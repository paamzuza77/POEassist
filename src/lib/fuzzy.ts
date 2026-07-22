// P5 Phase 4 (patch 0.68) — fuzzy subsequence scorer, ported from index.html (cmdkFuzzyScore).
// Pure. Used by the Command Palette. Byte-identical logic.

// คืน -1 ถ้าไม่ match (q ไม่เป็น subsequence ของ text); ยิ่งตัวติดกัน/ต้นคำ ยิ่งคะแนนสูง; q ว่าง = 0
export function cmdkFuzzyScore(textIn: unknown, qIn: unknown): number {
  const text = String(textIn || '').toLowerCase();
  const q = String(qIn || '').toLowerCase().trim();
  if (!q) return 0;
  let ti = 0, score = 0, streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === ' ') { streak = 0; continue; }
    let found = -1;
    for (let i = ti; i < text.length; i++) { if (text[i] === c) { found = i; break; } }
    if (found === -1) return -1;
    if (found === ti) { streak++; score += 2 + streak; } else { streak = 0; score += 1; }
    if (found === 0 || /[\s\-–—/·:()]/.test(text[found - 1])) score += 3; // โบนัสต้นคำ
    ti = found + 1;
  }
  return score;
}
