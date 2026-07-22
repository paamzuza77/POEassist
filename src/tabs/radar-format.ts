// P5 Phase 4 (patch 0.68) — Market Radar display helpers, ported from index.html.
// Pure (input → string / SVG string). Byte-identical logic. DOM insertion stays in the monolith.

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
