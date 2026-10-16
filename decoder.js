// Dit Dah Dojo: listens to the microphone and decodes Morse.
//
// 1. dsp.js turns the audio into a tone envelope (one value per 2 ms) in an AudioWorklet.
// 2. MorseCore works in dB: it tracks the noise floor and the signal level, keys on/off
//    with hysteresis and a debounce, and records every mark and space length.
// 3. Timing adapts to the sender: dits and dahs are separated by clustering the recent
//    marks, spaces by clustering the recent gaps, so echo (long marks, short spaces),
//    sloppy fists, Farnsworth spacing and speed changes are all handled.
// 4. A character that decodes to nothing is retried as two characters split at its widest gap.
"use strict";

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Best split of values into a short and a long group (Otsu on log values).
function twoClusters(vals, minRatio) {
  if (vals.length < 3) return null;
  const s = [...vals].sort((x, y) => x - y), lg = s.map(Math.log);
  let best = null;
  for (let k = 1; k < s.length; k++) {
    const lo = lg.slice(0, k), hi = lg.slice(k);
    const ml = lo.reduce((a, b) => a + b, 0) / lo.length, mh = hi.reduce((a, b) => a + b, 0) / hi.length;
    const score = (lo.length * hi.length) * (mh - ml) ** 2;
    if (Math.exp(mh - ml) >= minRatio && (!best || score > best.score)) best = { score, lo: median(s.slice(0, k)), hi: median(s.slice(k)), nlo: k, nhi: s.length - k };
  }
  return best;
}

function decodeChar(code, gaps) {
  let out = DECODE[code];
  if (!out) {
    // two characters run together? split at the widest gap that gives two real characters
    const order = gaps.map((g, i) => [g, i]).sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) {
      const a = DECODE[code.slice(0, i + 1)], b = DECODE[code.slice(i + 1)];
      if (a && b) { out = a + b; break; }
    }
  }
  return out || (code === "........" ? "<HH>" : "�");
}

class MorseCore {
  constructor(wpm = 20) { this.dt = 0.002; this.cb = {}; this.sens = 0.5; this.doff = 6; this.don = 7; this.reset(wpm); }

  reset(wpm = 20) {
    const u = 1.2 / wpm;
    Object.assign(this, {
      t: 0, n: 0, floor: 0, sig: 0, L: -120, Ls: -120, plateau: -120, valley: 0, key: false, cand: false, candT: 0, edgeT: 0,
      markDit: u, markDah: 3 * u, spaceDit: u, marks: [], spaces: [], inter: [],
      elems: "", gaps: [], spaced: true, started: false,
      log: [], logMarks: 0, committed: "", sessText: "",
    });
  }

  get unit() { return (this.markDit + this.spaceDit) / 2; }
  get wpm() { return Math.round(1.2 / this.unit); }
  get thresholds() {
    const u = this.unit, sd = this.spaceDit;
    const charTh = Math.sqrt(sd * (sd + 2 * u));
    let wordTh = Math.sqrt((sd + 2 * u) * (sd + 6 * u));
    const c = twoClusters(this.inter, 1.7);
    if (c && c.nhi >= 1 && c.nlo >= 2) wordTh = Math.sqrt(c.lo * c.hi);
    else if (this.inter.length >= 2) wordTh = Math.max(wordTh, 1.6 * median(this.inter));
    return { markTh: Math.sqrt(this.markDit * this.markDah), charTh, wordTh: Math.max(wordTh, charTh * 1.8) };
  }

  feed(frames) { for (let i = 0; i < frames.length; i++) this.step(frames[i]); }

  step(v) {
    const L = 20 * Math.log10(v + 1e-7);
    this.t += this.dt; this.n++; this.L = L;
    const Ls = (this.Ls = this.n === 1 ? L : this.Ls + (L - this.Ls) * 0.5); // lightly smoothed
    if (this.n < 150) { // first 0.3 s: learn the room noise
      this.floor = this.n === 1 ? L : this.floor + (L - this.floor) * 0.05;
      this.sig = this.floor + 3; return;
    }
    if (!this.key) this.floor += (L - this.floor) * (L < this.floor ? 0.02 : 0.0015); // drops fast, creeps up slowly past echo tails
    if (Ls > this.sig) this.sig += (Ls - this.sig) * 0.3;
    else this.sig += (Ls - this.sig) * (this.key ? 0.004 : 0.0008);
    if (this.sig < this.floor + 3) this.sig = this.floor + 3;
    const snr = this.sig - this.floor, s = this.sens;
    // base threshold: a few dB under the signal, never below mid-way to the noise
    const th = this.sig - Math.min(snr * (0.38 + 0.24 * s), 6 + 8 * s);
    const ok = snr > 13 - 6 * s;
    // Edges are found relative to the tone itself: key up when the level falls a few dB below
    // this mark's plateau (the direct sound stopped, only room echo is left), key down when it
    // rises well above the lowest level since then. Echo tails can't glue elements together.
    let raw;
    if (this.key) {
      if (Ls > this.plateau && this.t - this.edgeT > 0.03) this.plateau = Ls; // skip the onset blip (phone AGC overshoot)
      raw = ok && L > Math.max(th - 1.5, this.plateau - this.doff);
    } else {
      if (Ls < this.valley) this.valley = Ls;
      raw = ok && L > Math.max(th + 1, this.valley + this.don - 2 * s);
    }
    if (raw !== this.key) {
      if (this.cand !== raw) { this.cand = raw; this.candT = this.t; }
      const hold = Math.min(0.02, Math.max(0.006, 0.22 * Math.min(this.markDit, this.spaceDit)));
      if (this.t - this.candT >= hold) {
        this.edge(raw, this.candT);
        if (raw) this.plateau = Ls - 4; else this.valley = Ls;
      }
    } else this.cand = this.key;
    if (!this.key) this.checkGap();
    this.th = this.key ? Math.max(th - 1.5, this.plateau - this.doff) : Math.max(th + 1, this.valley + this.don - 2 * s);
  }

  edge(down, at) {
    const d = at - this.edgeT;
    if (down) {
      this.space = d; this.spaceStart = this.edgeT; // booked when the mark turns out to be real
      this.edgeT = at; this.key = true;
    } else {
      this.key = false;
      if (d < Math.max(0.012, 0.3 * this.markDit) || d > 1.5) {
        // a click or a long carrier: forget it, as if the gap before it never ended
        this.edgeT = this.spaceStart;
        this.cb.tone && this.cb.tone(false);
        return;
      }
      this.edgeT = at;
      if (this.started) {
        this.log.push(["s", this.space]);
        if (this.elems) { this.gaps.push(this.space); this.spaces.push(this.space); if (this.spaces.length > 24) this.spaces.shift(); }
        else { this.inter.push(this.space); if (this.inter.length > 16) this.inter.shift(); }
      }
      this.started = true; this.spaced = false;
      this.marks.push(d); if (this.marks.length > 24) this.marks.shift();
      this.log.push(["m", d]); this.logMarks++;
      this.retime();
      this.elems += d < this.thresholds.markTh ? "." : "-";
      if (this.elems.length > 9) { this.elems = ""; this.gaps = []; }
      this.cb.elems && this.cb.elems(this.elems, this.wpm);
    }
    this.cb.tone && this.cb.tone(down);
  }

  retime() {
    const c = twoClusters(this.marks, 1.8);
    if (c && c.nlo >= 2 && c.nhi >= 1 && c.hi / c.lo < 5.5) {
      this.markDit += (c.lo - this.markDit) * 0.5;
      this.markDah += (c.hi - this.markDah) * 0.5;
    } else if (this.marks.length >= 3) {
      // all marks alike: decide whether they look like dits or dahs
      const m = median(this.marks.slice(-6));
      if (Math.abs(Math.log(m / this.markDit)) < Math.abs(Math.log(m / this.markDah))) this.markDit += (m - this.markDit) * 0.3;
      else this.markDah += (m - this.markDah) * 0.3;
    }
    if (this.markDah < 1.8 * this.markDit) this.markDah = 1.8 * this.markDit;
    if (this.spaces.length >= 3) {
      const sc = twoClusters(this.spaces, 2);
      const sd = sc && sc.nlo >= 2 ? sc.lo : median(this.spaces);
      this.spaceDit += (sd - this.spaceDit) * 0.4;
    }
    this.markDit = Math.min(0.3, Math.max(0.02, this.markDit));
    // keep the space estimate within reason of the mark estimate
    this.spaceDit = Math.min(Math.max(this.spaceDit, this.markDit * 0.35), this.markDit * 2.2);
  }

  checkGap() {
    const gap = this.t - this.edgeT;
    if (!this.elems && this.spaced) return;
    if (this.cand) return; // a tone may be starting; wait for the debounce
    const { charTh, wordTh } = this.thresholds;
    if (this.elems && gap > charTh) this.flush();
    if (!this.spaced && !this.elems && gap > wordTh) { this.spaced = true; this.sessText += " "; this.emit(); }
    if (!this.elems && this.log.length && gap > Math.max(3, 2.5 * wordTh)) {
      // a long pause ends the session: what we have is final
      this.committed = (this.committed + this.sessText).replace(/ {2,}/g, " ").slice(-4000);
      this.sessText = ""; this.log = []; this.logMarks = 0; this.started = false;
    }
  }

  emit() { this.cb.text && this.cb.text((this.committed + this.sessText).replace(/ {2,}/g, " ")); }

  clearText() { this.committed = ""; this.sessText = ""; this.log = []; this.logMarks = 0; this.started = false; this.emit(); }

  // Re-read the whole session with today's timing knowledge. Early characters get fixed once
  // the decoder has learned the sender's speed.
  decodeLog() {
    const { markTh, charTh, wordTh } = this.thresholds;
    let out = "", code = "", gaps = [];
    const end = () => { if (code) out += decodeChar(code, gaps); code = ""; gaps = []; };
    for (const [k, d] of this.log) {
      if (k === "m") code += d < markTh ? "." : "-";
      else if (d > wordTh) { end(); out += " "; }
      else if (d > charTh) end();
      else gaps.push(d);
    }
    end();
    return out;
  }

  flush() {
    if (!this.elems) return;
    const out = decodeChar(this.elems, this.gaps);
    this.elems = ""; this.gaps = [];
    // while the decoder is still learning, re-read the session; after that just append
    this.sessText = this.logMarks <= 40 ? this.decodeLog() : this.sessText + out;
    this.cb.elems && this.cb.elems("", this.wpm);
    this.emit();
  }
}

const MicDecoder = {
  on: false, freq: 600, locked: false, wpmGuess: 20, sens: 0.5,
  cb: {},

  async start(cb) {
    this.cb = cb;
    // iPhone: the app's audio session is "playback" (so tones play with the silent switch on),
    // which blocks the microphone. Switch to play-and-record while listening.
    this.setSession("play-and-record");
    const core = (this.core = new MorseCore(this.wpmGuess));
    core.sens = this.sens;
    core.cb = cb;
    try {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") throw err;
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // simplest request as a fallback
      }
      // A separate audio context for the mic: Safari is happier when it is created after the mic opens.
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = (this.ctx = new AC());
      if (ctx.state !== "running") await ctx.resume();
      this.src = ctx.createMediaStreamSource(this.stream);
      this.an = ctx.createAnalyser(); this.an.fftSize = 8192; this.an.smoothingTimeConstant = 0;
      this.mute = ctx.createGain(); this.mute.gain.value = 0;
      this.src.connect(this.an);
      this.frames = 0;
      const onFrames = (frames) => { this.frames += frames.length; core.feed(frames); cb.level && cb.level(core); };
      if (ctx.createScriptProcessor && !this.useWorklet) {
        // ScriptProcessor: proven on iPhone; a big buffer rides out busy moments on the main thread
        const dsp = new EnvDSP(ctx.sampleRate), buf = [];
        this.node = ctx.createScriptProcessor(2048, 1, 1);
        this.node.onaudioprocess = (e) => { buf.length = 0; dsp.process(e.inputBuffer.getChannelData(0), buf); onFrames(buf); };
        this.post = (m) => dsp.setFreq(m.freq, m.bw);
        this.engine = "script";
      } else {
        await ctx.audioWorklet.addModule("dsp.js?v=1.2.1");
        this.node = new AudioWorkletNode(ctx, "cw-env");
        this.node.port.onmessage = (e) => onFrames(e.data);
        this.post = (m) => this.node.port.postMessage(m);
        this.engine = "worklet";
      }
      this.src.connect(this.node); this.node.connect(this.mute).connect(ctx.destination);
      this.rate = ctx.sampleRate;
    } catch (err) {
      this.release();
      throw err;
    }
    // listen wide until the tone is found, then narrow in on it
    this.found = this.locked;
    this.setFreq(this.freq, this.locked ? 110 : 350);
    this.spec = new Float32Array(this.an.frequencyBinCount);
    this.avg = null; this.candF = 0; this.candN = 0;
    this.freqTimer = setInterval(() => this.trackFreq(), 120);
    this.on = true;
  },

  setFreq(f, bw) { this.freq = f; this.post && this.post({ freq: f, bw }); },
  lockTo(f) { this.found = true; this.setFreq(f, 110); },
  setSens(s) { this.sens = s; if (this.core) this.core.sens = s; },
  setSession(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {} },

  release() {
    try { this.node && this.node.disconnect(); this.src && this.src.disconnect(); this.an && this.an.disconnect(); } catch {}
    if (this.node && this.node.port) this.node.port.onmessage = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close().catch(() => {});
    this.stream = this.ctx = this.node = this.src = this.an = this.post = null;
    this.setSession("playback");
  },

  stop() {
    this.on = false;
    clearInterval(this.freqTimer);
    this.release();
    if (this.core) { this.core.flush(); this.core.cb = {}; }
    this.cb.tone && this.cb.tone(false);
  },

  // Find the steadiest strong tone between 300 and 1200 Hz (averaged spectrum, so voices and clicks don't win)
  trackFreq() {
    if (!this.on || this.locked) return;
    this.an.getFloatFrequencyData(this.spec);
    const hz = this.rate / this.an.fftSize;
    const lo = Math.floor(300 / hz), hi = Math.ceil(1200 / hz);
    if (!this.avg) this.avg = new Float32Array(hi + 2);
    for (let i = lo - 1; i <= hi + 1; i++) this.avg[i] = this.avg[i] * 0.75 + Math.pow(10, this.spec[i] / 10) * 0.25;
    let best = lo;
    for (let i = lo; i <= hi; i++) if (this.avg[i] > this.avg[best]) best = i;
    const db = (i) => 10 * Math.log10(this.avg[i] + 1e-20);
    const band = []; for (let i = lo; i <= hi; i++) band.push(db(i));
    if (db(best) - median(band) < 10) return;
    const a = db(best - 1), b = db(best), c = db(best + 1);
    const f = (best + (0.5 * (a - c)) / (a - 2 * b + c || 1)) * hz;
    if (Math.abs(f - this.freq) > 25) {
      // only jump to a new tone once it has been the strongest for a moment
      if (Math.abs(f - this.candF) < 25) this.candN++; else { this.candF = f; this.candN = 1; }
      if (this.candN >= 3 || (!this.found && this.candN >= 2)) { this.found = true; this.setFreq(f, 110); this.candN = 0; this.cb.freq && this.cb.freq(f); }
    } else if (Math.abs(f - this.freq) > 2) { this.setFreq(this.freq * 0.7 + f * 0.3); this.cb.freq && this.cb.freq(this.freq); }
  },
};
