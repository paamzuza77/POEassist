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

// หมวดที่จะดึงจาก poe.ninja — เพิ่ม/ลบชื่อหมวดได้ที่นี่
// (ชื่อต้องตรงกับพารามิเตอร์ type ของ API เช่นเดียวกับ path ในหน้าเว็บ poe.ninja)
// หมวดไหนดึงพลาดจะถูกบันทึกลง errors[] แต่ไม่ทำให้ทั้ง script ล้ม
const CATEGORIES = [
  'Currency', 'Fragments', 'Abyss', 'Runes', 'Ritual', 'Delirium',
  'Breach', 'SoulCores', 'Essences', 'Expedition', 'Verisium',
];

// จับคู่หมวดไอเทม → เนื้อหาที่ควรไปฟาร์ม (แก้/เพิ่มได้ตามใจ)
// confidence = ความมั่นใจว่าไอเทมหมวดนี้มาจาก content นี้จริง (0-1)
// หมวดที่ไม่อยู่ใน map นี้ (เช่น Currency) จะโชว์ใน Top Rising ได้
// แต่ไม่ถูกนำไปคิดเป็น content recommendation
const CONTENT_MAP = {
  Runes: {
    content: 'Runes of Aldur / Ezomyte Remnants',
    contentKey: 'runes',
    confidence: 0.9,
    wikiUrl: '',
    sourceUrls: [],
  },
  Breach: {
    content: 'Breach',
    contentKey: 'breach',
    confidence: 0.95,
    wikiUrl: '',
    sourceUrls: [],
  },
  Delirium: {
    content: 'Delirium',
    contentKey: 'delirium',
    confidence: 0.95,
    wikiUrl: '',
    sourceUrls: [],
  },
  Ritual: {
    content: 'Ritual',
    contentKey: 'ritual',
    confidence: 0.9,
    wikiUrl: '',
    sourceUrls: [],
  },
  Abyss: {
    content: 'Abyss',
    contentKey: 'abyss',
    confidence: 0.85,
    wikiUrl: '',
    sourceUrls: [],
  },
  Expedition: {
    content: 'Expedition',
    contentKey: 'expedition',
    confidence: 0.85,
    wikiUrl: '',
    sourceUrls: [],
  },
  SoulCores: {
    content: 'Soul Core related content',
    contentKey: 'soulcores',
    confidence: 0.75,
    wikiUrl: '',
    sourceUrls: [],
  },
  Essences: {
    content: 'Essence farming',
    contentKey: 'essences',
    confidence: 0.8,
    wikiUrl: '',
    sourceUrls: [],
  },
  Fragments: {
    content: 'Boss / Fragment content',
    contentKey: 'fragments',
    confidence: 0.75,
    wikiUrl: '',
    sourceUrls: [],
  },
  Verisium: {
    content: 'Verisium content',
    contentKey: 'verisium',
    confidence: 0.6,
    wikiUrl: '',
    sourceUrls: [],
  },
};

const TOP_RISING_COUNT = 12;   // จำนวนไอเทมในกล่อง Top Rising
const RELATED_ITEM_COUNT = 4;  // จำนวนไอเทมตัวอย่างต่อ content card
const MIN_VOLUME_DIVINE = 0.5; // ไอเทมที่ volume ต่ำกว่านี้ (หน่วย divine) ไม่เอาเข้า Top Rising

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

// ---------------------------------------------------------------------------
// 🧮 Farm Score — สูตรคะแนน (0-100, "คะแนนความน่าฟาร์ม" ไม่ใช่ % drop chance)
//
//   score = trendScore*0.40 + priceScore*0.25 + volumeScore*0.20
//         + confidenceScore*0.15 - riskPenalty
//
// - trendScore:  %เปลี่ยนราคา 7 วัน → 0-100 (0% = 50 คะแนน, +40% ขึ้นไป = 100)
// - priceScore:  ราคา (log scale กัน outlier ราคาโหดๆ ดันคะแนนเกินจริง)
// - volumeScore: ปริมาณเทรด (log scale) — ไม่มีข้อมูล = 50 (neutral)
// - confidence:  ความมั่นใจของ CONTENT_MAP
// - riskPenalty: หักถ้าสภาพคล่องต่ำ/ราคาจิ๋วมาก (ขายจริงยาก)
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
  let penalty = 0;
  const notes = [];
  if (typeof item.volume === 'number' && item.volume > 0 && item.volume < 5) {
    penalty += 10;
    notes.push('Low liquidity');
  }
  if (typeof item.value === 'number' && item.value < 0.005) {
    penalty += 5;
    notes.push('Very cheap per unit — needs bulk selling');
  }
  if (typeof item.trend7d === 'number' && item.trend7d > 100) {
    penalty += 5;
    notes.push('Spiking hard — price may correct');
  }
  return { penalty, note: notes.join('; ') };
}

function itemFarmScore(item, confidence) {
  const risk = riskInfo(item);
  const raw =
    trendScore(item.trend7d) * 0.40 +
    priceScore(item.value) * 0.25 +
    volumeScore(item.volume) * 0.20 +
    clamp(confidence, 0, 1) * 100 * 0.15 -
    risk.penalty;
  return { score: clamp(raw, 0, 100), risk };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const errors = [];
  const allItems = [];

  let version = null;
  try {
    version = await getSnapshotVersion();
    console.log(`snapshot version: ${version}`);
  } catch (err) {
    errors.push(`index-state: ${err.message}`);
  }

  if (version) {
    for (const cat of CATEGORIES) {
      try {
        const items = await fetchCategory(version, cat);
        console.log(`${cat}: ${items.length} items`);
        allItems.push(...items);
      } catch (err) {
        // หมวดไหนพัง ข้ามหมวดนั้น — จดไว้ใน errors ให้หน้าเว็บโชว์เตือน
        errors.push(`${cat}: ${err.message}`);
      }
      // เว้นจังหวะเล็กน้อย ไม่ยิงรัว
      await new Promise((r) => setTimeout(r, 250));
    }
  }

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
      topRisingItems: [],
      contentRecommendations: [],
      errors: [],
    };
    out.errors = errors;
    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
    return;
  }

  // --- คะแนนรายไอเทม ---
  const scored = allItems.map((item) => {
    const mapping = CONTENT_MAP[item.category] || null;
    const confidence = mapping ? mapping.confidence : 0.5;
    const { score, risk } = itemFarmScore(item, confidence);
    return { ...item, mapping, confidence, score, riskPenalty: risk.penalty, riskNote: risk.note };
  });

  // --- A) Top Rising: เรียงตาม %7d จากมากไปน้อย กรอง volume ต่ำทิ้ง ---
  const topRising = scored
    .filter((x) => typeof x.trend7d === 'number' && (x.volume || 0) >= MIN_VOLUME_DIVINE)
    .sort((a, b) => b.trend7d - a.trend7d)
    .slice(0, TOP_RISING_COUNT)
    .map((x) => ({
      name: x.name,
      category: x.category,
      icon: x.icon,
      value: round2(x.value),
      valueCurrency: 'Divine',
      trend7d: round2(x.trend7d),
      volumeScore: round2(volumeScore(x.volume) / 100),
      liquidityLabel: liquidityLabel(x.volume),
      mappedContent: x.mapping ? x.mapping.content : '',
      contentKey: x.mapping ? x.mapping.contentKey : '',
      confidence: x.confidence,
      sourceUrl: `${NINJA_BASE}/poe2/economy/${LEAGUE}/${x.category.toLowerCase()}`,
      wikiUrl: x.mapping ? x.mapping.wikiUrl : '',
      risk: x.riskNote,
    }));

  // --- B) Content recommendations: คะแนนเฉลี่ยของไอเทมท็อป 5 ในแต่ละหมวดที่ map ไว้ ---
  const contentRecommendations = [];
  for (const [category, mapping] of Object.entries(CONTENT_MAP)) {
    const catItems = scored
      .filter((x) => x.category === category)
      .sort((a, b) => b.score - a.score);
    if (catItems.length === 0) continue;

    const top = catItems.slice(0, 5);
    const avgScore = top.reduce((s, x) => s + x.score, 0) / top.length;
    const risers = catItems.filter((x) => (x.trend7d || 0) > 20);
    const avgTrend = top.reduce((s, x) => s + (x.trend7d || 0), 0) / top.length;
    const goodLiq = catItems.filter((x) => (x.volume || 0) >= 100).length;

    const reason = [
      `${risers.length} รายการในหมวดนี้ราคาขึ้น >20% ใน 7 วัน`,
      `เทรนด์เฉลี่ยของไอเทมท็อป: ${avgTrend >= 0 ? '+' : ''}${round2(avgTrend)}% (7d)`,
      goodLiq > 0
        ? `${goodLiq} รายการมีปริมาณเทรดสูง ขายออกง่าย`
        : 'ปริมาณเทรดโดยรวมยังต่ำ ขายอาจช้า',
    ];

    const riskiest = top.find((x) => x.riskNote);
    contentRecommendations.push({
      content: mapping.content,
      contentKey: mapping.contentKey,
      score: Math.round(clamp(avgScore, 0, 100)),
      confidence: mapping.confidence,
      relatedItems: top.slice(0, RELATED_ITEM_COUNT).map((x) => x.name),
      reason,
      risk: riskiest ? riskiest.riskNote : '',
      sourceUrls: [
        `${NINJA_BASE}/poe2/economy/${LEAGUE}/${category.toLowerCase()}`,
        ...mapping.sourceUrls,
      ],
    });
  }
  contentRecommendations.sort((a, b) => b.score - a.score);

  const out = {
    version: 1,
    league: LEAGUE,
    updatedAt: new Date().toISOString(),
    source: {
      name: 'poe.ninja',
      url: `${NINJA_BASE}/poe2/economy/${LEAGUE}/currency`,
    },
    topRisingItems: topRising,
    contentRecommendations,
    errors,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${OUT_FILE}: ${topRising.length} rising items, ${contentRecommendations.length} recommendations, ${errors.length} errors`);
}

main().catch((err) => {
  // กันเคสผิดพลาดไม่คาดคิด: log แล้วจบด้วย exit 1 ให้ Actions เตือน
  console.error(err);
  process.exit(1);
});
