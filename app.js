import { renderMainHeader, openMenuOverlay } from "./header.js";
import { renderSetSelection } from "./sets.js";
import { startRegistration, cleanupRegistration, editCustomCard } from "./register.js";
import { openDB, get, put, STORES } from "./db.js";
import { loadIndex, displayedCard } from "./master.js";
import { list, detail } from "./cards.js";
import { esc, toast } from "./utils.js";

const h = document.getElementById("app-header"), m = document.getElementById("app-main");
const defaultListState = () => ({ searchOpen: false, query: "", character: "", brand: "", type: "", rarity: "", category: "", ownership: "", favoriteOnly: false, sort: "id", direction: "asc" });
const s = { screen: "CARD_LIST", setId: null, cardId: null, history: [], listState: defaultListState() };

function nav(screen, p = {}, replace = false) {
  if (!replace) s.history.push({ screen: s.screen, setId: s.setId, cardId: s.cardId });
  s.screen = screen; Object.assign(s, p); render();
}
function back() { const p = s.history.pop(); if (!p) return; s.screen = p.screen; s.setId = p.setId; s.cardId = p.cardId; render(); }
function header(title, backable = false) {
  h.innerHTML = backable
    ? `<button class="icon-btn" id="back">←</button><div class="header-title">${esc(title)}</div>`
    : `<div class="header-left"><button class="header-btn" id="sets">${esc(title)}</button></div><div class="header-actions"><button class="header-btn" id="reg"><button class="register-button" data-action="register">＋登録</button></button><button class="icon-btn" id="search">⌕</button><button class="icon-btn" id="menu">☰</button></div>`;
  if (backable) h.querySelector("#back").onclick = back;
  else {
    h.querySelector("#sets").onclick = () => nav("SET_SELECT");
    h.querySelector("#reg").onclick = () => toast("登録画面は次の実装段階で追加します");
    h.querySelector("#search").onclick = () => { s.listState.searchOpen = !s.listState.searchOpen; render(); };
    h.querySelector("#menu").onclick = () => toast("メニューは次の実装段階で追加します");
  }
}

async function render() {
  const idx = await loadIndex();
  if (!s.setId) s.setId = idx.sets[0].id;
  if (s.screen === "CARD_LIST") {
    const set = idx.sets.find(x => x.id === s.setId);
    header(set.name);
    await list({ set, main: m, open: id => nav("CARD_DETAIL", { cardId: id }), listState: s.listState, onChange: () => render() });
  } else if (s.screen === "SET_SELECT") {
    header("弾を選択", true);
    m.innerHTML = idx.sets.map(x => `<button class="list-item ${x.id === s.setId ? "current" : ""}" data-id="${x.id}">${x.id === s.setId ? "●" : "○"} ${esc(x.name)}</button>`).join("");
    m.querySelectorAll("[data-id]").forEach(b => b.onclick = async () => {
      s.setId = b.dataset.id;
      s.history = [];
      // Search term and filters reset on set change; sort remains.
      Object.assign(s.listState, { searchOpen: false, query: "", character: "", brand: "", type: "", rarity: "", category: "", ownership: "", favoriteOnly: false });
      const a = await get(STORES.settings, "app") || { key: "app" };
      await put(STORES.settings, { ...a, key: "app", lastViewedSet: s.setId });
      nav("CARD_LIST", {}, true);
    });
  } else if (s.screen === "CARD_DETAIL") {
    header("カード詳細", true);
    await detail({ card: await displayedCard(s.cardId, s.setId), setId: s.setId, main: m });
  }
}

async function init() {
  await openDB();
  let a = await get(STORES.settings, "app");
  if (!a) { a = { key: "app", selectedTheme: "autumn", lastViewedSet: "E1" }; await put(STORES.settings, a); }
  document.body.className = `theme-${a.selectedTheme || "autumn"}`;
  s.setId = a.lastViewedSet || "E1";
  try { await render(); }
  catch (e) { header("エラー", true); m.innerHTML = `<div class="empty">マスターデータを読み込めませんでした。<br>${esc(e.message)}</div>`; }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js");
}
init();

window.__aikatsuRender = render;

document.addEventListener("click", async (event) => {
  const action = event.target?.closest?.("[data-action]")?.dataset?.action;
  if (action === "register") {
    await startRegistration(render);
  }
});

document.addEventListener("click", async (event) => {
  const btn = event.target?.closest?.("[data-action='edit-custom-card']");
  if (!btn) return;
  const cardId = btn.dataset.cardId;
  await editCustomCard(cardId, render);
});

document.addEventListener("click", async (event) => {
  const selector = event.target?.closest?.("[data-action='select-set'], .set-selector");
  if (!selector) return;

  const currentSetId = window.__aikatsuCurrentSet || "E1";
  const root = document.querySelector("#app, main");
  if (!root) return;

  await renderSetSelection(root, currentSetId, async (setId) => {
    window.__aikatsuCurrentSet = setId;
    // Reset search/filter state when switching sets. Sort persistence is handled
    // by the existing list implementation.
    window.__aikatsuSetChange?.(setId);
  });
});

document.addEventListener("click", async (event) => {
  const actionEl = event.target?.closest?.("[data-action]");
  const action = actionEl?.dataset?.action;
  if (action === "menu") {
    const root = document.querySelector("#app, main");
    if (root) openMenuOverlay(root);
  }
  if (action === "search") {
    window.__aikatsuSearch?.();
  }
});

window.__aikatsuRenderMainHeader = renderMainHeader;
