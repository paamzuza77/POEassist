// P5 Phase 4 (patch 0.70) — Resistance Checker display helper, ported from index.html.
// Pure (input → string). Byte-identical logic. DOM stays in the monolith.
import { CAP } from '../lib/constants';

// แสดงค่าต้านทาน: เกิน cap → "75%(ค่าจริง%)" · ไม่เกิน → เติม "+" ถ้าเป็นบวก
export function formatResValue(total: number): string {
  if (total > CAP) return `${CAP}%(${total}%)`;
  return (total > 0 ? '+' : '') + total + '%';
}
