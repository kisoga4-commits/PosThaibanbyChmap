// ตั้งชื่อ Cache และกำหนดเวอร์ชัน (ถ้าแก้โค้ดหน้าเว็บ ควรมาเปลี่ยนเลขเวอร์ชันตรงนี้)
const CACHE_NAME = 'vpos-v11-pro-cache-v1';

// รายชื่อไฟล์และลิงก์ CDN ทั้งหมดที่ต้องดูดเก็บไว้ตั้งแต่วันแรกที่เปิดแอป (มีเน็ต)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // พลังของ Offline อยู่ตรงนี้: สั่งเก็บ CDN สำคัญลงเครื่อง
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode',
  'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;800;900&display=swap'
];

// 1. ขั้นตอน Install: ติดตั้งและดูดไฟล์ทั้งหมดลง Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching Static Assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting()) // บังคับให้ Service Worker ตัวใหม่เริ่มงานทันทีไม่ต้องรอ
  );
});

// 2. ขั้นตอน Activate: ทำความสะอาด Cache เก่า (สำคัญมากเวลาคุณอัปเดตแอป)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache); // ลบถังเก่าทิ้ง
          }
        })
      );
    }).then(() => self.clients.claim()) // ให้ Service Worker เข้าคุมหน้าเว็บทันที
  );
});

// 3. ขั้นตอน Fetch: ดักจับการเรียกไฟล์ (หัวใจหลักตอน Offline)
self.addEventListener('fetch', event => {
  // ข้ามการดักจับถ้าเป็น API หรือไม่ใช่การดึงข้อมูลปกติ (GET)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 3.1 เจอของใน Cache -> ส่งคืนไปเลย (ทำงานตอน Offline ได้ทันที)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 3.2 ไม่เจอใน Cache -> ลองไปดึงจากเน็ตดู
      return fetch(event.request).then(networkResponse => {
        // เช็คว่าการดึงข้อมูลสมบูรณ์ไหม ถ้าไม่สมบูรณ์ก็คืนค่าไปตามปกติ
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // 3.3 Runtime Caching: แอบเก็บไฟล์ใหม่ที่เพิ่งโหลดมาลง Cache ด้วย
        // (เช่น พวกไฟล์ฟอนต์ .woff2 ที่ Google Fonts แอบไปดึงมาอีกทอดนึง)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // กรณี Offline เต็มตัวและหาไฟล์ไม่เจอจริงๆ
        // ระบบจะเงียบๆ ไว้ ไม่ให้แอป Crash 
        console.log('[Service Worker] Offline & No Cache Found for:', event.request.url);
      });
    })
  );
});