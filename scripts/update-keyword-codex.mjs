// ============================================================================
// Keyword Codex — generator (poe2db.tw Keywords TH + US)
//
// ดึงหน้า Keywords ของ poe2db 2 ภาษา (แค่ 2 requests ต่อการรันหนึ่งครั้ง — สุภาพต่อต้นทาง):
//   https://poe2db.tw/th/Keywords  → ชื่อ keyword ภาษาไทย + คำอธิบายไทย
//   https://poe2db.tw/us/Keywords  → ชื่อ keyword ภาษาอังกฤษ
// แล้วเขียนไฟล์ static: data/keyword-codex.json
// หน้าเว็บ (index.html แท็บ Keyword Codex) อ่านไฟล์นั้นอย่างเดียว — เบราว์เซอร์ไม่เรียก poe2db ตรงๆ
//
// กติกาข้อมูล (สำคัญ):
// - "ไม่แปลชื่อ keyword เอง" — ชื่อไทยมาจากหน้า TH, ชื่ออังกฤษมาจากหน้า US เท่านั้น
// - จับคู่ TH/EN ด้วย slug ของลิงก์ (เช่น href="Physical_Damage") ซึ่งเป็น key เดียวกันทั้งสองภาษา
//   ถ้าฝั่งใดฝั่งหนึ่งไม่มี → เก็บชื่อดิบจากฝั่งที่มี + ติดธง needsReview (ไม่เดา)
// - คำอธิบายหลักเป็นภาษาไทย (descTh) — ถ้าไม่มีคำอธิบายไทย จะเก็บคำอธิบายอังกฤษจากหน้า US ไว้เป็น
//   fallback (descEn — เก็บ "เฉพาะ" entry ที่ไม่มีไทย เพื่อไม่ให้ไฟล์บวมเท่าตัว) + ธง descLang: th|en|none
//   (UI แสดงไทยก่อนเสมอ → อังกฤษเมื่อไม่มีไทย พร้อมป้าย EN fallback → ไม่มีทั้งคู่ = "ไม่มีคำอธิบาย")
// - หมวดหมู่ (cats) ไม่ได้มาจากต้นทาง — อนุมานแบบโปร่งใสด้วย keyword matching บนชื่อ/slug ภาษาอังกฤษ
//   (กติกาอยู่ใน KWC_CATEGORY_RULES ด้านล่าง) ใช้เป็น filter facet ใน UI เท่านั้น ไม่แตะข้อความต้นทาง
//
// โครงสร้างหน้า poe2db ที่ parse (ทั้ง 2 ภาษาเหมือนกัน):
//   <a href="SLUG" class="strong fontinSmallCaps">NAME</a><div class="fontinRegular">DESC_HTML</div>
// ลิงก์ keyword อื่นในคำอธิบายเป็น <a ... href="SLUG" class="KeywordPopups" ...> → ใช้ทำ related
//
// ถ้าดึง/parse ไม่สำเร็จ หรือได้ entry น้อยผิดปกติ → "ไม่เขียนทับไฟล์เดิม"
// ต้องใช้ Node 20+ (fetch ในตัว, ไม่มี dependency) — รันเอง: node scripts/update-keyword-codex.mjs
// (ตั้งใจไม่ใส่ใน GitHub Actions รายชั่วโมง — ข้อมูล keyword เปลี่ยนเฉพาะตอน patch ใหญ่)
// ============================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_NAME = 'poe2db.tw';
const SOURCE_TH = 'https://poe2db.tw/th/Keywords';
const SOURCE_EN = 'https://poe2db.tw/us/Keywords';
const MIN_ENTRIES = 100; // sanity: ถ้า parse ได้น้อยกว่านี้ ถือว่าโครงหน้าเปลี่ยน → ไม่เขียนทับ

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'data', 'keyword-codex.json');

// ---- fetch แบบสุภาพ: UA เบราว์เซอร์ปกติ (poe2db บล็อก UA bot เปล่าๆ บางที) ----
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept': 'text/html',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.text();
}

// ---- HTML helpers (ไม่มี DOM parser — ใช้ regex กับโครงที่ตรวจแล้วว่าคงที่) ----
function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
// HTML คำอธิบาย → plain text (คง line break ของ <br> ไว้เป็น \n)
// บาง entry ฝั่ง EN (พวก *_Rune) มี markup ภายในของเกมติดมา เช่น <<ExpedRuneX>>, <rgb(...)>{...},
// <italic>{...} — ลอกออกแบบกลไกล้วน (ไม่แตะ/ไม่แปลถ้อยคำ): ตัด token <<...>> ก่อน แล้วค่อยตัดแท็ก
// และลบวงเล็บปีกกาที่เหลือ (ตรวจแล้ว: ปีกกาโผล่เฉพาะจาก markup นี้ — ไม่มีในเนื้อความจริงทั้ง TH/EN)
function htmlToText(html) {
  const text = html
    .replace(/<<[^>]*>>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[{}]/g, '');
  return decodeEntities(text)
    .split('\n').map(line => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
// ดึง slug ของ keyword อื่นที่ถูกอ้างในคำอธิบาย (<a class="KeywordPopups" href="SLUG">)
function extractRelatedSlugs(descHtml) {
  const out = [];
  for (const m of descHtml.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    if (!/class="[^"]*KeywordPopups[^"]*"/.test(tag)) continue;
    const href = tag.match(/href="([^"]+)"/);
    if (href && /^[A-Za-z0-9_'%.-]+$/.test(href[1])) out.push(href[1]);
  }
  return [...new Set(out)];
}

// ---- parse หน้า Keywords หนึ่งภาษา → Map(slug → {name, descText, related}) ----
const ENTRY_RE = /<a href="([^"]+)" class="strong fontinSmallCaps">(.*?)<\/a><div class="fontinRegular">(.*?)<\/div>/gs;
function parseKeywordPage(html) {
  const map = new Map();
  for (const m of html.matchAll(ENTRY_RE)) {
    const [, slug, nameHtml, descHtml] = m;
    if (!/^[A-Za-z0-9_'%.-]+$/.test(slug)) continue;
    if (map.has(slug)) continue; // หน้าเดียวกันมี slug ซ้ำได้ (~8 ตัว) — เก็บตัวแรก
    map.set(slug, {
      name: decodeEntities(nameHtml.replace(/<[^>]+>/g, '')).trim(),
      descText: htmlToText(descHtml),
      related: extractRelatedSlugs(descHtml),
    });
  }
  return map;
}

// ---- หมวดหมู่ (facet ของ UI เท่านั้น) — อนุมานโปร่งใสจากชื่อ/slug ภาษาอังกฤษ ----
// เจตนา: กติกาอ่านง่าย ตรวจสอบได้ ไม่แตะข้อความต้นทาง — entry จับหมวดไม่ได้ = อยู่แค่ใน "All"
const KWC_CATEGORY_RULES = [
  { id: 'damage', re: /damage|\bhit\b|hits\b|critical|penetrat|overwhelm/i },
  { id: 'ailment', re: /ailment|bleed|ignit|chill|freez|frozen|shock|poison|electrocut/i },
  { id: 'defense', re: /armou?r|evasion|block|resist|energy.?shield|barrier|fortif|\bward\b|deflect|aegis|guard/i },
  { id: 'resource', re: /\blife\b|\bmana\b|spirit|flask|charge|regen|leech|recoup|recover/i },
  { id: 'attribute', re: /strength|dexterity|intelligence|attribute/i },
  { id: 'combat', re: /attack|spell|skill|weapon|melee|projectile|area.?of.?effect|\bcast|accuracy|stun|parry|combo|empower/i },
  { id: 'minion', re: /minion|companion|totem|summon|revive/i },
  { id: 'map', re: /\bmaps?\b|waystone|atlas|tower|precursor|league|ritual|breach|delirium|expedition|essence|strongbox|shrine|rogue|\brunes?\b|sanctum|trial|ultimatum|corrupt|azmeri|affliction/i },
];
function inferCats(nameEn, slug) {
  const hay = (nameEn || '') + ' ' + (slug || '').replace(/_/g, ' ');
  return KWC_CATEGORY_RULES.filter(r => r.re.test(hay)).map(r => r.id);
}

async function main() {
  let thHtml, enHtml;
  try {
    // ดึงทีละหน้า (sequential) — รวม 2 requests เท่านั้น
    enHtml = await fetchHtml(SOURCE_EN);
    thHtml = await fetchHtml(SOURCE_TH);
  } catch (err) {
    console.error('WARN: fetch failed: ' + err.message + ' — keeping previous keyword-codex.json');
    process.exitCode = 0;
    return;
  }

  const en = parseKeywordPage(enHtml);
  const th = parseKeywordPage(thHtml);
  console.log('Parsed EN entries: ' + en.size + ' · TH entries: ' + th.size);
  if (en.size < MIN_ENTRIES || th.size < MIN_ENTRIES) {
    console.error('WARN: parsed entries below sanity threshold (' + MIN_ENTRIES + ') — page layout may have changed. Keeping previous file.');
    return;
  }

  const allSlugs = new Set([...en.keys(), ...th.keys()]);
  const keywords = [];
  let paired = 0, thOnly = 0, enOnly = 0;
  for (const slug of allSlugs) {
    const e = en.get(slug) || null;
    const t = th.get(slug) || null;
    if (e && t) paired++; else if (t) thOnly++; else enOnly++;
    // related: ใช้ลิงก์จากคำอธิบายไทยก่อน (คำอธิบายที่โชว์คือไทย) — ไม่มีก็ใช้ฝั่ง EN
    // (เคส EN fallback จึงได้ related จากลิงก์ในคำอธิบายอังกฤษโดยอัตโนมัติ — ไม่มีการเดา)
    const relatedRaw = (t && t.related.length ? t.related : (e ? e.related : []));
    const related = relatedRaw.filter(s => s !== slug && allSlugs.has(s));
    const descTh = (t && t.descText) ? t.descText : null;   // จากหน้า TH เท่านั้น — ไม่แปลเอง
    // descEn เก็บเฉพาะตอนไม่มีคำอธิบายไทย (fallback) — กันไฟล์โตเท่าตัวโดยไม่จำเป็น
    const descEn = (!descTh && e && e.descText) ? e.descText : null;
    keywords.push({
      id: slug,
      nameTh: t ? t.name : null,          // จากหน้า TH เท่านั้น — ไม่แปลเอง
      nameEn: e ? e.name : null,          // จากหน้า US เท่านั้น
      descTh,
      descEn,                             // มีค่าเฉพาะ entry ที่ใช้ EN fallback
      descLang: descTh ? 'th' : (descEn ? 'en' : 'none'), // ภาษาของคำอธิบายที่ UI ควรแสดง
      related,
      cats: inferCats(e ? e.name : null, slug),
      needsReview: !(e && t),             // จับคู่ไม่ครบสองฝั่ง → ให้ UI ติดป้าย ไม่เดา
    });
  }
  keywords.sort((a, b) => String(a.nameEn || a.id).localeCompare(String(b.nameEn || b.id)));

  const out = {
    updatedAt: new Date().toISOString(),
    source: {
      name: SOURCE_NAME,
      thUrl: SOURCE_TH,
      enUrl: SOURCE_EN,
      note: 'Keyword names/descriptions copied verbatim from poe2db.tw (TH + US pages). No manual translation. Per-keyword pages: https://poe2db.tw/{th|us}/{id}',
    },
    counts: {
      total: keywords.length, paired, thOnly, enOnly,
      descEnFallback: keywords.filter(k => k.descLang === 'en').length,
      descNone: keywords.filter(k => k.descLang === 'none').length,
    },
    keywords,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log('Wrote ' + OUT_FILE);
  console.log('total=' + keywords.length + ' paired=' + paired + ' thOnly=' + thOnly + ' enOnly=' + enOnly
    + ' descEnFallback=' + out.counts.descEnFallback + ' descNone=' + out.counts.descNone);
}

main();
