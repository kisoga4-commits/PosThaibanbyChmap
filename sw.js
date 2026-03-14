const CACHE_NAME = 'vpos-v11-pro-secure-cache-v1';

// ไฟล์สำคัญที่บังคับต้องจำลงเครื่อง (ถ้าขาด แอปจะไม่รัน)
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  // ถ้ามึงแยกไฟล์ CSS/JS ออกมา ให้ใส่ชื่อไฟล์ตรงนี้ด้วย
];

// 1. ตอนติดตั้งแอป (Install) - โหลดไฟล์ลงเครื่อง
self.addEventListener('install', event => {
  self.skipWaiting(); // บังคับอัปเดตทันทีถ้ามีเวอร์ชันใหม่
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('🔒 Secure Cache Activated');
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// 2. ตอนล้างไพ่ (Activate) - ลบไฟล์เวอร์ชันเก่าทิ้ง
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Clearing Old Tampered Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. ตอนดึงข้อมูล (Fetch) - โหมด Offline First & Anti-Tamper
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // ถ้ามีไฟล์ในเครื่อง (Cache) ให้ใช้จากเครื่องเสมอ! 
      // (กันคนแอบสลับโค้ดผ่านเน็ตเพจ)
      if (cachedResponse) return cachedResponse;
      
      // ถ้าไม่มีในเครื่อง ค่อยวิ่งไปหาจากเน็ต
      return fetch(event.request).catch(() => {
        // ถ้าเน็ตหลุดและหาไฟล์ไม่เจอจริงๆ
        return new Response("ระบบ Offline ทำงาน กรุณาตรวจสอบการเชื่อมต่อ", {
          status: 503,
          statusText: "Service Unavailable"
        });
      });
    })
  );
});
