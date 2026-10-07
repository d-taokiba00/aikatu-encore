
export function renderFilterPanel(container, options, state, onApply) {
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

        ${selectField("character","キャラクター",unique("character"),state.character)}
        ${selectField("brand","ブランド",unique("brand"),state.brand)}
        ${selectField("type","タイプ",unique("type"),state.type)}
        ${selectField("rarity","レアリティ",unique("rarity"),state.rarity)}
        ${selectField("category","カテゴリ",unique("category"),state.category)}

        <label class="filter-row">
          <span>所持状態</span>
          <select data-filter="ownership">
            <option value="all" ${state.ownership==="all"?"selected":""}>すべて</option>
            <option value="owned" ${state.ownership==="owned"?"selected":""}>所持</option>
            <option value="unowned" ${state.ownership==="unowned"?"selected":""}>未所持</option>
          </select>
        </label>

        <label class="check-row">
          <input type="checkbox" data-filter="favorite" ${state.favorite?"checked":""}>
          <span>お気に入りのみ</span>
        </label>
      </div>

      <div class="filter-section">
        <h3>並び替え</h3>
        <label class="filter-row">
          <span>項目</span>
          <select data-filter="sort">
            <option value="id" ${state.sort==="id"?"selected":""}>ID</option>
            <option value="rarity" ${state.sort==="rarity"?"selected":""}>レアリティ</option>
            <option value="appealPoint" ${state.sort==="appealPoint"?"selected":""}>AP</option>
            <option value="name" ${state.sort==="name"?"selected":""}>カード名</option>
          </select>
        </label>
        <label class="filter-row">
          <span>順序</span>
          <select data-filter="direction">
            <option value="asc" ${state.direction==="asc"?"selected":""}>昇順</option>
            <option value="desc" ${state.direction==="desc"?"selected":""}>降順</option>
          </select>
        </label>
      </div>

      <button class="primary-button full-width" data-action="apply-filters">この条件で表示</button>
    </section>
  `;

  const readState = () => {
    const next = {...state};
    container.querySelectorAll("[data-filter]").forEach(el => {
      const key = el.dataset.filter;
      next[key] = el.type === "checkbox" ? el.checked : el.value;
    });
    return next;
  };

  container.querySelector("[data-action='apply-filters']")?.addEventListener("click", () => {
    onApply(readState());
    container.remove();
  });

  container.querySelector("[data-action='reset-filters']")?.addEventListener("click", () => {
    onApply({
      search: state.search || "",
      character:"", brand:"", type:"", rarity:"", category:"",
      ownership:"all", favorite:false,
      sort:state.sort || "id", direction:state.direction || "asc"
    });
    container.remove();
  });

  container.querySelector("[data-action='close-filters']")?.addEventListener("click", () => container.remove());
}

function selectField(key, label, values, current) {
  return `
    <label class="filter-row">
      <span>${label}</span>
      <select data-filter="${key}">
        <option value="">すべて</option>
        ${values.map(v => `<option value="${esc(v)}" ${v===current?"selected":""}>${esc(v)}</option>`).join("")}
      </select>
    </label>
  `;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
