
export function renderMainHeader({ setName = "第1弾" } = {}) {
  return `
    <header class="main-header">
      <button class="set-selector" data-action="select-set" aria-label="弾を選択">${escapeHtml(setName)}</button>
      <div class="header-actions">
        <button class="header-action" data-action="register" aria-label="カード登録">＋登録</button>
        <button class="header-icon" data-action="search" aria-label="検索">⌕</button>
        <button class="header-icon" data-action="menu" aria-label="メニュー">☰</button>
      </div>
    </header>
  `;
}

export function openMenuOverlay(container) {
  closeMenuOverlay();
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";
  overlay.innerHTML = `
    <div class="menu-backdrop" data-action="close-menu"></div>
    <aside class="side-menu" role="dialog" aria-label="メニュー">
      <div class="side-menu-header">
        <strong>メニュー</strong>
        <button class="header-icon" data-action="close-menu" aria-label="閉じる">×</button>
      </div>
      <nav class="side-menu-list">
        <button data-menu-target="outfits">コーデ</button>
        <button data-menu-target="exchange">交換</button>
        <button data-menu-target="settings">設定</button>
      </nav>
    </aside>
  `;
  container.appendChild(overlay);

  overlay.querySelectorAll("[data-action='close-menu']").forEach(el =>
    el.addEventListener("click", closeMenuOverlay)
  );
  overlay.querySelectorAll("[data-menu-target]").forEach(el => {
    el.addEventListener("click", () => {
      const target = el.dataset.menuTarget;
      closeMenuOverlay();
      window.__aikatsuNavigate?.({
        screen: target === "outfits" ? "OUTFIT_LIST" :
                target === "exchange" ? "EXCHANGE" : "SETTINGS"
      });
    });
  });
}

export function closeMenuOverlay() {
  document.querySelector(".menu-overlay")?.remove();
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
