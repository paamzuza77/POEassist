# ROADMAP.md — POEassist / Exile Assistant

Phase-level view only. Task-level detail lives in `TODO.md`; session history in `CHANGELOG.md`.

Master plan วางเมื่อ 2026-07-22, ปรับตามผู้ใช้ 2026-07-23 — เป้าหมายรวม: **สุดยอดเว็บผู้ช่วย PoE2 ส่วนตัว (เดสก์ท็อปเว็บ)**
— ตอบ 3 คำถามให้เร็วที่สุดเสมอ: *ซื้ออะไรต่อ / แก้อะไรก่อน / ฟาร์มอะไรตอนนี้*

**คำตัดสินถาวรจากผู้ใช้ (2026-07-23):** ❌ **ไม่ทำ mobile app / PWA — ตัดถาวร ไม่ใช่การพัก**
(ห้ามคำนึงถึงตอน implement — ไม่มี manifest/service worker/install/offline/app icon;
คงไว้แค่สุขอนามัยพื้นฐานตาม `SKILL.md`: จอเล็กไม่พัง/ไม่ล้น แนวนอน scroll ได้ — แค่นั้น)

## Active Phase

### P0 — Maintenance & docs foundation (ongoing เสมอ)
Goal: 9 แท็บที่มีอยู่ทำงานถูกต้อง, data pipeline สดใหม่, docs แม่นพอให้ agent ทำงานต่อได้ปลอดภัย
Status: ongoing. Done ล่าสุด: Resistance Check redesign (0.48), Gear Check redesign (0.49).

### P1 — Instant QoL: เก็บของฟรีที่แรงที่สุดก่อน  ← **เฟสถัดไป**
1. **Ctrl+V อัจฉริยะ (ช่องทางเดียว รู้เองว่าวางอะไร)** — PoE2 กด Ctrl+C บนไอเทมได้ข้อความเต็ม:
   ที่จุด paste เดิมของ Resistance Checker ถ้า clipboard เป็น **text** → เข้า parser ข้อความ (แม่นกว่า OCR มาก),
   ถ้าเป็น**รูป** → เข้า OCR เหมือนเดิมทุกอย่าง — ผู้ใช้ไม่ต้องเลือกโหมดเอง; Gear Planner ได้ช่องวางข้อความ
   สร้าง/เติมแถวอัตโนมัติ (ชื่อ/ช่อง/option)
2. **⌘K Command Palette** — ต่อยอด search ของ 0.45 (`buildResults()`): เรียกด้วยคีย์บอร์ด, fuzzy match,
   สั่ง action ได้ (เพิ่มแถวเข้าช่อง / log farm run / สลับธีม / เปิด Settings) + คีย์ลัดสลับแท็บ
3. **Price-this-item lookup** — ช่องค้นราคาไอเทมจาก snapshot `marketItems` ที่มีอยู่แล้ว (ไม่ fetch เพิ่ม)
4. **Housekeeping pass** — webp currency icons (ลด ~250KB first paint), ลบไฟล์ภาพซ้ำชื่อขยะ,
   README จริง, กวาด CSS ตาย (totals-panel/shop-layout ที่เหลือ), เคลียร์ `Index.md`

### P2 — Build Profiles + ความปลอดภัยข้อมูล (desktop QoL)
1. **Build Profiles (หลายบิลด์)** — โปรไฟล์สลับได้ทั้งแอป: Gear Planner หลายลิสต์ (ตอนนี้มีลิสต์เดียว),
   ผูกกับ preset ของ Resistance Checker + ตั้งชื่อ preset ได้ (ของค้างเดิม) — เล่นหลายบิลด์/หลายลีคไม่ตีกัน
2. **Trash + Undo** — ลบแถว/การ์ดแล้วเข้าถังขยะกู้คืนได้ (soft-delete) แทนการหายถาวร + undo action ล่าสุด
3. **Auto-backup กันข้อมูลหาย** — localStorage เปราะ: เตือน/ดาวน์โหลด backup อัตโนมัติเป็นระยะ,
   สแนปช็อตล่าสุดเก็บซ้อนไว้ในเครื่อง กู้เองได้หนึ่งชั้นก่อนต้องพึ่งไฟล์
4. **ลูกเล่นล้ำ (เว็บล้วน ไม่ใช่ PWA)** — View Transitions API ตอนสลับแท็บ, skeleton shimmer ทุกจุดโหลด,
   แจ้งเตือน**ในหน้า** (toast) เมื่อ Stash Sale ใกล้เริ่มขณะเปิดเว็บอยู่ (เคารพ `prefers-reduced-motion`)

### P3 — Play-session tools: เครื่องมือระหว่างเล่นจริง
1. **Live Farm Session** — โหมดจับเวลาสดใน Farm Planner: start/stop, นับแมพ, จดของหลุดเร็วๆ,
   Div/ชม. คำนวณสดระหว่างเล่น (ต่อยอด Run Tracker ที่มีอยู่ — ไม่มีสูตรเดาใหม่)
2. **League Checklist** — เช็คลิสต์รางวัลถาวรของแคมเปญที่ห้ามพลาด (quest res/spirit ฯลฯ) ต่อ 1 ตัวละคร
   + เช็คลิสต์ day-1 ต้นลีค — ข้อมูล static + ติ๊กเก็บใน localStorage
3. **New League Mode** — ปุ่มเดียว: อาร์ไคฟ์แผน/การ์ดของลีคเก่าแล้วเริ่มลีคใหม่สะอาดๆ (ข้อมูลเก่าไม่หาย ดูย้อนได้)

### P4 — Market intelligence: ให้เว็บ "รู้" มากขึ้น
1. **Price history + sparklines** — Actions เก็บจุดราคาย่อ (`data/price-history.json`) → กราฟเทรนด์จิ๋ว
   บนการ์ด Radar/price lookup — เห็นว่า "ขึ้นจริงไหม" ไม่ใช่ตัวเลขเดียว
2. **Watchlist + in-page alerts** — เฝ้าไอเทม "ต่ำกว่า X Div เมื่อไหร่บอก" (เช็คตอนเปิดเว็บ/รีเฟรช snapshot)
3. **Loot-filter snippet generator** — สร้างกฎ filter จากราคาตลาดจริง (ของ ≥ X Div = เน้น) ให้ก็อป/ดาวน์โหลด
4. **Trade link builder** — ปุ่มสร้างลิงก์ค้น trade2 จากแถว Gear Planner (ต้องตรวจ URL format จริงก่อนทำ)
5. เพิ่มหมวด poe.ninja, Content Codex refresh ราย**สัปดาห์**ใน Actions, แก้ stub parsers

### P5 — Stack modernization: เปลี่ยนเครื่องยนต์ (แก้ boundary โดยตั้งใจ)
`index.html` ~16,700 บรรทัดแตะเพดานแล้ว:
1. **Vite + TypeScript** — แตกเป็นโมดูลต่อแท็บ, build ออกมาเป็น static เหมือนเดิม (Pages deploy ผ่าน Actions)
2. กติกาเหล็ก: **localStorage keys + สูตรทุกตัวห้ามเปลี่ยน**, migrate ทีละแท็บ, Playwright คุมทุกก้าว
3. **i18n เต็มระบบ TH/EN** ทั้งแอป (โครง `I18N` มีแล้ว — migrate ให้ครบ)
> เฟสนี้ยกเลิกกฎ "no build step" อย่างเป็นทางการเมื่อเริ่มทำ — ต้องยืนยันอีกครั้งก่อนเริ่ม

### P6 — Cloud + API/Tracker (optional — ข้าม boundary "no backend", ทำเมื่อพร้อมเท่านั้น)
1. **Sync ข้ามเครื่อง** — ทางเลือกเบา: GitHub Gist token ของผู้ใช้เอง / ทางเลือกเต็ม: worker เล็กๆ
2. **GGG OAuth** — ดึงตัวละคร/stash จริงอัตโนมัติ + มูลค่า stash (ถ้าฟื้น Build Doctor จะกลับมาที่เฟสนี้)
3. **Farm tracker ระหว่างเล่นจริง** — อ่าน `Client.txt` (ต้องมี desktop companion; เว็บอ่านไฟล์สดไม่ได้) →
   จับเวลา/นับแมพ/ตาย ต่อยอด Run Tracker; loot ต่อแมพต้องรอ PoE2 stash API เปิด
> ต้องมี proxy/backend + นโยบาย token ปลอดภัย — เฟสเดียวที่แตะกฎ "ข้อมูลไม่ออกจากเบราว์เซอร์"
> **📄 อ่าน `POE2_API_RESEARCH.md` ก่อนเริ่ม** — สรุปว่า API PoE2 ตัวไหนดึงได้ (character/league/currency ✅,
> stash ❌ ยังไม่เปิด), ข้อจำกัด OAuth, และแผน 3 เฟส (A: OAuth import · B: Client.txt tracker · C: loot diff รอ GGG).

## พักไว้ (ผู้ใช้สั่งพัก — ไม่ใช่ตัดถาวร)

- **Build Doctor** (พัก 2026-07-23) — สเปคเต็มอยู่ใน `SKILL.md`; ถ้าฟื้น ให้พิจารณาคู่กับ P6 (OAuth ดึงตัวละครจริง)

## ตัด / ไม่ทำ (ตัดสินใจแล้ว — ถาวร)

- **Mobile app / PWA ทุกรูปแบบ** (ผู้ใช้ตัดถาวร 2026-07-23 — ไม่ต้องคำนึงถึงตอน implement)
- **ไม่คืนชีพ Divine Market tab** (ถอดไป 0.39 — mock data ไม่มีประโยชน์จริง)
- **Craft Simulator: ไม่ทำจนกว่าจะมีข้อมูล weight จริง** จาก poe2db — ไม่เดาเรทให้ผู้ใช้เข้าใจผิด
- ไม่ auto-link keyword ทั้ง 766 คำทั่ว DOM, ไม่ hotlink รูป wiki, ไม่ใช้ `logo.png` (เครื่องหมายการค้า)
- Farm Score ไม่มีวันเรียกว่า drop chance (กฎถาวร)

## Boundaries (แก้ได้เฉพาะเมื่อเริ่มเฟสที่ระบุ)

- Static GitHub Pages + localStorage + Actions-generated JSON — ยืนพื้นจนถึง P4
- **No mobile app/PWA — ถาวร** (ดูคำตัดสินด้านบน)
- **P5 เริ่มเมื่อไหร่**: อนุญาต build step (Vite/TS) แต่ output ยังเป็น static site
- **P6 เริ่มเมื่อไหร่**: อนุญาต backend เล็ก/OAuth — ก่อนหน้านั้นห้าม
- Frontend ไม่เรียก API ภายนอกตรงๆ (ผ่าน Actions → static JSON เท่านั้น) — คงไว้ทุกเฟส ยกเว้น P6 ส่วน OAuth
- ข้อมูลผู้ใช้อยู่ในเครื่อง ไม่ส่งไปไหน — คงไว้จนถึง P6 (และ P6 ต้อง opt-in ชัดเจน)
