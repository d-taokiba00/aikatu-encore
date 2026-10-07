
import {
  getUserCard, putUserCard, getAllUserCards,
  putSetting, getSetting,
  putCardOverride, getCardOverride, resetCardOverrideField
} from "./db.js";

async function run() {
  const id = "__IDB_TEST__";
  await putUserCard({cardId:id, ownedCount:2, favorite:true});
  const a = await getUserCard(id);
  if (!a || a.ownedCount !== 2 || !a.favorite) throw new Error("userCards保存失敗");

  await putSetting("selectedTheme", "autumn");
  const theme = await getSetting("selectedTheme");
  if (theme !== "autumn") throw new Error("settings保存失敗");

  await putCardOverride(id, {name:"テスト", brand:"テストブランド"});
  const o1 = await getCardOverride(id);
  if (o1?.name !== "テスト" || o1?.brand !== "テストブランド") throw new Error("override保存失敗");

  await resetCardOverrideField(id, "name");
  const o2 = await getCardOverride(id);
  if (o2?.name !== undefined || o2?.brand !== "テストブランド") throw new Error("override個別リセット失敗");

  const all = await getAllUserCards();
  if (!all.some(x => x.cardId === id)) throw new Error("getAll失敗");

  document.body.innerHTML = "<main style='padding:24px;font-family:sans-serif'><h1>IndexedDB検証OK</h1><p>userCards / settings / cardOverrides の保存・取得・個別リセットを確認しました。</p></main>";
}
run().catch(err => {
  document.body.innerHTML = `<main style="padding:24px;font-family:sans-serif"><h1>IndexedDB検証失敗</h1><pre>${String(err.stack || err)}</pre></main>`;
});
