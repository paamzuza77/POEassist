// ============================================================================
// Exile Hub — home status generator (League Status + Stash Sale Watch)
//
// รันโดย GitHub Actions (.github/workflows/update-market-radar.yml) ทุกชั่วโมง
// ดึงหน้าแรกของ poe2db.tw (server-side ครั้งเดียวต่อชั่วโมง) แล้วเขียนไฟล์ static:
//   data/home-status.json
// หน้าเว็บ (index.html แท็บ Exile Hub) อ่านไฟล์นั้นอย่างเดียว
// ไม่มี backend และเบราว์เซอร์ไม่เรียก poe2db.tw ตรงๆ เด็ดขาด
//
// วิธีอ่านข้อมูล: หน้าแรก poe2db ฝัง epoch วินาทีไว้ใน attribute เช่น
//   <a href="Runes_of_Aldur_league">Running for</a> ... data-countdown='1780084800'
//   <h5>Stash Tab Sales</h5> ... <a href="shop">Starts in</a> data-countdown='1783641600'
// ถ้าดึง/parse ไม่สำเร็จ script จะ "ไม่เขียนทับไฟล์เดิม" (ปล่อยให้ UI ขึ้น Stale เอง)
//
// ต้องใช้ Node 20+ (ใช้ fetch ในตัว ไม่มี dependency ภายนอก)
// รันเองในเครื่อง: node scripts/update-home-status.mjs
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://poe2db.tw/us/';
const SOURCE_NAME = 'poe2db.tw';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '..', 'data', 'home-status.json');

// อ่านไฟล์เดิมไว้เป็น fallback รายส่วน (league พังแต่ stash รอด → เก็บ league เก่าไว้)
function loadPrevious() {
  try {
    return JSON.parse(readFileSync(OUT_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

const epochToIso = (sec) => new Date(Number(sec) * 1000).toISOString();

// ---- League card: "<header> <version>" + ลิงก์ *_league + epoch ----
function extractLeague(html) {
  const i = html.indexOf('>Running for<');
  if (i === -1) return null;
  const before = html.slice(Math.max(0, i - 1500), i);
  const after = html.slice(i, i + 600);

  const startMatch =
    after.match(/data-countdown=["'](\d{9,11})["']/) ||
    before.match(/data-displaytime=["'](\d{9,11})["']/);
  if (!startMatch) return null;

  const headerMatch = before.match(/<h5 class="card-header">\s*([^<]+?)\s*<small class="float-end">\s*([^<]+?)\s*<\/small>/);
  const slugMatch = before.match(/href="([A-Za-z0-9_'%.-]+)_league"/);

  return {
    name: slugMatch ? decodeURIComponent(slugMatch[1]).replace(/_/g, ' ') : null,
    displayName: headerMatch ? (headerMatch[1] + ' ' + headerMatch[2]).trim() : null,
    startAt: epochToIso(startMatch[1]),
    endAt: null,
    source: SOURCE_NAME,
  };
}

// ---- Stash Tab Sales card: epoch + label ("Starts in" ก่อนเริ่ม / "Ends in" ช่วงลดราคา) ----
function extractStashSale(html) {
  const i = html.search(/Stash Tab\s*(<[^>]*>\s*)?Sales/);
  if (i === -1) return null;
  const seg = html.slice(i, i + 1500);
  const tsMatch = seg.match(/data-(?:displaytime|countdown)=["'](\d{9,11})["']/);
  if (!tsMatch) return null;
  const isLive = /Ends in/i.test(seg);
  return {
    mode: 'auto',
    nextStartAt: isLive ? null : epochToIso(tsMatch[1]),
    nextEndAt: isLive ? epochToIso(tsMatch[1]) : null,
    source: SOURCE_NAME,
  };
}

async function main() {
  let html;
  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        // poe2db บล็อก UA เปล่าๆ ของ bot บางที — ใช้ UA เบราว์เซอร์ปกติ
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    html = await res.text();
  } catch (err) {
    // ดึงไม่ได้ → ไม่เขียนทับไฟล์เดิม และไม่ทำให้ workflow step อื่นล้ม
    console.error('WARN: fetch ' + SOURCE_URL + ' failed: ' + err.message + ' — keeping previous home-status.json');
    return;
  }

  const prev = loadPrevious();
  const league = extractLeague(html);
  const stashSale = extractStashSale(html);

  if (!league && !stashSale) {
    console.error('WARN: could not parse league or stash sale from poe2db HTML — keeping previous home-status.json');
    return;
  }
  if (!league) console.error('WARN: league parse failed — reusing previous league block');
  if (!stashSale) console.error('WARN: stash sale parse failed — reusing previous stashSale block');

  const out = {
    updatedAt: new Date().toISOString(),
    league: league || prev.league || null,
    stashSale: stashSale || prev.stashSale || null,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log('Wrote ' + OUT_FILE);
  console.log(JSON.stringify(out, null, 2));
}

main();
