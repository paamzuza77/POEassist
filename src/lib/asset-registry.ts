// P5 Phase 3 (patch 0.65) — Game asset registry, ported from js/asset-registry.js to TypeScript.
// Logic byte-identical. Built into js/ea.js (window.EA) and loaded before the monolith.
//
// กติกา (อย่าทำให้หลวมกว่านี้): จับคู่ด้วยตารางที่ตรวจด้วยมือเท่านั้น (ASSET_ALIASES) — ห้าม fuzzy;
// ไม่มีในตาราง = ไม่มีไอคอน (UI เดิมทำงานต่อได้; ข้อความ label อยู่ครบเสมอ). รูปเป็นของประกอบ
// (aria-hidden + alt=""), โหลดพัง = ซ่อนเงียบ ๆ (listener ท้ายไฟล์). ศิลป์ทั้งหมด © Grinding Gear Games.

export interface GameAsset {
  file: string;
  label: string;
}
export interface LocalAsset {
  key: string;
  file: string;
  label: string;
  src: string;
}
export interface RenderAssetOpts {
  size?: 'sm' | 'md' | 'lg';
  lazy?: boolean;
  className?: string;
}

const ASSET_BASE = 'image/';

// key → ไฟล์จริงใน image/ (ชื่อไฟล์คงเดิม)
export const GAME_ASSETS: Record<string, GameAsset> = {
  divine:        { file: 'divine.webp',                 label: 'Divine Orb' },
  chaos:         { file: 'chaos.webp',                  label: 'Chaos Orb' },
  exalted:       { file: 'exalt.webp',                  label: 'Exalted Orb' },
  mirror:        { file: 'mirror.webp',                 label: 'Mirror of Kalandra' },
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

// ชื่อที่ยอมให้จับคู่ → key ด้านบน · ทุกบรรทัดตรวจกับข้อมูลจริงแล้ว (codex / radar buckets / FARM_*)
export const ASSET_ALIASES: Record<string, string> = {
  'divine': 'divine', 'div': 'divine', 'dv': 'divine', 'divine orb': 'divine',
  'chaos orb': 'chaos', 'c': 'chaos',
  'exalted': 'exalted', 'exalt': 'exalted', 'ex': 'exalted', 'exalted orb': 'exalted',
  'mirror': 'mirror', 'mirror of kalandra': 'mirror',
  'abyss': 'abyss',
  'breach': 'breach',
  'ritual': 'ritual',
  'delirium': 'delirium',
  'expedition': 'expedition',
  'waystone': 'waystone', 'waystones mapping': 'waystone',
  'the trialmaster': 'trialchaos', 'trial of chaos': 'trialchaos', 'the trial of chaos': 'trialchaos',
  'zarokh the temporal': 'trialsekhemas', 'trial of the sekhemas': 'trialsekhemas',
  'atziri': 'atziri', 'atziri the red queen': 'atziri',
};

// จงใจ "ไม่" จับคู่: chaos (คำเดียว = ธาตุ Chaos ใน Keyword Codex ไม่ใช่ Chaos Orb),
//   simulacrum/essence/strongbox/runes/fragments (ไม่มีไฟล์), trial_soulcores (trial 2 ใบ เลือกไม่ได้).

// Market Radar: contentKey ของ bucket → key ใน GAME_ASSETS (ตรวจกับ data/market-radar.json แล้ว)
export const RADAR_ASSET_BY_KEY: Record<string, string> = {
  ritual: 'ritual',
  abyss: 'abyss',
  expedition: 'expedition',
  delirium: 'delirium',
  breach: 'breach',
  waystones_mapping: 'waystone',
};

export function normalizeAssetKey(name: unknown): string {
  return String(name == null ? '' : name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ') // ตัด comma/slash/จุด — "Atziri, the Red Queen" → "atziri the red queen"
    .replace(/\s+/g, ' ')
    .trim();
}

// คืน { key, file, label, src } ถ้าจับคู่ได้ · ไม่ได้ = null (caller ต้องคง UI เดิมไว้)
export function getLocalAssetForName(name: unknown): LocalAsset | null {
  const key = ASSET_ALIASES[normalizeAssetKey(name)];
  if (!key) return null;
  const def = GAME_ASSETS[key];
  if (!def) return null;
  return { key, file: def.file, label: def.label, src: ASSET_BASE + encodeURIComponent(def.file) };
}

// คืน HTML ของ <img> หรือ '' ถ้าไม่มีรูป · size: 'sm' (16px) | 'md' (22px) | 'lg' (40px thumbnail)
export function renderAssetIcon(name: unknown, opts?: RenderAssetOpts): string {
  const o = opts || {};
  const asset = getLocalAssetForName(name);
  if (!asset) return '';
  const size = o.size && ['sm', 'md', 'lg'].includes(o.size) ? o.size : 'sm';
  const lazy = o.lazy === false ? '' : ' loading="lazy" decoding="async"';
  const cls = 'game-ico game-ico-' + size + (o.className ? ' ' + o.className : '');
  return '<img class="' + cls + '" src="' + asset.src + '" alt="" aria-hidden="true"' + lazy +
    ' title="' + asset.label.replace(/"/g, '&quot;') + '">';
}

// รูปโหลดไม่ขึ้น → ซ่อนเงียบ ๆ (capture เพราะ error ของ <img> ไม่ bubble). side effect ตอน ea.js โหลด.
document.addEventListener(
  'error',
  (ev: Event) => {
    const el = ev.target as HTMLElement | null;
    if (el && el.tagName === 'IMG' && el.classList.contains('game-ico')) el.style.display = 'none';
  },
  true,
);
