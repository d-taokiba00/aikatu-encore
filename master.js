import { getCustomCard } from "./db.js";
import{get,STORES}from"./db.js";
let indexCache,masters=new Map();
export async function loadIndex(){if(indexCache)return indexCache;const r=await fetch("./data/index.json",{cache:"no-cache"});if(!r.ok)throw Error("index.jsonを読み込めませんでした");return indexCache=await r.json()}
export async function loadMaster(id){if(masters.has(id))return masters.get(id);const r=await fetch(`./data/${id}.json`,{cache:"no-cache"});if(!r.ok)throw Error(`${id}.jsonを読み込めませんでした`);const x=await r.json();if(!Array.isArray(x))throw Error(`${id}.jsonの形式が不正です`);masters.set(id,x);return x}
export async function displayedCard(cardId,setId){const master=await loadMaster(setId),official=master.find(x=>x.id===cardId)||null,custom=await get(STORES.customCards,cardId),override=await get(STORES.cardOverrides,cardId),user=await get(STORES.userCards,cardId);const base=official||custom||{id:cardId,name:null,character:null,brand:null,type:null,rarity:null,category:null,appealPoint:null};return{...base,...(override||{}),official:!!official,ownedCount:user?.ownedCount??0,favorite:!!user?.favorite}}
export function imagePath(setId,id){return`./images/${setId}/${encodeURIComponent(id)}.webp`}

export async function getCardDisplay(cardId) {
  const sets = await loadIndex();
  for (const set of sets) {
    const cards = await loadMaster(set.id);
    const official = cards?.find(c => c.id === cardId);
    if (official) {
      const override = await getOverride?.(cardId);
      return { ...official, ...(override || {}), official: true };
    }
  }
  const custom = await getCustomCard?.(cardId);
  if (custom) return { ...custom, official: false };
  return null;
}

export async function findCardById(cardId) {
  const d = await getCardDisplay(cardId);
  return d?.official ? d : null;
}
