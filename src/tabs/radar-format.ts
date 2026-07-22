// P5 Phase 4 (patch 0.68) — Market Radar display helpers, ported from index.html.
// Pure (input → string / SVG string). Byte-identical logic. DOM insertion stays in the monolith.
// patch 0.71: the two radarData-dependent helpers moved here too — radarData is passed in as an argument.
import type { RadarReco } from './radar-scoring';
import { RADAR_FRESH_HOURS } from '../lib/constants';

export interface PricePoint {
  t?: number;
  v?: number;
}

// จัดรูปมูลค่า: ≥100 = ปัดจำนวนเต็ม+คั่นพัน · ≥1 = 2 ตำแหน่ง · <1 = 2 นัยสำคัญ · ไม่ใช่ตัวเลข = '—'
export function radarFmtValue(v: unknown, cur?: string): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  const num = v >= 100 ? Math.round(v).toLocaleString('en-US')
    : v >= 1 ? v.toFixed(2)
    : v.toPrecision(2);
  return num + ' ' + (cur || 'Div');
}

// SVG sparkline จิ๋วจากจุดราคา [{t,v}] — ต้องมี ≥2 จุด (คืน null ถ้าน้อยกว่า) · เขียว/แดงตามขึ้น-ลงรวม
export function priceSparkline(points: unknown, w?: number, h?: number): string | null {
  if (!Array.isArray(points) || points.length < 2) return null;
  const vals = points.map((p) => (p as PricePoint).v).filter((v): v is number => typeof v === 'number');
  if (vals.length < 2) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = w || 64, H = h || 18, pad = 2;
  const stepX = (W - pad * 2) / (vals.length - 1);
  const pts = vals.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (H - pad * 2) * (1 - (v - min) / range);
    return (Math.round(x * 10) / 10) + ',' + (Math.round(y * 10) / 10);
  });
  const up = vals[vals.length - 1] >= vals[0];
  const color = up ? 'var(--ok, #4a4)' : 'var(--fire, #d33)';
  const last = pts[pts.length - 1].split(',');
  return '<svg class="price-spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
    '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="1.8" fill="' + color + '"/></svg>';
}

// ผลลัพธ์ signal ต่อการ์ด — group เดียว + ป้าย/หมายเหตุที่ renderRadar เอาไปแสดง
export interface RadarSignal {
  group: 'nosignal' | 'top' | 'watch' | 'rising' | 'stable';
  label: string | null;
  sub: string;
  note: string;
}

/* กลุ่ม/สัญญาณต่อการ์ด (การนำเสนอเท่านั้น — ไม่แตะสูตร score) — การ์ดหนึ่งใบอยู่กลุ่มหลักกลุ่มเดียว:
   - TOP PICK (ใบแรกที่มี evidence + score > 0)     → top
   - ไม่มี evidence                                  → nosignal ("No signal" ไม่ใช่ "ไม่มีค่า")
   - มี evidence แต่ score ปัดเป็น 0                 → watch (Low confidence)
   - เทรนด์เฉลี่ยไอเทมท็อป ≥ +5%                     → rising
   - เทรนด์เฉลี่ย ≤ −5%                              → watch (ราคากำลังลง)
   - ที่เหลือ (−5%..+5%)                             → stable (ราคานิ่ง = รายได้สม่ำเสมอ ไม่ใช่ศูนย์) */
export function radarSignalInfo(rc: RadarReco | null | undefined, isTopPick: boolean): RadarSignal {
  if (!rc || rc.hasEvidence === false) {
    return { group: 'nosignal', label: 'No signal', sub: 'INSUFFICIENT DATA',
      note: 'ไม่มีไอเทมราคาผ่านเกณฑ์ใน snapshot ปัจจุบัน — ไม่ได้แปลว่า content นี้ไม่มีค่า แค่ยังไม่มีหลักฐานราคา' };
  }
  if (isTopPick) return { group: 'top', label: null, sub: 'FARM SCORE', note: '' };
  const trend = typeof rc.avgTrend === 'number' ? rc.avgTrend : 0;
  if (!(rc.score > 0)) {
    return { group: 'watch', label: 'Low confidence', sub: 'WEAK SIGNAL',
      note: 'มีหลักฐานราคาแต่สัญญาณอ่อนจนคะแนนปัดเป็น 0 — จับตาไว้ก่อน' };
  }
  if (trend >= 5) return { group: 'rising', label: null, sub: 'FARM SCORE', note: 'ราคาไอเทมท็อปกำลังขึ้น (+' + trend.toFixed(1) + '% 7d)' };
  if (trend <= -5) return { group: 'watch', label: null, sub: 'FARM SCORE', note: 'ราคาไอเทมท็อปกำลังลง (' + trend.toFixed(1) + '% 7d) — จับตาก่อนลงแรง' };
  return { group: 'stable', label: null, sub: 'FARM SCORE', note: 'ราคาแทบไม่ขยับใน 7 วัน (' + (trend >= 0 ? '+' : '') + trend.toFixed(1) + '%) — รายได้ค่อนข้างนิ่ง' };
}

// ---- patch 0.71: radarData-dependent presentation helpers (radarData passed in, not read as global) ----

// รูปแบบ snapshot ขั้นต่ำที่ helper ต้องใช้ (radarData เต็มมี field อื่น ๆ — ไม่แตะ)
export interface RadarSnapshot {
  updatedAt?: string | number | Date | null;
  [k: string]: unknown;
}

export interface RadarConfidence {
  level: 'none' | 'high' | 'low' | 'medium';
  label: string;
  cls: string;
  why: string;
}

// อายุ snapshot เป็นชั่วโมง (จาก radarData.updatedAt) — null ถ้าไม่มี/พาร์สไม่ได้
export function radarSnapshotAgeHours(radarData: RadarSnapshot | null | undefined): number | null {
  const updated = radarData && radarData.updatedAt ? new Date(radarData.updatedAt) : null;
  if (!updated || isNaN(updated.getTime())) return null; // เดิม isNaN(updated) — isNaN(Date) coerces via getTime(), byte-identical
  return (Date.now() - updated.getTime()) / 3600000;
}

/* Confidence ต่อการ์ด — กติกาโปร่งใสจากข้อมูลที่มีอยู่แล้วเท่านั้น (เอกสารเต็มใน EDIT_GUIDE.md):
   - ไม่มี evidence (ไม่มีไอเทมผ่านเกณฑ์)                → No signal (missing data)
   - itemCount ≥ 3 และ mapping confidence ≥ 0.8 และ snapshot สด → High
   - itemCount < 2 หรือ mapping confidence < 0.6 หรือ snapshot เก่า/ไม่รู้อายุ → Low
   - ที่เหลือ → Medium */
export function radarConfidenceInfo(rc: RadarReco | null | undefined, radarData: RadarSnapshot | null | undefined): RadarConfidence {
  if (!rc || rc.hasEvidence === false) {
    return { level: 'none', label: 'No signal', cls: 'conf-none', why: 'ไม่มีไอเทมผ่านเกณฑ์ราคาใน snapshot นี้' };
  }
  const ageH = radarSnapshotAgeHours(radarData);
  const fresh = ageH !== null && ageH <= RADAR_FRESH_HOURS;
  const conf = typeof rc.confidence === 'number' ? rc.confidence : 0;
  const n = typeof rc.itemCount === 'number' ? rc.itemCount : 0;
  if (n >= 3 && conf >= 0.8 && fresh) {
    return { level: 'high', label: 'High', cls: 'conf-high', why: n + ' items · mapping ' + Math.round(conf * 100) + '% · snapshot fresh' };
  }
  if (n < 2 || conf < 0.6 || !fresh) {
    const why: string[] = [];
    if (n < 2) why.push('มีหลักฐานแค่ ' + n + ' item');
    if (conf < 0.6) why.push('mapping confidence ต่ำ (' + Math.round(conf * 100) + '%)');
    if (!fresh) why.push('snapshot เก่า');
    return { level: 'low', label: 'Low', cls: 'conf-low', why: why.join(' · ') };
  }
  return { level: 'medium', label: 'Medium', cls: 'conf-med', why: n + ' items · mapping ' + Math.round(conf * 100) + '%' };
}
