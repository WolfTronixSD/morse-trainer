// Dit Dah Dojo: signal display. Draws into every visible .scope canvas.
// Modes: oscilloscope, signal lamp, paper tape, waterfall and ripples, plus an
// optional full-screen flash and a "light only" mode that mutes the beep.
"use strict";

const VIZ_MODES = [
  { v: "scope", n: "📈 Scope" },
  { v: "lamp", n: "💡 Lamp" },
  { v: "tape", n: "📜 Tape" },
  { v: "fall", n: "🌈 Waterfall" },
  { v: "ripple", n: "🌊 Ripples" },
];
const VIZ_COLORS = ["", "#ffffff", "#ff3b3b", "#ffb020", "#ffe14d", "#4dff6a", "#3df5ff", "#4d8bff", "#c04dff", "#ff4dc4"];

// The phone's flashlight, through the rear camera's "torch" control. Works in
// Chrome on Android; iPhone browsers don't offer torch control to web pages.
const Torch = {
  track: null, want: false, lit: false, busy: false,
  async enable() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      const t = st.getVideoTracks()[0], caps = t.getCapabilities ? t.getCapabilities() : {};
      if (!caps.torch) { st.getTracks().forEach((x) => x.stop()); return "unsupported"; }
      this.track = t; this.lit = false; return "ok";
    } catch (e) { return e && e.name === "NotAllowedError" ? "denied" : "unsupported"; }
  },
  disable() { this.want = false; if (this.track) { try { this.track.stop(); } catch {} } this.track = null; this.lit = false; },
  // the torch reacts slowly, so only one change is in flight and the latest wish wins
  set(on) {
    this.want = on;
    if (!this.track || this.busy || this.lit === on) return;
    this.busy = true;
    this.track.applyConstraints({ advanced: [{ torch: on }] }).then(() => { this.lit = on; }, () => {}).finally(() => { this.busy = false; if (this.want !== this.lit) this.set(this.want); });
  },
};

const Viz = (() => {
  const dpr = () => devicePixelRatio || 1;
  let tbuf, fbuf, level = 0, wasOn = false, labelUntil = 0;
  const hist = []; // [time ms, on] transitions for the tape
  const rings = []; // ripple start times
  const state = new WeakMap(); // per-canvas memory (waterfall image)

  const color = () => S.set.vizColor || getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#4dffb0";
  const rgba = (hex, a) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
  };

  const grid = (x, w, h) => {
    x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = 1;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo((w * i) / 6, 0); x.lineTo((w * i) / 6, h); x.stroke(); }
    x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
  };

  const scope = (x, w, h, col, tm) => {
    grid(x, w, h);
    const an = Sound.analyser;
    x.strokeStyle = col; x.lineWidth = 2.5 * dpr(); x.shadowColor = col; x.shadowBlur = 12;
    x.beginPath();
    const n = 512;
    for (let i = 0; i < n; i++) {
      const v = an ? tbuf[i] : 0;
      const y = h / 2 - (v * 1.4 + Math.sin(i / 18 + tm * 3) * 0.015) * h * 0.45;
      i ? x.lineTo((i / n) * w, y) : x.moveTo(0, y);
    }
    x.stroke();
  };

  const lamp = (x, w, h, col) => {
    const r = h * 0.36, cx = w / 2, cy = h / 2;
    // halo
    if (level > 0.02) {
      const g = x.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 3.2);
      g.addColorStop(0, rgba(col, 0.55 * level)); g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    // bulb
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
    const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, level > 0.02 ? "#fff" : "#2a2a35"); g.addColorStop(0.35, level > 0.02 ? col : "#1a1a22"); g.addColorStop(1, level > 0.02 ? rgba(col, 0.8) : "#101016");
    x.globalAlpha = 1; x.fillStyle = g; x.shadowColor = col; x.shadowBlur = 40 * level * dpr(); x.fill();
    if (level < 1) { x.globalAlpha = 1 - level; x.fillStyle = "#14141c"; x.fill(); x.globalAlpha = 1; }
    x.shadowBlur = 0; x.lineWidth = 2 * dpr(); x.strokeStyle = rgba(col, 0.25 + 0.75 * level); x.stroke();
  };

  const tape = (x, w, h, col, now) => {
    const span = 2500, bar = h * 0.18, y = h / 2 - bar / 2;
    x.strokeStyle = "rgba(255,255,255,.08)"; x.setLineDash([3 * dpr(), 6 * dpr()]); x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); x.setLineDash([]);
    x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 10;
    const X = (t) => w - ((now - t) / span) * w;
    for (let i = 0; i < hist.length; i++) {
      if (!hist[i][1]) continue;
      const a = X(hist[i][0]), b = i + 1 < hist.length ? X(hist[i + 1][0]) : w;
      if (b < 0) continue;
      x.beginPath();
      x.roundRect ? x.roundRect(a, y, Math.max(2, b - a), bar, bar / 2) : x.rect(a, y, Math.max(2, b - a), bar);
      x.fill();
    }
    x.shadowBlur = 0;
    // pen
    x.fillStyle = rgba(col, Sound.toneOn ? 1 : 0.35);
    x.beginPath(); x.arc(w - 3 * dpr(), h / 2, 4 * dpr(), 0, Math.PI * 2); x.fill();
  };

  const fall = (c, x, w, h, col) => {
    const an = Sound.analyser;
    let st = state.get(c);
    if (!st || st.w !== w || st.h !== h) { st = { w, h, img: document.createElement("canvas") }; st.img.width = w; st.img.height = h; state.set(c, st); }
    const ix = st.img.getContext("2d"), step = Math.max(1, Math.round(2 * dpr()));
    ix.globalCompositeOperation = "copy"; ix.drawImage(st.img, -step, 0); ix.globalCompositeOperation = "source-over";
    ix.clearRect(w - step, 0, step, h);
    if (an) {
      // 200 Hz at the bottom to 1200 Hz at the top
      const hz = Sound.ctx.sampleRate / an.fftSize, lo = 200 / hz, hi = 1200 / hz;
      for (let y = 0; y < h; y += step) {
        const v = fbuf[Math.round(hi - (y / h) * (hi - lo))] / 255;
        if (v < 0.25) continue;
        ix.fillStyle = rgba(col, Math.min(1, ((v - 0.25) / 0.6) ** 1.5));
        ix.fillRect(w - step, y, step, step);
      }
    }
    x.drawImage(st.img, 0, 0);
  };

  const ripple = (x, w, h, col, now) => {
    const cx = w / 2, cy = h / 2, max = Math.hypot(w, h) / 2;
    for (let i = rings.length - 1; i >= 0; i--) {
      const k = (now - rings[i]) / 1600;
      if (k > 1) { rings.splice(i, 1); continue; }
      x.beginPath(); x.arc(cx, cy, 8 * dpr() + k * max, 0, Math.PI * 2);
      x.strokeStyle = rgba(col, (1 - k) * 0.9); x.lineWidth = (3 - 2 * k) * dpr(); x.stroke();
    }
    x.beginPath(); x.arc(cx, cy, (6 + 6 * level) * dpr(), 0, Math.PI * 2);
    x.fillStyle = rgba(col, 0.3 + 0.7 * level); x.shadowColor = col; x.shadowBlur = 20 * level; x.fill(); x.shadowBlur = 0;
  };

  const flash = document.createElement("div");
  flash.id = "flash"; document.body.appendChild(flash);

  const draw = () => {
    requestAnimationFrame(draw);
    const now = performance.now(), on = Sound.toneOn;
    // tone state history
    if (on !== wasOn) { wasOn = on; hist.push([now, on]); if (on) rings.push(now); }
    while (hist.length > 2 && hist[1][0] < now - 3000) hist.shift();
    level = on ? 1 : Math.max(0, level - 0.25); // bulb: instant on, short afterglow
    const col = color();
    flash.style.background = col;
    if (Torch.track) Torch.set(on);
    flash.style.opacity = S.set.vizFlash && level > 0 ? (0.85 * level).toFixed(2) : "0";

    const cvs = $$(".tab.active .scope");
    if (!cvs.length) return;
    const an = Sound.analyser, mode = S.set.viz;
    if (an) {
      if (!tbuf) { tbuf = new Float32Array(an.fftSize); fbuf = new Uint8Array(an.frequencyBinCount); }
      if (mode === "scope") an.getFloatTimeDomainData(tbuf);
      if (mode === "fall") { an.smoothingTimeConstant = 0.2; an.getByteFrequencyData(fbuf); }
    }
    for (const c of cvs) {
      const w = Math.round(c.clientWidth * dpr()), h = Math.round(c.clientHeight * dpr());
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const x = c.getContext("2d");
      x.clearRect(0, 0, w, h); x.shadowBlur = 0; x.globalAlpha = 1;
      if (mode === "lamp") lamp(x, w, h, col);
      else if (mode === "tape") tape(x, w, h, col, now);
      else if (mode === "fall") fall(c, x, w, h, col);
      else if (mode === "ripple") ripple(x, w, h, col, now);
      else scope(x, w, h, col, now / 1000);
      if (now < labelUntil) {
        const m = VIZ_MODES.find((m) => m.v === mode);
        x.shadowBlur = 0; x.globalAlpha = Math.min(1, (labelUntil - now) / 300);
        x.font = `700 ${13 * dpr()}px -apple-system, sans-serif`; x.textAlign = "left"; x.textBaseline = "bottom";
        x.fillStyle = "rgba(0,0,0,.6)"; x.fillRect(6 * dpr(), h - 26 * dpr(), x.measureText(m.n).width + 14 * dpr(), 20 * dpr());
        x.fillStyle = "#fff"; x.fillText(m.n, 13 * dpr(), h - 9 * dpr()); x.globalAlpha = 1;
      }
    }
  };
  requestAnimationFrame(draw);
  return { showLabel: () => (labelUntil = performance.now() + 1500) };
})();

/* ---------- settings ---------- */
(() => {
  $("#vizModes").innerHTML = VIZ_MODES.map((m) => `<button data-v="${m.v}">${m.n}</button>`).join("");
  $("#vizColors").innerHTML =
    VIZ_COLORS.map((c) => `<button data-v="${c}" title="${c || "Theme color"}" style="--c:${c || "var(--accent)"}">${c ? "" : "🎨"}</button>`).join("") +
    `<label class="sw-custom" title="Pick any color">🌈<input type="color" id="vizCustom"></label>`;
  const sync = () => {
    const s = S.set;
    $$("#vizModes button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.viz));
    let found = false;
    $$("#vizColors button").forEach((b) => { const on = b.dataset.v === s.vizColor; found ||= on; b.classList.toggle("on", on); });
    $(".sw-custom").classList.toggle("on", !found);
    if (!found) { $(".sw-custom").style.setProperty("--c", s.vizColor); $("#vizCustom").value = s.vizColor; }
    $("#vizFlash").checked = s.vizFlash; $("#vizMute").checked = s.vizMute;
    document.body.style.setProperty("--viz", s.vizColor || "var(--accent)");
    Sound.opts.mute = s.vizMute;
    if (Sound.toneBus) Sound.toneBus.gain.value = s.vizMute ? 0 : 1;
  };
  const demo = () => Sound.play("VVV", { wpm: 18, fw: 18 });
  seg("#vizModes", (v) => { S.set.viz = v; save(); sync(); Viz.showLabel(); demo(); });
  seg("#vizColors", (v) => { S.set.vizColor = v; save(); sync(); demo(); });
  $("#vizCustom").addEventListener("input", (e) => { S.set.vizColor = e.target.value; save(); sync(); });
  $("#vizCustom").addEventListener("change", demo);
  $("#vizTorch").addEventListener("change", async (e) => {
    if (!e.target.checked) { Torch.disable(); return; }
    const r = await Torch.enable();
    if (r === "ok") { toast("🔦 Flashlight ready! Best at 15 WPM or slower, it's a bit lazy.", 3000); demo(); return; }
    e.target.checked = false;
    toast(r === "denied" ? "🔦 Camera access was blocked, and the flashlight needs it." : "🔦 This browser can't switch the flashlight. iPhone doesn't allow it for web apps yet, so try ⚡ Flash the whole screen.", 4500);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && Torch.track) { Torch.disable(); $("#vizTorch").checked = false; } });
  $("#vizFlash").addEventListener("change", (e) => { S.set.vizFlash = e.target.checked; save(); sync(); if (e.target.checked) demo(); });
  $("#vizMute").addEventListener("change", (e) => {
    S.set.vizMute = e.target.checked; save(); sync();
    if (e.target.checked) { if (S.set.viz === "scope" || S.set.viz === "fall") { S.set.viz = "lamp"; save(); sync(); } toast("💡 Light only: read the blinks, no beeps!", 2500); demo(); }
  });
  // tap any display to cycle through the modes
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".scope-wrap") || e.target.closest(".mic-trace")) return;
    const i = VIZ_MODES.findIndex((m) => m.v === S.set.viz);
    S.set.viz = VIZ_MODES[(i + 1) % VIZ_MODES.length].v; save(); sync(); Viz.showLabel(); fx("tick");
  });
  sync();
})();
