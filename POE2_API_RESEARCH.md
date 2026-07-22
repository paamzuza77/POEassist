# POE2_API_RESEARCH.md — การดึง API PoE2 + Tracker ระหว่างฟาร์ม

> เอกสารค้นคว้า (research spike) เก็บไว้ทำจริง **หลัง P6** — เรื่องดึงข้อมูลตัวละคร/คลังของจาก API
> และ tracker จับสถิติระหว่างฟาร์มในแมพจริง. วันที่ค้นคว้า: 2026-07-23. อ้างอิงแหล่งทางการ + เครื่องมือจริง
> (ดู "แหล่งอ้างอิง" ท้ายไฟล์). ตรวจซ้ำก่อนเริ่มงานจริง — API PoE2 ยังพัฒนาอยู่ อาจมีของใหม่เพิ่ม.

## 0. สรุปสั้น (TL;DR)

- **ไม่มี API สดจากเซิร์ฟเวอร์ระหว่างเล่น** — real-time ระหว่างฟาร์มได้จาก **`Client.txt`** (ไฟล์ log ในเครื่อง) เท่านั้น
  → ต้องเป็น **แอปเดสก์ท็อป** อ่านไฟล์; เว็บ static (GitHub Pages) อ่านไม่ได้.
- **API ทางการ (OAuth)** ให้ข้อมูล **บัญชี** (ไม่ real-time): ตัวละคร + อุปกรณ์/พาสซีฟ/สกิล, ลีค+ladder,
  currency exchange, item filters — รองรับ PoE2 แล้วบางส่วน (`realm=poe2`). **Stash/guild/PvP ยังเป็น PoE1 เท่านั้น.**
- OAuth ต้องมี **backend/proxy + โดเมน HTTPS จดทะเบียน** (localhost/IP ไม่ได้) → เว็บ static ล้วนทำเองไม่ได้ = ตรงกับ **P6**.
- **ทางที่ทำได้ไม่แตะ backend:** ให้ผู้ใช้ paste/import **character JSON** เอง (Build Doctor MVP) + คงใช้ poe.ninja/poe2db ผ่าน GitHub Actions.

---

## 1. ข้อมูล real-time "ระหว่างเล่น" — Client.txt

PoE2 เขียนไฟล์ log `Client.txt` (โฟลเดอร์เกม เช่น `...\Path of Exile 2\logs\Client.txt`) เพิ่มบรรทัดใหม่ทุกครั้งที่เกิดเหตุการณ์:

- เข้าโซน/แมพใหม่ (`: You have entered <area>`)
- level up, ตาย (`... has been slain`)
- ล็อกอิน/เชื่อมต่อเซิร์ฟเวอร์, AFK on/off
- ข้อความบางประเภท (whisper, trade, system)

**ลักษณะข้อมูล:** เป็น plain text ต่อบรรทัด มี timestamp — parse ด้วย regex ได้. เครื่องมือชุมชนที่ทำแบบนี้:
- **TraXile** — overlay จับเวลาแมพ + สถิติ (in-game overlay)
- **Mapwatch** — สรุป/วิเคราะห์ session จาก Client.txt
- **PoE2 Map Tracker** — โหมด real-time เพิ่มโซนใหม่ระหว่างเล่น

**สิ่งที่ทำได้จาก Client.txt (สำหรับ farm tracker):**
- นับจำนวนแมพต่อ session, เวลา/แมพ, เวลารวม
- เวลาต่อ session, จำนวนตาย
- ไม่มีข้อมูล loot/currency ที่ดรอป (log ไม่บันทึกของที่ได้) → ต้อง**เทียบ stash ก่อน/หลัง** ผ่าน API เอา (ดู §2)

**ข้อควรระวังทางเทคนิค (จาก David Meents / mapwatch):**
- เกม restart อาจ **truncate ไฟล์เป็น 0 ไบต์** → ถ้าติดตามตำแหน่ง byte ต้อง handle กรณีไฟล์เล็กลงกะทันหัน
- Windows อาจ lock ไฟล์ระหว่างเกมเขียน — บางเครื่องมือใช้ "open once" fallback
- encoding/locale ของ timestamp ต่างเครื่อง

**⚠️ ข้อจำกัดกับโปรเจกต์นี้:** เบราว์เซอร์อ่านไฟล์ในเครื่องแบบ tail ไม่ได้ (File System Access API เปิดได้เฉพาะไฟล์ที่ผู้ใช้เลือก + ไม่ tail สด + ต้อง permission ทุกครั้ง). ทำ farm tracker สดจริง ๆ **ต้องมี desktop companion** (Electron/Tauri/native) หรือ local helper ที่ผู้ใช้รัน แล้ว push เข้าเว็บ. **นอกขอบเขต static GitHub Pages ปัจจุบัน.**

---

## 2. API ทางการ GGG (OAuth 2.1) — ข้อมูลบัญชี

Base: `https://api.pathofexile.com` (เอกสาร: `pathofexile.com/developer/docs`). ใช้ **OAuth 2.1**.

### 2.1 Endpoint + สถานะรองรับ PoE2

| Endpoint | ข้อมูล | PoE2 (`realm=poe2`) | Auth |
|---|---|---|---|
| `GET /profile` | โปรไฟล์ (UUID, ชื่อ, Twitch) | ❌ | OAuth |
| `GET /character[/<realm>]` | **ตัวละครทั้งหมด** + อุปกรณ์ | ✅ | OAuth |
| `GET /character[/<realm>]/<name>` | **ตัวละครเดี่ยว**: equipment, inventory, passives, skills | ✅ | OAuth |
| `GET /league` · `/league/<id>` · `/league/<id>/ladder` | ลีค + อันดับ | ✅ | OAuth |
| `GET /api/currency-exchange[/<realm>]` | ประวัติเรทแลกเงิน | ✅ (public) | Public |
| `GET /item-filter` · `/item-filter/<id>` (+POST สร้าง/แก้) | loot filter ของบัญชี | ✅ | OAuth |
| `GET /stash[/<realm>]/<league>[/<id>]` | **คลังของ (stash)** | ❌ PoE1 เท่านั้น | OAuth |
| `GET /guild[/<realm>]/stash/...` | guild stash | ❌ PoE1 | OAuth |
| `GET /league-account[/<realm>]/<league>` | atlas passives, sextants ฯลฯ | ❌ PoE1 | OAuth |
| `GET /account/leagues[/<realm>]` | ลีคของบัญชี | ❌ PoE1 | OAuth |
| `GET /pvp-match[...]` | PvP | ❌ PoE1 | OAuth |
| `GET /public-stash-tabs[/<realm>]` | สตรีม stash สาธารณะ (ดีเลย์ ~5 นาที) | ❌ PoE1 | Public |

> GGG ระบุเอง: *"There are currently limited APIs that return PoE2 game information."*
> **สรุป PoE2 ที่ดึงได้ตอนนี้:** character, league/ladder, currency-exchange, item-filter.
> **ยังดึงไม่ได้ (สำคัญกับ tracker):** stash tabs ของ PoE2 → เทียบ loot ก่อน/หลังแมพ **ยังทำไม่ได้ผ่าน API ทางการ** จนกว่า GGG จะเปิด.

### 2.2 OAuth scopes ที่เกี่ยว
- `account:characters` — ดูตัวละคร + inventory
- `account:stashes` — ดู stash + items (PoE2 ยังไม่คืนข้อมูล)
- `account:item_filter` — จัดการ loot filter

### 2.3 ข้อจำกัดที่กระทบสถาปัตยกรรม
- **Confidential client:** access token 28 วัน, refresh token 90 วัน.
- **Redirect URI ต้องเป็น HTTPS + โดเมนจดทะเบียนที่เจ้าของแอปคุม** — **localhost/IP ใช้ไม่ได้แม้ตอน dev.**
- ต้องเก็บ client secret ฝั่ง server → **เว็บ static ล้วนทำ OAuth ปลอดภัยเองไม่ได้** ต้องมี proxy/backend เล็ก ๆ.
- มี rate limit (header `X-Rate-Limit-*`) — ต้อง honor.

---

## 3. แหล่ง third-party

- **poe.ninja** — ราคา/เศรษฐกิจ PoE2 (แอปใช้อยู่แล้วผ่าน `scripts/update-market-radar.mjs`).
- **poe2db.tw** — items/mods/mechanics/เวลาลีค (ใช้อยู่แล้ว: `update-home-status.mjs`, codex).
- **Trade API (`/trade2`)** — ค้นหาไอเทม; ต้องระวัง rate limit + ต้อง POST search แล้ว fetch รายละเอียดเป็น batch.

---

## 4. อะไรทำได้ / ทำไม่ได้ กับโปรเจกต์นี้

| อยากได้ | ทำได้บน static web? | ต้องมีอะไร |
|---|---|---|
| จับเวลา/นับแมพ **สด**ระหว่างเล่น | ❌ | desktop companion อ่าน Client.txt |
| ดึง **ตัวละคร**อัตโนมัติ (สเตตัส/เกียร์) | ⚠️ ต้อง OAuth | backend/proxy (P6) |
| ดึง **stash/loot** เทียบก่อน-หลังแมพ | ❌ ตอนนี้ | รอ GGG เปิด PoE2 stash API + OAuth |
| **paste character JSON** เอง → วิเคราะห์ | ✅ | ไม่ต้องมีอะไรเพิ่ม (Build Doctor MVP) |
| ราคา/เศรษฐกิจ/ลีค | ✅ (มีแล้ว) | GitHub Actions → static JSON |
| **จับเวลาฟาร์มแบบ manual** (กดเอง) | ✅ | ในเว็บล้วน (Live Farm Session, P3) |

---

## 5. แผนคร่าว ๆ เมื่อทำจริง (หลัง P6)

**เฟส A — OAuth character import (P6)**
1. proxy เล็ก ๆ (Cloudflare Worker / เล็กสุดที่ทำ OAuth + เก็บ secret ได้) รับ redirect, แลก token, ส่งต่อ.
2. Frontend: ปุ่ม "เชื่อมบัญชี PoE" → OAuth → ดึง `/character/poe2/<name>` → เก็บ snapshot ในเครื่อง.
3. ป้อนเข้า **Build Doctor**: วิเคราะห์ res/สเตตัสขาด, ผูกกับ Resistance Checker/Gear Planner.
4. เคารพ rate limit + refresh token; token เก็บฝั่ง proxy ไม่ใช่ localStorage (ความปลอดภัย).

**เฟส B — Farm tracker ระหว่างเล่นจริง (ต้อง desktop companion)**
1. companion เล็ก (Tauri/Electron/CLI) tail `Client.txt` → parse เข้า/ออกแมพ, เวลา/แมพ, ตาย.
2. companion push สรุปเข้าเว็บ (local WebSocket/HTTP ที่ผู้ใช้รันเอง หรือเขียนไฟล์ JSON ให้เว็บอ่าน).
3. เว็บแสดง overlay/สถิติ session ต่อยอด Run Tracker เดิมของ Farm Planner.
4. loot/currency ต่อแมพ: ต้องรอ **PoE2 stash API** เปิด แล้วเทียบ snapshot ก่อน-หลัง (เฟส C).

**เฟส C — Loot/currency ต่อแมพ (รอ GGG)**
- เมื่อ PoE2 มี stash API: snapshot stash เข้าแมพ vs ออกแมพ → diff = ของที่ได้ → คิดมูลค่าจาก poe.ninja.
- **บล็อกอยู่ที่ GGG** — ตอนนี้ยังไม่มี PoE2 stash endpoint.

---

## 6. คำถามที่ต้องเคลียร์ก่อนเริ่มจริง

1. รับ desktop companion ไหม? (แตะกฎ "static only" — ต้องตัดสินใจเหมือนตอนพิจารณา PWA)
2. Proxy จะ host ที่ไหน? ใครถือ client secret? (Cloudflare Worker free tier?)
3. PoE2 stash API เปิดหรือยัง ณ วันเริ่มงาน? (เช็คซ้ำ — บล็อก loot tracking)
4. เก็บ token/ข้อมูลตัวละครที่ไหน — ย้ำกฎ "ข้อมูลไม่ออกจากเบราว์เซอร์" ต้องปรับ (opt-in ชัดเจน).

---

## แหล่งอ้างอิง

- PoE Developer Docs — Authorization: https://www.pathofexile.com/developer/docs/authorization
- PoE Developer Docs — Reference (endpoint list): https://www.pathofexile.com/developer/docs/reference
- Public stash tab API (wiki): https://pathofexile.fandom.com/wiki/Public_stash_tab_API
- Parsing PoE2 Client.txt (David Meents): https://davidmeents.com/blog/post/0008-poe2-overlord-log-analysis
- TraXile (log tracker + overlay): https://github.com/dermow/Traxile
- Mapwatch (Client.txt parser): https://github.com/ugimser/mapwatch/
- PoEDB: https://poedb.tw/us/

> **หมายเหตุ:** เอกสารนี้เป็น snapshot ณ 2026-07-23. สถานะ "PoE2 รองรับ/ไม่รองรับ" ของแต่ละ endpoint
> ต้องเช็คซ้ำที่ developer docs ก่อนเริ่มงานจริง — GGG ทยอยเปิด API PoE2 เพิ่มเรื่อย ๆ.
