// Dit Dah Dojo: tone envelope detector. Runs inside an AudioWorklet (audio thread,
// so main-thread hiccups never lose audio) or, as a fallback, in a ScriptProcessor.
// Two cascaded band-pass filters around the tone, then power smoothing; one
// envelope value comes out every 2 ms.
"use strict";

class EnvDSP {
  constructor(rate) {
    this.rate = rate;
    this.step = Math.max(1, Math.round(rate * 0.002));
    this.n = 0; this.p = 0;
    this.a = 1 - Math.exp(-1 / (rate * 0.002));
    this.s = new Float64Array(8);
    this.setFreq(600, 110);
  }
  setFreq(f, bw) {
    this.freq = f; if (bw) this.bw = bw;
    const w = (2 * Math.PI * f) / this.rate, q = f / this.bw, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    this.b0 = al / a0; this.a1 = (-2 * Math.cos(w)) / a0; this.a2 = (1 - al) / a0;
  }
  process(x, out) {
    const { b0, a1, a2, s, a, step } = this;
    for (let i = 0; i < x.length; i++) {
      // biquad 1 then biquad 2 (direct form I, b1 = 0, b2 = -b0)
      const x0 = x[i];
      const y1 = b0 * (x0 - s[1]) - a1 * s[2] - a2 * s[3];
      s[1] = s[0]; s[0] = x0; s[3] = s[2]; s[2] = y1;
      const y2 = b0 * (y1 - s[5]) - a1 * s[6] - a2 * s[7];
      s[5] = s[4]; s[4] = y1; s[7] = s[6]; s[6] = y2;
      this.p += a * (y2 * y2 - this.p);
      if (++this.n >= step) { this.n = 0; out.push(Math.sqrt(this.p) * 1.414); }
    }
  }
}

if (typeof registerProcessor === "function") {
  registerProcessor("cw-env", class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.dsp = new EnvDSP(sampleRate);
      this.buf = [];
      this.port.onmessage = (e) => { if (e.data.freq) this.dsp.setFreq(e.data.freq, e.data.bw); };
    }
    process(inputs) {
      const ch = inputs[0] && inputs[0][0];
      if (ch) this.dsp.process(ch, this.buf);
      if (this.buf.length >= 10) { this.port.postMessage(this.buf); this.buf = []; }
      return true;
    }
  });
}
