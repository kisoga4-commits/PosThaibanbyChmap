/**
 * VILLAGE POS - Service Worker V11.2.1 (Ultra Offline Core)
 * ระบบคุมโกดังแบบปิดตาย เน้นออฟไลน์ 100% กล้องต้องติด ข้อมูลต้องไม่หาย
 */

const CACHE_NAME = 'vpos-v11-2-1-ultra-offline'; // เปลี่ยนเลขเพื่อบังคับบราวเซอร์ล้างของเก่า

// 🟢 1. เสบียงหลัก (ต้องมีให้ครบ ไม่งั้นแอปพังตอนไม่มีเน็ต)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png', // ⚠️ สำคัญมาก! ต้องมีไฟล์ไอคอน ไม่งั้น PWA จะแคลชตอนเปิดแบบออฟไลน์
  
  // CDN ทั้งหมดที่ระบบต้องใช้
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode',
  'https://unpkg.com/dexie/dist/dexie.js'
];

// 🛠️ 1. ตอนติดตั้งแอป - ยัดเสบียงลงกล่อง
self.addEventListener('install', event => {
  console.log('📦 SW: Installing Ultra Offline Cache...');
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // ดึงไฟล์ทั้งหมดลงเครื่อง
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 🛠️ 2. ตอนเปิดแอป - ทำลายกล่องเสบียงเก่าที่หมดอายุ
self.addEventListener('activate', event => {
  console.log('🚀 SW: Cache V11.2.1 Activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ SW: Clearing Old Cache...', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); 
});

// 🛠️ 3. ตอนดึงข้อมูล (Fetch) - หัวใจของระบบ Offline 100%
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 🛡️ ด่านที่ 1: มีในเครื่องไหม? ถ้ามี เอาไปใช้เลย! (โคตรไว + ออฟไลน์ชัวร์)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🌐 ด่านที่ 2: ไม่มีในเครื่อง วิ่งไปดึงจากเน็ต
      return fetch(event.request).then(networkResponse => {
        // ⚠️ ปลดล็อคให้เก็บไฟล์ CDN (CORS/Opaque) ได้แล้ว กล้อง/ฐานข้อมูลจะได้ไม่ตาย
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        // 💾 ด่านที่ 3: ได้ของมาแล้ว ถ่ายเอกสารเก็บลงเครื่องไว้ใช้รอบหน้า
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // 🆘 ด่านที่ 4: เน็ตหลุด + ของไม่มีในเครื่อง
        // ถ้าสิ่งที่พยายามเปิดคือหน้าเว็บ ให้เด้งกลับไป index.html (กันหน้าขาว)
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
