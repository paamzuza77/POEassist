# LIVE_TRACKER_PLAN.md — Live Farm Session Tracker (แบบ dillapoe2stat และดีกว่า)

> เอกสารแผนดำเนินการละเอียด (research + architecture + roadmap) — เขียน 2026-07-23 ตามคำสั่งผู้ใช้:
> ศึกษา **dillapoe2stat** (ตัวอย่างที่ใช้ได้จริง) + **poe.ninja PoE2 ทุกหมวด** แล้ววางแผนสร้าง
> Live Farm Session tracker ของเราให้ **"ใช้งานได้จริง และดีกว่าหรือเท่ากับของเขา"**
> Reference screenshots อยู่ที่ `docs/ref-tracker/` (dillapoe2stat_*.png)
> เอกสารพี่น้อง: `POE2_API_RESEARCH.md` (API ทางการ GGG — อ่านคู่กัน)

---

## 0. TL;DR

| คำถาม | คำตอบ |
|---|---|
| dillapoe2stat ทำอะไรได้ | นับแมพอัตโนมัติจาก Client.txt + **diff ของใน inventory ก่อน/หลังแมพ** ผ่าน GGG API (OAuth 2.1) → ตีราคาด้วย poe.ninja → มูลค่า loot ต่อแมพ + สถิติ session + OBS overlay + Windows toast + วิเคราะห์ waystone modifier |
| ทำไมเขา "หยุด" | **เขาไม่ได้หยุดพัฒนา** (227 commits, active ถึง Oct 2025, v0.4.0) — แต่ **GGG ปิด inventory API access** ทำให้ loot tracking ตายทั้งระบบ รอ GGG เปิดคืน |
| เราทำตามได้เลยไหม | **บางส่วนได้ทันที** (นับแมพ/เวลา/สถิติจาก Client.txt — ไม่พึ่ง GGG API), **ส่วน loot diff อัตโนมัติติดกำแพงเดียวกับเขา** จนกว่า GGG จะเปิด API คืน — มีแผสำรอง (จด loot กึ่ง-manual ที่เร็วมากด้วยราคาครบทุกหมวด) |
| แผน | 3 เฟส: **A** = เว็บล้วน (ทำได้เลย) · **B** = desktop companion อ่าน Client.txt (นับแมพอัตโนมัติ) · **C** = loot diff อัตโนมัติ (รอ/เช็ค GGG API) + ขยายราคา poe.ninja ให้ครบทุกหมวดตั้งแต่เฟส A |
| License ของเขา | MIT — ศึกษา/ต่อยอดแนวคิดได้อิสระ (ถ้า copy โค้ดจริงต้องเก็บ notice) |

---

## 1. บทเรียนจาก dillapoe2stat (ศึกษาจาก repo + wiki + screenshots)

Repo: https://github.com/DoofDilla/dillapoe2stat · Wiki: /wiki · MIT License · Python 3.10+ · Windows

### 1.1 สถาปัตยกรรม (จาก README-TECHNICAL + module list)

```
Client.txt (game log) ──tail──▶ poe_stats_refactored_v2.py (main loop)
                                   │  zone change detected → auto map start/stop
GGG API (OAuth 2.1) ◀──REST──────┤  F2 = PRE inventory snapshot
  /character inventory            │  F3 = POST snapshot → diff = loot!
                                   │
poe.ninja API ◀──cache───────────┤  ตีราคา loot (Chaos/Ex/Div)
                                   │
                                   ├──▶ obs_web_server.py (Flask :5000) → OBS Browser Source
                                   ├──▶ notification_manager.py → Windows toast
                                   └──▶ session_analyzer.py / run_analyzer.py → สถิติย้อนหลัง
```

- **ภาษา/ไลบรารี:** Python, `keyboard` (global hotkeys), Flask (overlay server), Windows toasts
- **Loot detection:** ใช้ **character inventory endpoint** ของ API ทางการ (OAuth 2.1 — ไม่ใช่ POESESSID,
  ไม่ใช่ stash) — "Zone changes refresh inventory" คือ trick: ข้อมูล inventory ฝั่ง API อัปเดตเมื่อเปลี่ยนโซน
  → PRE ก่อนเข้าแมพ / POST หลังออก (เข้า hideout) → ของที่งอกใน inventory = loot จากแมพนั้น
- **Pricing:** poe.ninja หมวด Currency, Catalysts, Waystones, Fragments, Runes, Gems + `manual_prices.json`
  (ราคา override เอง) + cache + "item rarity detection via icon color analysis"
- **Hotkeys:** F2 PRE / F3 POST / F5 inventory check / F6 new session / F7 session stats / F8 output mode /
  Ctrl+F2 waystone analysis / F9 OBS server
- **ไฟล์หลัก:** `poe_stats_refactored_v2.py`, `poe_api.py`, `price_check_poe2.py`, `session_analyzer.py`,
  `run_analyzer.py`, `obs_web_server.py`, `notification_manager.py`, `hotkey_manager.py`, `auto_map_detector.py`

### 1.2 ฟีเจอร์ที่เห็นจาก screenshots (docs/ref-tracker/)

| Screenshot | ฟีเจอร์ |
|---|---|
| `dillapoe2stat_startup.png` | config summary (char, Client.txt path, API rate limit 2.5s, Gear Rarity 93%), hotkey list, session ID |
| `dillapoe2stat_run_with_toast.png` | ตาราง Valuable Loot ต่อแมพ (Item/Qty/Category/Chaos/Exalted), Net Value, SESSION PROGRESS (เวลา session, จำนวนแมพ, มูลค่ารวม, Avg/Map, Avg Time), Windows toast "Map Completed!" |
| `dillapoe2stat_analysis_1.png` | **Advanced Run Analysis**: โหลด runs ย้อนหลัง 127 ครั้ง → **Waystone Modifier Impact** (Item Rarity / Magic Monsters / Rare Monsters / Waystone Drop Chance เป็นช่วง % → exalted + exalted/min ต่อ bucket) + **Map Efficiency** (top maps เรียงตาม exalted/min) |
| `dillapoe2stat_obs_overlay_session.png` | OBS overlay ที่ `localhost:5000/obs/session_stats` — Maps / Exalted รวม / เวลา (Flask เสิร์ฟ HTML ให้ OBS Browser Source) |
| `dillapoe2stat_obs_overlay_loot.png` | overlay รายการ loot ล่าสุด |
| `dillapoe2stat_windows_toast.png` | Windows toast แจ้งจบแมพ + มูลค่า |

### 1.3 ทำไมมันตาย (ข้อเท็จจริงสำคัญที่สุดของเอกสารนี้)

README ประกาศ: **"currently not working — GGG has disabled inventory API access"** —
ฟีเจอร์หัวใจ (loot diff) พึ่ง character inventory endpoint ซึ่ง GGG ปิดไป (~ปลาย 2025)
สอดคล้องกับ `POE2_API_RESEARCH.md` §2 ที่บันทึกว่า PoE2 API มีจำกัด (character ✅ แต่ inventory
ที่ละเอียดพอสำหรับ diff ถูกจำกัดภายหลัง; stash ❌ มาตลอด)

**นัยต่อแผนเรา:**
1. ส่วน **Client.txt (นับแมพ/เวลา/ตาย) ไม่พึ่ง GGG API** → ทำได้เสมอ ไม่มีวันโดนปิด — นี่คือแกนที่มั่นคง
2. ส่วน **loot diff อัตโนมัติ = ติดกำแพงเดียวกับเขา** — ก่อนเริ่มเฟส C ต้องเช็คสดว่า GGG เปิด
   inventory/stash API PoE2 คืนหรือยัง (pathofexile.com/developer/docs — สถานะ ณ 2026-07-23: ยังไม่มีข่าวเปิดคืน)
3. เพราะงั้นความ "ดีกว่าของเขา" ที่ทำได้จริงวันนี้คือ: **สถิติแมพอัตโนมัติ (เท่าเขา) + จด loot กึ่ง-manual
   ที่เร็วที่สุดเท่าที่ UI ทำได้ (เขาไม่มี — เขา auto อย่างเดียว พอ API ปิดคือศูนย์) + ราคาครบทุกหมวด +
   ผูกเข้ากับ Farm Planner/Market Radar ที่เรามีอยู่แล้ว** — และพร้อมเสียบ auto-diff ทันทีที่ GGG เปิด

---

## 2. Feature matrix — เขา vs เราปัจจุบัน vs เป้าหมาย

| ฟีเจอร์ | dillapoe2stat | เราตอนนี้ | เป้า (เฟส) |
|---|---|---|---|
| นับแมพ + เวลาอัตโนมัติ (Client.txt) | ✅ | ❌ | ✅ B |
| จับเวลา session / สถิติสด | ✅ | ❌ (Run Tracker = จดหลังเล่น) | ✅ A (manual) → B (auto) |
| Loot ต่อแมพ + ตีราคา | ✅ (ตาย เพราะ API) | ❌ | ⚠️ A/B แบบเร็ว-กึ่ง-manual → C auto (รอ GGG) |
| ราคา poe.ninja | 6 หมวด + manual override | 11 หมวด (≥1 Div เท่านั้น) | ✅ A: **ทุกหมวด ทุกชิ้น** (~22 หมวด) |
| Div/hr, Avg/Map, Best/Worst | ✅ | ✅ บางส่วน (Run Tracker หลังเล่น) | ✅ A |
| Waystone modifier impact analysis | ✅ | ❌ | ✅ B/C (ต้องมีข้อมูล waystone ต่อ run) |
| OBS overlay | ✅ (Flask :5000) | ❌ | ✅ B (companion เสิร์ฟ) — ⭐ optional |
| Toast แจ้งเตือน | ✅ Windows | ✅ ในเว็บ (showToast) | ✅ A |
| ประวัติ session ย้อนหลัง + วิเคราะห์ | ✅ (session_analyzer) | ✅ บางส่วน (Run Tracker analytics) | ✅ A ต่อยอดของเดิม |
| ผูกกับ market radar / farm score | ❌ | ✅ มีอยู่แล้ว | ⭐ จุดที่เราชนะขาด |
| ทำงานบนเว็บ ไม่ต้องติดตั้ง | ❌ (Python + config) | ✅ | ⭐ เฟส A ไม่ต้องติดตั้งอะไรเลย |

---

## 3. สถาปัตยกรรม 3 เฟส

### เฟส A — เว็บล้วน "Live Farm Session" (ทำได้ทันที ไม่แตะ boundary ใด)

ต่อยอด Farm Planner (Run Tracker เดิม) — ตรงกับ P3 ใน `ROADMAP.md` ที่ผู้ใช้สั่งปลุกแล้ว:

1. **Session mode ใน Farm Planner:** ปุ่ม "▶ เริ่ม Live Session" บนการ์ดฟาร์ม →
   - จับเวลาสด (elapsed), ปุ่มใหญ่ "จบแมพ" (นับแมพ + เวลา/แมพอัตโนมัติจากตอนกด)
   - แถว "จดของด่วน": ช่อง search พิมพ์ชื่อไอเทม → autocomplete จาก **ราคาครบทุกหมวด** (ดู §4)
     → กด Enter = ลง loot log พร้อมราคา ณ ตอนนั้น (แก้ qty ได้) — **เป้า: จดของ 1 ชิ้น < 3 วินาที**
   - แผงสด: มูลค่ารวม session, Div/hr (คำนวณสดทุกวินาที), Avg/Map, แมพล่าสุด vs เฉลี่ย
   - จบ session → เขียนกลับเป็น run rows ของ Run Tracker เดิม (`runTrackerRows` — additive,
     สูตร analytics เดิมใช้ต่อได้ทันที) + สรุป session + ⧉ copy
2. **Storage (additive ทั้งหมด):** key ใหม่ `poe2LiveSession.v1` = session ปัจจุบัน (กัน refresh/ปิดแท็บ —
   กู้ session ค้างได้), ประวัติ session เก็บใน key เดิมของ Run Tracker + field `sessionId` additive
3. **แจ้งเตือน:** `showToast` + `pushNotification` ที่มีอยู่ (จบแมพ/สถิติ) — ไม่มี OS toast ในเฟสนี้
4. **กฎเดิมที่คงไว้:** ไม่มีสูตรเดา, หน่วยผสมไม่แปลง, Farm Score ไม่เรียกว่า drop chance

### เฟส B — Desktop companion "poe2-session-bridge" (นับแมพอัตโนมัติ = เท่า dilla)

> แตะ boundary "static only" — แต่**เว็บยัง static เหมือนเดิม** companion เป็นโปรแกรมเสริมที่ผู้ใช้รันเอง
> (ตามที่ `POE2_API_RESEARCH.md` §5 เฟส B วางไว้แล้ว) — ผู้ใช้อนุมัติแนวทางนี้เมื่อสั่งงานนี้

1. **รูปแบบ:** สคริปต์เดี่ยวรันในเครื่อง (เสนอ **Node single-file** — เราใช้ Node ในโปรเจกต์อยู่แล้ว
   ผู้ใช้มี Node; Python แบบ dilla ก็ได้ถ้าจะ port ตรง) — `node poe2-bridge.mjs` จบ ไม่ต้องติดตั้งอะไรเพิ่ม
2. **หน้าที่:**
   - tail `Client.txt` (handle truncate-to-0 + file lock ตาม gotchas ใน `POE2_API_RESEARCH.md` §1)
   - regex จับ zone enter/exit → map start/stop อัตโนมัติ, นับตาย, ชื่อแมพ
   - เสิร์ฟ `http://localhost:8123` : `GET /events` (SSE stream) + `GET /state` (JSON) +
     `GET /obs/session` (หน้า overlay สำหรับ OBS — แบบเดียวกับ dilla :5000)
   - **CORS จำกัด origin:** `Access-Control-Allow-Origin: https://paamzuza77.github.io` (+ localhost dev)
   - หมายเหตุ browser: HTTPS page → `http://localhost` fetch ได้ (localhost = potentially trustworthy
     origin, ไม่ติด mixed content ใน Chrome/Edge/Firefox ปัจจุบัน) — pattern เดียวกับ overlay tools อื่น
3. **ฝั่งเว็บ:** แท็บ Live Session เพิ่มสถานะ "🔌 เชื่อม companion" — ถ้าต่อได้: แมพ start/stop เอง,
   เวลาแมพแม่น, ชื่อแมพอัตโนมัติ; ต่อไม่ได้: ตกกลับเป็นโหมด manual เฟส A ทุกอย่าง (graceful)
4. **แจกยังไง:** ไฟล์เดียวใน repo (`companion/poe2-bridge.mjs`) + คู่มือใน docs — ไม่มี installer,
   ไม่มี auto-update, โค้ดอ่านได้ทั้งไฟล์ (โปร่งใสเรื่องความปลอดภัย)

### เฟส C — Loot diff อัตโนมัติ (รอ/เช็ค GGG API — กำแพงเดียวกับ dilla)

1. **เงื่อนไขเริ่ม:** เช็ค developer docs สด — ถ้า GGG เปิด character inventory (หรือ stash PoE2) คืน:
   - ทางหลัก: companion ทำ OAuth (public client + PKCE ถ้า GGG อนุญาต desktop app แบบ dilla v0.4)
     → PRE/POST snapshot ที่ zone change (rate limit ~2.5s/req แบบ dilla) → diff → ส่งเข้าเว็บผ่าน SSE
   - ตีราคา: ใช้ **data/market-prices.json ของเราเอง** (ครบทุกหมวดจาก §4) — ไม่ยิง poe.ninja สดจากเครื่องผู้ใช้
2. ถ้า GGG ไม่เปิด: เฟส A/B ยังให้ค่าเกือบทั้งหมด (แมพ/เวลา/Div/hr อัตโนมัติ + จดของเร็ว) — **ไม่ block**
3. Waystone modifier impact analysis (แบบ dilla): ทำได้เมื่อมีข้อมูล waystone ต่อ run —
   เฟส B ให้จดโมดิไฟเออร์ waystone ตอนเริ่มแมพ (กึ่ง-manual) หรือเฟส C อ่านจาก inventory ก่อนเข้า

---

## 4. ขยายราคา poe.ninja ให้ "ครบทุกหมวด ทุกชิ้น" (คำสั่งข้อ 2 ของงานนี้ — ทำในเฟส A)

### 4.1 สิ่งที่พบจากการ probe จริง (2026-07-23, ลีค Runes of Aldur) — ✅ ยืนยันจาก network จริงแล้ว

- Endpoint เดิมใช้ต่อได้: `index-state` → `version` → `/poe2/api/economy/exchange/{version}/overview?league={display}&type={Type}`
  (หน้าเว็บใช้ `current` แทน version ได้ด้วย)
- **หมวดที่มีข้อมูลจริงในลีคปัจจุบัน = 14 type** (ครอบ sidebar หน้าเว็บครบ 100%):
  11 เดิมของ script (Currency, Fragments, Abyss, Runes, Ritual, Delirium, Breach, SoulCores, Essences,
  Expedition, Verisium) + 3 ใหม่: **`UncutGems` (42), `Idols` (32), `LineageSupportGems` (75)**
- **Mapping sidebar → type ที่ไม่ตรงตัว (ยืนยันจาก network request ของหน้า poe.ninja):**
  "Omens" → `type=Ritual` (Omens เป็น subset ของ Ritual — มีอยู่แล้ว!) · "Abyssal Bones" → `Abyss` ·
  "Uncut Gems" → `UncutGems` · "Lineage Gems" → `LineageSupportGems` · "Idols" → `Idols`
- ชื่ออื่นที่ลอง (`Catalysts`/`Waystones`/`Talismans`/`Gems`/`Distilled`/`Artifacts`/`Logbooks`/
  `LiquidEmotions`/`Tablets`) = API ตอบโครงว่าง (0 items) ในลีคนี้ — เก็บเป็น candidate ให้ script probe
  ทุกงวด (ลีคหน้ามีของก็ติดมาอัตโนมัติ)
- **บทเรียน probe:** เช็คว่า "หมวดมีจริง" ต้องนับ `lines[].length` — เช็คแค่โครง response หลอกได้
  (ทุก type คืน 200 + โครงเต็มเสมอ แม้หมวดไม่มีของ)

### 4.2 แผนแก้ `scripts/update-market-radar.mjs`

1. **แยก output เป็น 2 ไฟล์** (ไม่แตะของเดิม — additive):
   - `data/market-radar.json` — เหมือนเดิมทุกอย่าง (scoring pipeline, เกณฑ์ ≥1 Div) → **สูตร/пайп ไม่เปลี่ยน**
   - `data/market-prices.json` — **ใหม่**: ทุกหมวด ทุกไอเทม ไม่มีเกณฑ์ขั้นต่ำ, ต่อไอเทมเก็บ
     `{id, name, icon, category, valueDiv, valueEx, valueChaos, trend7d, volume}` — ใช้โดย price lookup /
     Live Session quick-log / (อนาคต) companion
2. **CATEGORIES → CANDIDATE_CATEGORIES:** รวมชื่อยืนยันแล้ว ~22 ชื่อ + ชื่อที่สงสัย — script ยิงทีละหมวด
   หมวดไหน `lines`/`items` ว่างก็ log ลง `skippedCategories[]` (ไม่ fail) → หมวดใหม่ในลีคหน้าถูกเก็บอัตโนมัติ
3. **Rate/มารยาท:** ยิงตามลำดับ (ไม่ parallel ถล่ม), User-Agent เดิม, รันในตาราง Actions รายชั่วโมงเดิม
4. **ขนาดไฟล์:** ประเมิน ~22 หมวด × โดยเฉลี่ย ~30-80 items → หลักพัน items, JSON ~เมกะไบต์ต้น ๆ —
   ยอมรับได้ (โหลด lazy เฉพาะตอนใช้ price lookup/Live Session, ไม่โหลดตอน boot)
5. **price-history.json:** คงเกณฑ์เดิมไว้ก่อน (กันไฟล์โต) — ถ้าอยากได้ history ทุกชิ้นค่อยตัดสินใจแยก
6. Frontend price lookup (`เช็คราคา` ใน Market Radar) เปลี่ยน source → `market-prices.json` (ครบทุกชิ้น)
   — Watchlist/sparkline เดิมยังใช้ได้ (id เดียวกัน)

---

## 5. Data model (เฟส A — additive ทั้งหมด, ห้ามแตะ key/สูตรเดิม)

```js
// key ใหม่: poe2LiveSession.v1  (APP_DATA_KEYS ✅ / UI_PREF_KEYS ❌)
{
  active: true,
  cardId: '<farm card id>',        // ผูกกับการ์ด Farm Planner (optional)
  startedAt: '2026-07-23T12:00:00Z',
  maps: [                           // ต่อแมพ
    { n: 1, startedAt, endedAt, name: '',          // ชื่อแมพ (เฟส B: อัตโนมัติ)
      loot: [ { name, qty, unit: 'div'|'ex'|'chaos', unitValue, category } ],
      note: '' }
  ],
  currentMapStartedAt: null,        // แมพที่กำลังรันอยู่ (null = ยังไม่เริ่มแมพ)
}
// จบ session → แปลงเป็น runTrackerRows เดิมของการ์ด (+ field sessionId additive) แล้วล้าง key นี้
```

UI สเปคละเอียด (ปุ่ม/แผง/microcopy) → เขียนตอน implement เฟส A โดยยึด `SKILL.md` conventions
(link chips, soft-delete+undo, ไม่มีสูตรเดา, TH เป็นหลัก)

---

## 6. Roadmap + ลำดับงาน (ผูกกับ ROADMAP.md)

| งาน | เฟส | ขนาด | เงื่อนไข |
|---|---|---|---|
| A1. ขยาย poe.ninja ครบทุกหมวด → `market-prices.json` | A | ✅ **เสร็จ 2026-07-23** | 634 items / 14 หมวดจริง / 197KB / radar scoring ไม่กระทบ |
| A2. Live Farm Session (เว็บล้วน) ใน Farm Planner | A | M-L | ใช้ A1 |
| A3. price lookup เปลี่ยน source เป็น market-prices | A | ✅ **เสร็จ 2026-07-23 (patch 0.78)** | ค้น+watchlist เห็นครบ 634 ชิ้น (lazy load + fallback radar) |
| B1. companion `poe2-bridge.mjs` (Client.txt → SSE localhost) | B | M | user รัน Node เอง |
| B2. เว็บต่อ companion (auto map events + fallback manual) | B | S-M | หลัง B1 |
| B3. OBS overlay endpoint ใน companion | B | S | optional |
| C1. เช็คสถานะ GGG inventory API + OAuth desktop flow | C | ? | **ติดกำแพง GGG — เช็คก่อนเริ่มทุกครั้ง** |
| C2. PRE/POST loot diff อัตโนมัติ | C | M | หลัง C1 เปิด |
| C3. Waystone modifier impact analysis | B/C | M | มีข้อมูล waystone ต่อ run |

- **ROADMAP.md:** P3 (Live Farm Session) = เฟส A — เปลี่ยนจาก "พักไว้" เป็น active ตามคำสั่งนี้
- เฟส B/C คือ P6 บางส่วน (desktop companion / OAuth) — ผู้ใช้อนุมัติทิศทางแล้วในคำสั่งนี้ แต่**เริ่ม
  implement เฟส B เมื่อเฟส A เสร็จ**; เฟส C ติดเงื่อนไข GGG เสมอ

## 7. ความเสี่ยง / คำถามเปิด

1. **GGG API (เฟส C):** ปิดอยู่ ณ วันเขียน — ห้าม promise ฟีเจอร์ loot อัตโนมัติจนกว่าเช็คสดแล้วเปิดจริง
2. **poe.ninja เปลี่ยนโครง API ได้ทุกเมื่อ** (เคยระบุใน script เดิมแล้ว) — probe + `errors[]` ช่วยให้ไม่ล้มทั้งระบบ
3. **ขนาด market-prices.json** โตตามลีค — ถ้าเกิน ~2-3MB ค่อยพิจารณา split ต่อหมวด
4. **companion + จริยธรรม/ToS:** อ่าน Client.txt = แนวเดียวกับ tools ที่ชุมชนใช้กันแพร่หลาย (TraXile,
   Mapwatch, Awakened) — ไม่แตะ memory เกม ไม่ automate การเล่น = โซนปลอดภัยของ GGG ที่ผ่านมา
5. **หลายภาษาของ Client.txt** (timestamp/ข้อความ) — เริ่มจาก client EN ก่อน แล้วเก็บ pattern เพิ่ม

## 8. แหล่งอ้างอิง

- dillapoe2stat: https://github.com/DoofDilla/dillapoe2stat (+ wiki, README-TECHNICAL) · MIT
- Live demo/site: https://doofdilla.github.io/dillapoe2stat/
- poe.ninja PoE2 economy: https://poe.ninja/poe2/economy/runesofaldur/currency (+ `/poe2/api/data/index-state`,
  `/poe2/api/economy/exchange/{version}/overview`)
- GGG developer docs: https://www.pathofexile.com/developer/docs (สถานะ API — เช็คสดก่อนเฟส C)
- `POE2_API_RESEARCH.md` ในโปรเจกต์นี้ (OAuth/Client.txt รายละเอียด + ข้อจำกัด)
- Screenshots: `docs/ref-tracker/dillapoe2stat_*.png`

> **สถานะเอกสาร:** แผนอนุมัติแล้วโดยผู้ใช้ (2026-07-23) — เริ่มงานที่ A1 → A2. อัปเดตเอกสารนี้เมื่อเฟสคืบ
> หรือสถานะ GGG API เปลี่ยน (กติกา: ทุกการเพิ่ม/ย้ายฟีเจอร์ต้องอัปเดต PROJECT_INDEX/EDIT_GUIDE ด้วย)
