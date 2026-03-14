/**
 * VILLAGE POS - Service Worker V11.2.2 (Ultra Offline Core)
 * กลยุทธ์: Cache-First (หยิบของในเครื่องก่อน ไม่สนเน็ต) 
 * เพื่อการันตีว่าแอปจะไม่ขาว และเปิดติด 100% ในที่อับสัญญาณ
 */

const CACHE_NAME = 'vpos-v11-2-2-stable'; 

// 🟢 1. เสบียงที่ต้อง "โหลดลงเครื่อง" ให้ครบตั้งแต่วินาทีแรก
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode',
  'https://unpkg.com/dexie/dist/dexie.js',
  // เพิ่มฟอนต์ลงแคชด้วย ไม่งั้นตอนออฟไลน์ฟอนต์จะเพี้ยน
  'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;800;900&display=swap'
];

// 🛠️ 1. Install - สั่งดาวน์โหลดไฟล์ทั้งหมดลง "โกดัง" (Cache)
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 SW: กำลังสูบไฟล์ลงเครื่อง...');
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 🛠️ 2. Activate - ล้างโกดังเก่าทิ้งทันทีที่มีของใหม่
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ SW: ลบแคชเก่าทิ้งแล้ว');
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); 
});

// 🛠️ 3. Fetch - หัวใจของการ Offline 100%
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 🛡️ ด่าน 1: ถ้าในเครื่อง (Cache) มีไฟล์นี้อยู่แล้ว ส่งให้หน้าจอทันที! (ไม่ถามเน็ตเลย)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🌐 ด่าน 2: ถ้าในเครื่องไม่มีจริงๆ (เช่น รูปสินค้าใหม่ๆ) ค่อยไปถามเน็ต
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // 💾 ด่าน 3: ได้ของจากเน็ตมาแล้ว "ถ่ายเอกสาร" เก็บลงเครื่องไว้ใช้รอบหน้าด้วย
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 🆘 ด่าน 4: ถ้าไม่มีเน็ต + ไม่มีในเครื่อง (เน็ตหลุดกลางคัน)
        // ส่งหน้าหลัก index.html กลับไปให้ เพื่อไม่ให้หน้าจอขาว
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
