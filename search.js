import { renderFilterPanel } from "./filters.js";

export function renderSearchPanel(container, state = {}) {
  container.innerHTML = `
    <section class="search-panel">
      <div class="search-panel-header">
        <h2>検索</h2>
        <button class="header-icon" data-action="close-search">×</button>
      </div>
      <label class="search-input-wrap">
        <span>🔍</span>
        <input id="search-term" value="${escapeAttr(state.search || "")}"
               placeholder="カードID・カード名">
      </label>

      <button class="filter-open" data-action="open-filters">
        絞り込み・並び替え
      </button>

      <div class="search-panel-actions">
        <button class="secondary-button" data-action="clear-search">リセット</button>
        <button class="primary-button" data-action="apply-search">適用</button>
      </div>
    </section>
  `;
  container.querySelector("[data-action='close-search']")?.addEventListener("click", () => container.remove());
  container.querySelector("[data-action='open-filters']")?.addEventListener("click", () => {
    const panel = document.createElement("div");
    panel.className = "filter-overlay";
    document.body.appendChild(panel);
    renderFilterPanel(panel, window.__aikatsuFilterCards?.() || [], state, next => {
      window.__aikatsuApplyFilters?.(next);
    });
  });
}
function escapeAttr(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
