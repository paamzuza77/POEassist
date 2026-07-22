// P5 Phase 4 (patch 0.72) — Gear Planner shop logic, ported from index.html.
// isBought/rowEstPrice are pure row predicates; shopBuyNextCandidates reads the mutable shopRows
// list, so shopRows is passed in as an argument. Byte-identical logic. DOM render stays in the monolith.

// แถวใน Gear Planner — เฉพาะ field ที่ logic กลุ่มนี้แตะ (แถวจริงมี field อื่น name/type/option/slot ฯลฯ — ไม่ยุ่ง)
export interface ShopRow {
  min?: number;
  max?: number;
  dealPrice?: number;
  bought?: number;
  checked?: boolean;
  [k: string]: unknown;
}

// ซื้อแล้วหรือยัง — มีราคาที่ซื้อจริง (ตัวเลข) เก็บไว้
export function isBought(row: ShopRow): boolean {
  return typeof row.bought === 'number' && !isNaN(row.bought);
}

// ราคาที่คาดว่าจะจ่ายจริงของแถว: deal ที่เซฟไว้ > Min > Max (ใช้กับแถบ "ซื้อต่อไป")
export function rowEstPrice(row: ShopRow): number | null {
  if (typeof row.dealPrice === 'number' && !isNaN(row.dealPrice)) return row.dealPrice;
  if (typeof row.min === 'number' && !isNaN(row.min)) return row.min;
  if (typeof row.max === 'number' && !isNaN(row.max)) return row.max;
  return null;
}

// คิว "ซื้อต่อไป": แถวที่ยังไม่ซื้อ + มีราคา — แถวที่ติ๊กมาร์กสำคัญกว่า (มาก่อน) จากนั้นถูกสุดก่อน
export function shopBuyNextCandidates(shopRows: ShopRow[]): ShopRow[] {
  const candidates = shopRows.filter((r) => !isBought(r) && rowEstPrice(r) !== null);
  // เดิม (b.checked===true)-(a.checked===true) และ rowEstPrice(a)-rowEstPrice(b) — Number()/! ให้ TS ผ่าน ผลลัพธ์เท่าเดิม
  candidates.sort((a, b) => (Number(b.checked === true) - Number(a.checked === true)) || (rowEstPrice(a)! - rowEstPrice(b)!));
  return candidates;
}
