# P5_MIGRATION.md — Stack modernization (Vite + TypeScript)

> เฟส P5 ของ `ROADMAP.md`. เริ่ม 2026-07-23 (patch 0.63). **แนวทาง: incremental + ปลอดภัย —
> live site เสิร์ฟ `index.html` เดิมต่อไปจนกว่าจะย้ายโค้ดครบ.** ห้ามเปลี่ยน localStorage keys/สูตร.

## สถานะปัจจุบัน (Phase 1 — foundation) ✅

ติดตั้งแล้ว, verify ในเครื่องแล้ว, **ไม่แตะ deploy จริง**:
- `package.json` — Vite 5 + TypeScript 5; scripts: `dev` / `build` / `preview` / `typecheck`
- `tsconfig.json` — typecheck **เฉพาะ `src/`** (strict) — ไม่แตะ monolith เดิม
- `vite.config.ts` — `base: './'`, `publicDir: false` (root คือ static root อยู่แล้ว), build → `dist/` (ยังไม่ใช้)
- `.gitignore` += `node_modules/`, `dist/`
- `src/lib/format.ts` — โมดูล seed ตัวแรก (formatter บริสุทธิ์ มี type) + `src/README.md`

**พิสูจน์แล้ว:** `npm run typecheck` ผ่าน (exit 0); `npm run dev` เสิร์ฟแอปที่ `:5173` พร้อม HMR,
เสิร์ฟ `data/*.json` + `css/*` (200). โค้ดเดิม (global-scope monolith + classic scripts `js/*.js`)
ทำงานได้ปกติใน dev เพราะ Vite ไม่ bundle ตอน dev (global scope คงอยู่).

## ทำไมยังไม่ตัด deploy มาที่ Vite build

`index.html` เป็น **global-scope monolith** (~17k บรรทัด) + classic scripts `js/ux-foundation.js`,
`js/asset-registry.js` โหลด **ก่อน** inline script แล้วแชร์ global scope กัน. ถ้าให้ `vite build` bundle
index.html ตอนนี้ มันจะห่อ top-level `function`/`const` ของสคริปต์เหล่านั้นให้เป็น module scope →
`showToast`, `renderAssetIcon` ฯลฯ **หลุด global** → inline script เรียกไม่เจอ → แอปพัง.

จึงต้อง **ย้ายโค้ดเป็น ES modules ทีละส่วนก่อน** แล้วค่อยตัด deploy มาที่ build.

## แผนถัดไป (ทำทีละเซสชัน)

**Phase 2 — ย้าย helper บริสุทธิ์เป็น `src/`**
1. ย้าย formatter/math/utility ที่ไม่พึ่ง DOM/global → `src/lib/*.ts` (เริ่มที่ `format.ts` แล้ว).
2. ทำ `src/main.ts` เป็น entry เดียว รวม re-export helper + ติด `window.EA = {...}` (bridge) ให้ inline script เดิมเรียกได้ระหว่างเปลี่ยนผ่าน.
3. เพิ่ม `<script type="module" src="/src/main.ts">` ใน index.html; แทนที่ helper เดิมด้วยการเรียกผ่าน bridge ทีละตัว.

**Phase 3 — แปลง classic scripts เป็น modules**
- `js/ux-foundation.js` + `js/asset-registry.js` → `src/ux/*.ts`, `src/assets/*.ts`; expose ผ่าน bridge เดียวกัน (แก้จุดที่บั๊ก global sharing ตอน bundle).

**Phase 4 — ย้ายทีละแท็บ**
- ต่อแท็บ: ดึง render/logic ออกเป็น `src/tabs/<tab>.ts` (Today/Radar/Gear/Forge/Farm/Codex/Hub).
- คง id/คลาส/คีย์ storage/สูตร **เป๊ะ** — Playwright เทียบ before/after ทุกก้าว.

**Phase 5 — ตัด deploy มาที่ Vite build**
1. เมื่อ monolith หมด (index.html เหลือแค่ markup + `<script type="module">`) → `vite build` ได้ปลอดภัย.
2. เพิ่ม `.github/workflows/deploy-pages.yml` (build + `actions/deploy-pages`).
3. **ผู้ใช้ต้องสลับ GitHub → Settings → Pages → Source เป็น "GitHub Actions"** (จาก "Deploy from a branch").
   *ก่อนสลับ:* deploy เดิม (เสิร์ฟ root index.html) ยังทำงาน = ไม่มีดาวน์ไทม์.
4. workflow `update-market-radar.yml` ที่ commit `data/*.json` ต้องยังเสิร์ฟได้ — Vite ต้อง copy `data/` เข้า dist (ตั้ง publicDir หรือ static-copy) — **เช็คตอน Phase 5**.

## กติกาเหล็ก (ห้ามพลาด)

- **ห้ามเปลี่ยน localStorage keys หรือสูตรคำนวณ** — ย้ายโค้ดคือ "ตัด+วาง+ใส่ type" ไม่ใช่เขียนใหม่.
- ย้ายทีละส่วน + verify (typecheck + Playwright/preview) ทุกก้าว; ห้าม big-bang.
- คง `index.html` เป็น source ที่ live จนกว่า Phase 5; ทุกอย่างก่อนหน้าเป็น additive.
- ไม่ commit `node_modules/`, `dist/` (gitignored).
- อ่าน `EDIT_GUIDE.md`/`PROJECT_INDEX.md` หา anchor ก่อนย้ายโค้ดทุกครั้ง.

## คำสั่ง

```bash
npm install        # ครั้งแรก
npm run dev        # dev server + HMR ที่ :5173 (เสิร์ฟแอปเดิม)
npm run typecheck  # เช็ค type เฉพาะ src/
npm run build      # ⚠️ ยังไม่ใช้เป็น deploy — จะพร้อมหลัง monolith ย้ายครบ (Phase 5)
```
