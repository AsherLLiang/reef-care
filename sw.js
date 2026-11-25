// 海缸照顾 · 离线缓存
// 每次更新内容后，把 VERSION 改一下（比如加 1），手机联网打开时会自动换成新内容。
var VERSION = 'v2';
var CACHE = 'reef-' + VERSION;
var CORE = ['./', 'index.html', 'style.css', 'data.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png',
  "img/bucket.jpg",  "img/p3978.jpg",  "img/p3979.jpg",  "img/p3981a.jpg",  "img/p3982a.jpg",  "img/p3983.jpg",  "img/p3986.jpg",  "img/p3988.jpg",  "img/p3991.jpg",  "img/p3993.jpg",  "img/p3995.jpg",  "img/p4016.jpg",  "img/p4028.jpg",  "img/p4030.jpg",  "img/p4045.jpg",  "img/p4047.jpg",  "img/p4048.jpg"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromNetwork(req, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(reject, ms);
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      clearTimeout(t);
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); resolve(res); }
      else reject();
    }, function () { clearTimeout(t); reject(); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var isImg = /\/img\//.test(req.url);
  if (isImg) {
    // 图片：先用缓存，后台顺便更新
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { if (res && res.ok) { var c2 = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, c2); }); } return res; }).catch(function () { return hit; });
      return hit || net;
    }));
  } else {
    // 页面和文字：联网时取最新的（最多等 4 秒），没网就用手机里存的
    e.respondWith(fromNetwork(req, 4000).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
    }));
  }
});
