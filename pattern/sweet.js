const CACHE = "pattern-detective-v1";

// 只缓存你真正有的文件
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

// 安装时缓存
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// 激活
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 请求优先走缓存，没命中再联网
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});