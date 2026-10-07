
export async function renderSetSelection(container, currentSetId, onSelect) {
  const index = await loadSetIndex();
  container.innerHTML = `
    <section class="screen set-selection-screen">
      <header class="screen-header">
        <button class="icon-button" data-action="back" aria-label="戻る">←</button>
        <h1>弾を選択</h1>
        <span></span>
      </header>
      <div class="set-list">
        ${index.map(set => `
          <button class="set-row ${set.id === currentSetId ? "is-selected" : ""}"
                  data-set-id="${escapeAttr(set.id)}">
            <span class="set-radio">${set.id === currentSetId ? "●" : "○"}</span>
            <span class="set-name">${escapeHtml(set.name)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;

  container.querySelectorAll("[data-set-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.setId;
      await onSelect(id);
    });
  });
}

async function loadSetIndex() {
  const response = await fetch("data/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("set-index-load-failed");
  const data = await response.json();
  return Array.isArray(data) ? data : (data.sets || []);
}
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(v) { return escapeHtml(v); }
