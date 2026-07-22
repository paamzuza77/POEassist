/* ==================== Modern UX Foundation (patch 0.31) ====================
   ระบบกลาง 3 อย่างที่ทุกแท็บเรียกใช้ได้ (ไม่มี state/สคีมาใหม่ ไม่แตะการคำนวณใดๆ):

     showToast(msg, opts) / showSuccessToast / showWarningToast / showErrorToast / showInfoToast
       opts: { duration, key }  — key เดิมจะ "แทนที่" toast ตัวเก่า ไม่ซ้อนกองกัน
       auto-dismiss + หยุดนับถอยหลังตอนเอาเมาส์ชี้/โฟกัสอยู่ในนั้น + ปุ่มปิดเอง
       เขียนลง aria-live region ให้ screen reader อ่านด้วย

     uxEmptyState({ icon, title, body, bodyHtml, actions, variant })  → HTMLElement
       variant: 'empty' (ค่าเริ่มต้น) | 'loading' | 'error'
       actions: [{ label, onClick, primary }]
     uxSkeleton(rows)  → HTMLElement (placeholder ระหว่างโหลด JSON)

     uxFlash(el)          — ไฮไลต์เขียวจางๆ ให้แถว/การ์ดที่เพิ่งเพิ่ม/เปลี่ยน
     uxBusy(btn, on, txt) — ปุ่มกำลังทำงาน (import/export) กันกดซ้ำ

   ห้ามใช้ toast แทน confirm() ของงานที่ลบข้อมูล — toast ไม่บล็อก ผู้ใช้กดพลาดแล้วกู้ไม่ได้

   ── modularization Phase 1 (patch 0.34) ─────────────────────────────────────
   ย้ายออกจาก inline <script> ของ index.html เป็นไฟล์แยก — โค้ดเดิมไม่เปลี่ยน
   ต้องโหลด "ก่อน" สคริปต์หลักของ index.html (แท็กอยู่เหนือ <script> ตัวหลัก)
   เป็น classic script ตัวเดียวกับ global scope — const/function ด้านล่างจึงมองเห็นได้จากสคริปต์หลัก
   จับคู่กับ css/ux-foundation.css
   =========================================================================== */

const TOAST_ICONS = { success: '✓', warn: '⚠', error: '✕', info: 'i' };
const TOAST_DEFAULT_MS = 3200;
const toastByKey = new Map(); // key → element (toast ที่มี key ซ้ำจะถูกแทนที่ ไม่กองซ้อน)

function toastStackEl() {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  return stack;
}

function dismissToast(el) {
  if (!el || el.dataset.leaving === '1') return;
  el.dataset.leaving = '1';
  clearTimeout(el._toastTimer);
  if (el.dataset.toastKey) toastByKey.delete(el.dataset.toastKey);
  el.classList.add('leaving');
  const drop = () => el.remove();
  el.addEventListener('animationend', drop, { once: true });
  setTimeout(drop, 400); // กันกรณี reduced-motion (ไม่มี animationend ให้รอ)
}

function showToast(message, opts) {
  const o = opts || {};
  const kind = TOAST_ICONS[o.kind] ? o.kind : 'info';
  const duration = typeof o.duration === 'number' ? o.duration : TOAST_DEFAULT_MS;

  if (o.key && toastByKey.has(o.key)) dismissToast(toastByKey.get(o.key));

  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  if (o.key) { el.dataset.toastKey = o.key; toastByKey.set(o.key, el); }

  const ico = document.createElement('span');
  ico.className = 'toast-ico';
  ico.setAttribute('aria-hidden', 'true');
  ico.textContent = TOAST_ICONS[kind];
  const msg = document.createElement('span');
  msg.className = 'toast-msg';
  msg.textContent = String(message == null ? '' : message); // textContent = escape ให้เอง

  el.appendChild(ico);
  el.appendChild(msg);

  // ปุ่ม action เสริม (additive) — เช่นปุ่ม "เลิกทำ" ของระบบ undo; o.action = { label, onClick }
  if (o.action && typeof o.action.onClick === 'function') {
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'toast-action';
    act.textContent = String(o.action.label == null ? 'OK' : o.action.label);
    act.addEventListener('click', () => {
      try { o.action.onClick(); } finally { dismissToast(el); }
    });
    el.appendChild(act);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'ปิดการแจ้งเตือน');
  close.textContent = '✕';
  close.addEventListener('click', () => dismissToast(el));
  el.appendChild(close);
  toastStackEl().appendChild(el);

  // หยุดนับถอยหลังตอนชี้/โฟกัสอยู่ในนั้น — ผู้ใช้จะได้อ่าน/กดลิงก์ทัน
  const arm = () => {
    clearTimeout(el._toastTimer);
    if (duration > 0) el._toastTimer = setTimeout(() => dismissToast(el), duration);
  };
  el.addEventListener('mouseenter', () => clearTimeout(el._toastTimer));
  el.addEventListener('mouseleave', arm);
  el.addEventListener('focusin', () => clearTimeout(el._toastTimer));
  el.addEventListener('focusout', arm);
  arm();
  return el;
}

function showSuccessToast(message, opts) { return showToast(message, Object.assign({}, opts, { kind: 'success' })); }
function showWarningToast(message, opts) { return showToast(message, Object.assign({}, opts, { kind: 'warn' })); }
function showErrorToast(message, opts) { return showToast(message, Object.assign({}, opts, { kind: 'error', duration: (opts && opts.duration) || 6000 })); }
function showInfoToast(message, opts) { return showToast(message, Object.assign({}, opts, { kind: 'info' })); }

/* ---- Empty / loading / error state ---- */
function uxEmptyState(cfg) {
  const c = cfg || {};
  const box = document.createElement('div');
  box.className = 'ux-state' + (c.variant && c.variant !== 'empty' ? ' ' + c.variant : '');
  if (c.icon) {
    const i = document.createElement('div');
    i.className = 'ux-state-ico';
    i.setAttribute('aria-hidden', 'true');
    i.textContent = c.icon;
    box.appendChild(i);
  }
  if (c.title) {
    const t2 = document.createElement('div');
    t2.className = 'ux-state-title';
    t2.textContent = c.title;
    box.appendChild(t2);
  }
  if (c.body || c.bodyHtml) {
    const b = document.createElement('div');
    b.className = 'ux-state-body';
    // bodyHtml ใช้เฉพาะข้อความคงที่ในไฟล์นี้ (เช่น <code>คำสั่ง</code>) — ห้ามส่งข้อมูลจากภายนอกเข้ามา
    if (c.bodyHtml) b.innerHTML = c.bodyHtml; else b.textContent = c.body;
    box.appendChild(b);
  }
  const acts = (c.actions || []).filter(Boolean);
  if (acts.length) {
    const row = document.createElement('div');
    row.className = 'ux-state-actions';
    acts.forEach(a => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ocr-btn' + (a.primary ? ' primary' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', a.onClick);
      row.appendChild(btn);
    });
    box.appendChild(row);
  }
  return box;
}

function uxSkeleton(rows) {
  const wrap = document.createElement('div');
  wrap.className = 'ux-skel-list';
  wrap.setAttribute('aria-hidden', 'true'); // ตัวจริงคือ aria-busy/ข้อความสถานะ — ไม่ต้องให้ SR อ่านกล่องเปล่า
  const n = Math.max(1, Math.min(8, rows || 5));
  for (let i = 0; i < n; i++) {
    const r = document.createElement('div');
    r.className = 'ux-skel-row';
    wrap.appendChild(r);
  }
  return wrap;
}

/* ---- Micro-interactions ---- */
function uxFlash(el) {
  if (!el || !el.classList) return;
  el.classList.remove('ux-flash');
  void el.offsetWidth; // restart animation (reflow) — จำเป็นเมื่อ flash ซ้ำที่เดิม
  el.classList.add('ux-flash');
  setTimeout(() => el.classList.remove('ux-flash'), 1300);
}

// ปุ่มกำลังทำงาน: กันกดซ้ำระหว่าง export/import แล้วคืนข้อความเดิมให้เอง
function uxBusy(btn, on, busyLabel) {
  if (!btn) return;
  if (on) {
    if (btn.dataset.idleLabel == null) btn.dataset.idleLabel = btn.textContent;
    btn.classList.add('is-busy');
    btn.disabled = true;
    if (busyLabel) btn.textContent = busyLabel;
  } else {
    btn.classList.remove('is-busy');
    btn.disabled = false;
    if (btn.dataset.idleLabel != null) {
      btn.textContent = btn.dataset.idleLabel;
      delete btn.dataset.idleLabel;
    }
  }
}
