// ============================================================================
// Content Codex — boss/content drop knowledge base generator
//
// ดึงข้อมูลจาก poe2wiki.net (MediaWiki API) แล้วเขียนไฟล์ static:
//   data/content-codex.json
// หน้าเว็บ (index.html แท็บ Content Codex) อ่านไฟล์นั้นอย่างเดียว
// ไม่มี backend และเบราว์เซอร์ไม่เรียก poe2wiki.net ตรงๆ เด็ดขาด
//
// วิธีทำงาน:
//   1. discover หน้า boss/content จาก curated categories + seed pages ด้านล่าง
//   2. ดึง raw wikitext ผ่าน action=parse (wikitext สะอาดกว่า HTML — เห็น
//      section/template/table ตรงๆ เช่น ==Drops==, {{il|...}}, {{Version history table row|...}})
//   3. parse เป็น section แบบมีโครงสร้าง: Access / Mechanics / Monsters / Bosses /
//      Drops (+ estimated rates) / Version history — หน้าไหน parse ไม่ได้
//      ก็ยังสร้าง entry พร้อม warning (ไม่ล้มทั้ง generation, error ถูกบันทึกใน errors[])
//
// กติกาข้อมูล (สำคัญ):
//   - ไม่เดา/ไม่แต่ง drop rate เอง — rate ทุกตัวมาจากข้อความใน wiki เท่านั้น
//     (wiki ติดป้าย "Estimated drop rates" → เราติด rateKind: "estimated")
//   - rate ที่ wiki ไม่ระบุ = rateKind "unknown" (UI แสดง "Unknown / Not documented")
//   - ไม่ copy prose ยาวๆ ทั้งก้อน — ตัดเป็น bullet/ประโยคสั้น (cap ความยาว)
//   - รูปภาพ: ไฟล์ใน wiki เป็น game asset (© Grinding Gear Games) และหน้า File
//     ไม่ระบุ license ชัดเจน → ไม่ hotlink/ฝังรูป (safeToEmbed: false) เก็บแค่ลิงก์
//     ไปหน้า File บน wiki ให้ผู้ใช้กดดูเอง
//   - ข้อความจาก wiki อยู่ใต้ CC BY-NC 3.0 (unless otherwise noted) — ใส่ attribution
//     ใน source block และ UI ต้องแสดง Source: poe2wiki + ลิงก์ + license note
//
// ต้องใช้ Node 20+ (ใช้ fetch ในตัว ไม่มี dependency ภายนอก)
// รันเองในเครื่อง: node scripts/update-content-codex.mjs
// (ยังไม่ผูกกับ GitHub Actions — เนื้อหา wiki เปลี่ยนไม่บ่อย รันมือเมื่ออยาก refresh)
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_URL = 'https://www.poe2wiki.net';
const API_URL = ROOT_URL + '/w/api.php';
const SOURCE_NAME = 'poe2wiki';
const LICENSE_NOTE = 'Content is available under Creative Commons Attribution-NonCommercial 3.0 (CC BY-NC 3.0) unless otherwise noted.';
const USER_AGENT = 'POEassist-ExileAssistant-ContentCodex/1.0 (personal static site generator; runs manually)';
const FETCH_DELAY_MS = 600; // สุภาพกับ wiki — ดึงทีละหน้า เว้นจังหวะ (เจอ 429 ได้ถ้าเร็วกว่านี้)

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'data', 'content-codex.json');

// ---------------------------------------------------------------------------
// Discovery config — แก้ตรงนี้เพื่อเพิ่ม/ลดหน้าที่เก็บ
// ---------------------------------------------------------------------------

// หมวดหมู่ที่ไล่เก็บสมาชิก (เฉพาะ namespace 0 = บทความ)
const CATEGORY_SOURCES = [
  { category: 'Category:Encounters', note: 'endgame/map encounter pages' },
  { category: 'Category:Pinnacle bosses', note: 'pinnacle boss pages', forceType: 'Boss', extraTags: ['Pinnacle'] },
];

// หน้าเดี่ยวที่อยากได้แน่ๆ แม้ไม่อยู่ใน category ข้างบน
const SEED_PAGES = [
  { title: 'Simulacrum', extraTags: ['Delirium', 'Endgame'] },
  { title: 'The Burning Monolith', extraTags: ['Pinnacle', 'Endgame'] },
  { title: 'Twisted Domain', extraTags: ['Breach', 'Pinnacle', 'Endgame'] },
  { title: 'Crux of Nothingness', extraTags: ['Ritual', 'Pinnacle', 'Endgame'] },
];

// หน้าพวกนี้จัด type เป็น League mechanic (encounter หลักที่มาจาก league กลไกใหญ่)
const LEAGUE_MECHANIC_PAGES = new Set(['Abyss', 'Breach', 'Delirium', 'Expedition', 'Ritual']);

// category บน wiki → tag ที่เราใช้ (whitelist — category อื่นไม่เอา)
const CATEGORY_TAG_MAP = {
  Delirium: 'Delirium', Breach: 'Breach', Abyss: 'Abyss', Expedition: 'Expedition',
  Ritual: 'Ritual', Atlas: 'Endgame', Pinnacle_bosses: 'Pinnacle',
  Map_areas: 'Map area', Encounters: 'Encounter', Monsters: 'Monster',
};

// caps กัน entry บวม (และกัน copy prose ยาวเกิน)
const MAX_LINES_PER_SECTION = 10;
const MAX_LINE_CHARS = 320;
const MAX_VERSIONS = 10;
const MAX_CHANGES_PER_VERSION = 6;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const wikiUrl = (title) => ROOT_URL + '/wiki/' + encodeURIComponent(String(title).trim().replace(/ /g, '_'))
  .replace(/%2C/gi, ',').replace(/%27/gi, "'").replace(/%3A/gi, ':')
  .replace(/%28/gi, '(').replace(/%29/gi, ')').replace(/%21/gi, '!');

const editUrl = (title) => ROOT_URL + '/index.php?title=' + encodeURIComponent(String(title).trim().replace(/ /g, '_')) + '&action=edit';

async function apiGet(params, retries = 2) {
  const url = API_URL + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + API_URL);
      return await res.json();
    } catch (err) {
      if (attempt >= retries) throw err;
      // 429 = โดน rate limit — ถอยยาวๆ; 5xx ชั่วคราว — ถอยสั้น
      const is429 = /HTTP 429/.test(err.message);
      await sleep((is429 ? 10000 : 1500) * (attempt + 1));
    }
  }
}

const clip = (s, max = MAX_LINE_CHARS) => {
  const t = String(s || '').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// ---------------------------------------------------------------------------
// Wikitext parsing helpers
// ---------------------------------------------------------------------------

// หา template {{Name|...}} แบบนับวงเล็บ (รองรับ template ซ้อน template)
function extractTemplates(text, name) {
  const out = [];
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\{\\{\\s*' + escaped + '\\s*[|}]', 'ig');
  let m;
  while ((m = re.exec(text))) {
    const start = m.index;
    let depth = 0;
    let i = start;
    let end = -1;
    while (i < text.length - 1) {
      if (text[i] === '{' && text[i + 1] === '{') { depth++; i += 2; continue; }
      if (text[i] === '}' && text[i + 1] === '}') { depth--; i += 2; if (depth === 0) { end = i; break; } continue; }
      i++;
    }
    if (end === -1) break;
    out.push({ start, end, body: text.slice(start + 2, end - 2) });
    re.lastIndex = end;
  }
  return out;
}

// แยก param ของ template ที่ระดับบนสุด (ไม่แตก | ที่อยู่ใน {{ }} หรือ [[ ]])
function splitParams(body) {
  const parts = [];
  let cur = '';
  let curly = 0;
  let square = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const n = body[i + 1];
    if (c === '{' && n === '{') { curly++; cur += '{{'; i++; continue; }
    if (c === '}' && n === '}') { curly--; cur += '}}'; i++; continue; }
    if (c === '[' && n === '[') { square++; cur += '[['; i++; continue; }
    if (c === ']' && n === ']') { square--; cur += ']]'; i++; continue; }
    if (c === '|' && curly === 0 && square === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

// ชื่อไอเทมจาก {{il|...}} — รองรับ {{il|Name}}, {{il|page=Name}}, {{il|page=Name|...}}
function ilItemName(paramsStr) {
  const parts = splitParams(paramsStr);
  let positional = '';
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq !== -1 && /^\s*page\s*$/.test(p.slice(0, eq))) return p.slice(eq + 1).trim();
    if (eq === -1 && !positional) positional = p.trim();
  }
  return positional;
}

// wikitext → plain text อ่านง่าย (ตัด template/link markup ที่รู้จัก แล้วทิ้งที่เหลือ)
function stripMarkup(input) {
  let s = String(input || '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<ref[^>]*\/>/gi, ' ').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ');
  for (let pass = 0; pass < 4; pass++) {
    s = s.replace(/\{\{\s*il\s*\|([^{}]*)\}\}/gi, (_, p) => ilItemName(p));
    s = s.replace(/\{\{\s*c\s*\|[^|{}]*\|([^{}]*)\}\}/gi, '$1');
    s = s.replace(/\{\{\s*(?:stl|sl|moncat)\s*\|([^|{}]*?)(?:\|[^{}]*)?\}\}/gi, '$1');
    s = s.replace(/\{\{\s*n\/a\s*\}\}/gi, '—');
    s = s.replace(/\{\{\s*undocumented\s*\}\}/gi, '(undocumented)');
    s = s.replace(/\{\{[^{}]*\}\}/g, ''); // template อื่นๆ ที่ไม่รู้จัก → ทิ้ง
  }
  s = s.replace(/\[\[(?:File|Image|Category):[^\]]*\]\]/gi, '');
  s = s.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1');
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1').replace(/\[https?:\/\/\S+\]/g, '');
  s = s.replace(/'''''|'''|''/g, '');
  s = s.replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
  return s;
}

// ดึงลิงก์ item/page จาก wikitext ก้อนหนึ่ง → [{name, page, url}]
function extractPageLinks(text) {
  const found = [];
  const seen = new Set();
  const push = (name, page) => {
    const cleanPage = String(page || '').trim();
    const cleanName = stripMarkup(name || cleanPage);
    if (!cleanPage || !cleanName) return;
    if (/^(File|Image|Category|version )/i.test(cleanPage)) return;
    const key = cleanPage.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ name: cleanName, page: cleanPage, url: wikiUrl(cleanPage) });
  };
  for (const t of extractTemplates(text, 'il')) {
    const name = ilItemName(t.body.replace(/^il\s*\|?/i, ''));
    push(name, name);
  }
  const linkRe = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
  let m;
  while ((m = linkRe.exec(text))) push(m[2] || m[1], m[1]);
  return found;
}

// แบ่ง wikitext เป็น section ตามหัวข้อระดับ 2 (==Heading==) — intro = ก่อนหัวข้อแรก
function splitSections(wikitext) {
  const sections = { __intro: '' };
  const re = /^==([^=].*?)==\s*$/gm;
  let last = { name: '__intro', start: 0 };
  let m;
  while ((m = re.exec(wikitext))) {
    sections[last.name] = (sections[last.name] || '') + wikitext.slice(last.start, m.index);
    last = { name: stripMarkup(m[1]).toLowerCase(), start: m.index + m[0].length };
  }
  sections[last.name] = (sections[last.name] || '') + wikitext.slice(last.start);
  return sections;
}

// section → bullet/ประโยคสั้นๆ (ข้าม table + template ทั้งบรรทัด, cap จำนวน/ความยาว)
function sectionToLines(sectionText) {
  if (!sectionText) return [];
  const noTables = sectionText.replace(/\{\|[\s\S]*?\n\|\}/g, '');
  const lines = [];
  let braceCarry = 0; // นับ {{ }} ข้ามบรรทัด — ข้ามเนื้อใน template หลายบรรทัด (เช่น {{Query area infoboxes ...}})
  for (const raw of noTables.split('\n')) {
    const line = raw.trim();
    const opens = (line.match(/\{\{/g) || []).length;
    const closes = (line.match(/\}\}/g) || []).length;
    const startedInsideTemplate = braceCarry > 0;
    braceCarry = Math.max(0, braceCarry + opens - closes);
    if (startedInsideTemplate) continue;
    if (/^\{\{/.test(line) && opens > closes) continue; // เปิด template ข้ามบรรทัด
    if (!line) continue;
    if (/^\{\{/.test(line) && /\}\}$/.test(line) && !/^\{\{\s*(il|c)\b/i.test(line)) continue; // template ทั้งบรรทัด (Mbox/Navbox/infobox row)
    if (/^[|!]/.test(line) || /^\{\||^\|\}/.test(line)) continue;
    if (/^\[\[(File|Image|Category):/i.test(line)) continue;
    if (/^__[A-Z]+__$/.test(line)) continue;
    const isSub = /^===/.test(line);
    const isBullet = /^\*+/.test(line);
    let text = line.replace(/^===+\s*/, '').replace(/\s*===+$/, '').replace(/^\*+\s*/, '').replace(/^[:;]+\s*/, '');
    text = stripMarkup(text);
    if (!text) continue;
    if (isSub) text = '— ' + text + ' —';
    else if (isBullet && /^\*\*/.test(line)) text = '· ' + text;
    lines.push(clip(text));
    if (lines.length >= MAX_LINES_PER_SECTION) { lines.push('… (ดูรายละเอียดเต็มบนหน้า wiki)'); break; }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Drops parsing
// ---------------------------------------------------------------------------

// แกะ wikitable ใน section Drops → แถวละ 1 รายการ drop
function parseDropTables(sectionText, ctx) {
  const drops = [];
  const tableRe = /\{\|[\s\S]*?\n\|\}/g;
  let tm;
  while ((tm = tableRe.exec(sectionText))) {
    const table = tm[0];
    const headerText = stripMarkup((table.split(/\n\|-/)[0] || ''));
    if (/difficulty/i.test(headerText)) {
      ctx.notes.push('ตาราง drop บน wiki แยกตาม Difficulty — ค่าที่แสดงคือคอลัมน์ที่ wiki มีข้อมูล (ส่วนใหญ่คือ difficulty สูงสุด)');
    }
    let currentGroup = '';
    for (const rowChunk of table.split(/\n\|-/).slice(1)) {
      const row = rowChunk.replace(/\n\|\}[\s\S]*$/, '');
      // group label จาก cell ที่มี rowspan เช่น rowspan="9" | '''Guaranteed<br>Unique'''
      const groupMatch = row.match(/rowspan\s*=\s*"?\d+"?\s*\|\s*([^\n|]+)/);
      if (groupMatch) {
        const g = stripMarkup(groupMatch[1]);
        if (g) currentGroup = g.replace(/\s*·\s*/g, ' ');
      }
      const links = extractPageLinks(row);
      if (!links.length) continue;
      // rate = cell สุดท้ายที่มี % / ? / ~ / ตัวเลข และไม่ใช่ตัว item เอง
      let rateText = '';
      const cells = row.split('\n').map((l) => l.trim()).filter((l) => /^\|/.test(l) && !/^\|\}/.test(l));
      for (const cellLine of cells) {
        for (const cell of cellLine.replace(/^\|/, '').split('||')) {
          const noAttr = /=\s*"/.test(cell) && cell.includes('|') ? cell.slice(cell.indexOf('|') + 1) : cell;
          const t = stripMarkup(noAttr);
          if (t && /[%?~]|^\d/.test(t) && !extractPageLinks(noAttr).length) rateText = t;
        }
      }
      // note = ข้อความในวงเล็บติดกับตัว item เช่น "(2 mod)" / "(can drop Raven-Touched)"
      const itemLines = row.split('\n').map((l) => l.trim()).filter((l) => /\{\{\s*il\b|\[\[/i.test(l));
      const itemText = stripMarkup(itemLines.join(' ').replace(/^\*+\s*/, ''));
      const noteParts = [...itemText.matchAll(/\(([^()]+)\)/g)].map((m) => m[1].trim()).filter((p) => !/[%]/.test(p) && p !== rateText);
      const item = links[0];
      drops.push({
        name: item.name,
        url: item.url,
        group: currentGroup,
        rateText,
        rateKind: rateText ? (ctx.hasEstimateDisclaimer ? 'estimated' : 'listed') : 'unknown',
        note: noteParts.join('; '),
      });
    }
  }
  return drops;
}

// แกะ bullet drops เช่น "* {{il|Veilpiercer}} (35%)" / "* {{il|The Auspex}} (can drop ...) (17%)"
function parseDropBullets(sectionText, ctx) {
  const drops = [];
  const noTables = sectionText.replace(/\{\|[\s\S]*?\n\|\}/g, '');
  let currentGroup = '';
  for (const raw of noTables.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^\*/.test(line)) {
      const t = stripMarkup(line);
      if (/always drops|guaranteed/i.test(t)) { currentGroup = 'Guaranteed pool'; ctx.guaranteedProse.push(clip(t)); }
      else if (/can also drop|additionally|also drop/i.test(t)) {
        currentGroup = 'Additional drops';
        if (/\d|guarantee|always/i.test(t)) ctx.guaranteedProse.push(clip(t));
      }
      continue;
    }
    const links = extractPageLinks(line);
    if (!links.length) continue;
    const cleaned = stripMarkup(line.replace(/^\*+\s*/, ''));
    const parens = [...cleaned.matchAll(/\(([^()]+)\)/g)].map((m) => m[1].trim());
    const rateText = parens.find((p) => /[%?]/.test(p)) || '';
    const noteParts = parens.filter((p) => p !== rateText);
    drops.push({
      name: links[0].name,
      url: links[0].url,
      group: currentGroup,
      rateText,
      rateKind: rateText ? (ctx.hasEstimateDisclaimer ? 'estimated' : 'listed') : 'unknown',
      note: noteParts.join('; '),
    });
  }
  return drops;
}

function parseDropsSection(sectionText) {
  const ctx = { hasEstimateDisclaimer: false, notes: [], guaranteedProse: [] };
  if (!sectionText) return { drops: [], notes: [], guaranteedProse: [], hasEstimateDisclaimer: false };

  // {{Mbox|text= Estimated drop rates from [[version X]] ...}} → estimated disclaimer
  for (const t of extractTemplates(sectionText, 'Mbox')) {
    const txt = stripMarkup(t.body.replace(/^Mbox\s*\|/i, '').replace(/^\s*text\s*=/i, ''));
    if (txt) {
      ctx.notes.push(clip(txt));
      if (/estimated/i.test(txt)) ctx.hasEstimateDisclaimer = true;
    }
  }

  const tableDrops = parseDropTables(sectionText, ctx);
  const bulletDrops = parseDropBullets(sectionText, ctx);
  // กันซ้ำ (บางหน้ามีทั้ง bullet และ table ของไอเทมเดียวกัน)
  const seen = new Set();
  const drops = [];
  for (const d of [...tableDrops, ...bulletDrops]) {
    const key = (d.name + '|' + d.rateText + '|' + d.note).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drops.push(d);
  }

  // prose อื่นๆ ใน section (ที่ไม่ใช่ bullet รายการ item) → เก็บเป็น note สั้นๆ
  for (const line of sectionToLines(sectionText)) {
    if (drops.some((d) => line.startsWith(d.name))) continue;
    if (ctx.notes.some((n) => n === line)) continue;
    ctx.notes.push(line);
    if (ctx.notes.length >= 8) break;
  }

  return { drops, notes: ctx.notes, guaranteedProse: ctx.guaranteedProse, hasEstimateDisclaimer: ctx.hasEstimateDisclaimer };
}

// ---------------------------------------------------------------------------
// Version history parsing — {{Version history table row|0.5.3|* change...}}
// ---------------------------------------------------------------------------

function parseVersionHistory(sectionText) {
  if (!sectionText) return [];
  const out = [];
  for (const t of extractTemplates(sectionText, 'Version history table row')) {
    const params = splitParams(t.body);
    const version = stripMarkup(params[1] || '');
    const body = params.slice(2).join('|');
    if (!version) continue;
    const changes = [];
    for (const raw of String(body).split('\n')) {
      const line = raw.trim();
      if (!/^\*/.test(line)) continue;
      const nested = /^\*\*/.test(line);
      const text = stripMarkup(line.replace(/^\*+\s*/, ''));
      if (!text) continue;
      changes.push(clip((nested ? '· ' : '') + text, 280));
      if (changes.length >= MAX_CHANGES_PER_VERSION) { changes.push('… (มีรายการเพิ่มเติมบน wiki)'); break; }
    }
    out.push({ version, changes });
    if (out.length >= MAX_VERSIONS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Infobox (MonsterBox) — เอา location/level/image
// ---------------------------------------------------------------------------

function parseMonsterBox(wikitext) {
  const t = extractTemplates(wikitext, 'MonsterBox')[0];
  if (!t) return null;
  const params = splitParams(t.body);
  const map = {};
  for (const p of params.slice(1)) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    map[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return {
    location: stripMarkup(map.location || ''),
    level: stripMarkup(map.level || ''),
    image: (map.image || '').trim(),
    resistance: stripMarkup(map.resistance || ''),
    damage: stripMarkup(map.damage || ''),
  };
}

// ---------------------------------------------------------------------------
// Pinnacle encounter mapping — ตารางบนหน้า "Pinnacle encounter"
// (Encounter → Boss → Key) เอาไว้ enrich ทั้งฝั่ง mechanic และฝั่ง boss
// ---------------------------------------------------------------------------

function parsePinnacleMapping(wikitext) {
  const rows = [];
  const tableRe = /\{\|[\s\S]*?\n\|\}/g;
  let tm;
  while ((tm = tableRe.exec(wikitext))) {
    const table = tm[0];
    if (!/!!\s*Boss\s*!!/i.test(table)) continue;
    for (const rowChunk of table.split(/\n\|-/).slice(1)) {
      const cells = [];
      for (const raw of rowChunk.split('\n')) {
        const line = raw.trim();
        if (/^\|\}/.test(line) || !/^\|/.test(line)) continue;
        for (const cell of line.replace(/^\|/, '').split('||')) cells.push(cell.trim());
      }
      if (cells.length < 3) continue;
      const place = extractPageLinks(cells[0])[0] || null;
      const boss = extractPageLinks(cells[1])[0] || null;
      const keys = extractPageLinks(cells[2]);
      if (boss) rows.push({ place, boss, keys, keyText: stripMarkup(cells[2]) });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Per-page processing
// ---------------------------------------------------------------------------

function buildEntry(meta, parseResult) {
  const title = parseResult?.parse?.title || meta.title;
  const wikitext = parseResult?.parse?.wikitext?.['*'] || '';
  const categories = (parseResult?.parse?.categories || []).map((c) => c['*']);

  const tags = new Set(meta.extraTags || []);
  for (const c of categories) if (CATEGORY_TAG_MAP[c]) tags.add(CATEGORY_TAG_MAP[c]);

  let type = meta.forceType || '';
  if (!type) {
    if (categories.includes('Pinnacle_bosses')) type = 'Boss';
    else if (LEAGUE_MECHANIC_PAGES.has(title)) type = 'League mechanic';
    else type = 'Content';
  }
  if (type === 'Boss' && categories.includes('Pinnacle_bosses')) tags.add('Pinnacle');
  if (type === 'League mechanic') tags.add('League mechanic');

  const sections = splitSections(wikitext);
  const pick = (...names) => {
    for (const n of names) if (sections[n]) return sections[n];
    return '';
  };

  const warnings = [];
  const notes = [];

  // intro หนึ่งย่อหน้าแรก = summary สั้นของ entry
  const introLines = sectionToLines(sections.__intro);
  const summary = introLines[0] || '';

  const monsterBox = parseMonsterBox(wikitext);

  const access = sectionToLines(pick('access', 'how to access', 'obtaining'));
  if (monsterBox?.location) access.unshift(clip('Location: ' + monsterBox.location + (monsterBox.level ? ' (Level ' + monsterBox.level + ')' : '')));
  const mechanics = sectionToLines(pick('mechanics', 'behavior'));
  const skills = sectionToLines(pick('skills'));
  if (skills.length) mechanics.push(...skills.slice(0, 4).map((s) => clip('Skill: ' + s)));

  const monstersSection = pick('monsters');
  const monsters = extractPageLinks(monstersSection.replace(/\{\|[\s\S]*?\n\|\}/g, ''))
    .filter((l) => !/^(corpse|herald of ice)$/i.test(l.page))
    .map((l) => ({ name: l.name, url: l.url }));

  const bossesSection = pick('bosses', 'boss');
  const bosses = extractPageLinks(bossesSection.replace(/\{\|[\s\S]*?\n\|\}/g, ''))
    .map((l) => ({ name: l.name, url: l.url, note: '' }));

  const dropsSectionText = pick('drops', 'rewards', 'drops and rewards', 'loot');
  const dropsParsed = parseDropsSection(dropsSectionText);
  const drops = dropsParsed.drops;
  notes.push(...dropsParsed.notes.map((n) => clip(n)));

  const guaranteedDrops = [...dropsParsed.guaranteedProse];
  for (const d of drops) {
    if (/guaranteed/i.test(d.group)) {
      guaranteedDrops.push(d.name + (d.note ? ' (' + d.note + ')' : '') + (d.rateText ? ' — ' + d.rateText + ' of the guaranteed pool' : ''));
    }
  }

  const versionHistory = parseVersionHistory(pick('version history'));

  // status ตามความสมบูรณ์ของการ parse
  const parsedSomething = access.length || mechanics.length || monsters.length || bosses.length || drops.length || versionHistory.length;
  let status = 'Parsed';
  if (!wikitext) status = 'Error';
  else if (!parsedSomething) { status = 'Stub'; warnings.push('needs parser support — โครงหน้านี้ยังไม่มี section ที่ parser รู้จัก (ดูบน wiki โดยตรง)'); }
  else if (!drops.length && dropsSectionText) warnings.push('Drops/Rewards บน wiki เป็นข้อความอธิบาย (ไม่มีตาราง rate ให้แกะ) — สรุปไว้ใน Notes, ดูเต็มบนหน้า wiki');
  else if (!dropsSectionText) warnings.push('หน้านี้ไม่มี section Drops/Rewards บน wiki');

  return {
    id: slugify(title),
    name: title,
    type,
    tags: [...tags].sort(),
    status,
    summary: clip(summary),
    sourceUrl: wikiUrl(title),
    editSourceUrl: editUrl(title),
    fetchedAt: new Date().toISOString(),
    image: monsterBox?.image
      ? {
          url: '', // จงใจไม่ hotlink — license ของ game asset ไม่ชัด
          fileName: monsterBox.image,
          sourceUrl: wikiUrl('File:' + monsterBox.image),
          licenseNote: 'Game artwork © Grinding Gear Games; wiki file page lists no explicit license — not embedded, view on wiki',
          safeToEmbed: false,
        }
      : { url: '', fileName: '', sourceUrl: '', licenseNote: '', safeToEmbed: false },
    access,
    mechanics,
    monsters,
    bosses,
    guaranteedDrops: [...new Set(guaranteedDrops)],
    dropRates: drops.filter((d) => d.rateText),
    drops,
    versionHistory,
    notes: [...new Set(notes)].slice(0, 8),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function discoverPages(errors) {
  const pages = new Map(); // title → meta
  const addPage = (title, meta = {}) => {
    if (!pages.has(title)) pages.set(title, { title, ...meta });
    else Object.assign(pages.get(title), { extraTags: [...new Set([...(pages.get(title).extraTags || []), ...(meta.extraTags || [])])], forceType: pages.get(title).forceType || meta.forceType });
  };

  for (const src of CATEGORY_SOURCES) {
    try {
      const res = await apiGet({ action: 'query', list: 'categorymembers', cmtitle: src.category, cmlimit: '500' });
      const members = res?.query?.categorymembers || [];
      for (const m of members) {
        if (m.ns !== 0) continue; // ข้าม subcategory/template
        addPage(m.title, { forceType: src.forceType, extraTags: src.extraTags || [] });
      }
      console.log(`discover: ${src.category} → ${members.filter((m) => m.ns === 0).length} pages`);
    } catch (err) {
      errors.push({ page: src.category, error: 'category discovery failed: ' + err.message });
    }
    await sleep(FETCH_DELAY_MS);
  }
  for (const seed of SEED_PAGES) addPage(seed.title, { extraTags: seed.extraTags || [] });
  return [...pages.values()];
}

async function main() {
  const errors = [];
  const startedAt = new Date().toISOString();

  const pageMetas = await discoverPages(errors);
  console.log(`total pages to fetch: ${pageMetas.length}`);

  const entries = [];
  const rawByTitle = new Map();

  for (const meta of pageMetas) {
    try {
      const res = await apiGet({ action: 'parse', page: meta.title, prop: 'wikitext|categories', redirects: '1' });
      if (res?.error) throw new Error(res.error.info || res.error.code || 'API error');
      const entry = buildEntry(meta, res);
      rawByTitle.set(entry.name, res?.parse?.wikitext?.['*'] || '');
      entries.push(entry);
      console.log(`fetched: ${meta.title} → ${entry.status} (drops ${entry.drops.length}, versions ${entry.versionHistory.length})`);
    } catch (err) {
      errors.push({ page: meta.title, error: err.message });
      entries.push({
        ...buildEntry(meta, null),
        status: 'Error',
        warnings: ['fetch/parse failed: ' + err.message],
      });
      console.error(`ERROR: ${meta.title} — ${err.message}`);
    }
    await sleep(FETCH_DELAY_MS);
  }

  // enrich: ตาราง pinnacle (Encounter → Boss → Key) จากหน้า Pinnacle encounter
  const pinnacleWt = rawByTitle.get('Pinnacle encounter') || '';
  if (pinnacleWt) {
    const mapping = parsePinnacleMapping(pinnacleWt);
    for (const row of mapping) {
      const mech = row.place && entries.find((e) => e.name === row.place.page);
      if (mech && !mech.bosses.some((b) => b.name === row.boss.name)) {
        mech.bosses.push({ name: row.boss.name, url: row.boss.url, note: 'Pinnacle boss (จากหน้า Pinnacle encounter)' });
      }
      const bossEntry = entries.find((e) => e.name === row.boss.page || e.name === row.boss.name);
      if (bossEntry && row.keyText) {
        const accessLine = clip('Access key: ' + row.keyText + (row.place ? ' — via ' + row.place.name : ''));
        if (!bossEntry.access.includes(accessLine)) bossEntry.access.push(accessLine);
      }
    }
    console.log(`pinnacle mapping rows applied: ${parsePinnacleMapping(pinnacleWt).length}`);
  }

  // เรียงให้อ่านง่าย: League mechanic → Content → Boss แล้วตามชื่อ
  const typeOrder = { 'League mechanic': 0, Content: 1, Boss: 2 };
  entries.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) || a.name.localeCompare(b.name));

  const okCount = entries.filter((e) => e.status === 'Parsed').length;
  if (!okCount) {
    console.error('WARN: no page parsed successfully — keeping previous content-codex.json');
    return;
  }

  const out = {
    version: 1,
    updatedAt: new Date().toISOString(),
    startedAt,
    source: {
      name: SOURCE_NAME,
      license: 'CC BY-NC 3.0 unless otherwise noted',
      licenseNote: LICENSE_NOTE,
      rootUrl: ROOT_URL,
      discovery: [...CATEGORY_SOURCES.map((c) => c.category), ...SEED_PAGES.map((s) => 'seed:' + s.title)],
    },
    entries,
    errors,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`entries: ${entries.length} (Parsed ${okCount}, Stub ${entries.filter((e) => e.status === 'Stub').length}, Error ${entries.filter((e) => e.status === 'Error').length}), errors: ${errors.length}`);
}

main();
