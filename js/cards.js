
import { getUserCard, putUserCard, getCustomImage } from "./db.js";
import { loadMaster, getCardDisplay } from "./master.js";
import { showToast } from "./utils.js";

let currentSetId = "E1";
let state = {
  search: "",
  character: "",
  brand: "",
  type: "",
  rarity: "",
  category: "",
  ownership: "all",
  favorite: false,
  sort: "id",
  direction: "asc"
};

export function getListState() {
  return {...state};
}

export function setListState(next = {}) {
  state = {...state, ...next};
}

export async function renderCardList(container, setId = currentSetId) {
  currentSetId = setId;
  const allCards = await loadMaster(setId) || [];
  const userMap = await buildUserMap(allCards);
  const filtered = applyFilters(allCards, userMap);
  const progress = getProgress(allCards, userMap);

  container.innerHTML = `
    <section class="card-list-screen">
      ${window.__aikatsuRenderMainHeader
        ? window.__aikatsuRenderMainHeader({setName: setName(setId)})
        : `<header class="main-header"><button class="set-selector" data-action="select-set">${escapeHtml(setName(setId))}</button></header>`}

      <div class="progress-area">
        <div class="progress-title">
          <strong>${escapeHtml(setName(setId))}</strong>
          <span>${progress.owned}/${allCards.length}</span>
        </div>
        <div class="progress-row">
          <div class="progress-track"><div class="progress-fill" style="width:${progress.rate}%"></div></div>
          <span>${progress.rate}%</span>
        </div>
      </div>

      ${hasActiveFilter()
        ? `<div class="active-filter-indicator" data-action="search">🔍 絞り込み中 ●</div>`
        : ""}

      <div class="card-grid">
        ${filtered.length
          ? filtered.map(card => renderCardTile(card, userMap[card.id])).join("")
          : `<div class="empty-results">条件に一致するカードがありません。</div>`}
      </div>
    </section>
  `;

  bindListEvents(container, setId);
  window.__aikatsuFilterCards = () => allCards;
  window.__aikatsuApplyFilters = async next => {
    state = {...next};
    await renderCardList(container, currentSetId);
  };
  window.__aikatsuSearch = async () => {
    openSearchPanel(container, allCards);
  };
}

function openSearchPanel(container, allCards) {
  document.querySelector(".search-panel")?.remove();
  const panel = document.createElement("div");
  panel.className = "search-panel";
  panel.innerHTML = `
    <div class="search-panel-header">
      <h2>検索</h2>
      <button class="header-icon" data-action="close-search">×</button>
    </div>
    <label class="search-input-wrap">
      <span>🔍</span>
      <input id="search-term" value="${escapeAttr(state.search)}" placeholder="カードID・カード名" autocomplete="off">
    </label>
    <button class="filter-open" data-action="open-filters">絞り込み・並び替え</button>
    <div class="search-panel-actions">
      <button class="secondary-button" data-action="clear-search">リセット</button>
      <button class="primary-button" data-action="apply-search">適用</button>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector("[data-action='close-search']").onclick = () => panel.remove();

  panel.querySelector("[data-action='clear-search']").onclick = async () => {
    state.search = "";
    await renderCardList(container, currentSetId);
    panel.remove();
  };

  panel.querySelector("[data-action='apply-search']").onclick = async () => {
    state.search = panel.querySelector("#search-term").value.trim();
    await renderCardList(container, currentSetId);
    panel.remove();
  };

  panel.querySelector("[data-action='open-filters']").onclick = async () => {
    const overlay = document.createElement("div");
    overlay.className = "filter-overlay";
    document.body.appendChild(overlay);
    const options = allCards;
    renderFilterPanelDirect(overlay, options, state, async next => {
      state = {...next};
      await renderCardList(container, currentSetId);
      panel.remove();
    });
  };
}

function renderFilterPanelDirect(container, options, current, onApply) {
  const unique = field => [...new Set(options.map(c => c[field]).filter(Boolean))];
  container.innerHTML = `
    <section class="filter-panel">
      <header class="filter-panel-header">
        <button class="icon-button" data-action="close-filters">←</button>
        <h2>絞り込み・並び替え</h2>
        <button class="text-button" data-action="reset-filters">リセット</button>
      </header>

      <div class="filter-section">
        <h3>絞り込み</h3>
        ${filterSelect("character","キャラクター",unique("character"),current.character)}
        ${filterSelect("brand","ブランド",unique("brand"),current.brand)}
        ${filterSelect("type","タイプ",unique("type"),current.type)}
        ${filterSelect("rarity","レアリティ",unique("rarity"),current.rarity)}
        ${filterSelect("category","カテゴリ",unique("category"),current.category)}

        <label class="filter-row">
          <span>所持状態</span>
          <select data-filter="ownership">
            <option value="all" ${current.ownership==="all"?"selected":""}>すべて</option>
            <option value="owned" ${current.ownership==="owned"?"selected":""}>所持</option>
            <option value="unowned" ${current.ownership==="unowned"?"selected":""}>未所持</option>
          </select>
        </label>

        <label class="check-row">
          <input type="checkbox" data-filter="favorite" ${current.favorite?"checked":""}>
          <span>お気に入りのみ</span>
        </label>
      </div>

      <div class="filter-section">
        <h3>並び替え</h3>
        <label class="filter-row">
          <span>項目</span>
          <select data-filter="sort">
            <option value="id" ${current.sort==="id"?"selected":""}>ID</option>
            <option value="rarity" ${current.sort==="rarity"?"selected":""}>レアリティ</option>
            <option value="appealPoint" ${current.sort==="appealPoint"?"selected":""}>AP</option>
            <option value="name" ${current.sort==="name"?"selected":""}>カード名</option>
          </select>
        </label>
        <label class="filter-row">
          <span>順序</span>
          <select data-filter="direction">
            <option value="asc" ${current.direction==="asc"?"selected":""}>昇順</option>
            <option value="desc" ${current.direction==="desc"?"selected":""}>降順</option>
          </select>
        </label>
      </div>

      <button class="primary-button full-width" data-action="apply-filters">この条件で表示</button>
    </section>
  `;

  container.querySelector("[data-action='close-filters']").onclick = () => container.remove();

  container.querySelector("[data-action='reset-filters']").onclick = () => {
    onApply({
      search: state.search,
      character:"", brand:"", type:"", rarity:"", category:"",
      ownership:"all", favorite:false,
      sort:state.sort, direction:state.direction
    });
  };

  container.querySelector("[data-action='apply-filters']").onclick = () => {
    const next = {...current};
    container.querySelectorAll("[data-filter]").forEach(el => {
      next[el.dataset.filter] = el.type === "checkbox" ? el.checked : el.value;
    });
    onApply(next);
  };
}

function filterSelect(key, label, values, current) {
  return `
    <label class="filter-row">
      <span>${label}</span>
      <select data-filter="${key}">
        <option value="">すべて</option>
        ${values.map(v => `<option value="${escapeAttr(v)}" ${v===current?"selected":""}>${escapeHtml(v)}</option>`).join("")}
      </select>
    </label>
  `;
}

function applyFilters(cards, userMap) {
  const q = state.search.toLowerCase();
  let result = cards.filter(card => {
    if (q && !String(card.id).toLowerCase().includes(q) &&
        !String(card.name || "").toLowerCase().includes(q)) return false;

    for (const field of ["character","brand","type","rarity","category"]) {
      if (state[field] && String(card[field] || "") !== state[field]) return false;
    }

    const user = userMap[card.id] || {};
    const owned = (user.ownedCount || 0) > 0;
    if (state.ownership === "owned" && !owned) return false;
    if (state.ownership === "unowned" && owned) return false;
    if (state.favorite && !user.favorite) return false;
    return true;
  });

  result.sort((a,b) => {
    const key = state.sort;
    let av = a[key], bv = b[key];
    if (key === "appealPoint") {
      av = Number.isFinite(av) ? av : -1;
      bv = Number.isFinite(bv) ? bv : -1;
    } else {
      av = String(av ?? "").toLowerCase();
      bv = String(bv ?? "").toLowerCase();
    }
    let cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return state.direction === "desc" ? -cmp : cmp;
  });
  return result;
}

async function buildUserMap(cards) {
  const map = {};
  await Promise.all(cards.map(async c => {
    map[c.id] = await getUserCard(c.id) || {cardId:c.id, ownedCount:0, favorite:false};
  }));
  return map;
}

function getProgress(cards, userMap) {
  let owned = 0;
  for (const c of cards) if ((userMap[c.id]?.ownedCount || 0) > 0) owned++;
  return {owned, rate: cards.length ? Math.round(owned/cards.length*100) : 0};
}

function renderCardTile(card, user) {
  const count = user?.ownedCount || 0;
  const fav = !!user?.favorite;
  return `
    <article class="card-tile ${count ? "is-owned" : "is-unowned"}" data-card-id="${escapeAttr(card.id)}">
      <button class="tile-favorite ${fav ? "is-favorite" : ""}" data-action="favorite" data-card-id="${escapeAttr(card.id)}">★</button>
      <button class="tile-main" data-action="open-card" data-card-id="${escapeAttr(card.id)}">
        <img src="images/${escapeAttr(currentSetId)}/${encodeURIComponent(card.id)}.webp"
             alt="${escapeAttr(card.name || card.id)}" loading="lazy"
             onerror="this.outerHTML='<div class=&quot;tile-placeholder&quot;>画像なし</div>'">
        <span class="tile-id">${escapeHtml(card.id)}</span>
        ${count ? `<span class="tile-count">×${count}</span>` : ""}
      </button>
    </article>
  `;
}

function bindListEvents(container) {
  container.addEventListener("click", async e => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.cardId;

    if (action === "open-card") {
      window.__aikatsuNavigate?.({screen:"CARD_DETAIL", cardId:id});
    } else if (action === "favorite") {
      const u = await getUserCard(id) || {cardId:id, ownedCount:0,favorite:false};
      u.favorite = !u.favorite;
      await putUserCard(u);
      el.classList.toggle("is-favorite", u.favorite);
      showToast(u.favorite ? "お気に入りに追加しました" : "お気に入りから外しました");
      await renderCardList(container, currentSetId);
    }
  });
}

function hasActiveFilter() {
  return !!(
    state.search || state.character || state.brand || state.type ||
    state.rarity || state.category || state.ownership !== "all" ||
    state.favorite
  );
}

function setName(id) { return id === "E1" ? "第1弾" : id; }
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(v) { return escapeHtml(v); }
