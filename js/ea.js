var EA = function(exports) {
  "use strict";
  function formatDurationParts(ms) {
    if (typeof ms !== "number" || Number.isNaN(ms) || ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1e3);
    return {
      days: Math.floor(totalSec / 86400),
      hours: Math.floor(totalSec % 86400 / 3600),
      minutes: Math.floor(totalSec % 3600 / 60),
      seconds: totalSec % 60
    };
  }
  function fmtDuration(ms) {
    const p = formatDurationParts(ms);
    const pad = (n) => String(n).padStart(2, "0");
    if (p.days > 0) return `${p.days}d ${p.hours}h ${pad(p.minutes)}m ${pad(p.seconds)}s`;
    if (p.hours > 0) return `${p.hours}h ${pad(p.minutes)}m ${pad(p.seconds)}s`;
    return `${p.minutes}m ${pad(p.seconds)}s`;
  }
  function fmtNum(n) {
    return (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }
  function parseIso(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function kwHelpEsc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function notifFmtAgo(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const mins = Math.floor((Date.now() - d.getTime()) / 6e4);
    if (mins < 1) return "เมื่อครู่นี้";
    if (mins < 60) return mins + " นาทีก่อน";
    const h = Math.floor(mins / 60);
    if (h < 24) return h + " ชม.ก่อน";
    return Math.floor(h / 24) + " วันก่อน";
  }
  function acNum(v) {
    return String(Math.round(v * 100) / 100);
  }
  function acPct(v) {
    const r = Math.round(v * 100) / 100;
    return (r > 0 ? "+" : "") + r + "%";
  }
  function cmdkFuzzyScore(textIn, qIn) {
    const text = String(textIn || "").toLowerCase();
    const q = String(qIn || "").toLowerCase().trim();
    if (!q) return 0;
    let ti = 0, score = 0, streak = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi];
      if (c === " ") {
        streak = 0;
        continue;
      }
      let found = -1;
      for (let i = ti; i < text.length; i++) {
        if (text[i] === c) {
          found = i;
          break;
        }
      }
      if (found === -1) return -1;
      if (found === ti) {
        streak++;
        score += 2 + streak;
      } else {
        streak = 0;
        score += 1;
      }
      if (found === 0 || /[\s\-–—/·:()]/.test(text[found - 1])) score += 3;
      ti = found + 1;
    }
    return score;
  }
  function radarFmtValue(v, cur) {
    if (typeof v !== "number" || Number.isNaN(v)) return "—";
    const num = v >= 100 ? Math.round(v).toLocaleString("en-US") : v >= 1 ? v.toFixed(2) : v.toPrecision(2);
    return num + " " + (cur || "Div");
  }
  function priceSparkline(points, w, h) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const vals = points.map((p) => p.v).filter((v) => typeof v === "number");
    if (vals.length < 2) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = w || 64, H = h || 18, pad = 2;
    const stepX = (W - pad * 2) / (vals.length - 1);
    const pts = vals.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (H - pad * 2) * (1 - (v - min) / range);
      return Math.round(x * 10) / 10 + "," + Math.round(y * 10) / 10;
    });
    const up = vals[vals.length - 1] >= vals[0];
    const color = up ? "var(--ok, #4a4)" : "var(--fire, #d33)";
    const last = pts[pts.length - 1].split(",");
    return '<svg class="price-spark" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true"><polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="1.8" fill="' + color + '"/></svg>';
  }
  function radarSignalInfo(rc, isTopPick) {
    if (!rc || rc.hasEvidence === false) {
      return {
        group: "nosignal",
        label: "No signal",
        sub: "INSUFFICIENT DATA",
        note: "ไม่มีไอเทมราคาผ่านเกณฑ์ใน snapshot ปัจจุบัน — ไม่ได้แปลว่า content นี้ไม่มีค่า แค่ยังไม่มีหลักฐานราคา"
      };
    }
    if (isTopPick) return { group: "top", label: null, sub: "FARM SCORE", note: "" };
    const trend = typeof rc.avgTrend === "number" ? rc.avgTrend : 0;
    if (!(rc.score > 0)) {
      return {
        group: "watch",
        label: "Low confidence",
        sub: "WEAK SIGNAL",
        note: "มีหลักฐานราคาแต่สัญญาณอ่อนจนคะแนนปัดเป็น 0 — จับตาไว้ก่อน"
      };
    }
    if (trend >= 5) return { group: "rising", label: null, sub: "FARM SCORE", note: "ราคาไอเทมท็อปกำลังขึ้น (+" + trend.toFixed(1) + "% 7d)" };
    if (trend <= -5) return { group: "watch", label: null, sub: "FARM SCORE", note: "ราคาไอเทมท็อปกำลังลง (" + trend.toFixed(1) + "% 7d) — จับตาก่อนลงแรง" };
    return { group: "stable", label: null, sub: "FARM SCORE", note: "ราคาแทบไม่ขยับใน 7 วัน (" + (trend >= 0 ? "+" : "") + trend.toFixed(1) + "%) — รายได้ค่อนข้างนิ่ง" };
  }
  const CAP = 75;
  const PENALTY = -40;
  const RADAR_FRESH_HOURS = 2;
  function formatResValue(total) {
    if (total > CAP) return `${CAP}%(${total}%)`;
    return (total > 0 ? "+" : "") + total + "%";
  }
  const ASSET_BASE = "image/";
  const GAME_ASSETS = {
    divine: { file: "divine.webp", label: "Divine Orb" },
    chaos: { file: "chaos.webp", label: "Chaos Orb" },
    exalted: { file: "exalt.webp", label: "Exalted Orb" },
    mirror: { file: "mirror.webp", label: "Mirror of Kalandra" },
    abyss: { file: "abyss.webp", label: "Abyss" },
    breach: { file: "breach.webp", label: "Breach" },
    ritual: { file: "ritual.webp", label: "Ritual" },
    delirium: { file: "delirium.webp", label: "Delirium" },
    expedition: { file: "expedition.webp", label: "Expedition" },
    waystone: { file: "waystone.webp", label: "Waystone" },
    trialchaos: { file: "the trial of chaos.webp", label: "Trial of Chaos" },
    trialsekhemas: { file: "trial of the sekhemma.webp", label: "Trial of the Sekhemas" },
    atziri: { file: "Atziri.webp", label: "Atziri, the Red Queen" }
  };
  const ASSET_ALIASES = {
    "divine": "divine",
    "div": "divine",
    "dv": "divine",
    "divine orb": "divine",
    "chaos orb": "chaos",
    "c": "chaos",
    "exalted": "exalted",
    "exalt": "exalted",
    "ex": "exalted",
    "exalted orb": "exalted",
    "mirror": "mirror",
    "mirror of kalandra": "mirror",
    "abyss": "abyss",
    "breach": "breach",
    "ritual": "ritual",
    "delirium": "delirium",
    "expedition": "expedition",
    "waystone": "waystone",
    "waystones mapping": "waystone",
    "the trialmaster": "trialchaos",
    "trial of chaos": "trialchaos",
    "the trial of chaos": "trialchaos",
    "zarokh the temporal": "trialsekhemas",
    "trial of the sekhemas": "trialsekhemas",
    "atziri": "atziri",
    "atziri the red queen": "atziri"
  };
  const RADAR_ASSET_BY_KEY = {
    ritual: "ritual",
    abyss: "abyss",
    expedition: "expedition",
    delirium: "delirium",
    breach: "breach",
    waystones_mapping: "waystone"
  };
  function normalizeAssetKey(name) {
    return String(name == null ? "" : name).toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function getLocalAssetForName(name) {
    const key = ASSET_ALIASES[normalizeAssetKey(name)];
    if (!key) return null;
    const def = GAME_ASSETS[key];
    if (!def) return null;
    return { key, file: def.file, label: def.label, src: ASSET_BASE + encodeURIComponent(def.file) };
  }
  function renderAssetIcon(name, opts) {
    const o = opts || {};
    const asset = getLocalAssetForName(name);
    if (!asset) return "";
    const size = o.size && ["sm", "md", "lg"].includes(o.size) ? o.size : "sm";
    const lazy = o.lazy === false ? "" : ' loading="lazy" decoding="async"';
    const cls = "game-ico game-ico-" + size + (o.className ? " " + o.className : "");
    return '<img class="' + cls + '" src="' + asset.src + '" alt="" aria-hidden="true"' + lazy + ' title="' + asset.label.replace(/"/g, "&quot;") + '">';
  }
  document.addEventListener(
    "error",
    (ev) => {
      const el = ev.target;
      if (el && el.tagName === "IMG" && el.classList.contains("game-ico")) el.style.display = "none";
    },
    true
  );
  const TOAST_ICONS = { success: "✓", warn: "⚠", error: "✕", info: "i" };
  const TOAST_DEFAULT_MS = 3200;
  const toastByKey = /* @__PURE__ */ new Map();
  function toastStackEl() {
    let stack = document.getElementById("toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }
  function dismissToast(el) {
    if (!el || el.dataset.leaving === "1") return;
    el.dataset.leaving = "1";
    clearTimeout(el._toastTimer);
    if (el.dataset.toastKey) toastByKey.delete(el.dataset.toastKey);
    el.classList.add("leaving");
    const drop = () => el.remove();
    el.addEventListener("animationend", drop, { once: true });
    setTimeout(drop, 400);
  }
  function showToast(message, opts) {
    const o = opts || {};
    const kind = o.kind && TOAST_ICONS[o.kind] ? o.kind : "info";
    const duration = typeof o.duration === "number" ? o.duration : TOAST_DEFAULT_MS;
    if (o.key && toastByKey.has(o.key)) dismissToast(toastByKey.get(o.key));
    const el = document.createElement("div");
    el.className = "toast " + kind;
    if (o.key) {
      el.dataset.toastKey = o.key;
      toastByKey.set(o.key, el);
    }
    const ico = document.createElement("span");
    ico.className = "toast-ico";
    ico.setAttribute("aria-hidden", "true");
    ico.textContent = TOAST_ICONS[kind];
    const msg = document.createElement("span");
    msg.className = "toast-msg";
    msg.textContent = String(message == null ? "" : message);
    el.appendChild(ico);
    el.appendChild(msg);
    if (o.action && typeof o.action.onClick === "function") {
      const action = o.action;
      const act = document.createElement("button");
      act.type = "button";
      act.className = "toast-action";
      act.textContent = String(action.label == null ? "OK" : action.label);
      act.addEventListener("click", () => {
        try {
          action.onClick();
        } finally {
          dismissToast(el);
        }
      });
      el.appendChild(act);
    }
    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "ปิดการแจ้งเตือน");
    close.textContent = "✕";
    close.addEventListener("click", () => dismissToast(el));
    el.appendChild(close);
    toastStackEl().appendChild(el);
    const arm = () => {
      clearTimeout(el._toastTimer);
      if (duration > 0) el._toastTimer = setTimeout(() => dismissToast(el), duration);
    };
    el.addEventListener("mouseenter", () => clearTimeout(el._toastTimer));
    el.addEventListener("mouseleave", arm);
    el.addEventListener("focusin", () => clearTimeout(el._toastTimer));
    el.addEventListener("focusout", arm);
    arm();
    return el;
  }
  function showSuccessToast(message, opts) {
    return showToast(message, Object.assign({}, opts, { kind: "success" }));
  }
  function showWarningToast(message, opts) {
    return showToast(message, Object.assign({}, opts, { kind: "warn" }));
  }
  function showErrorToast(message, opts) {
    return showToast(message, Object.assign({}, opts, { kind: "error", duration: opts && opts.duration || 6e3 }));
  }
  function showInfoToast(message, opts) {
    return showToast(message, Object.assign({}, opts, { kind: "info" }));
  }
  function uxEmptyState(cfg) {
    var _a;
    const c = cfg || {};
    const box = document.createElement("div");
    box.className = "ux-state" + (c.variant && c.variant !== "empty" ? " " + c.variant : "");
    if (c.icon) {
      const i = document.createElement("div");
      i.className = "ux-state-ico";
      i.setAttribute("aria-hidden", "true");
      i.textContent = c.icon;
      box.appendChild(i);
    }
    if (c.title) {
      const t2 = document.createElement("div");
      t2.className = "ux-state-title";
      t2.textContent = c.title;
      box.appendChild(t2);
    }
    if (c.body || c.bodyHtml) {
      const b = document.createElement("div");
      b.className = "ux-state-body";
      if (c.bodyHtml) b.innerHTML = c.bodyHtml;
      else b.textContent = (_a = c.body) != null ? _a : "";
      box.appendChild(b);
    }
    const acts = (c.actions || []).filter(Boolean);
    if (acts.length) {
      const row = document.createElement("div");
      row.className = "ux-state-actions";
      acts.forEach((a) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ocr-btn" + (a.primary ? " primary" : "");
        btn.textContent = a.label;
        btn.addEventListener("click", a.onClick);
        row.appendChild(btn);
      });
      box.appendChild(row);
    }
    return box;
  }
  function uxSkeleton(rows) {
    const wrap = document.createElement("div");
    wrap.className = "ux-skel-list";
    wrap.setAttribute("aria-hidden", "true");
    const n = Math.max(1, Math.min(8, rows || 5));
    for (let i = 0; i < n; i++) {
      const r = document.createElement("div");
      r.className = "ux-skel-row";
      wrap.appendChild(r);
    }
    return wrap;
  }
  function uxFlash(el) {
    if (!el || !el.classList) return;
    el.classList.remove("ux-flash");
    void el.offsetWidth;
    el.classList.add("ux-flash");
    setTimeout(() => el.classList.remove("ux-flash"), 1300);
  }
  function uxBusy(btn, on, busyLabel) {
    var _a;
    if (!btn) return;
    if (on) {
      if (btn.dataset.idleLabel == null) btn.dataset.idleLabel = (_a = btn.textContent) != null ? _a : "";
      btn.classList.add("is-busy");
      btn.disabled = true;
      if (busyLabel) btn.textContent = busyLabel;
    } else {
      btn.classList.remove("is-busy");
      btn.disabled = false;
      if (btn.dataset.idleLabel != null) {
        btn.textContent = btn.dataset.idleLabel;
        delete btn.dataset.idleLabel;
      }
    }
  }
  function radarItemScore(it) {
    const t = Math.max(-50, Math.min(150, typeof it.trend7d === "number" ? it.trend7d : 0));
    const trendScore = (t + 50) / 200;
    const v = typeof it.value === "number" && it.value > 0 ? it.value : 0;
    const valueScore = Math.min(1, Math.log10(1 + v * 10) / 2);
    const volScore = typeof it.volumeScore === "number" ? Math.max(0, Math.min(1, it.volumeScore)) : 0.3;
    let s = trendScore * 0.45 + valueScore * 0.25 + volScore * 0.3;
    if (it.liquidityLabel === "Low" && t > 100) s *= 0.75;
    else if (it.liquidityLabel === "Low") s *= 0.9;
    if (it.risk) s *= 0.95;
    return Math.max(0, Math.min(1, s));
  }
  function buildRadarRecos(items, allBuckets) {
    const groups = /* @__PURE__ */ new Map();
    items.forEach((it) => {
      if (!it.contentKey) return;
      if (!groups.has(it.contentKey)) groups.set(it.contentKey, []);
      groups.get(it.contentKey).push(it);
    });
    const bucketMeta = /* @__PURE__ */ new Map();
    (Array.isArray(allBuckets) ? allBuckets : []).forEach((b) => {
      if (b && b.contentKey) bucketMeta.set(b.contentKey, b);
    });
    groups.forEach((_, key) => {
      if (!bucketMeta.has(key)) bucketMeta.set(key, { contentKey: key, displayName: key });
    });
    const recos = [];
    bucketMeta.forEach((meta, key) => {
      const list = groups.get(key) || [];
      if (list.length === 0) {
        recos.push({
          content: meta.displayName || key,
          contentKey: key,
          score: 0,
          confidence: typeof meta.confidence === "number" ? meta.confidence : null,
          relatedItems: [],
          reason: [],
          status: meta.noEvidenceStatus || meta.status || "No qualifying 1D+ items in current snapshot",
          risk: "",
          sourceUrls: [],
          hasEvidence: false,
          itemCount: 0
          // additive display field (patch 0.39)
        });
        return;
      }
      const scored = list.map((it) => ({ it, s: radarItemScore(it) })).sort((a, b) => b.s - a.s);
      const top = scored.slice(0, 3);
      const avgScore = top.reduce((sum, x) => sum + x.s, 0) / top.length;
      const conf = Math.max(...list.map((x) => typeof x.confidence === "number" ? x.confidence : 0.7));
      const avgTrend = top.reduce((sum, x) => sum + (x.it.trend7d || 0), 0) / top.length;
      const avgValue = top.reduce((sum, x) => sum + (x.it.value || 0), 0) / top.length;
      const lowLiq = list.filter((x) => x.liquidityLabel === "Low").length;
      recos.push({
        content: list[0].mappedContent || meta.displayName || key,
        contentKey: key,
        score: Math.round(avgScore * conf * 100),
        confidence: conf,
        relatedItems: scored.slice(0, 4).map((x) => x.it.name),
        reason: [
          list.length + " รายการผ่านเกณฑ์ราคาขั้นต่ำ",
          "เทรนด์เฉลี่ยไอเทมท็อป: " + (avgTrend >= 0 ? "+" : "") + avgTrend.toFixed(1) + "% (7d)",
          "มูลค่าเฉลี่ยไอเทมท็อป: " + avgValue.toFixed(2) + " Div"
        ],
        risk: lowLiq > list.length / 2 ? "ไอเทมส่วนใหญ่สภาพคล่องต่ำ — ราคา spike อาจย่อ" : "",
        sourceUrls: [...new Set(list.map((x) => x.sourceUrl).filter(Boolean))].slice(0, 2),
        hasEvidence: true,
        // additive display fields (patch 0.39) — ไม่กระทบสูตร score เดิม
        itemCount: list.length,
        avgTrend,
        avgValue,
        lowLiqCount: lowLiq,
        trendKnownCount: list.filter((x) => typeof x.trend7d === "number").length
      });
    });
    recos.sort((a, b) => {
      if (a.hasEvidence !== b.hasEvidence) return a.hasEvidence ? -1 : 1;
      return b.score - a.score;
    });
    return recos;
  }
  exports.ASSET_ALIASES = ASSET_ALIASES;
  exports.CAP = CAP;
  exports.GAME_ASSETS = GAME_ASSETS;
  exports.PENALTY = PENALTY;
  exports.RADAR_ASSET_BY_KEY = RADAR_ASSET_BY_KEY;
  exports.RADAR_FRESH_HOURS = RADAR_FRESH_HOURS;
  exports.acNum = acNum;
  exports.acPct = acPct;
  exports.buildRadarRecos = buildRadarRecos;
  exports.cmdkFuzzyScore = cmdkFuzzyScore;
  exports.fmtDuration = fmtDuration;
  exports.fmtNum = fmtNum;
  exports.formatDurationParts = formatDurationParts;
  exports.formatResValue = formatResValue;
  exports.getLocalAssetForName = getLocalAssetForName;
  exports.kwHelpEsc = kwHelpEsc;
  exports.normalizeAssetKey = normalizeAssetKey;
  exports.notifFmtAgo = notifFmtAgo;
  exports.parseIso = parseIso;
  exports.priceSparkline = priceSparkline;
  exports.radarFmtValue = radarFmtValue;
  exports.radarItemScore = radarItemScore;
  exports.radarSignalInfo = radarSignalInfo;
  exports.renderAssetIcon = renderAssetIcon;
  exports.showErrorToast = showErrorToast;
  exports.showInfoToast = showInfoToast;
  exports.showSuccessToast = showSuccessToast;
  exports.showToast = showToast;
  exports.showWarningToast = showWarningToast;
  exports.uxBusy = uxBusy;
  exports.uxEmptyState = uxEmptyState;
  exports.uxFlash = uxFlash;
  exports.uxSkeleton = uxSkeleton;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
