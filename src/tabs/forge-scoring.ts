// P5 Phase 4 (patch 0.73) — Resistance Checker (forge) scoring "brain", ported from index.html.
// The mutable/state deps (forgeTargets, the STATS list, the filled-slot count, the slot count) are
// passed in as arguments so the functions stay pure; CAP/PENALTY come from constants. Byte-identical
// logic — the Readiness/Missing/Reco math is a product rule; DOM render stays in the monolith.
import { CAP, PENALTY } from '../lib/constants';

export interface ForgeTargets { elemental: number; chaos: number; rarity: number; }
// STATS entry — เฉพาะ field ที่ scoring แตะ (ตัวจริงมี color/glow ด้วย — ไม่ยุ่ง)
export interface StatDef { key: string; label: string; group: string; [k: string]: unknown; }
export interface ForgeMissing {
  key: string; label: string; group: string;
  current: number; target: number; shortBy: number; status: string; cls: string;
}
export interface ForgeReadinessPart { label: string; pts: number; max: number; }
export interface ForgeReadiness { score: number; filled: number; parts: ForgeReadinessPart[]; }
export interface ForgeReco { cls: string; text: string; }

// เป้าของแต่ละค่า: chaos/rarity ตรงตัว · ธาตุใช้เป้า elemental ร่วม
export function forgeTargetFor(statKey: string, forgeTargets: ForgeTargets): number {
  if (statKey === 'chaos') return forgeTargets.chaos;
  if (statKey === 'rarity') return forgeTargets.rarity;
  return forgeTargets.elemental;
}

// ความคืบหน้า 0..1 จาก floor → target (กัน target <= floor) — module-internal
function forgeProgress(current: number, floor: number, target: number): number {
  if (target <= floor) return current >= target ? 1 : 0;
  return Math.max(0, Math.min(1, (current - floor) / (target - floor)));
}

// สถานะรายค่า: ready/capped (เขียว) · short +X (ส้ม) · optional (จาง สำหรับ rarity)
export function computeForgeMissing(totals: Record<string, number>, stats: StatDef[], forgeTargets: ForgeTargets): ForgeMissing[] {
  return stats.map((s) => {
    const target = forgeTargetFor(s.key, forgeTargets);
    const current = totals[s.key];
    const shortBy = Math.max(0, Math.ceil(target - current));
    let status: string, cls: string;
    if (s.key === 'rarity') {
      if (target <= 0) { status = 'tracking only'; cls = 'opt'; }
      else if (current >= target) { status = 'ready'; cls = 'ready'; }
      else { status = '+' + shortBy + ' to target'; cls = 'opt'; }
    } else if (current >= target) {
      status = current >= CAP ? 'capped' : 'ready';
      cls = 'ready';
    } else {
      status = 'short +' + shortBy;
      cls = 'short';
    }
    return { key: s.key, label: s.label, group: s.group, current, target, shortBy, status, cls };
  });
}

// Readiness Score 0-100 (สูตรโปร่งใส): Elemental 45 (ธาตุละ 15, วัดจาก penalty → เป้า)
// + Chaos 20 + Rarity 15 (เป้า ≤ 0 = tracking only ให้เต็ม) + ช่องอุปกรณ์ที่มีข้อมูล 20 (10 ช่องหลัก)
// filled = จำนวนช่องที่มีข้อมูล (คำนวณจาก slotHasAnyData ใน monolith), slotCount = EQUIP_SLOTS.length
export function computeForgeReadiness(totals: Record<string, number>, forgeTargets: ForgeTargets, filled: number, slotCount: number): ForgeReadiness {
  let elem = 0;
  (['fire', 'cold', 'lightning'] as const).forEach((k) => {
    elem += 15 * forgeProgress(totals[k], PENALTY, forgeTargets.elemental);
  });
  const chaosT = forgeTargets.chaos;
  const chaos = 20 * (chaosT <= 0 ? (totals.chaos >= chaosT ? 1 : 0) : forgeProgress(totals.chaos, 0, chaosT));
  const rarT = forgeTargets.rarity;
  const rarity = 15 * (rarT <= 0 ? 1 : forgeProgress(totals.rarity, 0, rarT));
  const gear = 20 * (filled / slotCount);
  return {
    score: Math.max(0, Math.min(100, Math.round(elem + chaos + rarity + gear))),
    filled,
    parts: [
      { label: 'Elemental', pts: Math.round(elem), max: 45 },
      { label: 'Chaos', pts: Math.round(chaos), max: 20 },
      { label: 'Rarity', pts: Math.round(rarity), max: 15 },
      { label: 'Gear Filled', pts: Math.round(gear), max: 20 },
    ],
  };
}

// คำแนะนำสั้นๆ: ธาตุที่ขาดมากสุดก่อน → chaos → rarity → ช่องว่าง; ครบหมด = ข้อความพร้อมใช้
// slotCount = EQUIP_SLOTS.length (เดิมอ่านตรงจาก EQUIP_SLOTS.length)
export function buildForgeRecos(missing: ForgeMissing[], readiness: ForgeReadiness, slotCount: number): ForgeReco[] {
  const recos: ForgeReco[] = [];
  const elemShort = missing.filter((m) =>
    (m.key === 'fire' || m.key === 'cold' || m.key === 'lightning') && m.current < m.target);
  if (elemShort.length) {
    const worst = elemShort.reduce((a, b) => (b.shortBy > a.shortBy ? b : a));
    recos.push({ cls: 'short', text: 'เติม ' + worst.label.replace(' Resistance', '') + ' ก่อน — ขาดอีก +' + worst.shortBy + '%' });
    const rest = elemShort.filter((m) => m !== worst);
    if (rest.length) {
      recos.push({ cls: 'short', text: 'ธาตุอื่นที่ยังขาด: ' + rest.map((m) => m.label.replace(' Resistance', '') + ' +' + m.shortBy + '%').join(' · ') });
    }
  }
  const chaos = missing.find((m) => m.key === 'chaos');
  if (chaos && chaos.current < chaos.target) {
    recos.push({ cls: 'short', text: 'Chaos ยังขาด +' + chaos.shortBy + '% (เป้า ' + chaos.target + '%)' });
  }
  const rar = missing.find((m) => m.key === 'rarity');
  if (rar && rar.target > 0 && rar.current < rar.target) {
    recos.push({ cls: 'opt', text: 'Rarity อีก +' + rar.shortBy + '% ถึงเป้า ' + rar.target + '% (nice to have)' });
  }
  if (!recos.length) recos.push({ cls: 'ready', text: '✓ เป้าหมายหลักครบแล้ว — ชุดนี้พร้อมใช้งาน' });
  if (readiness.filled < slotCount) {
    recos.push({ cls: 'opt', text: 'ช่องอุปกรณ์ที่ยังไม่มีข้อมูล: ' + (slotCount - readiness.filled) + '/' + slotCount + ' ช่อง' });
  }
  return recos;
}
