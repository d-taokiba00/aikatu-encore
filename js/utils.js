export function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export function toast(msg){const r=document.getElementById("toast-root");r.innerHTML=`<div class="toast">${esc(msg)}</div>`;setTimeout(()=>r.innerHTML="",1800)}
