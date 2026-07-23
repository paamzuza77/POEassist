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
- ✅ **state-module foundation (patch 0.70):** ยก constants `CAP`(75)/`PENALTY`(-40)/`RADAR_FRESH_HOURS`(2) →
  `src/lib/constants.ts` แล้วย้าย consumer ที่พึ่งแค่ constant/pure: `formatResValue` (→ `src/tabs/forge-format.ts`, ใช้ CAP)
  + `radarSignalInfo` (→ `src/tabs/radar-format.ts` — จริง ๆ **pure** อ่านแค่ reco arg แม้ notes เดิมจะเหมาก่อนกับ trio ที่พึ่ง
  radarData). `js/ea.js` bind 5 ชื่อจาก window.EA (บนสุด), ลบ def เดิมทั้งหมด. **byte-identical:** typecheck + Node harness
  บน `js/ea.js` จริง (16/16: constants, formatResValue over/at/under-cap+ลบ, radarSignalInfo ครบ 6 กลุ่ม+note ตรง) +
  browser integration (console clean boot+render, bare binding + window.EA.* ตรงค่า, forge stat `-40% → 75%`, radar 10 การ์ด).
  `constants.ts` = ฐานให้ scoring ที่พึ่ง constant ย้ายตามได้.
- ✅ **radar state helpers (patch 0.71):** ย้าย `radarSnapshotAgeHours` + `radarConfidenceInfo` (พึ่ง `radarData` mutable) →
  `src/tabs/radar-format.ts` โดย **ส่ง radarData เป็น argument** (`radarSnapshotAgeHours(radarData)`,
  `radarConfidenceInfo(rc, radarData)`); RADAR_FRESH_HOURS มาจาก constants (0.70). type ใหม่ `RadarSnapshot`/`RadarConfidence`.
  monolith bind 2 ชื่อ + 6 call site ส่ง radarData (renderRadar คำนวณ ageH inline เอง — ไม่แตะ). byte-identical: typecheck +
  Node 12/12 + browser (10 การ์ด/11 conf-badge, live ageH=0.63h, evidence→high/null→none). **radar presentation trio ครบใน src/ แล้ว.**
- ✅ **shop logic (patch 0.72):** ย้าย `isBought` + `rowEstPrice` (pure) + `shopBuyNextCandidates(shopRows)` →
  `src/tabs/shop-logic.ts` (type `ShopRow`). isBought/rowEstPrice pure → call site ไม่แตะ; shopBuyNextCandidates รับ
  shopRows เป็น arg (2 call site). TS tweak ผลเท่าเดิม: `Number(bool)` แทน boolean subtraction, `!` หลัง rowEstPrice
  (filter การันตี non-null). byte-identical: typecheck + Node 14/14 + browser (render + live queue order + data-path buy-next strip ถูก).
- ✅ **forge scoring (patch 0.73):** ย้าย `forgeTargetFor` + `computeForgeMissing` + `computeForgeReadiness` + `buildForgeRecos`
  (+ `forgeProgress` เป็น module-internal) → `src/tabs/forge-scoring.ts`. ส่ง `forgeTargets`/`STATS`/`filled`/`slotCount` เป็น arg
  (คง `STATS`/`EQUIP_SLOTS`/`slotHasAnyData` ใน monolith; เพิ่ม helper `forgeFilledSlots()` นับ filled ป้อนเข้า). 8 call site +
  type `ForgeTargets`/`StatDef`/`ForgeMissing`/`ForgeReadiness`/`ForgeReco`. byte-identical: typecheck + Node 14/14 (score=57 เป๊ะ,
  statuses/reco Thai texts) + browser (forge render score=20, breakdown/reco/statlist ถูก).
- **✅ Phase 4 logic migration ครบแล้ว (0.67–0.73)** — pure + mutable-state scoring ที่ระบุไว้ย้ายเข้า `src/` หมด: format/fuzzy/
  asset/ux (lib) + radar-scoring/radar-format + shop-logic + forge-scoring + constants. **เหลือแต่ DOM render + state management**
  ใน monolith (จะย้ายตอน Phase 5 endgame).
- ✅ **docs map pass (หลัง 0.73):** PROJECT_INDEX ได้ตาราง **"Source modules (`src/`)"** (แผนที่ logic→ไฟล์ + กฎ edit→build:bridge) +
  feature-map header P5 note + anchor radar/forge/shop ชี้ src/ · EDIT_GUIDE Analytics table + feature rows radar/forge/shop อัปเดต ·
  memory `nav-docs-accuracy` (กฎ: ย้าย/เพิ่ม/ลบ ต้องแก้ map ทุกครั้ง). **อ่าน PROJECT_INDEX ไฟล์เดียวรู้ว่า logic อยู่ src/ ไหน.**
- **งานถัดไป:** Phase 5 — **เริ่มแล้ว (patch 0.74: `vite build` ครบ + verify)**. ค้นพบว่า **ไม่ต้องย้าย monolith ก่อน** (Vite ไม่แตะ classic script). เหลือ: เพิ่ม `deploy-pages.yml` + ผู้ใช้สลับ Pages source เป็น "GitHub Actions" (ดู Phase 5 ด้านล่าง).
- **กติกา:** ย้ายเฉพาะ pure (input→output ไม่แตะ DOM/global) ก่อน; ที่พึ่ง state รอจนกว่า state/constants จะขึ้น bridge.

**Phase 5 — ตัด deploy มาที่ Vite build** — **เริ่มแล้ว (patch 0.74)**

> **ค้นพบสำคัญ (patch 0.74):** ข้อ 1 เดิม ("ต้องเคลียร์ monolith ก่อน") **ไม่จริง** — พิสูจน์ด้วยการรัน `vite build` จริง:
> Vite **ทิ้ง classic `<script>`** (inline monolith + `<script src="js/ea.js">`) ไว้เดิม (ไม่แปลงเป็น module → global scope
> คงอยู่ครบ; แค่ warn ว่า bundle ea.js ไม่ได้) และ bundle inline `<style>`+`css/*.css` → `dist/assets/*.css`. **Phase 5 จึง
> ไม่ต้องรอย้าย monolith 18k บรรทัด — ทำได้เลย.**

1. ✅ **`vite build` ครบ + verify (patch 0.74):** `vite.config.ts` เพิ่ม `closeBundle` plugin (Node fs, ไม่เพิ่ม dependency)
   copy static runtime asset ที่ Vite มองไม่เห็น (`js/ea.js` bridge, `data/`, `image/`, `background/`, `assets/icons`) เข้า `dist/`.
   verify ด้วย `vite preview`: ทุก asset HTTP 200, window.EA 42 keys, theme modern, radarData โหลด, radar 10 การ์ด, forge
   scoring bind (score 20), icon โหลด (naturalWidth>0), **console สะอาด**. `dist/` ยัง gitignored.
2. ✅ **สร้างแล้ว (patch 0.75):** `.github/workflows/deploy-pages.yml` — checkout → setup-node 20 → `npm ci` → `npm run build`
   → `actions/upload-pages-artifact` (path `dist`) → `actions/deploy-pages@v4` (permissions: pages write, id-token write;
   concurrency group `pages`). **เริ่มแบบ `workflow_dispatch` (manual) ก่อน** (push trigger comment ไว้) → ไม่มี run แดงก่อนสลับ
   setting. js/ea.js commit อยู่ใน repo แล้ว → checkout มีครบ; data/*.json สดจาก workflow เดิม. (`npm ci` ใช้ได้: lockfile tracked.)
3. ✅ **สลับแล้ว (2026-07-23):** ผู้ใช้เปลี่ยน Pages Source เป็น "GitHub Actions" (`build_type: workflow`) → รัน workflow manual
   ครั้งแรก **success** → **live (paamzuza77.github.io/POEassist) เสิร์ฟ Vite build แล้ว** (verify: hashed `assets/index-*.css`,
   window.EA 42 keys, theme modern, radarData โหลด, radar 10 การ์ด, forge bind, icon โหลด, console สะอาด). ไม่มีดาวน์ไทม์.
4. ✅ **push trigger เปิดแล้ว (patch 0.76):** push main ทุกครั้ง (รวม data update รายชม.) → auto build+deploy. data/*.json copy
   เข้า dist (ข้อ 1) → live data สด. ไม่มี loop (deploy job ไม่ commit อะไร); concurrency group `pages` คิว deploy ที่ทับกัน.

**🎉 Phase 5 เสร็จ — deploy ตัดมา Vite build / GitHub Actions ครบ end-to-end.** monolith + static-site คงเดิมทุกอย่าง (Vite ไม่แตะ
classic script). งาน P5 ที่เหลือเป็น **optional refinement** (ไม่รีบ/ไม่บังคับ): ทยอยย้าย DOM render + state ที่เหลือเข้า `src/` + i18n เต็มระบบ TH/EN.

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
