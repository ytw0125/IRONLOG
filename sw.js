/* IRONLOG 서비스워커
   ─────────────────────────────────────────────
   전략을 두 갈래로 나눕니다.

   1) index.html (화면을 여는 요청) → 네트워크 우선
      인터넷이 되면 항상 서버의 최신 파일을 씁니다.
      그래서 앱을 고쳐 올리면 다음에 열 때 바로 반영됩니다.
      인터넷이 없으면 캐시에 저장해 둔 마지막 버전을 씁니다.

   2) 아이콘 같은 정적 파일 → 캐시 우선
      바뀔 일이 거의 없으니 캐시에서 바로 꺼내 쓰고,
      뒤에서 조용히 새 버전을 받아 캐시를 갱신합니다.

   이 방식이면 앱 내용을 고칠 때 아래 CACHE 이름을 건드릴 필요가 없습니다.
   (이 sw.js 파일 자체를 고칠 때만 숫자를 올려주세요) */

const CACHE = 'ironlog-v25';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png?v=3',
  './icon-512.png?v=3',
  './icon-maskable.png?v=3'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage){
    /* 네트워크 우선 — 최신 화면을 먼저 시도하고, 실패하면 캐시 */
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* 캐시 우선 — 꺼내 쓰고 뒤에서 갱신 */
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic'){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
