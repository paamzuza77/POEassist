// P5 Phase 3 (patch 0.66) — Modern UX Foundation, ported from js/ux-foundation.js to TypeScript.
// Logic byte-identical. Built into js/ea.js (window.EA), loaded before the monolith.
// Public API (exposed on window.EA): showToast + show{Success,Warning,Error,Info}Toast,
// uxEmptyState, uxSkeleton, uxFlash, uxBusy. Internal helpers stay module-private.
// กติกา: ห้ามใช้ toast แทน confirm() ของงานลบข้อมูล (toast ไม่บล็อก กดพลาดแล้วกู้ไม่ได้).
// จับคู่กับ css/ux-foundation.css (ยัง <link> แยก — เป็น CSS ไม่ย้าย).

type ToastKind = 'success' | 'warn' | 'error' | 'info';
type ToastEl = HTMLDivElement & { _toastTimer?: ReturnType<typeof setTimeout> };

export interface ToastAction {
  label?: string;
  onClick: () => void;
}
export interface ToastOpts {
  kind?: ToastKind;
  duration?: number;
  key?: string;
  action?: ToastAction;
}

const TOAST_ICONS: Record<ToastKind, string> = { success: '✓', warn: '⚠', error: '✕', info: 'i' };
const TOAST_DEFAULT_MS = 3200;
const toastByKey = new Map<string, ToastEl>(); // key → element (toast ที่มี key ซ้ำจะถูกแทนที่ ไม่กองซ้อน)

function toastStackEl(): HTMLElement {
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

function dismissToast(el: ToastEl | null | undefined): void {
  if (!el || el.dataset.leaving === '1') return;
  el.dataset.leaving = '1';
  clearTimeout(el._toastTimer);
  if (el.dataset.toastKey) toastByKey.delete(el.dataset.toastKey);
  el.classList.add('leaving');
  const drop = (): void => el.remove();
  el.addEventListener('animationend', drop, { once: true });
  setTimeout(drop, 400); // กันกรณี reduced-motion (ไม่มี animationend ให้รอ)
}

export function showToast(message: unknown, opts?: ToastOpts): HTMLElement {
  const o = opts || {};
  const kind: ToastKind = o.kind && TOAST_ICONS[o.kind] ? o.kind : 'info';
  const duration = typeof o.duration === 'number' ? o.duration : TOAST_DEFAULT_MS;

  if (o.key && toastByKey.has(o.key)) dismissToast(toastByKey.get(o.key));

  const el = document.createElement('div') as ToastEl;
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
    const action = o.action;
    const act = document.createElement('button');
    act.type = 'button';
    act.className = 'toast-action';
    act.textContent = String(action.label == null ? 'OK' : action.label);
    act.addEventListener('click', () => {
      try { action.onClick(); } finally { dismissToast(el); }
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
  const arm = (): void => {
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

export function showSuccessToast(message: unknown, opts?: ToastOpts): HTMLElement {
  return showToast(message, Object.assign({}, opts, { kind: 'success' as const }));
}
export function showWarningToast(message: unknown, opts?: ToastOpts): HTMLElement {
  return showToast(message, Object.assign({}, opts, { kind: 'warn' as const }));
}
export function showErrorToast(message: unknown, opts?: ToastOpts): HTMLElement {
  return showToast(message, Object.assign({}, opts, { kind: 'error' as const, duration: (opts && opts.duration) || 6000 }));
}
export function showInfoToast(message: unknown, opts?: ToastOpts): HTMLElement {
  return showToast(message, Object.assign({}, opts, { kind: 'info' as const }));
}

/* ---- Empty / loading / error state ---- */
export interface UxAction {
  label: string;
  onClick: (ev?: Event) => void;
  primary?: boolean;
}
export interface UxStateCfg {
  icon?: string;
  title?: string;
  body?: string;
  bodyHtml?: string;
  actions?: Array<UxAction | null | undefined | false>;
  variant?: 'empty' | 'loading' | 'error';
}

export function uxEmptyState(cfg?: UxStateCfg): HTMLElement {
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
    if (c.bodyHtml) b.innerHTML = c.bodyHtml; else b.textContent = c.body ?? '';
    box.appendChild(b);
  }
  const acts = (c.actions || []).filter(Boolean) as UxAction[];
  if (acts.length) {
    const row = document.createElement('div');
    row.className = 'ux-state-actions';
    acts.forEach((a) => {
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

export function uxSkeleton(rows?: number): HTMLElement {
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
export function uxFlash(el: HTMLElement | null | undefined): void {
  if (!el || !el.classList) return;
  el.classList.remove('ux-flash');
  void el.offsetWidth; // restart animation (reflow) — จำเป็นเมื่อ flash ซ้ำที่เดิม
  el.classList.add('ux-flash');
  setTimeout(() => el.classList.remove('ux-flash'), 1300);
}

// ปุ่มกำลังทำงาน: กันกดซ้ำระหว่าง export/import แล้วคืนข้อความเดิมให้เอง
export function uxBusy(btn: HTMLButtonElement | null | undefined, on: boolean, busyLabel?: string): void {
  if (!btn) return;
  if (on) {
    if (btn.dataset.idleLabel == null) btn.dataset.idleLabel = btn.textContent ?? '';
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
