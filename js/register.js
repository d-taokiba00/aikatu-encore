
/*
 * アイカツ！アンコール - カード登録
 * Camera/OCR image is kept only in memory and is never written to IndexedDB.
 * OCR uses Tesseract.js from CDN when available; manual ID entry is always available.
 */
import { getUserCard, putUserCard, putCustomCard, getCustomCard, putCustomImage } from "./db.js";
import { findCardById } from "./master.js";
import { showToast, showDialog } from "./utils.js";

let stream = null;
let video = null;
let canvas = null;
let lastOcrId = null;

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/[–—ー−]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function extractCardId(text) {
  const t = normalizeOcrText(text);
  // Expected official/custom ID form. Do not alter a confirmed ID.
  const m = t.match(/(?:E\d|EP)-\d{1,3}[A-Z]{0,2}/);
  return m ? m[0] : null;
}

export async function startRegistration(render) {
  lastOcrId = null;
  renderRegistration(render);
}

function renderRegistration(render) {
  render(`
    <section class="screen registration-screen">
      <header class="screen-header">
        <button class="icon-button" data-action="back" aria-label="戻る">←</button>
        <h1>カード登録</h1>
        <span></span>
      </header>

      <div class="registration-body">
        <div class="camera-frame">
          <video id="register-video" autoplay playsinline muted></video>
          <div class="camera-guide">カードIDを枠内に入れてください</div>
        </div>

        <div class="registration-actions">
          <button class="primary-button" id="camera-start">カメラを起動</button>
          <button class="secondary-button" id="camera-capture">撮影して読み取る</button>
        </div>

        <div class="manual-entry">
          <label for="manual-card-id">IDを手入力</label>
          <div class="manual-row">
            <input id="manual-card-id" type="text" autocomplete="off" autocapitalize="characters"
              placeholder="例：E1-01" />
            <button class="secondary-button" id="manual-confirm">確認</button>
          </div>
        </div>

        <p class="registration-note">
          撮影画像はOCR処理のみに使用し、登録・バックアップには保存しません。
        </p>

        <div id="ocr-status" class="status-box" hidden></div>
      </div>
    </section>
  `);

  video = document.querySelector("#register-video");
  canvas = document.createElement("canvas");

  document.querySelector("#camera-start")?.addEventListener("click", startCamera);
  document.querySelector("#camera-capture")?.addEventListener("click", captureAndRecognize);
  document.querySelector("#manual-confirm")?.addEventListener("click", () => {
    const id = normalizeOcrText(document.querySelector("#manual-card-id")?.value);
    if (!id) return showToast("カードIDを入力してください");
    confirmRecognizedId(id, render);
  });
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("camera-not-supported");
    }
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    showStatus("カメラを起動しました。カードIDを映してください。");
  } catch (e) {
    showStatus("カメラを起動できませんでした。IDを手入力できます。", true);
  }
}

async function captureAndRecognize() {
  if (!video?.videoWidth) {
    showStatus("先にカメラを起動してください。", true);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Crop the lower area where the card ID is printed. The resulting data URL
  // exists only in memory and is not persisted.
  const crop = document.createElement("canvas");
  const cw = Math.floor(canvas.width * 0.8);
  const ch = Math.floor(canvas.height * 0.22);
  crop.width = cw;
  crop.height = ch;
  crop.getContext("2d").drawImage(
    canvas,
    Math.floor(canvas.width * 0.1),
    Math.floor(canvas.height * 0.72),
    cw, ch,
    0, 0, cw, ch
  );

  showStatus("カードIDを読み取っています…");

  try {
    if (!window.Tesseract) {
      throw new Error("ocr-library-unavailable");
    }
    const result = await window.Tesseract.recognize(crop, "eng", {
      logger: m => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          showStatus(`カードIDを読み取っています… ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    const raw = result?.data?.text || "";
    const id = extractCardId(raw);
    if (!id) {
      showStatus("IDを読み取れませんでした。再試行するか、手入力してください。", true);
      return;
    }
    lastOcrId = id;
    showStatus(`読み取り結果：${id}`);
    await confirmRecognizedId(id, window.__aikatsuRender);
  } catch (e) {
    showStatus("OCRを利用できませんでした。再試行するか、IDを手入力してください。", true);
  }
}

async function confirmRecognizedId(id, render) {
  const ok = await showDialog({
    title: "読み取り結果の確認",
    message: `カードID「${id}」で登録しますか？`,
    buttons: [
      { label: "修正する", value: false },
      { label: "このIDで登録", value: true, primary: true }
    ]
  });
  if (!ok) {
    document.querySelector("#manual-card-id")?.focus();
    return;
  }
  stopCamera();
  await registerById(id, render);
}

async function registerById(id, render) {
  const official = await findCardById(id);
  if (official) {
    const existing = await getUserCard(id);
    const ownedCount = (existing?.ownedCount || 0) + 1;
    await putUserCard({ cardId: id, ownedCount, favorite: !!existing?.favorite });
    showToast(`${id} を登録しました（所持数 ${ownedCount}）`);
    render({ screen: "CARD_DETAIL", cardId: id });
    return;
  }

  const existingCustom = await getCustomCard(id);
  if (!existingCustom) {
    await putCustomCard({
      cardId: id,
      name: null,
      character: null,
      brand: null,
      type: null,
      rarity: null,
      category: null,
      appealPoint: null
    });
  }
  const existing = await getUserCard(id);
  const ownedCount = (existing?.ownedCount || 0) + 1;
  await putUserCard({ cardId: id, ownedCount, favorite: !!existing?.favorite });
  showToast(`${id} は未登録カードとして登録しました`);
  render({ screen: "CUSTOM_CARD_EDIT", cardId: id });
}

function showStatus(text, error = false) {
  const el = document.querySelector("#ocr-status");
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle("error", error);
}

function stopCamera() {
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
  }
  stream = null;
  if (video) video.srcObject = null;
}

export function cleanupRegistration() {
  stopCamera();
}


export async function editCustomCard(cardId, render) {
  const existing = await getCustomCard(cardId);
  if (!existing) {
    showToast("未登録カードの情報が見つかりません");
    return;
  }

  render(`
    <section class="screen custom-edit-screen">
      <header class="screen-header">
        <button class="icon-button" data-action="back" aria-label="戻る">←</button>
        <h1>カード情報を編集</h1>
        <span></span>
      </header>

      <div class="custom-edit-body">
        <div class="custom-id">${escapeHtml(cardId)}</div>

        <div class="form-grid">
          <label>カード名
            <input data-field="name" value="${escapeAttr(existing.name)}" placeholder="未設定">
          </label>
          <label>キャラクター
            <input data-field="character" value="${escapeAttr(existing.character)}" placeholder="未設定">
          </label>
          <label>ブランド
            <input data-field="brand" value="${escapeAttr(existing.brand)}" placeholder="未設定">
          </label>
          <label>タイプ
            <input data-field="type" value="${escapeAttr(existing.type)}" placeholder="未設定">
          </label>
          <label>レアリティ
            <input data-field="rarity" value="${escapeAttr(existing.rarity)}" placeholder="未設定">
          </label>
          <label>カテゴリ
            <input data-field="category" value="${escapeAttr(existing.category)}" placeholder="未設定">
          </label>
          <label>AP
            <input data-field="appealPoint" inputmode="numeric" value="${escapeAttr(existing.appealPoint)}" placeholder="未設定">
          </label>
        </div>

        <div class="custom-image-section">
          <h2>カード画像</h2>
          <div id="custom-image-preview" class="custom-image-preview">
            <span>画像なし</span>
          </div>
          <input id="custom-image-input" type="file" accept="image/*">
          <p>未登録カードは表面画像を1枚保存できます。</p>
        </div>

        <button class="primary-button" id="custom-save">保存</button>
      </div>
    </section>
  `);

  document.querySelector("#custom-image-input")?.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = document.querySelector("#custom-image-preview");
    const url = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${url}" alt="カード画像プレビュー">`;
    preview.dataset.pendingImage = "1";
    preview._file = file;
  });

  document.querySelector("#custom-save")?.addEventListener("click", async () => {
    const fields = ["name","character","brand","type","rarity","category"];
    const card = { cardId };
    for (const field of fields) {
      const v = document.querySelector(`[data-field="${field}"]`)?.value?.trim() || null;
      card[field] = v;
    }

    const apRaw = document.querySelector('[data-field="appealPoint"]')?.value?.trim() || "";
    if (apRaw === "") {
      card.appealPoint = null;
    } else if (/^\d+$/.test(apRaw)) {
      card.appealPoint = Number(apRaw);
    } else {
      showToast("APは数字で入力してください");
      return;
    }

    await putCustomCard(card);

    const preview = document.querySelector("#custom-image-preview");
    const file = preview?._file;
    if (file) {
      await putCustomImage({
        cardId,
        blob: file,
        mimeType: file.type || "image/*"
      });
    }

    showToast("カード情報を保存しました");
    render({ screen: "CARD_DETAIL", cardId });
  });
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(v) { return escapeHtml(v); }
