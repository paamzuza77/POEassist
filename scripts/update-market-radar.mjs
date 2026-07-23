// ============================================================================
// Market Farm Radar — data generator
//
// รันโดย GitHub Actions (.github/workflows/update-market-radar.yml) ทุกชั่วโมง
// ดึงข้อมูลเศรษฐกิจ PoE2 จาก poe.ninja แล้วเขียนไฟล์ static:
//   data/market-radar.json
// หน้าเว็บ (index.html แท็บ Atlas Farm Planner) อ่านไฟล์นั้นอย่างเดียว
// ไม่มี backend และเบราว์เซอร์ไม่เรียก poe.ninja ตรงๆ
//
// ต้องใช้ Node 20+ (ใช้ fetch ในตัว ไม่มี dependency ภายนอก)
// รันเองในเครื่อง: node scripts/update-market-radar.mjs
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// ⚙️ CONFIG — จุดที่แก้บ่อยอยู่ตรงนี้ทั้งหมด
// ---------------------------------------------------------------------------

// ชื่อลีก: 'slug' คือชื่อใน URL ของ poe.ninja, 'display' คือชื่อเต็มที่ API ต้องการ
// ดูรายชื่อลีกปัจจุบันได้จาก https://poe.ninja/poe2/api/data/index-state (economyLeagues)
const LEAGUE = 'runesofaldur';
const LEAGUE_DISPLAY = 'Runes of Aldur';

// หมวดที่ป้อนเข้า RADAR SCORING — ห้ามเพิ่มที่นี่โดยไม่ตั้งใจ: การเพิ่มหมวดเปลี่ยนผล Farm Score
// (ชื่อต้องตรงกับพารามิเตอร์ type ของ API เช่นเดียวกับ path ในหน้าเว็บ poe.ninja)
// หมวดไหนดึงพลาดจะถูกบันทึกลง errors[] แต่ไม่ทำให้ทั้ง script ล้ม
const CATEGORIES = [
  'Currency', 'Fragments', 'Abyss', 'Runes', 'Ritual', 'Delirium',
  'Breach', 'SoulCores', 'Essences', 'Expedition', 'Verisium',
];

// หมวดเพิ่มเติมสำหรับ data/market-prices.json (ราคาครบทุกหมวดทุกชิ้น — 2026-07-23):
// ดึง "ทุกหมวดที่มีข้อมูล" (CATEGORIES + รายการนี้) แต่ **ไม่ป้อนเข้า radar scoring** (สูตรเดิมคงผลเป๊ะ)
// ชื่อ type ยืนยันจาก network ของหน้า poe.ninja จริง — sidebar ชื่อไม่ตรง type เสมอไป:
//   Uncut Gems → UncutGems · Idols → Idols · Lineage Gems → LineageSupportGems ·
//   Omens → Ritual (มีใน CATEGORIES แล้ว) · Abyssal Bones → Abyss (มีแล้ว)
// ⇒ 3 ชื่อแรก = มีข้อมูลจริงในลีคปัจจุบัน; ที่เหลือเป็น candidate จากลีคเก่า/อนาคต — probe ทุกงวด
// หมวดที่คืน 0 items จะลง skippedCategories[] (ไม่ใช่ error) — ลีคหน้ามีของก็ติดมาอัตโนมัติ
const EXTRA_PRICE_CATEGORIES = [
  'UncutGems', 'Idols', 'LineageSupportGems',
  // candidates (ว่างในลีคปัจจุบัน — เผื่อ GGG/poe.ninja เพิ่มคืนในลีคหน้า):
  'Catalysts', 'Waystones', 'Talismans', 'Gems', 'Omens', 'Distilled',
  'Artifacts', 'Logbooks', 'LiquidEmotions', 'Tablets',
];

// หมวด "ไอเทม" (endpoint คนละตัว! — 2026-07-23, แก้เคส "หา Unique Tablet ไม่เจอ"):
//   /poe2/api/economy/stash/{version}/item/overview?league=&type=
// ต่างจาก exchange: lines[] มี primaryValue (divine เหมือนกัน), sparkLine (L ใหญ่), listingCount (ไม่มี volume)
// ยืนยันมีข้อมูลจริง 7 หมวด (~717 ชิ้น); UniqueRelics = candidate เผื่ออนาคต
const ITEM_CATEGORIES = [
  'UniqueWeapons', 'UniqueArmours', 'UniqueAccessories', 'UniqueJewels',
  'UniqueFlasks', 'UniqueCharms', 'UniqueTablets', 'UniqueRelics',
];

// ===== Content bucket mapping (จุดเดียวที่คุมว่าหมวด poe.ninja ไหน → farm content ไหน) =====
// นี่คือ "แหล่งความจริง" เดียวของ content mapping ทั้งระบบ — ห้าม hardcode ที่อื่น
// - contentKey/displayName: ใช้แสดงผลและจัดกลุ่ม evidence items
// - categories: หมวด poe.ninja (ตรงกับ CATEGORIES ด้านบน) ที่แม็ปเข้า bucket นี้
//   ถ้าไม่มีหมวดที่ดึงได้จริง (poe.ninja ยังไม่มี category ตรงๆ) ปล่อย [] ไว้ —
//   bucket จะยังโชว์อยู่เสมอ แต่ evidenceItems ว่างจนกว่าจะมีข้อมูล
// - confidence: ความมั่นใจว่าไอเทมหมวดนี้มาจาก content นี้จริง (0-1)
// - noEvidenceStatus: ข้อความตอนไม่มีไอเทม >=1 Divine เข้าเกณฑ์
const CONTENT_BUCKETS = [
  { contentKey: 'ritual', displayName: 'Ritual', categories: ['Ritual'], confidence: 0.9 },
  { contentKey: 'expedition', displayName: 'Expedition', categories: ['Expedition'], confidence: 0.85 },
  { contentKey: 'delirium', displayName: 'Delirium', categories: ['Delirium'], confidence: 0.95 },
  { contentKey: 'simulacrum', displayName: 'Simulacrum', categories: [], confidence: 0.7 },
  { contentKey: 'breach', displayName: 'Breach', categories: ['Breach'], confidence: 0.95 },
  { contentKey: 'essence', displayName: 'Essence', categories: ['Essences'], confidence: 0.8 },
  { contentKey: 'runes', displayName: 'Runes / Remnants', categories: ['Runes'], confidence: 0.9 },
  { contentKey: 'trial_soulcores', displayName: 'Trial / Soul Cores', categories: ['SoulCores'], confidence: 0.75 },
  { contentKey: 'fragments_bossing', displayName: 'Fragments / Bossing', categories: ['Fragments'], confidence: 0.75 },
  // patch 0.79: Unique/Precursor Tablets = ของสาย mapping โดยตรง → เข้า bucket นี้ (เดิมว่างตลอด)
  { contentKey: 'waystones_mapping', displayName: 'Waystones / Mapping', categories: ['UniqueTablets', 'Waystones', 'Tablets'], confidence: 0.7 },
  { contentKey: 'abyss', displayName: 'Abyss', categories: ['Abyss'], confidence: 0.85 },
  { contentKey: 'strongboxes', displayName: 'Strongboxes', categories: [], confidence: 0.6 },
  { contentKey: 'generic_currency', displayName: 'Generic Currency', categories: ['Currency', 'Verisium'], confidence: 0.5 },
  // ===== patch 0.79: bucket ใหม่ตามการฟาร์ม PoE2 (หมวดที่เพิ่งดึงครบ — คำสั่งผู้ใช้ 2026-07-23) =====
  { contentKey: 'uncut_gems', displayName: 'Uncut Gems (General)', categories: ['UncutGems', 'Gems'], confidence: 0.6 },
  { contentKey: 'idols', displayName: 'Idols', categories: ['Idols'], confidence: 0.7 },
  { contentKey: 'lineage_gems', displayName: 'Lineage Gems (Endgame)', categories: ['LineageSupportGems'], confidence: 0.6 },
  // uniques ดรอปได้ทั่วไป/บอส — ฟาร์มเจาะจงยาก → confidence ต่ำสุดกันคะแนนเวอร์จากของแพงรายชิ้น
  { contentKey: 'uniques_general', displayName: 'Uniques (General / Bossing)',
    categories: ['UniqueWeapons', 'UniqueArmours', 'UniqueAccessories', 'UniqueJewels', 'UniqueFlasks', 'UniqueCharms', 'UniqueRelics'],
    confidence: 0.4 },
].map((b) => ({
  ...b,
  wikiUrl: '',
  sourceUrls: [],
  noEvidenceStatus: 'No priced items in current snapshot', // 0.79: ไม่มีเกณฑ์ 1D+ แล้ว
}));

// reverse lookup: poe.ninja category name → bucket (มาจาก CONTENT_BUCKETS เท่านั้น จุดเดียว)
const CATEGORY_TO_BUCKET = new Map();
for (const bucket of CONTENT_BUCKETS) {
  for (const cat of bucket.categories) CATEGORY_TO_BUCKET.set(cat, bucket);
}

const TOP_RISING_COUNT = 12;    // จำนวนไอเทมในกล่อง Top Rising (แสดงผล/fallback เท่านั้น ไม่ใช่ต้นทางคำนวณ)
const EVIDENCE_ITEM_COUNT = 5;  // จำนวน evidence item สูงสุดต่อ content bucket
const MIN_VOLUME_DIVINE = 0.5;  // ไอเทมที่ volume ต่ำกว่านี้ (หน่วย divine) ไม่เอาเข้า Top Rising
// patch 0.79 (product decision จากผู้ใช้ 2026-07-23): ยกเลิกเกณฑ์ ≥1 Divine —
// ทุกไอเทมทุกราคาเข้าคำนวณ/แสดงผล แต่ของที่ต่ำกว่า 1 Divine โดน "ภาษี" คะแนนแรง (SUB_DIVINE_TAX)
// เพื่อให้ของ >1 Divine ชนะเสมอในการจัดอันดับความน่าฟาร์ม
const MIN_ITEM_VALUE_DIVINE = 0; // เดิม 1 — ตอนนี้ทุกราคาเข้าระบบ
const SUB_DIVINE_TAX = 0.35;     // ตัวคูณคะแนนเมื่อ 0 < value < 1 Div (ต้องตรงกับ src/tabs/radar-scoring.ts)
// ประวัติราคา: เก็บเฉพาะไอเทม ≥0.5 Div กันไฟล์ price-history บวม (จาก ~1,350 ชิ้นหลังรวม endpoint ใหม่)
const HISTORY_MIN_VALUE_DIVINE = 0.5;

// ---------------------------------------------------------------------------
// poe.ninja API (PoE2)
// ---------------------------------------------------------------------------
// รูปแบบ endpoint ปัจจุบัน (ตรวจจาก network ของหน้า poe.ninja/poe2/economy):
//   1) GET https://poe.ninja/poe2/api/data/index-state
//      → snapshotVersions[] จับคู่ url === LEAGUE เพื่อเอา "version"
//   2) GET https://poe.ninja/poe2/api/economy/exchange/{version}/overview
//        ?league={LEAGUE_DISPLAY}&type={Category}
//      → { core: { items, rates, primary }, lines: [...], items: [...] }
//        - lines[].primaryValue        = ราคาปัจจุบัน (หน่วย = core.primary, ปกติคือ divine)
//        - lines[].volumePrimaryValue  = ปริมาณเทรด (หน่วย divine)
//        - lines[].sparkline           = { totalChange: %7วัน, data: [...] }
//        - items[]                     = แผนที่ id → name/image/category
// ถ้า poe.ninja เปลี่ยนโครงสร้าง ให้แก้ฟังก์ชัน fetchCategory ด้านล่าง
// ---------------------------------------------------------------------------

const NINJA_BASE = 'https://poe.ninja';

// slug หน้าเว็บ poe.ninja ต่อหมวด (0.80) — ใช้สร้าง sourceUrl ให้คลิกแล้วไปหน้าที่ถูกจริง
// (เดิมใช้ category.toLowerCase() — ผิดกับหมวดหลายคำ เช่น UniqueArmours → 'uniquearmours' ไม่มีหน้า)
// ★ = ยืนยันจากเว็บจริง; ที่เหลือ kebab-case ตาม convention เดียวกัน — ตรงกับ NINJA_CAT_SLUGS ฝั่ง index.html
const CATEGORY_PAGE_SLUGS = {
  Currency: 'currency', Fragments: 'fragments', Abyss: 'abyssal-bones', UncutGems: 'uncut-gems',
  LineageSupportGems: 'lineage-support-gems', Essences: 'essences', SoulCores: 'soul-cores',
  Idols: 'idols', Runes: 'runes', Ritual: 'omens', Expedition: 'expedition',
  Delirium: 'delirium', Breach: 'breach', Verisium: 'verisium',
  UniqueTablets: 'unique-tablets', UniqueWeapons: 'unique-weapons', UniqueArmours: 'unique-armours',
  UniqueAccessories: 'unique-accessories', UniqueJewels: 'unique-jewels',
  UniqueFlasks: 'unique-flasks', UniqueCharms: 'unique-charms',
};
const categoryPageSlug = (cat) => CATEGORY_PAGE_SLUGS[cat] || String(cat || '').toLowerCase();
const USER_AGENT = 'POEassist-market-radar/1.0 (github.com/paamzuza77/POEassist; hourly static snapshot)';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'data', 'market-radar.json');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (v) => Math.round(v * 100) / 100;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function getSnapshotVersion() {
  const state = await fetchJson(`${NINJA_BASE}/poe2/api/data/index-state`);
  const snap = (state.snapshotVersions || []).find((s) => s.url === LEAGUE);
  if (!snap || !snap.version) {
    throw new Error(`ไม่พบ snapshot version ของลีก "${LEAGUE}" ใน index-state — เช็คชื่อลีกใน CONFIG`);
  }
  return snap.version;
}

// ดึงหนึ่งหมวด แล้ว normalize เป็น [{ id, name, icon, category, value, trend7d, volume }]
async function fetchCategory(version, category) {
  const url = `${NINJA_BASE}/poe2/api/economy/exchange/${version}/overview` +
    `?league=${encodeURIComponent(LEAGUE_DISPLAY)}&type=${encodeURIComponent(category)}`;
  const data = await fetchJson(url);

  const lines = Array.isArray(data.lines) ? data.lines : [];
  const itemMeta = new Map();
  for (const it of Array.isArray(data.items) ? data.items : []) {
    if (it && it.id) itemMeta.set(it.id, it);
  }

  return lines.map((ln) => {
    const meta = itemMeta.get(ln.id) || {};
    const spark = ln.sparkline || {};
    return {
      id: ln.id,
      name: meta.name || ln.id || '?',
      icon: meta.image ? NINJA_BASE + meta.image : '',
      category,
      value: typeof ln.primaryValue === 'number' ? ln.primaryValue : null, // divine
      trend7d: typeof spark.totalChange === 'number' ? spark.totalChange : null, // % 7 วัน
      volume: typeof ln.volumePrimaryValue === 'number' ? ln.volumePrimaryValue : null, // divine
    };
  }).filter((x) => x.value !== null);
}

// ดึงหนึ่งหมวด "ไอเทม" (endpoint คนละตัวกับ exchange — patch 0.79, เคส Unique Tablets)
//   GET /poe2/api/economy/stash/{version}/item/overview?league=&type=
// lines[] แบนกว่า: name/baseType/icon ในตัว, sparkLine (L ใหญ่), listingCount (ไม่มี volume แบบ divine)
// normalize เป็น shape เดียวกับ fetchCategory (volume=null — สภาพคล่องขึ้น Unknown ตามพฤติกรรมเดิมของ shape)
async function fetchItemCategory(version, category) {
  const url = `${NINJA_BASE}/poe2/api/economy/stash/${version}/item/overview` +
    `?league=${encodeURIComponent(LEAGUE_DISPLAY)}&type=${encodeURIComponent(category)}`;
  const data = await fetchJson(url);
  const lines = Array.isArray(data.lines) ? data.lines : [];
  return lines.map((ln) => {
    const spark = ln.sparkLine || {};
    return {
      id: ln.detailsId || String(ln.id || ln.name || '?'),
      name: ln.name ? (ln.baseType && ln.baseType !== ln.name ? `${ln.name} (${ln.baseType})` : ln.name) : (ln.baseType || '?'),
      icon: typeof ln.icon === 'string' ? ln.icon : '',
      category,
      value: typeof ln.primaryValue === 'number' ? ln.primaryValue : null, // divine (core.primary ยืนยันแล้ว)
      trend7d: typeof spark.totalChange === 'number' ? spark.totalChange : null,
      volume: null, // endpoint นี้ให้ listingCount ไม่ใช่ volume-divine — ไม่เดาเป็น volume
      listingCount: typeof ln.listingCount === 'number' ? ln.listingCount : null,
    };
  }).filter((x) => x.value !== null);
}

// ---------------------------------------------------------------------------
// 🧮 Item Score — สูตรคะแนน (0-100, "คะแนนความน่าฟาร์ม" ไม่ใช่ % drop chance)
//
//   score = trendScore*0.30 + valueScore*0.30 + volumeScore*0.20
//         + confidenceScore*0.15 - riskScore*0.05
//
// - trendScore:  %เปลี่ยนราคา 7 วัน → 0-100, cap กัน spike สุดโต่งครองอันดับ
// - valueScore:  มูลค่าไอเทม (log scale กัน outlier ราคาโหดๆ ดันคะแนนเกินจริง)
// - volumeScore: ปริมาณเทรด/สภาพคล่อง (log scale) — ไม่มีข้อมูล = 50 (neutral)
// - confidence:  ความมั่นใจของ CONTENT_BUCKETS
// - riskScore:   0-100 ยิ่งสูงยิ่งเสี่ยง (สภาพคล่องต่ำ/ราคาจิ๋ว/spike ผิดปกติ) หักแค่ 5% น้ำหนัก
// ---------------------------------------------------------------------------

function trendScore(trend7d) {
  if (typeof trend7d !== 'number') return 50; // ไม่มีข้อมูล = กลางๆ
  return clamp(50 + trend7d * 1.25, 0, 100);
}

function priceScore(value) {
  if (typeof value !== 'number' || value <= 0) return 0;
  // 0.0001 div → 0 คะแนน, ~300 div → 100 คะแนน (log10)
  return clamp(((Math.log10(value) + 4) / 6.5) * 100, 0, 100);
}

function volumeScore(volume) {
  if (typeof volume !== 'number' || volume <= 0) return 50; // Unknown = neutral
  // 0.001 div → 0, 1000 div ขึ้นไป → 100 (log10)
  return clamp(((Math.log10(volume) + 3) / 6) * 100, 0, 100);
}

function liquidityLabel(volume) {
  if (typeof volume !== 'number' || volume <= 0) return 'Unknown';
  if (volume >= 1000) return 'High';
  if (volume >= 100) return 'Good';
  if (volume >= 10) return 'OK';
  return 'Low';
}

function riskInfo(item) {
  let penalty = 0; // 0-100 scale, "quantity" of risk before weighting
  const notes = [];
  if (typeof item.volume === 'number' && item.volume > 0 && item.volume < 5) {
    penalty += 40;
    notes.push('Low liquidity');
  }
  if (typeof item.value === 'number' && item.value < 0.005) {
    penalty += 20;
    notes.push('Very cheap per unit — needs bulk selling');
  }
  if (typeof item.trend7d === 'number' && item.trend7d > 100) {
    penalty += 20;
    notes.push('Spiking hard — price may correct');
  }
  return { score: clamp(penalty, 0, 100), note: notes.join('; ') };
}

function itemFarmScore(item, confidence) {
  const risk = riskInfo(item);
  let raw =
    trendScore(item.trend7d) * 0.30 +
    priceScore(item.value) * 0.30 +
    volumeScore(item.volume) * 0.20 +
    clamp(confidence, 0, 1) * 100 * 0.15 -
    risk.score * 0.05;
  // patch 0.79 — "ภาษี sub-Divine" (product decision ผู้ใช้ 2026-07-23): ของราคาต่ำกว่า 1 Divine
  // เข้าระบบได้ทุกชิ้น แต่คะแนนโดนคูณ SUB_DIVINE_TAX (0.35) เพื่อให้ของ ≥1 Divine ชนะการจัดอันดับเสมอ
  // (v=0/ไม่มีราคา ไม่โดนภาษี — priceScore เป็น 0 อยู่แล้ว) — ต้องตรงกับ src/tabs/radar-scoring.ts
  if (typeof item.value === 'number' && item.value > 0 && item.value < 1) raw *= SUB_DIVINE_TAX;
  return { score: clamp(raw, 0, 100), risk };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const errors = [];
  const allItems = [];        // เฉพาะ CATEGORIES (radar scoring — pipeline เดิมเป๊ะ)
  const priceItems = [];      // ทุกหมวด (CATEGORIES + EXTRA) → data/market-prices.json
  const priceCategoryCounts = {}; // ชื่อหมวด → จำนวน items (สำหรับ summary/skipped)

  let version = null;
  try {
    version = await getSnapshotVersion();
    console.log(`snapshot version: ${version}`);
  } catch (err) {
    errors.push(`index-state: ${err.message}`);
  }

  if (version) {
    // patch 0.79: ทุกหมวด (exchange + item endpoint) เข้า radar scoring ทั้งหมด — "คะแนนจากทุกไอเทม"
    // (คำสั่งผู้ใช้ 2026-07-23; ของ <1 Div โดนภาษีคะแนนใน itemFarmScore แทนการตัดทิ้ง)
    const plan = [
      ...[...CATEGORIES, ...EXTRA_PRICE_CATEGORIES].map((c) => ({ cat: c, kind: 'exchange' })),
      ...ITEM_CATEGORIES.map((c) => ({ cat: c, kind: 'item' })),
    ];
    for (const { cat, kind } of plan) {
      try {
        const items = kind === 'item'
          ? await fetchItemCategory(version, cat)
          : await fetchCategory(version, cat);
        console.log(`${cat} [${kind}]: ${items.length} items`);
        priceCategoryCounts[cat] = items.length;
        priceItems.push(...items);
        allItems.push(...items);
      } catch (err) {
        if (/HTTP 404/.test(err.message)) {
          // 404 = หมวดนี้ไม่มีในลีคนี้ (candidate ที่ตั้งใจ probe) — นับเป็นหมวดว่าง ไม่ใช่ error เตือน UI
          priceCategoryCounts[cat] = 0;
        } else {
          // พังจริง (network/5xx/โครงเปลี่ยน) — จดไว้ใน errors ให้หน้าเว็บโชว์เตือน
          errors.push(`${cat}: ${err.message}`);
          priceCategoryCounts[cat] = -1; // -1 = fetch พัง (ต่างจาก 0 = หมวดว่าง)
        }
      }
      // เว้นจังหวะเล็กน้อย ไม่ยิงรัว
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // --- data/market-prices.json — ราคาครบทุกหมวดทุกชิ้น (ไม่มีเกณฑ์ขั้นต่ำ) ---
  // ใช้โดย price lookup / Live Farm Session (แผนใน docs/LIVE_TRACKER_PLAN.md) — แยกไฟล์จาก radar
  // เพื่อไม่แตะ scoring และให้หน้าเว็บโหลด lazy เฉพาะตอนใช้
  writeMarketPrices(priceItems, priceCategoryCounts, errors);

  // ถ้าดึงไม่ได้เลย: เก็บข้อมูลเดิมไว้ (ปลอดภัยกว่าเขียนไฟล์ว่าง)
  // แล้วเติม error ให้หน้าเว็บเห็นว่า snapshot รอบนี้ fail — updatedAt เดิมจะทำให้ขึ้น Stale เอง
  if (allItems.length === 0) {
    console.error('ดึงข้อมูลไม่ได้เลย:', errors);
    let previous = null;
    try { previous = JSON.parse(readFileSync(OUT_FILE, 'utf8')); } catch { /* ยังไม่มีไฟล์เดิม */ }
    const out = previous || {
      version: 1,
      league: LEAGUE,
      updatedAt: null,
      source: { name: 'poe.ninja', url: `${NINJA_BASE}/poe2/economy/${LEAGUE}/currency` },
      marketItems: [],
      topRisingItems: [],
      contentRecommendations: [],
      errors: [],
    };
    out.errors = errors;
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
    return;
  }

  // --- ให้คะแนน + map content ให้ไอเทมทุกตัวที่ normalize มาแล้ว ---
  const scored = allItems.map((item) => {
    const bucket = CATEGORY_TO_BUCKET.get(item.category) || null;
    const confidence = bucket ? bucket.confidence : 0.5;
    const { score, risk } = itemFarmScore(item, confidence);
    return { ...item, bucket, confidence, score, riskScore: risk.score, riskNote: risk.note };
  });

  // --- STEP 1: marketItems = ต้นทางความจริงเดียว ---
  // เก็บไอเทม mapped ทุกตัวที่ value >= 1 Divine ไว้ทั้งหมด (ห้ามตัดทิ้งเพราะเทรนด์ต่ำ/ไม่ rising)
  // กันไอเทมซ้ำด้วย name+category
  const seenKey = new Set();
  const marketItems = scored
    .filter((x) => typeof x.value === 'number' && x.value >= MIN_ITEM_VALUE_DIVINE)
    .filter((x) => {
      const key = x.name + '|' + x.category;
      if (seenKey.has(key)) return false;
      seenKey.add(key);
      return true;
    })
    .map((x) => ({
      name: x.name,
      category: x.category,
      icon: x.icon,
      value: round2(x.value),
      valueCurrency: 'Divine',
      trend7d: round2(x.trend7d),
      volume: x.volume === null ? null : round2(x.volume),
      volumeScore: round2(volumeScore(x.volume) / 100),
      liquidityLabel: liquidityLabel(x.volume),
      mappedContent: x.bucket ? x.bucket.displayName : '',
      contentKey: x.bucket ? x.bucket.contentKey : '',
      confidence: x.confidence,
      score: Math.round(x.score),
      sourceUrl: `${NINJA_BASE}/poe2/economy/${LEAGUE}/${categoryPageSlug(x.category)}`,
      wikiUrl: x.bucket ? x.bucket.wikiUrl : '',
      risk: x.riskNote,
    }));

  // --- STEP 2: topRisingItems — display/fallback list เท่านั้น, สร้างจาก marketItems ---
  // ห้ามใช้ตัวนี้เป็นต้นทางคำนวณ content recommendation
  const topRising = marketItems
    .filter((x) => typeof x.trend7d === 'number' && (x.volume || 0) >= MIN_VOLUME_DIVINE)
    .sort((a, b) => b.trend7d - a.trend7d)
    .slice(0, TOP_RISING_COUNT);

  // --- STEP 3: contentRecommendations — วนทุก bucket ที่รองรับ ไม่ใช่แค่ bucket ที่มีไอเทม ---
  const contentRecommendations = CONTENT_BUCKETS.map((bucket) => {
    const evidence = marketItems
      .filter((x) => x.contentKey === bucket.contentKey)
      .sort((a, b) => b.score - a.score || b.value - a.value || (b.trend7d || 0) - (a.trend7d || 0));

    if (evidence.length === 0) {
      return {
        contentKey: bucket.contentKey,
        displayName: bucket.displayName,
        farmScore: 0,
        confidence: bucket.confidence,
        status: bucket.noEvidenceStatus,
        evidenceItems: [],
        relatedItems: [],
        risk: '',
        sourceUrls: bucket.sourceUrls,
      };
    }

    const top = evidence.slice(0, EVIDENCE_ITEM_COUNT);
    const avgScore = top.reduce((s, x) => s + x.score, 0) / top.length;
    const bestItemBonus = top[0].score * 0.05;      // เล็กน้อย: ให้เครดิตไอเทมเด่นสุด
    const countBonus = Math.min(10, evidence.length * 2); // เล็กน้อย: มี evidence เยอะ = มั่นใจขึ้น
    const riskiest = top.find((x) => x.risk);
    const riskPenalty = riskiest ? 5 : 0;
    const farmScore = Math.round(clamp(avgScore + bestItemBonus + countBonus - riskPenalty, 0, 100));

    return {
      contentKey: bucket.contentKey,
      displayName: bucket.displayName,
      farmScore,
      confidence: bucket.confidence,
      status: `${evidence.length} priced item(s) mapped to this content`, // 0.79: ไม่มีเกณฑ์ 1D+ แล้ว
      evidenceItems: top.map((x) => ({
        name: x.name,
        value: x.value,
        valueCurrency: x.valueCurrency,
        trend7d: x.trend7d,
        volumeScore: x.volumeScore,
        liquidityLabel: x.liquidityLabel,
        score: x.score,
        sourceUrl: x.sourceUrl,
      })),
      relatedItems: top.map((x) => x.name), // backward compat กับหน้าเว็บเก่า
      risk: riskiest ? riskiest.risk : '',
      sourceUrls: [
        `${NINJA_BASE}/poe2/economy/${LEAGUE}/${categoryPageSlug(bucket.categories[0] || '')}`,
        ...bucket.sourceUrls,
      ].filter(Boolean),
    };
  });
  contentRecommendations.sort((a, b) => b.farmScore - a.farmScore);

  const out = {
    version: 1,
    league: LEAGUE,
    updatedAt: new Date().toISOString(),
    source: {
      name: 'poe.ninja',
      url: `${NINJA_BASE}/poe2/economy/${LEAGUE}/currency`,
    },
    marketItems,
    topRisingItems: topRising,
    contentRecommendations,
    errors,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
  const withEvidence = contentRecommendations.filter((c) => c.evidenceItems.length > 0).length;
  console.log(`wrote ${OUT_FILE}: ${marketItems.length} marketItems (all prices, 0.79), ${topRising.length} rising items, ${contentRecommendations.length} content buckets (${withEvidence} with evidence), ${errors.length} errors`);

  // --- STEP 4: price history — ต่อจุดราคาสะสมไว้ให้ frontend วาด sparkline (patch 0.61) ---
  updatePriceHistory(marketItems);
}

// เก็บประวัติราคาแบบต่อจุด (append) ต่อชื่อไอเทม — สูงสุด HISTORY_MAX จุด (รายชั่วโมง ≈ 1 สัปดาห์)
// ไฟล์เล็ก: t = epoch วินาที, v = ราคา Divine · ถ้ายังไม่มีไฟล์จะ seed จุดแรกจากค่าปัจจุบัน
const HISTORY_FILE = join(__dirname, '..', 'data', 'price-history.json');
const HISTORY_MAX = 168;
const HISTORY_MIN_GAP_SEC = 30 * 60; // กันจุดถี่เกิน (รันซ้ำ/ถี่) — เว้นอย่างน้อย 30 นาที
function updatePriceHistory(marketItems) {
  let hist = { updatedAt: null, points: {} };
  try {
    const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
    if (raw && typeof raw === 'object' && raw.points && typeof raw.points === 'object') hist = raw;
  } catch (e) { /* ยังไม่มีไฟล์ — เริ่มใหม่ */ }
  const nowSec = Math.floor(Date.now() / 1000);
  const names = new Set();
  marketItems.forEach((it) => {
    if (!it || typeof it.value !== 'number' || !it.name) return;
    // 0.79: marketItems รวมของทุกราคาแล้ว (~1,300+) — history เก็บเฉพาะ ≥ HISTORY_MIN_VALUE_DIVINE กันไฟล์บวม
    if (it.value < HISTORY_MIN_VALUE_DIVINE) return;
    names.add(it.name);
    const arr = Array.isArray(hist.points[it.name]) ? hist.points[it.name] : [];
    const last = arr[arr.length - 1];
    if (last && nowSec - last.t < HISTORY_MIN_GAP_SEC) {
      last.v = round2(it.value); // ยังไม่ถึงเวลา → อัปเดตจุดล่าสุดแทนการเพิ่ม
    } else {
      arr.push({ t: nowSec, v: round2(it.value) });
    }
    hist.points[it.name] = arr.slice(-HISTORY_MAX);
  });
  // ล้างไอเทมที่หายจากตลาดไปนานแล้ว (ไม่มีในรอบนี้ + จุดสุดท้ายเก่ากว่า 8 วัน)
  Object.keys(hist.points).forEach((name) => {
    if (names.has(name)) return;
    const arr = hist.points[name];
    const last = arr && arr[arr.length - 1];
    if (!last || nowSec - last.t > 8 * 86400) delete hist.points[name];
  });
  hist.updatedAt = new Date().toISOString();
  writeFileSync(HISTORY_FILE, JSON.stringify(hist) + '\n');
  console.log(`wrote ${HISTORY_FILE}: ${Object.keys(hist.points).length} items tracked`);
}

// ---------------------------------------------------------------------------
// data/market-prices.json — ราคาครบทุกหมวดทุกชิ้น (2026-07-23, docs/LIVE_TRACKER_PLAN.md A1)
// แยกไฟล์จาก market-radar.json โดยตั้งใจ: radar = scoring (เกณฑ์ ≥1 Div, สูตรห้ามแตะ) ·
// prices = ราคาดิบทุกชิ้นสำหรับ price lookup / Live Farm Session (โหลด lazy ฝั่งเว็บ)
// ---------------------------------------------------------------------------
const PRICES_FILE = join(__dirname, '..', 'data', 'market-prices.json');
function writeMarketPrices(priceItems, categoryCounts, errors) {
  // กัน id ซ้ำข้ามหมวด (ไอเทมเดียวกันโผล่หลาย overview ได้ เช่น Divine Orb) — เก็บตัวแรกพอ
  const seen = new Set();
  const items = priceItems
    .filter((x) => {
      const key = x.id + '|' + x.category;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((x) => ({
      id: x.id,
      name: x.name,
      icon: x.icon,
      category: x.category,
      valueDiv: round2(x.value),                                  // หน่วย divine เสมอ (core.primary)
      trend7d: x.trend7d === null ? null : round2(x.trend7d),
      volumeDiv: x.volume === null ? null : round2(x.volume),
    }));

  // ดึงไม่ได้เลยทั้งรอบ → คงไฟล์เดิม (แบบเดียวกับ radar) ดีกว่าเขียนไฟล์ว่างทับของดี
  if (items.length === 0) {
    console.error('market-prices: no items fetched — keeping previous file');
    return;
  }

  const skippedCategories = Object.keys(categoryCounts).filter((c) => categoryCounts[c] === 0);
  const out = {
    version: 1,
    league: LEAGUE,
    updatedAt: new Date().toISOString(),
    source: { name: 'poe.ninja', url: `${NINJA_BASE}/poe2/economy/${LEAGUE}/currency` },
    categories: categoryCounts,   // ชื่อหมวด → จำนวน items (-1 = fetch พัง, 0 = หมวดว่าง/ชื่อไม่ตรง)
    skippedCategories,
    errors,
    items,
  };
  mkdirSync(dirname(PRICES_FILE), { recursive: true });
  writeFileSync(PRICES_FILE, JSON.stringify(out) + '\n'); // ไม่ pretty-print — ไฟล์ใหญ่ ประหยัดขนาด
  console.log(`wrote ${PRICES_FILE}: ${items.length} items across ${Object.keys(categoryCounts).length} categories (${skippedCategories.length} skipped)`);
}

main().catch((err) => {
  // กันเคสผิดพลาดไม่คาดคิด: log แล้วจบด้วย exit 1 ให้ Actions เตือน
  console.error(err);
  process.exit(1);
});
