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
  exports.ASSET_ALIASES = ASSET_ALIASES;
  exports.GAME_ASSETS = GAME_ASSETS;
  exports.RADAR_ASSET_BY_KEY = RADAR_ASSET_BY_KEY;
  exports.fmtDuration = fmtDuration;
  exports.fmtNum = fmtNum;
  exports.formatDurationParts = formatDurationParts;
  exports.getLocalAssetForName = getLocalAssetForName;
  exports.normalizeAssetKey = normalizeAssetKey;
  exports.renderAssetIcon = renderAssetIcon;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
