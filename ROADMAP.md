# ROADMAP.md — POEassist / Exile Assistant

Phase-level view only. Task-level detail lives in `TODO.md`; session history in `CHANGELOG.md`.

Master plan วางเมื่อ 2026-07-22 (patch 0.49) — เป้าหมายรวม: **สุดยอดเว็บผู้ช่วย PoE2 ส่วนตัว**
— ตอบ 3 คำถามให้เร็วที่สุดเสมอ: *ซื้ออะไรต่อ / แก้อะไรก่อน / ฟาร์มอะไรตอนนี้* — พร้อมความรู้สึก
"เว็บจากอนาคต": ติดตั้งเป็นแอปได้, ทำงานออฟไลน์, แจ้งเตือนได้, คุมทั้งเว็บด้วยคีย์บอร์ด

## Active Phase

### P0 — Maintenance & docs foundation (ongoing เสมอ)
Goal: 9 แท็บที่มีอยู่ทำงานถูกต้อง, data pipeline สดใหม่, docs แม่นพอให้ agent ทำงานต่อได้ปลอดภัย
Status: ongoing. Done ล่าสุด: Resistance Check redesign (0.48), Gear Check redesign (0.49).

### P1 — Instant QoL: เก็บของฟรีที่แรงที่สุดก่อน  ← **เฟสถัดไป**
หลักคิด: ของที่ "ใช้ทุกวัน" ต้องเร็วขึ้นก่อน ค่อยเพิ่มของใหม่
1. **Paste item text (Ctrl+C จากเกม)** — PoE2 กด Ctrl+C บนไอเทมแล้วได้ข้อความเต็ม:
   เพิ่มช่อง "วางข้อความไอเทม" ใน Resistance Checker (แม่นกว่า OCR มาก — OCR เก็บไว้เป็น fallback)
   และใน Gear Planner (เติมชื่อ/ช่อง/option ให้แถวอัตโนมัติ) — **ฟีเจอร์เดียวที่คุ้มสุดของทั้งแผน**
2. **⌘K Command Palette** — ต่อยอด search ของ 0.45 (`buildResults()`): เรียกด้วยคีย์บอร์ด, fuzzy match,
   สั่ง action ได้ (เพิ่มแถวเข้าช่อง / log farm run / สลับธีม / เปิด Settings หน้าใดหน้าหนึ่ง) + คีย์ลัดสลับแท็บ
3. **Price-this-item lookup** — ช่องค้นราคาไอเทมจาก snapshot `marketItems` ที่มีอยู่แล้ว (ไม่ fetch เพิ่ม)
4. **Housekeeping pass** — webp currency icons (ลด ~250KB first paint), ลบไฟล์ภาพซ้ำชื่อขยะ,
   README จริง, กวาด CSS ตาย (totals-panel/shop-layout ที่เหลือ), เคลียร์ `Index.md`, audit 480px จริง

### P2 — PWA: "เว็บจากอนาคต" ที่ติดตั้งได้
1. **PWA เต็มรูป** — manifest + service worker: ติดตั้งเป็นแอปบนมือถือ/เดสก์ท็อป, เปิดออฟไลน์ได้
   (shell + snapshot ล่าสุดถูก cache), ไอคอนแอปของตัวเอง — ยังเป็น static GitHub Pages 100%
2. **แจ้งเตือน (opt-in)** — Notification API: Stash Sale ใกล้เริ่ม, ลีคใกล้จบ, (ต่อยอด P4: price alert)
3. **ลูกเล่นล้ำ** — View Transitions API ตอนสลับแท็บ, skeleton shimmer ทุกจุดโหลด,
   micro-interaction เพิ่มเติม (เคารพ `prefers-reduced-motion` เสมอ)
4. **Mobile card pass** — ตาราง Gear Planner เป็นการ์ดใต้ ~700px (ของค้างเก่า — จบใน phase นี้)

### P3 — Build Doctor: แท็บเรือธงใหม่
1. MVP: วาง/import **character JSON** → วิเคราะห์แบบ rule-based ตรงไปตรงมา:
   จุดแข็ง/จุดอ่อน, res ที่ขาด (ผูกเป้ากับ Resistance Checker), Defense/Gear Quality Score,
   ลำดับของที่ควรอัปเกรดก่อน + คำเตือน "เป็นค่าประมาณ ไม่ใช่ DPS จริง" เสมอ
2. **สะพานเชื่อม 3 แท็บ** — ปุ่มเดียวส่งของที่ขาดเข้า Gear Planner เป็นแถวช้อปปิ้ง
   (รวมของค้าง: Missing-stat → Gear Planner bridge), จาก Farm/Codex สร้างการ์ดฟาร์มได้
3. ไม่ fetch ข้อมูลตัวละครอัตโนมัติจนกว่าจะมี proxy/official API ที่เหมาะสม (ความจริงต้องมาก่อน)

### P4 — Data & Insight: ให้เว็บ "รู้" มากขึ้น
1. **Price history + sparklines** — Actions เก็บจุดราคาย่อลงไฟล์เล็ก (`data/price-history.json`)
   → กราฟเทรนด์จิ๋วบนการ์ด Radar/lookup — เห็น "กำลังขึ้นจริงไหม" ไม่ใช่แค่ตัวเลขเดียว
2. **Watchlist + price alerts** — เฝ้าไอเทม "ต่ำกว่า X Div เมื่อไหร่บอก" (เช็คตอนเปิดเว็บ + แจ้งเตือน PWA)
3. **Farm analytics charts** — กราฟ Div/ชม. ต่อกลยุทธ์จากข้อมูล Run Tracker ที่เก็บอยู่แล้ว
4. เพิ่มหมวด poe.ninja, Content Codex refresh อัตโนมัติราย**สัปดาห์** (เคารพ rate limit), แก้ stub parsers

### P5 — Stack modernization: เปลี่ยนเครื่องยนต์ (แก้ boundary โดยตั้งใจ)
`index.html` ~16,700 บรรทัดแตะเพดานแล้ว — เฟสนี้ยกเครื่องเพื่อความเร็วในการพัฒนาระยะยาว:
1. **Vite + TypeScript** — แตกเป็นโมดูลต่อแท็บ, build ออกมาเป็น static เหมือนเดิม (Pages deploy ผ่าน Actions)
2. กติกาเหล็ก: **localStorage keys + สูตรทุกตัวห้ามเปลี่ยน**, migrate ทีละแท็บ, Playwright suite คุมทุกก้าว
3. **i18n เต็มระบบ TH/EN** ทั้งแอป (โครง `I18N` มีแล้ว — migrate ให้ครบ)
> เฟสนี้ยกเลิกกฎ "no build step" อย่างเป็นทางการเมื่อเริ่มทำ — ต้องยืนยันอีกครั้งก่อนเริ่ม

### P6 — Cloud (optional — ข้าม boundary "no backend", ทำเมื่อพร้อมเท่านั้น)
1. **Sync ข้ามเครื่อง** — ทางเลือกเบา: GitHub Gist ด้วย token ของผู้ใช้เอง / ทางเลือกเต็ม: worker เล็กๆ
2. **GGG OAuth** — ดึงตัวละคร/stash จริงอัตโนมัติเข้า Build Doctor + มูลค่า stash
> ต้องมี proxy/backend + นโยบาย token ที่ปลอดภัย — เป็นเฟสเดียวที่แตะกฎ "ข้อมูลไม่ออกจากเบราว์เซอร์"

## ตัด / ไม่ทำ (ตัดสินใจแล้ว)

- **ไม่คืนชีพ Divine Market tab** (ถอดไป 0.39 — mock data ไม่มีประโยชน์จริง)
- **Craft Simulator: ไม่ทำจนกว่าจะมีข้อมูล weight จริง** จาก poe2db — ไม่เดาเรทให้ผู้ใช้เข้าใจผิด
- ไม่ auto-link keyword ทั้ง 766 คำทั่ว DOM, ไม่ hotlink รูป wiki, ไม่ใช้ `logo.png` (เครื่องหมายการค้า)
- Farm Score ไม่มีวันเรียกว่า drop chance (กฎถาวร)

## Boundaries (แก้ได้เฉพาะเมื่อเริ่มเฟสที่ระบุ)

- Static GitHub Pages + localStorage + Actions-generated JSON — ยืนพื้นจนถึง P4
- **P5 เริ่มเมื่อไหร่**: อนุญาต build step (Vite/TS) แต่ output ยังเป็น static site
- **P6 เริ่มเมื่อไหร่**: อนุญาต backend เล็ก/OAuth — ก่อนหน้านั้นห้าม
- Frontend ไม่เรียก API ภายนอกตรงๆ (ผ่าน Actions → static JSON เท่านั้น) — คงไว้ทุกเฟส ยกเว้น P6 ส่วน OAuth
- ข้อมูลผู้ใช้อยู่ในเครื่อง ไม่ส่งไปไหน — คงไว้จนถึง P6 (และ P6 ต้อง opt-in ชัดเจน)
