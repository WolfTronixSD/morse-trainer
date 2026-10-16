// Dit Dah Dojo: listens to the microphone and decodes Morse.
// A Goertzel filter tracks the energy at the tone frequency every ~5 ms,
// an adaptive threshold turns that into key down/up, and the timings are
// split into dits, dahs and gaps with a dit length that follows the sender.
"use strict";

const MicDecoder = {
  on: false, freq: 600, locked: false, wpmGuess: 20,
  cb: {},

  async start(cb) {
    this.cb = cb;
    // iPhone: the app's audio session is "playback" (so tones play with the silent switch on),
    // which blocks the microphone. Switch to play-and-record while listening.
    this.setSession("play-and-record");
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
      this.an = ctx.createAnalyser(); this.an.fftSize = 4096; this.an.smoothingTimeConstant = 0.3;
      this.sp = ctx.createScriptProcessor(1024, 1, 1);
      this.mute = ctx.createGain(); this.mute.gain.value = 0;
      this.src.connect(this.an); this.src.connect(this.sp); this.sp.connect(this.mute).connect(ctx.destination);
      this.rate = ctx.sampleRate;
    } catch (err) {
      this.release();
      throw err;
    }
    this.sub = Math.round(this.rate * 0.005); // ~5 ms analysis blocks
    this.reset();
    this.sp.onaudioprocess = (e) => this.process(e.inputBuffer.getChannelData(0));
    this.spec = new Float32Array(this.an.frequencyBinCount);
    this.freqTimer = setInterval(() => this.trackFreq(), 150);
    this.on = true;
  },

  setSession(type) { try { if (navigator.audioSession) navigator.audioSession.type = type; } catch {} },

  release() {
    try { this.sp && this.sp.disconnect(); this.src && this.src.disconnect(); this.an && this.an.disconnect(); } catch {}
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close().catch(() => {});
    this.stream = this.ctx = this.sp = this.src = this.an = null;
    this.setSession("playback");
  },

  stop() {
    this.on = false;
    clearInterval(this.freqTimer);
    this.release();
    this.flush();
    this.cb.tone && this.cb.tone(false);
  },

  reset() {
    this.t = 0; this.level = 0; this.floor = 1; this.peak = 1;
    this.key = false; this.edge = 0; this.elems = ""; this.spaced = true;
    this.dit = 1.2 / (this.wpmGuess || 20);
  },

  // Find the loudest steady tone between 300 and 1200 Hz
  trackFreq() {
    if (!this.on || this.locked) return;
    this.an.getFloatFrequencyData(this.spec);
    const hz = this.rate / this.an.fftSize;
    const lo = Math.floor(300 / hz), hi = Math.ceil(1200 / hz);
    let best = lo, sum = 0;
    for (let i = lo; i <= hi; i++) { sum += this.spec[i]; if (this.spec[i] > this.spec[best]) best = i; }
    const avg = sum / (hi - lo + 1);
    if (this.spec[best] - avg > 18 && this.spec[best] > -75) {
      const f = best * hz;
      this.freq = Math.abs(f - this.freq) > 40 ? f : this.freq * 0.7 + f * 0.3;
      this.cb.freq && this.cb.freq(this.freq);
    }
  },

  goertzel(buf, start, n) {
    const k = (2 * Math.PI * this.freq) / this.rate, c = 2 * Math.cos(k);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)); // Hann window
      const s0 = buf[start + i] * w + c * s1 - s2; s2 = s1; s1 = s0;
    }
    return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) / n;
  },

  process(buf) {
    const n = this.sub, step = n / this.rate;
    for (let p = 0; p + n <= buf.length; p += n) {
      const e = this.goertzel(buf, p, n);
      this.t += step;
      this.level = e;
      // noise floor follows the average level between tones; peak jumps up fast, decays slowly
      if (!this.key) this.floor += (e - this.floor) * (e < this.floor ? 0.08 : 0.01);
      this.peak = e > this.peak ? e : this.peak - (this.peak - this.floor) * 0.0015;
      const span = this.peak - this.floor;
      if (this.t < 0.4) { this.floor = this.t <= step ? e : this.floor + (e - this.floor) * 0.1; this.peak = this.floor * 2; continue; } // let the noise floor settle
      const loud = this.peak > this.floor * 5;
      const onAt = this.floor + span * 0.5, offAt = this.floor + span * 0.3;
      if (!this.key && loud && e > onAt) this.edgeTo(true);
      else if (this.key && (e < offAt || !loud)) this.edgeTo(false);
      else if (!this.key) this.checkGap();
    }
    this.cb.level && this.cb.level(this.level, this.floor, this.peak, this.floor + (this.peak - this.floor) * 0.5);
  },

  edgeTo(down) {
    const d = this.t - this.edge;
    if (down) {
      // gaps inside a character are one dit long; averaging them in cancels the threshold's bias on marks
      if (this.elems && d < 2 * this.dit) this.dit = this.dit * 0.9 + d * 0.1;
      this.key = true; this.edge = this.t;
    } else {
      if (d < 0.012) { this.key = false; return; } // a click, not a dit
      this.key = false; this.edge = this.t;
      if (d < 2 * this.dit) { this.elems += "."; this.dit = this.dit * 0.85 + d * 0.15; }
      else { this.elems += "-"; this.dit = this.dit * 0.85 + (d / 3) * 0.15; }
      this.dit = Math.min(0.24, Math.max(0.025, this.dit));
      this.wpmGuess = Math.round(1.2 / this.dit);
      this.spaced = false;
      if (this.elems.length > 9) this.elems = "";
      this.cb.elems && this.cb.elems(this.elems, this.wpmGuess);
    }
    this.cb.tone && this.cb.tone(this.key);
  },

  checkGap() {
    const gap = this.t - this.edge;
    if (this.elems && gap > 2.5 * this.dit) this.flush();
    if (!this.spaced && !this.elems && gap > 6 * this.dit) { this.spaced = true; this.cb.char && this.cb.char(" "); }
  },

  flush() {
    if (!this.elems) return;
    const ch = DECODE[this.elems] || (this.elems === "........" ? "<HH>" : "�");
    this.elems = "";
    this.cb.elems && this.cb.elems("", this.wpmGuess);
    this.cb.char && this.cb.char(ch);
  },
};
