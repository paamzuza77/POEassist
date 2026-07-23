import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync } from 'node:fs';

// P5 Phase 5 (patch 0.74) — Vite build for the static-site deploy.
// สำคัญ: Vite ไม่ยุ่งกับ classic <script> (inline monolith + <script src="js/ea.js">) — global scope คงอยู่
// (พิสูจน์แล้ว: dist/index.html เก็บสคริปต์เดิมครบ, ไม่แปลงเป็น module). Vite แค่ bundle inline <style> + css/*.css
// ลง dist/assets/*.css. เหลือแต่ static runtime asset ที่ Vite ไม่รู้จัก (อ้างอิงผ่าน fetch/สตริงใน JS) ต้อง copy เอง.
function copyStaticAssets(): Plugin {
  // js/ea.js (bridge), data/*.json (Actions-generated), image/ (game art), background/, assets/icons (original SVG)
  const dirs = ['js', 'data', 'image', 'background', 'assets'];
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      for (const d of dirs) {
        if (existsSync(d)) cpSync(d, `dist/${d}`, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  // publicDir ปิด — root คือ static root อยู่แล้ว (ไฟล์อ้างอิงแบบ relative); asset ที่เหลือ copy ผ่าน plugin ด้านบน
  publicDir: false,
  plugins: [copyStaticAssets()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    // เขียน dist แยก — Actions จะ build จาก checkout ล่าสุด (มี data/*.json สดจาก workflow เดิม) แล้ว deploy dist/
    outDir: 'dist',
    emptyOutDir: true,
  },
});
