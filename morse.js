// Dit Dah Dojo: Morse table, sound engine and text generators.
"use strict";

const CODE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "/": "-..-.", "=": "-...-", "+": ".-.-.", "-": "-....-",
  "'": ".----.", "(": "-.--.", ")": "-.--.-", ":": "---...", "@": ".--.-.", "!": "-.-.--", '"': ".-..-.",
  "<AR>": ".-.-.", "<SK>": "...-.-", "<BT>": "-...-", "<KN>": "-.--.", "<AS>": ".-...", "<BK>": "-...-.-", "<SOS>": "...---...",
};
const DECODE = Object.fromEntries(Object.entries(CODE).filter(([k]) => !["<AR>", "<BT>", "<KN>"].includes(k)).map(([k, v]) => [v, k]));

const SETS = {
  letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  mixed: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  punct: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?/=",
};
const KOCH = "KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X";
const kochSet = (n) => KOCH.slice(0, Math.max(2, n));

const tokenize = (text) => (text.toUpperCase().match(/<[A-Z]{2,3}>|\s+|./g) || []).map((t) => (/^\s+$/.test(t) ? " " : t));
const pretty = (tok) => (tok.startsWith("<") ? `<span class="pro">${tok.slice(1, -1)}</span>` : tok === " " ? " " : escapeHtml(tok));
function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

/* ---------- sound engine ---------- */
const Sound = {
  ctx: null, master: null, analyser: null, noiseGain: null, current: null,
  opts: { wpm: 20, fw: 20, tone: 600, vol: 0.7, qrn: 0, qsb: false },

  unlock() {
    if (!this.ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master = this.ctx.createGain();
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      // band noise: white noise through a bandpass, always running, level from settings
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8; bp.frequency.value = 700;
      this.noiseGain = this.ctx.createGain(); this.noiseGain.gain.value = 0;
      src.connect(bp).connect(this.noiseGain).connect(this.master); src.start();
      // iOS: a silent <audio> element keeps Web Audio playing with the ringer switch on silent
      try {
        const a = document.createElement("audio");
        a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        a.loop = true; a.setAttribute("playsinline", ""); a.play().catch(() => {});
      } catch {}
    }
    if (this.ctx.state !== "running") this.ctx.resume();
    this.master.gain.value = this.opts.vol;
    return this.ctx;
  },

  timing(wpm = this.opts.wpm, fw = this.opts.fw) {
    const dit = 1.2 / wpm;
    let charGap = 3 * dit, wordGap = 7 * dit;
    if (fw < wpm) { // ARRL Farnsworth
      const ta = (60 * wpm - 37.2 * fw) / (wpm * fw);
      charGap = (3 * ta) / 19; wordGap = (7 * ta) / 19;
    }
    return { dit, charGap, wordGap };
  },

  // Turns text into tone segments and character marks.
  plan(text, wpm, fw) {
    const { dit, charGap, wordGap } = this.timing(wpm, fw);
    const toks = tokenize(text), tones = [], marks = [];
    let t = 0;
    toks.forEach((tok, i) => {
      if (tok === " ") { t += wordGap - charGap; marks.push({ i, t, end: t }); return; }
      const code = CODE[tok];
      if (!code) { marks.push({ i, t, end: t }); return; }
      const start = t;
      [...code].forEach((e, j) => {
        const d = e === "." ? dit : 3 * dit;
        tones.push({ t, d });
        t += d + (j < code.length - 1 ? dit : 0);
      });
      marks.push({ i, t: start, end: t });
      t += charGap;
    });
    return { toks, tones, marks, total: t };
  },

  play(text, { wpm, fw, onChar, onEnd, onTone } = {}) {
    this.stop();
    const ctx = this.unlock();
    const o = this.opts;
    const p = this.plan(text, wpm || o.wpm, fw || Math.min(o.fw, wpm || o.wpm));
    const t0 = ctx.currentTime + 0.12;
    const osc = ctx.createOscillator(); osc.frequency.value = o.tone; osc.type = "sine";
    const env = ctx.createGain(); env.gain.value = 0;
    const qsb = ctx.createGain(); qsb.gain.value = 1;
    osc.connect(env).connect(qsb).connect(this.master);
    const rise = 0.005;
    for (const s of p.tones) {
      const a = t0 + s.t, b = a + s.d;
      env.gain.setValueAtTime(0, a);
      env.gain.linearRampToValueAtTime(1, a + rise);
      env.gain.setValueAtTime(1, b - rise);
      env.gain.linearRampToValueAtTime(0, b);
    }
    if (o.qsb && p.total > 1) {
      const n = 200, curve = new Float32Array(n), ph = Math.random() * 6, rate = 0.15 + Math.random() * 0.2;
      for (let i = 0; i < n; i++) { const tt = (i / n) * p.total; curve[i] = 0.55 + 0.45 * Math.sin(ph + tt * rate * 2 * Math.PI); }
      qsb.gain.setValueCurveAtTime(curve, t0, p.total);
    }
    this.noiseGain.gain.setTargetAtTime(o.qrn * 0.9, ctx.currentTime, 0.1);
    osc.start(t0); osc.stop(t0 + p.total + 0.1);
    const job = { osc, p, t0, alive: true };
    this.current = job;
    let lastMark = -1, toneIdx = 0, wasOn = false;
    const tick = () => {
      if (!job.alive) return;
      const now = ctx.currentTime - t0;
      while (lastMark + 1 < p.marks.length && p.marks[lastMark + 1].t <= now) { lastMark++; onChar && onChar(p.marks[lastMark].i, p.toks); }
      while (toneIdx < p.tones.length && p.tones[toneIdx].t + p.tones[toneIdx].d < now) toneIdx++;
      const on = toneIdx < p.tones.length && p.tones[toneIdx].t <= now;
      if (on !== wasOn) { wasOn = on; onTone && onTone(on); }
      if (now >= p.total + 0.05) { this.finish(job); onEnd && onEnd(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    job.onTone = onTone;
    return job;
  },

  finish(job) {
    job.alive = false;
    job.onTone && job.onTone(false);
    if (this.current === job) this.current = null;
    if (this.noiseGain && !this.current && !this.keyOsc) this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  },

  stop() {
    const j = this.current;
    if (!j) return;
    try { j.osc.stop(); } catch {}
    this.finish(j);
  },

  // Live tone for the key
  keyDown() {
    const ctx = this.unlock();
    if (this.keyOsc) return;
    const osc = ctx.createOscillator(); osc.frequency.value = this.opts.tone;
    const g = ctx.createGain(); g.gain.value = 0;
    osc.connect(g).connect(this.master); osc.start();
    g.gain.setTargetAtTime(1, ctx.currentTime, 0.002);
    this.keyOsc = { osc, g };
  },
  keyUp() {
    const k = this.keyOsc; if (!k) return;
    this.keyOsc = null;
    const t = this.ctx.currentTime;
    k.g.gain.setTargetAtTime(0, t, 0.002);
    k.osc.stop(t + 0.03);
  },

  // Little fun effects
  fx(kind) {
    const ctx = this.unlock();
    const seqs = {
      good: [[660, 0.07], [880, 0.07], [1320, 0.12]],
      bad: [[220, 0.12], [165, 0.2]],
      level: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]],
      tick: [[1200, 0.03]],
    };
    let t = ctx.currentTime + 0.01;
    for (const [f, d] of seqs[kind] || []) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kind === "bad" ? "sawtooth" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  },
};

/* ---------- generators ---------- */
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function groups(chars, size, count) {
  const out = [];
  for (let g = 0; g < count; g++) { let s = ""; for (let i = 0; i < size; i++) s += pick(chars); out.push(s); }
  return out.join(" ");
}

const WORDS = ("THE AND FOR ARE BUT NOT YOU ALL ANY CAN HAD HER WAS ONE OUR OUT DAY GET HAS HIM HIS HOW MAN NEW NOW OLD SEE TWO WAY WHO BOY DID ITS LET PUT SAY SHE TOO USE " +
  "ABOUT RADIO MORSE CODE SIGNAL ANTENNA POWER TUBE WIRE SOLDER SPARK QUICK HAPPY COFFEE PIZZA TACO BEACH SUNNY WORLD FRIEND MUSIC NIGHT LIGHT GREEN HOUSE WATER " +
  "CQ DE ES FB OM YL XYL RST TNX PSE AGN HR UR WX RIG ANT QTH QRZ QSL QSO QRM QRN QSB QRP QRO 73 88 GM GA GE GN OP HW CUL BK SRI NAME TEST DX").split(" ");

const PREFIXES = ["W", "K", "N", "AA", "AB", "AC", "AD", "KA", "KB", "KC", "KD", "KE", "KF", "KI", "WA", "WB", "N0", "VE", "VA", "DL", "DK", "DJ", "DF", "DO", "G", "M", "F", "EA", "I", "IK", "ON", "PA", "OH", "SM", "LA", "OZ", "OK", "SP", "HA", "YO", "LZ", "S5", "9A", "OE", "HB9", "JA", "JH", "VK", "ZL", "PY", "LU", "ZS", "UA", "R", "4X", "EI", "GM", "CT", "SV", "TA"];
function callsign() {
  let p = pick(PREFIXES);
  const needsDigit = !/\d$/.test(p);
  const sufLen = 1 + rnd(3);
  let suf = ""; for (let i = 0; i < sufLen; i++) suf += SETS.letters[rnd(26)];
  let c = p + (needsDigit ? rnd(10) : "") + suf;
  if (Math.random() < 0.05) c += "/P";
  return c;
}

const NAMES = ["BOB", "JIM", "ANN", "SUE", "TOM", "HANS", "KLAUS", "ERIKA", "PIERRE", "LUCA", "SVEN", "KENJI", "MIKE", "DAVE", "RON", "LISA", "PAT", "JOE", "AL", "ED", "BEN", "OLGA", "IGOR", "MARIA", "JOSE", "PETE", "WOLF", "SAM", "MAX", "ROSE", "KATE", "FRED"];
const QTHS = ["SAN DIEGO", "PHOENIX", "TEMPE", "DENVER", "BOSTON", "DALLAS", "SEATTLE", "MUNICH", "BERLIN", "HAMBURG", "LONDON", "PARIS", "ROME", "MADRID", "VIENNA", "OSLO", "TOKYO", "SYDNEY", "AUCKLAND", "TORONTO", "AUSTIN", "MIAMI", "CHICAGO", "PRAGUE", "ZURICH", "DUBLIN", "LISBON"];
const RIGS = ["IC7300", "FT991", "K3", "KX2", "FT DX10", "TS590", "IC705", "QCX", "HOMEBREW", "FT817", "K4", "IC7610", "FLEX 6600"];
const ANTS = ["DIPOLE", "VERTICAL", "YAGI", "END FED", "G5RV", "LOOP", "HEX BEAM", "WIRE IN TREE", "RAIN GUTTER", "HAMSTICK"];
const WXS = ["SUNNY", "RAINY", "CLOUDY", "FOGGY", "WINDY", "SNOWING", "HOT", "CLEAR"];
const PWRS = ["5", "10", "50", "100", "500"];
const JOKES_QSO = ["CAT STEPPED ON KEY", "XYL SAYS DINNER", "COFFEE IS COLD", "NEW KEY TODAY", "DOG SAYS HI", "ANT IS MY CLOTHESLINE"];

function makeQso(kind = "rag") {
  const a = { call: callsign(), name: pick(NAMES), qth: pick(QTHS), rig: pick(RIGS), ant: pick(ANTS), pwr: pick(PWRS), wx: pick(WXS), temp: String(5 + rnd(30)) };
  const b = { call: callsign(), name: pick(NAMES.filter((n) => n !== a.name)), qth: pick(QTHS.filter((q) => q !== a.qth)), rig: pick(RIGS), ant: pick(ANTS), pwr: pick(PWRS), wx: pick(WXS), temp: String(5 + rnd(30)) };
  const rstA = pick(["599", "579", "559", "449", "589", "569"]), rstB = pick(["599", "579", "559", "449", "589", "569"]);
  const lines = [];
  const L = (who, text) => lines.push({ who: who.call, text });
  let facts;
  if (kind === "contest") {
    const nrA = String(1 + rnd(1500)).padStart(3, "0"), nrB = String(1 + rnd(900)).padStart(3, "0");
    L(a, `CQ TEST ${a.call} ${a.call} TEST`);
    L(b, `${b.call}`);
    L(a, `${b.call} 5NN ${nrA}`);
    L(b, `TU 5NN ${nrB}`);
    L(a, `TU ${a.call} TEST`);
    facts = { kind, a, b, nrA, nrB };
  } else if (kind === "short") {
    L(a, `CQ CQ DE ${a.call} ${a.call} K`);
    L(b, `${a.call} DE ${b.call} ${b.call} K`);
    L(a, `${b.call} DE ${a.call} GM UR 5NN 5NN NAME ${a.name} QTH ${a.qth} <BK>`);
    L(b, `<BK> TU ${a.name} UR 5NN NAME ${b.name} QTH ${b.qth} 73 TU <SK>`);
    L(a, `TU ${b.name} 73 GL <SK> EE`);
    facts = { kind, a, b, rstA: "599", rstB: "599" };
  } else {
    const extra = Math.random() < 0.6 ? ` ${pick(JOKES_QSO)} HI HI` : "";
    L(a, `CQ CQ CQ DE ${a.call} ${a.call} ${a.call} PSE K`);
    L(b, `${a.call} DE ${b.call} ${b.call} <AR>`);
    L(a, `${b.call} DE ${a.call} GE OM TNX FER CALL <BT> UR RST ${rstA} ${rstA} <BT> NAME HR IS ${a.name} ${a.name} <BT> QTH ${a.qth} ${a.qth} <BT> HW CPY? ${b.call} DE ${a.call} <KN>`);
    L(b, `${a.call} DE ${b.call} R FB ${a.name} TNX FER RPT <BT> UR RST ${rstB} ${rstB} <BT> NAME ${b.name} ${b.name} QTH ${b.qth} ${b.qth} <BT> RIG ${b.rig} PWR ${b.pwr}W ANT ${b.ant} <BT> WX ${b.wx} TEMP ${b.temp}C${extra} <BT> ${a.call} DE ${b.call} <KN>`);
    L(a, `${b.call} DE ${a.call} R TNX ${b.name} FB <BT> RIG HR ${a.rig} ES ${a.pwr}W TO ${a.ant} <BT> WX ${a.wx} <BT> TNX FER NICE QSO HPE CUL 73 ES GUD DX <SK> ${b.call} DE ${a.call} EE`);
    L(b, `TU ${a.name} 73 <SK> EE`);
    facts = { kind, a, b, rstA, rstB };
  }
  return { lines, facts, text: lines.map((l) => l.text).join("  ") };
}

function qsoQuiz(f) {
  const opts = (right, pool) => shuffle([right, ...shuffle(pool.filter((x) => x !== right)).slice(0, 3)]);
  const fakeCalls = () => [f.a.call, f.b.call, callsign(), callsign(), callsign()];
  const q = [];
  if (f.kind === "contest") {
    q.push({ q: "Who called CQ?", right: f.a.call, opts: opts(f.a.call, fakeCalls()) });
    q.push({ q: `What serial did ${f.a.call} send?`, right: f.nrA, opts: opts(f.nrA, [f.nrB, String(+f.nrA + 1).padStart(3, "0"), String(Math.max(1, +f.nrA - 10)).padStart(3, "0"), String(rnd(999)).padStart(3, "0")]) });
    q.push({ q: `What serial did ${f.b.call} send?`, right: f.nrB, opts: opts(f.nrB, [f.nrA, String(+f.nrB + 1).padStart(3, "0"), String(Math.max(1, +f.nrB - 10)).padStart(3, "0"), String(rnd(999)).padStart(3, "0")]) });
    return q;
  }
  q.push({ q: "Who called CQ?", right: f.a.call, opts: opts(f.a.call, fakeCalls()) });
  q.push({ q: "Who answered?", right: f.b.call, opts: opts(f.b.call, fakeCalls()) });
  q.push({ q: `${f.a.call}'s name?`, right: f.a.name, opts: opts(f.a.name, NAMES) });
  q.push({ q: `Where is ${f.b.call}?`, right: f.b.qth, opts: opts(f.b.qth, QTHS) });
  if (f.kind === "rag") {
    q.push({ q: `RST sent to ${f.b.call}?`, right: f.rstA, opts: opts(f.rstA, ["599", "579", "559", "449", "589", "569", "339"]) });
    q.push({ q: `${f.b.call}'s rig?`, right: f.b.rig, opts: opts(f.b.rig, RIGS) });
    q.push({ q: `${f.b.call}'s antenna?`, right: f.b.ant, opts: opts(f.b.ant, ANTS) });
    q.push({ q: `Weather at ${f.b.call}?`, right: f.b.wx, opts: opts(f.b.wx, WXS) });
  }
  return q;
}
