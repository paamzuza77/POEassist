import { defineConfig } from 'vite';

// P5 (patch 0.63) — Vite foundation.
// สำคัญ: แอปปัจจุบันเป็น global-scope monolith ใน index.html + classic scripts (js/*.js)
// ที่แชร์ scope กัน — ถ้าให้ Vite bundle index.html จะทำ global พัง.
// เฟสนี้จึงตั้ง base './' + ไม่ยุ่งกับสคริปต์เดิม; ใช้ dev server (HMR) สำหรับพัฒนาโมดูล src/ ใหม่.
// การ build/deploy ผ่าน Vite เป็นขั้นถัดไป (ดู P5_MIGRATION.md) — ยังไม่ตัด live deploy เดิม.
export default defineConfig({
  base: './',
  // เสิร์ฟไฟล์ static ทั้งหมด (data/, image/, css/, js/, assets/, background/) จาก root ตามเดิม
  // publicDir ปิด — root คือ public อยู่แล้ว (ไฟล์ทั้งหมดอยู่ที่ root, อ้างอิงแบบ relative)
  publicDir: false,
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // เขียน dist แยก — ไม่ทับ index.html เดิมที่ live เสิร์ฟอยู่ (ยังไม่ใช้เป็น deploy path)
    outDir: 'dist',
    emptyOutDir: true,
  },
});
