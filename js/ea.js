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
  exports.fmtDuration = fmtDuration;
  exports.fmtNum = fmtNum;
  exports.formatDurationParts = formatDurationParts;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({});
