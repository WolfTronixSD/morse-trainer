// Dit Dah Dojo: Sleep mode. Relaxed Morse from news, Wikipedia or stories, with a
// binaural primer, calming background sounds, a sleep timer that fades out, and a night screen.
"use strict";

const SLEEP_DEFAULTS = {
  source: "ham", easy: true, wpm: 18, fw: 10, pitch: 550, vol: 60, echo: false, drift: true, show: true,
  primer: 5, wave: "theta", beatsUnder: true, beatVol: 35, amb: "ocean", ambVol: 35, timer: 30, custom: "",
};
S.sleep = { ...SLEEP_DEFAULTS, ...(S.sleep || {}) };
S.stats.sleepMin = S.stats.sleepMin || 0;
BADGES.push(
  { id: "sleep1", i: "😴", n: "Sleepy Wolf", d: "Finish a sleep session", ok: () => S.stats.sleepMin >= 10 },
  { id: "sleep60", i: "🌙", n: "Night Shift", d: "60 min of sleep Morse", ok: () => S.stats.sleepMin >= 60 },
  { id: "sleep600", i: "🛌", n: "Dream Decoder", d: "10 hours of sleep Morse", ok: () => S.stats.sleepMin >= 600 },
);

/* ---------- things to listen to ---------- */
const FABLES = [
  "A fox saw grapes high on a vine. He jumped and jumped but could not reach them. They are sour anyway, he said, and walked away.",
  "A slow turtle raced a fast rabbit. The rabbit took a nap. The turtle kept going step by step and won the race.",
  "A crow was thirsty. The water in the jar was too low. She dropped in stones one by one until the water rose and she could drink.",
  "A boy cried wolf to have some fun. The people ran to help. When a real wolf came, nobody believed him.",
  "A lion let a little mouse go free. Later the lion was caught in a net. The mouse chewed the ropes and set the lion free.",
  "The wind and the sun had a contest. Who can take the coat off the man? The wind blew hard and he held it tight. The sun shone warm and he took it off.",
  "An ant worked all summer to store food. A grasshopper sang and played. When winter came, the ant was ready and the grasshopper was hungry.",
  "A dog with a bone looked into a river. He saw another dog with a bigger bone. He barked and dropped his own bone into the water.",
  "An old ham sat by his radio at night. The bands were quiet. Then a faint call came from far away. He smiled and answered with a steady hand.",
  "A young wolf learned the code under the moon. Dit dah, dit dah, she tapped on a stone. One night the whole forest answered her call.",
  "The night was calm and the stars were bright. A ship far out at sea sent a gentle signal home. All is well, it said. Good night.",
  "A little station on a hill had a wire antenna in a tall pine tree. Every evening it talked to friends in Japan, Brazil and Spain.",
  "The rain fell softly on the roof. Inside the shack the radio glowed. A friend in Ireland sent seventy three and the operator smiled.",
  "A lighthouse keeper sent Morse to passing ships. Every light, every dit, kept the sailors safe until the morning came.",
];
const WIKI = "https://en.wikipedia.org/api/rest_v1/page/random/summary";
const NEWS_URL = "https://wolftronixsd.github.io/hobby-hub/news.json";
const NEWS_TOPICS = { ham: ["ham-main", "rf"], world: ["wn-world", "wn-usa"], science: ["wn-science"], tech: ["wn-tech", "ai"], sports: ["wn-sports", "sp-usa"] };

function cleanForMorse(s, easy) {
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/&/g, " ES ").replace(/%/g, " PERCENT ").replace(/[’']/g, "").replace(/[–—]/g, " ");
  s = easy ? s.replace(/[^A-Z0-9 ]+/g, " ") : s.replace(/[^A-Z0-9 .,?/=]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}
const toSentences = (txt) => txt.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 2);

async function fetchNews(topic) {
  let data;
  try {
    const r = await fetch(NEWS_URL, { cache: "no-cache" });
    data = await r.json();
    try { localStorage.setItem("ddd-news", JSON.stringify(data)); } catch {}
  } catch {
    try { data = JSON.parse(localStorage.getItem("ddd-news")); } catch {}
  }
  const titles = [];
  for (const k of NEWS_TOPICS[topic] || []) for (const it of data?.topics?.[k] || []) titles.push(it.title.replace(/\s+[-–|]\s+[^-–|]+$/, ""));
  return shuffle([...new Set(titles)]);
}
async function fetchWiki(n = 3) {
  const out = [];
  for (let i = 0; i < n; i++) {
    try {
      const r = await fetch(WIKI, { headers: { Accept: "application/json" } });
      const j = await r.json();
      if (j.extract) out.push(j.title + ". " + j.extract);
    } catch { break; }
  }
  return out.flatMap(toSentences);
}
async function nextBatch(o) {
  let raw = [];
  if (NEWS_TOPICS[o.source]) raw = await fetchNews(o.source);
  else if (o.source === "wiki") raw = await fetchWiki();
  else if (o.source === "qso") raw = Array.from({ length: 4 }, () => makeQso("rag").lines.map((l) => l.text.replace(/<[A-Z]+>/g, " "))).flat();
  else if (o.source === "custom") raw = toSentences(o.custom || "");
  else raw = shuffle(FABLES).flatMap(toSentences);
  if (!raw.length) { toast("📡 No connection, telling a story instead"); raw = shuffle(FABLES).flatMap(toSentences); }
  return raw.map((x) => ({ text: cleanForMorse(x, o.easy), say: x })).filter((x) => x.text.length > 1);
}

/* ---------- the sound ---------- */
function noiseBuffer(ctx, kind, secs = 8) {
  const n = ctx.sampleRate * secs, buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b = 0, p = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
      else if (kind === "pink") { p[0] = 0.997 * p[0] + 0.029 * w; p[1] = 0.985 * p[1] + 0.032 * w; p[2] = 0.95 * p[2] + 0.048 * w; d[i] = (p[0] + p[1] + p[2] + w * 0.05) * 1.8; }
      else if (kind === "crackle") d[i] = Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.9 : 0;
      else d[i] = w * 0.5;
    }
  }
  return buf;
}

const Sleep = {
  on: false,
  start(o) {
    const ctx = Sound.unlock(), t0 = ctx.currentTime;
    this.o = o; this.ctx = ctx; this.on = true; this.paused = false;
    this.nodes = [];
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.out.gain.linearRampToValueAtTime(1, t0 + 4); // gentle start
    this.out.connect(ctx.destination);
    const keep = (n) => (this.nodes.push(n), n);

    // background ambience
    if (o.amb !== "none") {
      const g = keep(ctx.createGain()); g.gain.value = (o.ambVol / 100) * 0.6; g.connect(this.out);
      const loop = (kind, filt, f, q = 0.7) => {
        const src = keep(ctx.createBufferSource()); src.buffer = noiseBuffer(ctx, kind); src.loop = true;
        const bq = keep(ctx.createBiquadFilter()); bq.type = filt; bq.frequency.value = f; bq.Q.value = q;
        src.connect(bq); src.start(); return bq;
      };
      if (o.amb === "ocean") {
        const waves = keep(ctx.createGain()); waves.gain.value = 0.55;
        const lfo = keep(ctx.createOscillator()); lfo.frequency.value = 0.09;
        const depth = keep(ctx.createGain()); depth.gain.value = 0.45; lfo.connect(depth).connect(waves.gain); lfo.start();
        loop("brown", "lowpass", 700).connect(waves).connect(g);
        loop("pink", "highpass", 2500).connect(keep(ctx.createGain())).connect(waves);
      } else if (o.amb === "rain") {
        loop("pink", "bandpass", 1800, 0.4).connect(g);
        loop("brown", "lowpass", 300).connect(g);
      } else if (o.amb === "fire") {
        loop("brown", "lowpass", 400).connect(g);
        const cr = loop("crackle", "highpass", 1500); const cg = keep(ctx.createGain()); cg.gain.value = 1.5; cr.connect(cg).connect(g);
      } else if (o.amb === "space") {
        loop("brown", "lowpass", 160).connect(g);
        for (const f of [55, 82.4, 110.1]) { const os = keep(ctx.createOscillator()); os.frequency.value = f; const og = keep(ctx.createGain()); og.gain.value = 0.05; os.connect(og).connect(g); os.start(); }
      }
    }

    // binaural beats: a slightly different pitch in each ear
    const beat = { theta: 6, alpha: 10, delta: 2.5 }[o.wave] || 6;
    if (o.primer > 0 || o.beatsUnder) {
      const merge = keep(ctx.createChannelMerger(2));
      this.beatGain = keep(ctx.createGain()); this.beatGain.gain.value = (o.beatVol / 100) * 0.25;
      [[180, 0], [180 + beat, 1]].forEach(([f, ch]) => { const os = keep(ctx.createOscillator()); os.frequency.value = f; os.connect(merge, 0, ch); os.start(); });
      merge.connect(this.beatGain).connect(this.out);
    }

    // Morse tone chain
    this.mGain = keep(ctx.createGain()); this.mGain.gain.value = (o.vol / 100) * 0.5; this.mGain.connect(this.out);

    // sleep timer with a 3 minute fade
    this.endAt = o.timer ? Date.now() + o.timer * 60000 : 0;
    if (o.timer) {
      const end = t0 + o.timer * 60;
      this.out.gain.setValueAtTime(1, Math.max(t0 + 5, end - 180));
      this.out.gain.linearRampToValueAtTime(0, end);
      this.endTimer = setTimeout(() => this.stop(true), o.timer * 60000 + 500);
    }
    this.startedAt = Date.now();
    this.morseAt = Date.now() + o.primer * 60000;
    this.queue = []; this.cur = null; this.count = 0;
    this.primerTimer = setTimeout(() => this.beginMorse(), o.primer * 60000 + 300);
    this.minuteTimer = setInterval(() => { if (!this.paused) { S.stats.sleepMin++; addXp(2); } }, 60000);
  },

  beginMorse() {
    if (!this.on) return;
    if (!this.o.beatsUnder && this.beatGain) this.beatGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 60);
    this.next();
  },

  fade() { return this.endAt ? Math.max(0, Math.min(1, (this.endAt - Date.now()) / 180000)) : 1; },

  wpmNow() {
    const o = this.o, mins = (Date.now() - this.morseAt) / 60000;
    if (!o.drift) return [o.wpm, Math.min(o.fw, o.wpm)];
    // drift: spacing slowly widens as the session goes on
    return [o.wpm, Math.max(5, Math.min(o.fw, o.wpm) - mins * 0.12)];
  },

  async next() {
    if (!this.on) return;
    if (this.paused) { this.waitT = setTimeout(() => this.next(), 1000); return; }
    if (!this.queue.length) this.queue = await nextBatch(this.o);
    if (!this.on) return;
    const item = (this.cur = this.queue.shift());
    this.count++;
    this.onItem && this.onItem(item);
    const [wpm, fw] = this.wpmNow();
    const p = Sound.plan(item.text, wpm, fw), ctx = this.ctx, t0 = ctx.currentTime + 0.2;
    const osc = ctx.createOscillator(); osc.frequency.value = this.o.pitch;
    const env = ctx.createGain(); env.gain.value = 0;
    osc.connect(env).connect(this.mGain);
    const rise = 0.008;
    for (const s of p.tones) {
      const a = t0 + s.t, b = a + s.d;
      env.gain.setValueAtTime(0, a); env.gain.linearRampToValueAtTime(1, a + rise);
      env.gain.setValueAtTime(1, b - rise); env.gain.linearRampToValueAtTime(0, b);
    }
    osc.start(t0); osc.stop(t0 + p.total + 0.1);
    this.osc = osc;
    this.marks = p.marks.map((m) => ({ ...m, at: performance.now() + (0.2 + m.t) * 1000 }));
    this.waitT = setTimeout(() => this.afterMorse(item), (p.total + 0.3) * 1000);
  },

  afterMorse(item) {
    if (!this.on) return;
    const gap = () => { this.waitT = setTimeout(() => this.next(), 2500); };
    if (this.o.echo && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(item.say.toLowerCase());
      u.rate = 0.85; u.pitch = 0.9; u.volume = Math.max(0.05, this.fade()) * (this.o.vol / 100);
      let done = false; const fin = () => { if (!done) { done = true; gap(); } };
      u.onend = fin; u.onerror = fin; setTimeout(fin, 20000);
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } else gap();
  },

  pause(p) {
    this.paused = p;
    if (this.ctx) (p ? this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3) : this.out.gain.setTargetAtTime(this.fade(), this.ctx.currentTime, 0.5));
    if (p) { try { this.osc && this.osc.stop(); } catch {} speechSynthesis?.cancel(); }
  },

  stop(timerEnded) {
    if (!this.on) return;
    this.on = false;
    [this.endTimer, this.primerTimer, this.waitT].forEach(clearTimeout); clearInterval(this.minuteTimer);
    try { this.osc && this.osc.stop(); } catch {}
    window.speechSynthesis?.cancel();
    const ctx = this.ctx, out = this.out;
    out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => { for (const n of this.nodes) { try { n.stop && n.stop(); } catch {} try { n.disconnect(); } catch {} } out.disconnect(); }, 2000);
    this.onStop && this.onStop(timerEnded);
    save();
  },
};

/* ---------- screen ---------- */
(() => {
  const o = S.sleep;
  const pills = (id, key, conv = (v) => v) => {
    const el = $(id);
    const sync = () => $$("button", el).forEach((b) => b.classList.toggle("on", String(conv(b.dataset.v)) === String(o[key])));
    el.addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; o[key] = conv(b.dataset.v); save(); sync(); fx("tick"); after(); });
    sync();
  };
  const after = () => {
    $("#slCustomRow").classList.toggle("hidden", o.source !== "custom");
    $("#slWaveRow").classList.toggle("hidden", !(o.primer > 0 || o.beatsUnder));
  };
  pills("#slSource", "source"); pills("#slPrimer", "primer", Number); pills("#slWave", "wave"); pills("#slAmb", "amb"); pills("#slTimer", "timer", Number);
  pills("#slLevel", "easy", (v) => v === "true");
  for (const [id, key] of [["slWpm", "wpm"], ["slFw", "fw"], ["slPitch", "pitch"], ["slVol", "vol"], ["slBeatVol", "beatVol"], ["slAmbVol", "ambVol"]]) {
    const el = $("#" + id), lab = $("#" + id + "Val");
    el.value = o[key]; lab.textContent = o[key];
    el.addEventListener("input", () => { o[key] = +el.value; lab.textContent = el.value; if (key === "fw" && o.fw > o.wpm) { o.wpm = o.fw; $("#slWpm").value = o.wpm; $("#slWpmVal").textContent = o.wpm; } if (key === "wpm" && o.fw > o.wpm) { o.fw = o.wpm; $("#slFw").value = o.fw; $("#slFwVal").textContent = o.fw; } save(); });
  }
  for (const [id, key] of [["slEcho", "echo"], ["slDrift", "drift"], ["slBeatsUnder", "beatsUnder"], ["slShow", "show"]]) {
    const el = $("#" + id); el.checked = o[key];
    el.addEventListener("change", () => { o[key] = el.checked; save(); after(); });
  }
  $("#slCustom").value = o.custom;
  $("#slCustom").addEventListener("input", (e) => { o.custom = e.target.value; save(); });
  after();

  // preview: one sentence from the chosen source at the chosen speed
  $("#slPreview").addEventListener("click", async () => {
    const b = await nextBatch(o);
    const it = b[0];
    $("#slPreviewText").textContent = it.text;
    Sound.play(it.text, { wpm: o.wpm, fw: Math.min(o.fw, o.wpm) });
  });

  /* night screen */
  const night = $("#night");
  let tick, lock, dim = false;
  const wake = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch {} };
  const fmt = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };
  const render = () => {
    const now = new Date();
    $("#nClock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#nLeft").textContent = Sleep.endAt ? `🌙 ${fmt(Sleep.endAt - Date.now())} left` : "🌙 no timer";
    const primer = Date.now() < Sleep.morseAt;
    night.classList.toggle("primer", primer);
    $("#nPhase").textContent = Sleep.paused ? "⏸ Paused" : primer ? `🫁 Breathe and relax · Morse starts in ${fmt(Sleep.morseAt - Date.now())}` : `📡 ${Sleep.wpmNow()[0]} WPM · sentence ${Sleep.count}`;
    if (Sleep.marks && S.sleep.show) {
      const t = performance.now(), m = Sleep.marks; let k = -1;
      for (let i = 0; i < m.length; i++) if (m[i].at <= t) k = i;
      const toks = tokenize(Sleep.cur?.text || "");
      $("#nText").innerHTML = toks.map((x, i) => `<span class="${i < k ? "d" : i === k ? "c" : ""}">${x === " " ? " " : escapeHtml(x)}</span>`).join("");
    } else $("#nText").textContent = "";
  };
  Sleep.onItem = () => render();
  Sleep.onStop = (timerEnded) => {
    clearInterval(tick); night.classList.add("hidden"); document.body.classList.remove("sleeping");
    try { lock && lock.release(); } catch {}
    const mins = Math.round((Date.now() - Sleep.startedAt) / 60000);
    toast(timerEnded ? `😴 Sleep timer done. ${mins} min of dreamy Morse. 73!` : `🌙 Session ended after ${mins} min`, 3500);
    checkBadges(); renderHeader();
  };
  $("#slStart").addEventListener("click", () => {
    Sound.stop(); buzz();
    Sleep.start({ ...o });
    dim = false; night.classList.remove("dim", "hidden"); document.body.classList.add("sleeping");
    $("#nPause").textContent = "⏸";
    wake(); render(); tick = setInterval(render, 250);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Sleep.on) wake(); });
  $("#nStop").addEventListener("click", (e) => { e.stopPropagation(); Sleep.stop(false); });
  $("#nPause").addEventListener("click", (e) => { e.stopPropagation(); Sleep.pause(!Sleep.paused); e.target.textContent = Sleep.paused ? "▶" : "⏸"; render(); });
  $("#nEye").addEventListener("click", (e) => { e.stopPropagation(); S.sleep.show = !S.sleep.show; $("#slShow").checked = S.sleep.show; save(); render(); });
  night.addEventListener("click", () => { dim = !dim; night.classList.toggle("dim", dim); });
})();
