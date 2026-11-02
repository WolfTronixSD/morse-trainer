// Dit Dah Dojo: Sleep mode. Relaxed Morse from news, Wikipedia or stories, with a
// binaural primer, calming background sounds, a sleep timer that fades out, and a night screen.
"use strict";

const SLEEP_DEFAULTS = {
  source: "ham", easy: true, wpm: 18, fw: 10, pitch: 550, vol: 60, echo: false, drift: true, show: true,
  primer: 5, wave: "theta", beatsUnder: true, beatVol: 35, amb: "ocean", ambVol: 35, timer: 30, custom: "", zoom: 0, bright: false,
};
let fromLink = null;
try {
  const m = location.hash.match(/sleep=([^&]+)/);
  if (m) fromLink = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
} catch {}
S.sleep = { ...SLEEP_DEFAULTS, ...(S.sleep || {}), ...(fromLink && typeof fromLink === "object" ? fromLink : {}) };
if (fromLink) { save(); history.replaceState(null, "", location.pathname + location.search); setTimeout(() => toast("💾 Sleep settings restored"), 600); }
try { navigator.storage?.persist?.(); } catch {}
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
  "A small bird built a nest in an old mailbox. Every day the mailman left the letters on the step so the eggs could stay warm.",
  "A cat sat in the window and watched the snow. She tried to catch the flakes with her paw. Then she curled up by the fire and slept.",
  "A boy found a lost puppy in the rain. He took it home and dried it with a towel. The next day the owner came and gave him a big hug.",
  "An old man planted a tree he would never see grow tall. Why, asked a child. So you can sit in the shade one day, he said.",
  "A goose laid one golden egg each day. The farmer wanted all the gold at once. He cut the goose open and found nothing at all.",
  "A town mouse visited a country mouse. The food was plain but the night was quiet. I will take beans in peace, said the country mouse.",
  "Two friends met a bear in the woods. One climbed a tree. The other lay still. The bear sniffed him and walked away. Pick your friends well.",
  "A farmer had a stubborn mule. He pushed and pulled. Then his daughter held out a carrot and the mule walked right along.",
  "A tired rider pedaled up a long hill. Halfway up he wanted to stop. He looked at the road and said one more turn. At the top the view was grand.",
  "A boy and his dad rode bikes to the lake. They fished all morning and caught one small fish. They let it go and ate sandwiches in the sun.",
  "A girl rode her bike to the beach at dawn. The waves were calm and the sand was cold. She watched the sun come up and rode home happy.",
  "A wolf pup could not howl. He tried and tried but only a squeak came out. One night under the full moon he took a deep breath and the whole valley heard him.",
  "A sailor was lost in the fog. He could not see the shore. Then he heard a bell from the harbor and followed it home.",
  "A baker got up at four each day. She made bread for the whole village. When she was sick, the village came and baked bread for her.",
  "A little train had a heavy load and a big hill. I think I can, it said. I think I can. Slowly it reached the top.",
  "A kid found an old radio in the attic. He cleaned it and plugged it in. It hummed and glowed, and a voice from far away said hello.",
  "A ham in a cabin sent CQ on a cold night. A friend in Finland answered. They talked about snow and saunas until two in the morning.",
  "Two hams met on the air every Sunday for forty years. They never met in person. When one went silent, the other sent a long slow seventy three.",
  "A camper set up a small radio on a mountain top. The air was thin and the sky was blue. Her tiny signal reached a man in Germany.",
  "A man kept a shop on a quiet street. Each day he swept the step and waved at people. When he retired, the whole street threw him a party.",
  "A frog lived in a well. He thought the sky was a small round circle. One day he jumped out and saw how big the sky really was.",
  "An owl sat in an oak tree. The more he saw, the less he spoke. The less he spoke, the more he heard. He was a wise old owl.",
  "A child asked the moon to come down and play. The moon smiled and sent a silver path across the lake for the child to dream on.",
  "A fisherman sat in his boat all day. He did not catch a thing. But he saw a whale, two dolphins and a red sunset. It was a good day.",
  "A cook made soup from a stone. A villager added a carrot. Another added a potato. Soon there was soup for everyone.",
  "A horse and a donkey carried loads to town. The donkey asked for help. The horse said no. The donkey fell, and the horse had to carry both loads.",
  "A small boat sailed on a big sea. A storm came at night. The captain sent SOS and a ship came through the waves to save them.",
  "A girl learned Morse from her grandpa. He tapped on the table at dinner. Pass the salt, he sent. She laughed and tapped back OK.",
  "A dog waited at the station every evening for his master. Many years went by. The town built a statue to the faithful dog.",
  "A bee and a flower were good friends. The bee got sweet food. The flower got help to make seeds. Both were happy all summer long.",
  "A rabbit was proud of his ears. A deer was proud of his legs. When the fox came, the legs ran fast, and the ears heard him first.",
  "A man rode his bike across the whole country. He met kind people, ate pie in small towns and slept under the stars. He never forgot the trip.",
  "A boy dropped a coin in a fountain and made a wish. He wished for a friend. When he turned around, a girl asked if he wanted to play.",
  "The snow fell all night. In the morning the world was white and still. Children ran out with sleds, and the dog jumped in the deep snow.",
  "A sparrow found a crumb of bread. A big crow took it. The sparrow found another crumb and ate it fast. Then she sang a happy song.",
  "An old radio operator taught a young one. Listen more than you send, he said. A good ear is worth more than a fast hand.",
  "A pilot flew over the ocean at night. The radio crackled. A ship below sent the weather in Morse. Clear skies ahead, it said.",
  "A grandma knitted a scarf for every child in the town. It took her ten years. Every winter the town looked like a rainbow.",
  "A fox asked a stork to dinner and served soup on a flat plate. The stork asked the fox back and served soup in a tall jar. They both learned to share.",
  "A lazy cat and a busy squirrel lived in the same tree. In fall the squirrel hid nuts. In winter she shared them with the cat, who promised to help next year.",
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
    this.mGain = keep(ctx.createGain()); this.mGain.gain.value = (o.vol / 100) * (o.bike ? 1 : 0.5); this.mGain.connect(this.out);

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

  // settings link: same settings in Safari, the hub and the home-screen app
  $("#slLink").addEventListener("click", async () => {
    const code = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(S.sleep)))));
    const url = location.origin + location.pathname + "#sleep=" + code;
    try { await navigator.clipboard.writeText(url); toast("🔗 Settings link copied. Paste it in Notes to keep it."); }
    catch { prompt("Copy your settings link:", url); }
  });
  navigator.storage?.persisted?.().then((p) => { if (p) $("#slSaved").textContent = "✅ Saved on this phone (kept permanently)"; }).catch(() => {});

  /* night screen */
  const night = $("#night");
  let tick, lock, dim = false;
  const wake = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch {} };
  const fmt = (ms) => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };
  // text size: steps of the Morse letters, remembered between sessions
  const ZOOM = [1, 1.35, 1.8, 2.4, 3.1, 4];
  const applyLook = () => {
    S.sleep.zoom = Math.max(0, Math.min(ZOOM.length - 1, S.sleep.zoom | 0));
    night.style.setProperty("--nz", ZOOM[S.sleep.zoom]);
    night.classList.toggle("big", S.sleep.zoom >= 2);
    night.classList.toggle("bright", !!S.sleep.bright);
    $("#nBright").classList.toggle("on", !!S.sleep.bright);
    $("#nSizeVal").textContent = `${S.sleep.zoom + 1}/${ZOOM.length}`;
    $("#nSmaller").disabled = S.sleep.zoom === 0;
    $("#nBigger").disabled = S.sleep.zoom === ZOOM.length - 1;
  };
  const sizeBtn = (id, d) => $(id).addEventListener("click", (e) => {
    e.stopPropagation(); S.sleep.zoom += d; applyLook(); save(); fx("tick"); render();
  });
  sizeBtn("#nSmaller", -1); sizeBtn("#nBigger", 1);
  $("#nBright").addEventListener("click", (e) => { e.stopPropagation(); S.sleep.bright = !S.sleep.bright; applyLook(); save(); fx("tick"); });
  applyLook();
  let lastK = -2;
  const render = () => {
    const now = new Date();
    $("#nClock").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#nLeft").textContent = Sleep.endAt ? `🌙 ${fmt(Sleep.endAt - Date.now())} left` : "🌙 no timer";
    const primer = Date.now() < Sleep.morseAt;
    night.classList.toggle("primer", primer);
    $("#nPhase").textContent = Sleep.paused ? "⏸ Paused" : primer ? `🫁 Breathe and relax · Morse starts in ${fmt(Sleep.morseAt - Date.now())}` : `${Sleep.o?.bike ? "🚲" : "📡"} ${Sleep.wpmNow()[0]} WPM · sentence ${Sleep.count}`;
    if (Sleep.marks && S.sleep.show) {
      const t = performance.now(), m = Sleep.marks; let k = -1;
      for (let i = 0; i < m.length; i++) if (m[i].at <= t) k = i;
      const toks = tokenize(Sleep.cur?.text || "");
      const box = $("#nText");
      box.innerHTML = toks.map((x, i) => `<span class="${i < k ? "d" : i === k ? "c" : ""}">${x === " " ? " " : escapeHtml(x)}</span>`).join("");
      // big text overflows: keep the letter being sent in view
      if (k !== lastK) {
        lastK = k;
        const c = $(".c", box);
        if (c && box.scrollHeight > box.clientHeight) box.scrollTop = c.offsetTop - box.offsetTop - box.clientHeight / 3;
        else if (k < 0) box.scrollTop = 0;
      }
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
  const go = (opts) => {
    Sound.stop(); buzz();
    Sleep.start(opts);
    dim = false; night.classList.remove("dim", "hidden"); document.body.classList.add("sleeping");
    $("#nPause").textContent = "⏸";
    wake(); render(); tick = setInterval(render, 250);
  };
  $("#slStart").addEventListener("click", () => go({ ...o }));
  // bike: easy bedtime stories, loud, nothing else; your own sleep settings stay as they are
  $("#slBike").addEventListener("click", () => {
    go({ ...o, bike: true, source: "fables", easy: true, amb: "none", primer: 0, beatsUnder: false, vol: 100, drift: false, echo: false, timer: 0 });
    toast("🚲 Ride safe! Keep one ear free for traffic.", 3000);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Sleep.on) wake(); });
  $("#nStop").addEventListener("click", (e) => { e.stopPropagation(); Sleep.stop(false); });
  $("#nPause").addEventListener("click", (e) => { e.stopPropagation(); Sleep.pause(!Sleep.paused); e.target.textContent = Sleep.paused ? "▶" : "⏸"; render(); });
  $("#nEye").addEventListener("click", (e) => { e.stopPropagation(); S.sleep.show = !S.sleep.show; $("#slShow").checked = S.sleep.show; save(); render(); });
  night.addEventListener("click", () => { dim = !dim; night.classList.toggle("dim", dim); });
})();
