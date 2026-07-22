// P5 Phase 4 (patch 0.67) — Market Radar scoring "brain", ported from index.html to TypeScript.
// Pure functions (input → output, no DOM/global). LOGIC BYTE-IDENTICAL — this is the Farm Score
// formula; never change it here without an explicit product decision (see SKILL.md / EDIT_GUIDE.md).
// DOM rendering (renderRadar) stays in the monolith and calls these via window.EA.

export interface MarketItem {
  name?: string;
  value?: number;
  valueCurrency?: string;
  trend7d?: number | null;
  volumeScore?: number;
  liquidityLabel?: string;
  risk?: string;
  contentKey?: string;
  confidence?: number;
  mappedContent?: string;
  sourceUrl?: string;
  [k: string]: unknown; // snapshot อาจมี field เสริมอื่น ๆ — ไม่แตะ
}

export interface BucketMeta {
  contentKey: string;
  displayName?: string;
  confidence?: number;
  noEvidenceStatus?: string;
  status?: string;
  [k: string]: unknown;
}

export interface RadarReco {
  content: string;
  contentKey: string;
  score: number;
  confidence: number | null;
  relatedItems: Array<string | undefined>;
  reason: string[];
  status?: string;
  risk: string;
  sourceUrls: string[];
  hasEvidence: boolean;
  itemCount: number;
  avgTrend?: number;
  avgValue?: number;
  lowLiqCount?: number;
  trendKnownCount?: number;
}

// Farm Score ของไอเทมเดียว (0..1) — trend cap ±[-50,150], value log scale, volume, หัก low-liq/risk
export function radarItemScore(it: MarketItem): number {
  const t = Math.max(-50, Math.min(150, typeof it.trend7d === 'number' ? it.trend7d : 0));
  const trendScore = (t + 50) / 200;                              // 0..1
  const v = typeof it.value === 'number' && it.value > 0 ? it.value : 0;
  const valueScore = Math.min(1, Math.log10(1 + v * 10) / 2);     // log scale: ~10 Div = เต็ม
  const volScore = typeof it.volumeScore === 'number' ? Math.max(0, Math.min(1, it.volumeScore)) : 0.3;
  let s = trendScore * 0.45 + valueScore * 0.25 + volScore * 0.30;
  if (it.liquidityLabel === 'Low' && t > 100) s *= 0.75;          // spike + สภาพคล่องต่ำ = หักแรง
  else if (it.liquidityLabel === 'Low') s *= 0.9;
  if (it.risk) s *= 0.95;
  return Math.max(0, Math.min(1, s));
}

// จัดกลุ่ม marketItems (ที่ผ่านฟิลเตอร์) ตาม contentKey → Farm Score ต่อ content; แสดงทุก bucket ที่รองรับ
export function buildRadarRecos(items: MarketItem[], allBuckets?: BucketMeta[]): RadarReco[] {
  const groups = new Map<string, MarketItem[]>();
  items.forEach((it) => {
    if (!it.contentKey) return;
    if (!groups.has(it.contentKey)) groups.set(it.contentKey, []);
    groups.get(it.contentKey)!.push(it);
  });

  // รวม key ของทุก bucket ที่รองรับ (จาก snapshot) + key ที่โผล่จากไอเทมจริง กันตกหล่น
  const bucketMeta = new Map<string, BucketMeta>();
  (Array.isArray(allBuckets) ? allBuckets : []).forEach((b) => {
    if (b && b.contentKey) bucketMeta.set(b.contentKey, b);
  });
  groups.forEach((_, key) => {
    if (!bucketMeta.has(key)) bucketMeta.set(key, { contentKey: key, displayName: key });
  });

  const recos: RadarReco[] = [];
  bucketMeta.forEach((meta, key) => {
    const list = groups.get(key) || [];
    if (list.length === 0) {
      recos.push({
        content: meta.displayName || key,
        contentKey: key,
        score: 0,
        confidence: typeof meta.confidence === 'number' ? meta.confidence : null,
        relatedItems: [],
        reason: [],
        status: meta.noEvidenceStatus || meta.status || 'No qualifying 1D+ items in current snapshot',
        risk: '',
        sourceUrls: [],
        hasEvidence: false,
        itemCount: 0, // additive display field (patch 0.39)
      });
      return;
    }
    const scored = list.map((it) => ({ it, s: radarItemScore(it) })).sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 3);
    const avgScore = top.reduce((sum, x) => sum + x.s, 0) / top.length;
    const conf = Math.max(...list.map((x) => (typeof x.confidence === 'number' ? x.confidence : 0.7)));
    const avgTrend = top.reduce((sum, x) => sum + (x.it.trend7d || 0), 0) / top.length;
    const avgValue = top.reduce((sum, x) => sum + (x.it.value || 0), 0) / top.length;
    const lowLiq = list.filter((x) => x.liquidityLabel === 'Low').length;
    recos.push({
      content: list[0].mappedContent || meta.displayName || key,
      contentKey: key,
      score: Math.round(avgScore * conf * 100),
      confidence: conf,
      relatedItems: scored.slice(0, 4).map((x) => x.it.name),
      reason: [
        list.length + ' รายการผ่านเกณฑ์ราคาขั้นต่ำ',
        'เทรนด์เฉลี่ยไอเทมท็อป: ' + (avgTrend >= 0 ? '+' : '') + avgTrend.toFixed(1) + '% (7d)',
        'มูลค่าเฉลี่ยไอเทมท็อป: ' + avgValue.toFixed(2) + ' Div',
      ],
      risk: lowLiq > list.length / 2 ? 'ไอเทมส่วนใหญ่สภาพคล่องต่ำ — ราคา spike อาจย่อ' : '',
      sourceUrls: [...new Set(list.map((x) => x.sourceUrl).filter(Boolean))].slice(0, 2) as string[],
      hasEvidence: true,
      // additive display fields (patch 0.39) — ไม่กระทบสูตร score เดิม
      itemCount: list.length,
      avgTrend,
      avgValue,
      lowLiqCount: lowLiq,
      trendKnownCount: list.filter((x) => typeof x.trend7d === 'number').length,
    });
  });
  recos.sort((a, b) => {
    if (a.hasEvidence !== b.hasEvidence) return a.hasEvidence ? -1 : 1;
    return b.score - a.score;
  });
  return recos;
}
