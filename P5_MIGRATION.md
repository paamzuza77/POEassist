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

**Phase 2 — ย้าย helper บริสุทธิ์เป็น `src/` ผ่าน bridge `window.EA`** — **เริ่มแล้ว (patch 0.64)**
กลไก bridge (สำคัญ — เหตุผลว่าทำไมไม่ใช้ `<script type="module">`): ES module เป็น **deferred** รันหลัง
inline monolith (ซึ่งรันตอน parse) → monolith เรียก module ไม่ทัน. จึง build `src/main.ts` เป็น
**classic IIFE** (`js/ea.js`, ตั้ง `window.EA`) โหลด **ก่อน** inline script เหมือน `js/ux-foundation.js` →
monolith `const {…} = window.EA;` ที่ต้นสคริปต์ได้ทันเวลา parse.
- ✅ ทำแล้ว: `src/lib/format.ts` (formatDurationParts/fmtDuration/fmtNum, typed) → `src/main.ts` re-export
  → `vite.bridge.config.ts` build เป็น `js/ea.js` (IIFE, ไม่ minify, commit เข้า repo) → `<script src="js/ea.js">`
  ก่อน inline → ลบ 3 function เดิมออกจาก monolith, bind จาก `window.EA` ที่ต้นสคริปต์. verify: helper ทำงานตรงค่าเดิม,
  Exile Hub countdown + Gear/Farm (ใช้ fmtNum) ปกติ, ทุกแท็บโหลด, ไม่มี console error.
- **ขั้นถัดไป (ทำต่อ):** ย้าย pure helper อื่น ๆ เข้า `src/lib/*.ts` แล้ว re-export ใน `main.ts` →
  `npm run build:bridge` → bind ใน monolith (ลบ def เดิม). ผู้สมัคร: `fmtNum`-family (เสร็จ), number/round utils,
  slot/stat mappings ที่บริสุทธิ์, escape/format อื่น ๆ. **อย่าย้าย** helper ที่แตะ DOM/global state ในเฟสนี้ (รอ Phase 4).
- **workflow:** แก้ `src/` → `npm run build:bridge` → commit `js/ea.js` **คู่กับ** `src/`. (build artifact เดียวที่ commit —
  เพราะ live เสิร์ฟไฟล์ดิบ). `npm run typecheck` ต้องผ่านก่อน commit.

**Phase 3 — แปลง classic scripts เป็น modules ผ่าน bridge เดียวกัน** — **กำลังทำ**
- ✅ `js/asset-registry.js` → `src/lib/asset-registry.ts` (patch 0.65): พอร์ตตาราง + 3 ฟังก์ชัน + error-listener
  (side effect รันตอน ea.js โหลด) เป็น TS มี type; re-export ใน `main.ts` → build เข้า `js/ea.js`; ลบ
  `<script src="js/asset-registry.js">` + ไฟล์เดิม; monolith bind 6 symbol (GAME_ASSETS/ASSET_ALIASES/
  RADAR_ASSET_BY_KEY/normalizeAssetKey/getLocalAssetForName/renderAssetIcon) จาก window.EA. verify: ไอคอน
  render ทุกแท็บ (Gear 24/Radar 6/Codex/Farm), alias/normalize ถูก, error-listener ซ่อนรูปพังได้, typecheck ผ่าน.
- ✅ `js/ux-foundation.js` → `src/lib/ux-foundation.ts` (patch 0.66): พอร์ต toasts/states/micro เป็น TS มี type
  (ToastOpts/UxStateCfg ฯลฯ); expose 9 public helper (showToast family + uxEmptyState/uxSkeleton/uxFlash/uxBusy),
  internal (dismissToast/toastStackEl/TOAST_ICONS/toastByKey) เป็น module-private; ลบ `<script src="js/ux-foundation.js">`
  + ไฟล์เดิม; monolith bind 9 symbol จาก window.EA. verify: toast/key-replace/action-button/emptyState/skeleton/
  busy round-trip + real toast path + ทุกแท็บ + typecheck ผ่าน + ไม่มี console error.
- **Phase 3 เสร็จ** — `js/` เหลือแค่ `ea.js` (bridge). classic script ทั้ง 2 ย้ายเป็น TS หมดแล้ว.
  **ระวัง (คงไว้):** `css/asset-icons.css` + `css/ux-foundation.css` ยัง `<link>` แยก (เป็น CSS ไม่ย้ายเฟสนี้);
  `KWC_ASSET_IDS` + tooltip helpers (`initAcHelpTips`, Keyword Help Bridge) ยัง inline (coupled กับ state — รอ Phase 4).

**Phase 4 — ย้ายทีละแท็บ** — **เริ่มแล้ว**
- แนวทาง: ดึง **logic บริสุทธิ์ (สมองของแท็บ)** ออกเป็น `src/tabs/*.ts` ก่อน — DOM render ยังอยู่ monolith
  (module โหลดหลัง monolith เข้าถึง global ของ monolith ไม่ได้ตรง ๆ; ย้าย pure logic ปลอดภัยสุด).
- ✅ Market Radar scoring (patch 0.67): `radarItemScore` + `buildRadarRecos` → `src/tabs/radar-scoring.ts`
  (pure, typed: MarketItem/BucketMeta/RadarReco). **สูตร Farm Score byte-identical** — verify ด้วย known-value
  (scoreZero=0.2025 ตรงสูตร, low-liq spike penalty, evidence-first sort) + Radar render 10 การ์ด + ไม่มี console error.
- ✅ batch 2 (patch 0.68): `parseIso` (→format.ts), `cmdkFuzzyScore` (→`lib/fuzzy.ts`), `radarFmtValue`+`priceSparkline`
  (→`tabs/radar-format.ts`). ✅ batch 3 (patch 0.69): `kwHelpEsc`, `notifFmtAgo`, `acNum`, `acPct` (→format.ts).
  ทั้งหมด pure + typed + byte-identical, verify known-value + integration จริง.
- **ที่ข้ามเพราะพึ่ง global (ยังไม่ย้าย):** `radarSnapshotAgeHours`/`radarConfidenceInfo`/`radarSignalInfo` (radarData +
  RADAR_FRESH_HOURS), `formatResValue` (CAP), forge scoring `computeForgeReadiness`/`computeForgeMissing`
  (forgeTargets/PENALTY/CAP/EQUIP_SLOTS/slotHasAnyData), shop `rowEstPrice`/`shopBuyNextCandidates` (shopRows).
  **จะย้ายได้เมื่อ:** ยก constants (CAP/PENALTY/RADAR_FRESH_HOURS) + shared state ขึ้น src/ ก่อน (หรือส่งเข้าเป็น
  argument — แต่จะเปลี่ยน signature หลาย call site). เป็นงานก้อนถัดไปของ Phase 4 (state module).
- **กติกา:** ย้ายเฉพาะ pure (input→output ไม่แตะ DOM/global) ก่อน; ที่พึ่ง state รอจนกว่า state/constants จะขึ้น bridge.

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
