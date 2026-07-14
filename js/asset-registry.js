/* ==================== Game asset registry (patch 0.32) ====================
   ไอคอนจริงจากเกมในโฟลเดอร์ image/ (สกุลเงิน + กลไก league) ใช้ประกอบ label ที่เป็นข้อความ

   กติกา (สำคัญ — อย่าทำให้หลวมกว่านี้):
   - **จับคู่ด้วยตารางที่ตรวจด้วยมือเท่านั้น** (ASSET_ALIASES) ห้ามเดา/ห้าม fuzzy match
     ไม่มีในตาราง = ไม่มีไอคอน (UI เดิมทำงานต่อได้ปกติ — ข้อความยังอยู่ครบเสมอ)
   - **รูปเป็นของประกอบ ไม่ใช่ตัวสื่อความหมาย** — ทุกที่ที่ใส่ไอคอนต้องมี label ข้อความอยู่แล้ว
     ดังนั้น <img> เป็น aria-hidden + alt="" (ไม่งั้น screen reader จะอ่านซ้ำสองรอบ)
   - โหลดรูปพังเมื่อไหร่ = ซ่อนรูปเงียบๆ (ตัว listener ด้านล่าง) — ห้ามโชว์ไอคอนรูปแตก
   - ไม่ preload ทั้งโฟลเดอร์ · thumbnail ในลิสต์ใช้ loading="lazy"
   - logo.png **ไม่ถูกใช้** โดยตั้งใจ (โลโก้ = เครื่องหมายการค้า + ไฟล์ใหญ่ 905KB)

   ที่มา/ลิขสิทธิ์: งานศิลป์ทั้งหมดเป็นของ Grinding Gear Games ใช้แบบ fan content
   (ดูหมายเหตุในหน้า Settings → ติดต่อ) — เราไม่ได้วาดเอง และไม่ได้อ้างว่าเป็นของเรา

   ── modularization Phase 1 (patch 0.34) ─────────────────────────────────────
   ย้ายออกจาก inline <script> ของ index.html เป็นไฟล์แยก — โค้ดเดิมไม่เปลี่ยน
   ต้องโหลด "ก่อน" สคริปต์หลักของ index.html (แท็กอยู่เหนือ <script> ตัวหลัก)
   เป็น classic script ตัวเดียวกับ global scope — const/function ด้านล่างจึงมองเห็นได้จากสคริปต์หลัก
   จับคู่กับ css/asset-icons.css
   =========================================================================== */

const ASSET_BASE = 'image/';

// key → ไฟล์จริงใน image/ (ชื่อไฟล์คงเดิม ไม่เปลี่ยนชื่อ/ย้าย)
const GAME_ASSETS = {
  divine:        { file: 'divine.webp',                 label: 'Divine Orb' },
  chaos:         { file: 'chaos.png',                   label: 'Chaos Orb' },
  exalted:       { file: 'exalt.png',                   label: 'Exalted Orb' },
  mirror:        { file: 'mirror.png',                  label: 'Mirror of Kalandra' },
  abyss:         { file: 'abyss.webp',                  label: 'Abyss' },
  breach:        { file: 'breach.webp',                 label: 'Breach' },
  ritual:        { file: 'ritual.webp',                 label: 'Ritual' },
  delirium:      { file: 'delirium.webp',               label: 'Delirium' },
  expedition:    { file: 'expedition.webp',             label: 'Expedition' },
  waystone:      { file: 'waystone.webp',               label: 'Waystone' },
  trialchaos:    { file: 'the trial of chaos.webp',     label: 'Trial of Chaos' },
  trialsekhemas: { file: 'trial of the sekhemma.webp',  label: 'Trial of the Sekhemas' },
  atziri:        { file: 'Atziri.webp',                 label: 'Atziri, the Red Queen' },
};

// ชื่อที่ยอมให้จับคู่ → key ด้านบน · ทุกบรรทัดตรวจกับข้อมูลจริงแล้ว (codex entries / radar buckets /
// FARM_MECHANICS / FARM_CURRENCIES) — เพิ่มบรรทัดใหม่ได้ แต่ต้องเช็คก่อนว่าชื่อนั้นมีอยู่จริง
const ASSET_ALIASES = {
  // สกุลเงิน (Gear Planner / Farm Planner ใช้ตัวย่อ Dv/C/Ex)
  'divine': 'divine', 'div': 'divine', 'dv': 'divine', 'divine orb': 'divine',
  'chaos orb': 'chaos', 'c': 'chaos',
  'exalted': 'exalted', 'exalt': 'exalted', 'ex': 'exalted', 'exalted orb': 'exalted',
  'mirror': 'mirror', 'mirror of kalandra': 'mirror',
  // กลไก league (ตรงกับ FARM_MECHANICS + radar buckets + Content Codex entry names)
  'abyss': 'abyss',
  'breach': 'breach',
  'ritual': 'ritual',
  'delirium': 'delirium',
  'expedition': 'expedition',
  'waystone': 'waystone', 'waystones mapping': 'waystone',
  // บอส ↔ content ที่บอสนั้นอยู่ (ตรวจกับ data/content-codex.json แล้ว)
  'the trialmaster': 'trialchaos', 'trial of chaos': 'trialchaos', 'the trial of chaos': 'trialchaos',
  'zarokh the temporal': 'trialsekhemas', 'trial of the sekhemas': 'trialsekhemas',
  'atziri': 'atziri', 'atziri the red queen': 'atziri',
};

// จงใจ "ไม่" จับคู่: chaos (คำเดียว) → คำว่า Chaos ใน Keyword Codex คือธาตุ Chaos ไม่ใช่ Chaos Orb
//   (ใช้ 'chaos orb'/'c' แทน) · simulacrum / essence / strongbox / runes / fragments → ไม่มีไฟล์รูป
//   · trial_soulcores ของ Market Radar → มีรูป trial สองใบ เลือกไม่ได้ว่าอันไหน จึงไม่ใส่ไอคอน

// Market Radar: contentKey ของ bucket → key ใน GAME_ASSETS (ตรวจกับ data/market-radar.json แล้ว)
// ที่ไม่มีในนี้ = ไม่มีไอคอน: essence / simulacrum / strongboxes / runes / fragments_bossing /
// generic_currency (ไม่มีไฟล์รูป) และ trial_soulcores (มีรูป trial 2 ใบ — เลือกไม่ได้ว่าอันไหนตรง)
const RADAR_ASSET_BY_KEY = {
  ritual: 'ritual',
  abyss: 'abyss',
  expedition: 'expedition',
  delirium: 'delirium',
  breach: 'breach',
  waystones_mapping: 'waystone',
};

function normalizeAssetKey(name) {
  return String(name == null ? '' : name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ') // ตัด comma/slash/จุด — "Atziri, the Red Queen" → "atziri the red queen"
    .replace(/\s+/g, ' ')
    .trim();
}

// คืน { key, file, label, src } ถ้าจับคู่ได้ · ไม่ได้ = null (caller ต้องคง UI เดิมไว้)
function getLocalAssetForName(name) {
  const key = ASSET_ALIASES[normalizeAssetKey(name)];
  if (!key) return null;
  const def = GAME_ASSETS[key];
  if (!def) return null;
  return { key, file: def.file, label: def.label, src: ASSET_BASE + encodeURIComponent(def.file) };
}

// คืน HTML ของ <img> หรือ '' ถ้าไม่มีรูป · size: 'sm' (16px) | 'md' (22px) | 'lg' (40px thumbnail)
// ผู้เรียกต้องมี label ข้อความอยู่แล้วเสมอ — รูปนี้เป็นของประกอบ (aria-hidden)
function renderAssetIcon(name, opts) {
  const o = opts || {};
  const asset = getLocalAssetForName(name);
  if (!asset) return '';
  const size = ['sm', 'md', 'lg'].includes(o.size) ? o.size : 'sm';
  const lazy = o.lazy === false ? '' : ' loading="lazy" decoding="async"';
  const cls = 'game-ico game-ico-' + size + (o.className ? ' ' + o.className : '');
  return '<img class="' + cls + '" src="' + asset.src + '" alt="" aria-hidden="true"' + lazy +
    ' title="' + asset.label.replace(/"/g, '&quot;') + '">';
}

// รูปโหลดไม่ขึ้น (ไฟล์หาย/พัง) → ซ่อนเงียบๆ ให้เหลือแต่ข้อความ ห้ามโชว์ไอคอนรูปแตก
// ใช้ capture เพราะ error ของ <img> ไม่ bubble
document.addEventListener('error', ev => {
  const el = ev.target;
  if (el && el.tagName === 'IMG' && el.classList.contains('game-ico')) el.style.display = 'none';
}, true);
