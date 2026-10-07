const CACHE="aikatsu-app-v1";
const SHELL=["./","./index.html","./manifest.json","./css/app.css","./css/themes.css","./js/app.js","./js/db.js","./js/master.js","./js/cards.js","./js/utils.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)))});
