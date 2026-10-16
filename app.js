// Dit Dah Dojo: the app. Morse table, sound and generators live in morse.js.
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- saved state ---------- */
const KEY = "ditdahdojo-v1";
const DEFAULTS = {
  set: { wpm: 20, fw: 20, tone: 600, vol: 70, qrn: 0, qsb: false, sfx: true, speak: false, vvv: true, theme: "neon" },
  copy: { mode: "groups", chars: "letters", koch: 2, size: 5, count: 10, custom: "CQ CQ DE DL1ABC K" },
  xp: 0, streak: 0, lastDay: "",
  stats: { sessions: 0, chars: 0, perfect: 0, qsos: 0, qsoPerfect: 0, sends: 0, history: [], rxBest: 0, spBest: 0, maxWpm: 0 },
  badges: {},
};
let S;
try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { S = {}; }
S = { ...DEFAULTS, ...S, set: { ...DEFAULTS.set, ...S.set }, copy: { ...DEFAULTS.copy, ...S.copy }, stats: { ...DEFAULTS.stats, ...S.stats }, badges: { ...S.badges } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

/* ---------- fun text ---------- */
const LEVELS = [
  ["Lid in Training", "🐣"], ["Dit Dabbler", "🐥"], ["Dah Dreamer", "🐤"], ["Key Clicker", "🔑"], ["Novice Squeaker", "📟"],
  ["QRP Padawan", "🪫"], ["Rag Chewer", "💬"], ["Pileup Survivor", "🛟"], ["DX Hunter", "🎯"], ["Contest Beast", "🦁"],
  ["Speed Demon", "😈"], ["Iron Fist", "✊"], ["Morse Wizard", "🧙"], ["Samuel Morse Reincarnated", "👑"],
];
const QUIPS = {
  100: ["PERFECT! Your ears have a built-in decoder. 🤖", "Flawless copy. Samuel Morse just shed a tear of joy.", "100%! Even the QRM is impressed.", "Solid copy, OM. FB FB FB!"],
  90: ["Excellent! Barely a dit out of place.", "So close to perfect, the DX station would QSL.", "That's some contest-grade copy right there."],
  70: ["Nice work! A few dits went to the bit bucket.", "Good copy! Some characters took a scenic route.", "Solid. Now let's tighten that fist… er, ear."],
  40: ["Not bad! Your brain is warming up its tubes.", "Getting there. Some letters were in a pileup.", "Half QSL, half QRM. Keep going!"],
  0: ["Hmm, was that copy or abstract art? 🎨", "Your ears called in sick. Try 🐢 slower?", "That was more QRN than CW. Again!", "Lid alert! 🚨 (We all start there. Try again!)"],
};
const JOKES = [
  "Why did the ham break up with his XYL? Too much QRM at home.",
  "A CW op walks into a bar. Dah-dit-dah-dah.",
  "My antenna is a wet noodle and I still work Japan. Propagation is magic.",
  "Real hams don't need a microphone. They have fingers.",
  "What do you call a ham with no radio? A sandwich.",
  "Dit dit. That's Morse for 'hi hi', which is ham for 'LOL'.",
  "The best time to learn Morse was 1844. The second best time is now.",
  "CW: the original texting. No autocorrect, no regrets.",
  "My cat learned Morse. She only sends ...-.- when she wants food.",
  "QRP: when you want to talk to Europe using the power of a flashlight.",
  "Why are CW ops good at parties? They know how to keep it short. 73!",
];
const PHONETIC = { A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee", Z: "Zulu", ".": "period", ",": "comma", "?": "question mark", "/": "slash", "=": "break" };

/* ---------- little helpers ---------- */
function toast(msg, ms = 1800) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), ms);
}
function fx(kind) { if (S.set.sfx) Sound.fx(kind); }
function speak(text) {
  if (!S.set.speak || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text); u.rate = 1.1; u.pitch = 0.8;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
const sayChar = (c) => PHONETIC[c] || c;
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- confetti ---------- */
const Confetti = (() => {
  const cv = $("#confetti"), cx = cv.getContext("2d");
  let parts = [], running = false;
  const colors = ["#4dffb0", "#b06bff", "#ffcf5a", "#ff6bd5", "#3dd6ff", "#ff5a7a"];
  const loop = () => {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.y < cv.height + 20 && p.life-- > 0);
    for (const p of parts) {
      p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      if (p.t) { cx.font = `${p.s * 2}px sans-serif`; cx.fillText(p.t, 0, 0); } else cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else running = false;
  };
  return (n = 120, emoji) => {
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    const dpr = devicePixelRatio;
    for (let i = 0; i < n; i++) parts.push({
      x: cv.width / 2 + (Math.random() - 0.5) * 80 * dpr, y: cv.height * 0.35, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 12 - 4) * dpr,
      r: 0, vr: (Math.random() - 0.5) * 0.4, s: (6 + Math.random() * 8) * dpr, c: colors[i % colors.length], life: 220,
      t: emoji && Math.random() < 0.3 ? emoji : null,
    });
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
})();

/* ---------- XP, levels, streak, badges ---------- */
const xpFor = (lvl) => 60 * lvl * (lvl - 1); // total XP to reach level
const levelOf = (xp) => { let l = 1; while (xp >= xpFor(l + 1)) l++; return l; };
const titleOf = (l) => LEVELS[Math.min(l, LEVELS.length) - 1];

function addXp(n) {
  n = Math.max(0, Math.round(n));
  const before = levelOf(S.xp);
  S.xp += n;
  const d = today();
  if (S.lastDay !== d) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.streak = S.lastDay === y ? S.streak + 1 : 1;
    S.lastDay = d;
    if (S.streak > 1) setTimeout(() => toast(`🔥 ${S.streak} day streak! Keep the fist warm.`), 1900);
  }
  const after = levelOf(S.xp);
  if (after > before) {
    const [t, e] = titleOf(after);
    setTimeout(() => { fx("level"); Confetti(160, e); toast(`${e} LEVEL UP! You are now a ${t}`, 3000); }, 700);
  }
  checkBadges(); save(); renderHeader();
}

const BADGES = [
  { id: "first", i: "🎧", n: "First Copy", d: "Check your first copy", ok: () => S.stats.sessions >= 1 },
  { id: "perfect", i: "💯", n: "Perfectionist", d: "100% on a copy", ok: () => S.stats.perfect >= 1 },
  { id: "perfect10", i: "🏅", n: "Golden Ears", d: "10 perfect copies", ok: () => S.stats.perfect >= 10 },
  { id: "w20", i: "🚀", n: "20 WPM Club", d: "90%+ at 20 WPM", ok: () => S.stats.maxWpm >= 20 },
  { id: "w25", i: "🛸", n: "25 WPM Club", d: "90%+ at 25 WPM", ok: () => S.stats.maxWpm >= 25 },
  { id: "w30", i: "☄️", n: "30 WPM Club", d: "90%+ at 30 WPM", ok: () => S.stats.maxWpm >= 30 },
  { id: "chars1k", i: "🔤", n: "Thousand Chars", d: "Copy 1000 characters", ok: () => S.stats.chars >= 1000 },
  { id: "chars10k", i: "📚", n: "Morse Bookworm", d: "Copy 10000 characters", ok: () => S.stats.chars >= 10000 },
  { id: "qso", i: "📻", n: "Eavesdropper", d: "Finish a QSO quiz", ok: () => S.stats.qsos >= 1 },
  { id: "qso5", i: "🕵️", n: "Super Snoop", d: "5 perfect QSO quizzes", ok: () => S.stats.qsoPerfect >= 5 },
  { id: "rx25", i: "⚡", n: "Lightning Ears", d: "Reflex streak of 25", ok: () => S.stats.rxBest >= 25 },
  { id: "sp1k", i: "🏁", n: "Pileup Buster", d: "1000 points in Call Sprint", ok: () => S.stats.spBest >= 1000 },
  { id: "send", i: "🔑", n: "Golden Fist", d: "Send a challenge word", ok: () => S.stats.sends >= 1 },
  { id: "send10", i: "🥇", n: "Brass Pounder", d: "Send 10 challenge words", ok: () => S.stats.sends >= 10 },
  { id: "streak3", i: "🔥", n: "On Fire", d: "3 day streak", ok: () => S.streak >= 3 },
  { id: "streak7", i: "🌋", n: "Volcano", d: "7 day streak", ok: () => S.streak >= 7 },
  { id: "owl", i: "🦉", n: "Night Owl", d: "Practice after midnight", ok: () => { const h = new Date().getHours(); return h >= 0 && h < 4 && S.stats.sessions > 0; } },
  { id: "koch", i: "🎓", n: "Koch Graduate", d: "Reach Koch lesson 40", ok: () => S.copy.koch >= 40 },
  { id: "lvl5", i: "⭐", n: "Rising Star", d: "Reach level 5", ok: () => levelOf(S.xp) >= 5 },
  { id: "lvl10", i: "🌟", n: "Legend", d: "Reach level 10", ok: () => levelOf(S.xp) >= 10 },
];
function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.ok()) {
      S.badges[b.id] = Date.now();
      setTimeout(() => { fx("level"); Confetti(80, b.i); toast(`${b.i} Badge unlocked: ${b.n}!`, 2600); }, 1200);
    }
  }
}

function renderHeader() {
  const l = levelOf(S.xp), [t, e] = titleOf(l);
  const lo = xpFor(l), hi = xpFor(l + 1);
  $("#xpFill").style.width = `${Math.min(100, ((S.xp - lo) / (hi - lo)) * 100)}%`;
  $("#xpText").textContent = `${e} Lvl ${l} · ${S.xp} / ${hi} XP`;
  $("#rankTitle").textContent = t;
  $("#streak").textContent = `🔥 ${S.streak}`;
  const s = S.set;
  $("#speedChip").textContent = s.fw < s.wpm ? `${s.wpm}/${s.fw} WPM` : `${s.wpm} WPM`;
}

/* ---------- oscilloscope ---------- */
const Scope = (() => {
  let buf;
  const draw = () => {
    requestAnimationFrame(draw);
    const cvs = $$(".tab.active .scope");
    if (!cvs.length) return;
    const an = Sound.analyser;
    if (an && !buf) buf = new Float32Array(an.fftSize);
    if (an) an.getFloatTimeDomainData(buf);
    const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#4dffb0";
    const tm = performance.now() / 1000;
    for (const c of cvs) {
      const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
      const x = c.getContext("2d");
      x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = 1;
      for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo((w * i) / 6, 0); x.lineTo((w * i) / 6, h); x.stroke(); }
      x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
      x.strokeStyle = accent; x.lineWidth = 2.5 * devicePixelRatio; x.shadowColor = accent; x.shadowBlur = 12;
      x.beginPath();
      const n = 512;
      for (let i = 0; i < n; i++) {
        const v = an ? buf[i] : 0;
        const idle = Math.sin(i / 18 + tm * 3) * 0.015;
        const y = h / 2 - (v * 1.4 + idle) * h * 0.45;
        i ? x.lineTo((i / n) * w, y) : x.moveTo(0, y);
      }
      x.stroke();
    }
  };
  requestAnimationFrame(draw);
})();

/* ---------- reusable player ---------- */
function makePlayer(root, { getText, render, prefix = () => "" }) {
  const led = $(".led", root), btn = $(".play", root), out = $("[data-out=text]", root);
  let job = null;
  const setLed = (on) => led.classList.toggle("on", on);
  const stop = () => { Sound.stop(); job = null; btn.classList.remove("playing"); $(".pi", btn).textContent = "▶"; };
  const play = () => {
    if (job) return stop();
    const text = getText();
    const pre = prefix();
    const skip = pre ? tokenize(pre).length : 0;
    render(out, text);
    btn.classList.add("playing"); $(".pi", btn).textContent = "■";
    job = Sound.play(pre + text, {
      onTone: setLed,
      onChar: (i) => {
        const k = i - skip; if (k < 0) return;
        const spans = $$("[data-i]", out);
        spans.forEach((s) => { const n = +s.dataset.i; s.classList.toggle("cur", n === k); s.classList.toggle("done", n < k); });
      },
      onEnd: () => { stop(); $$("[data-i]", out).forEach((s) => { s.classList.remove("cur"); s.classList.add("done"); }); },
    });
  };
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const a = b.dataset.act;
    if (a === "play") play();
    else if (a === "slower" || a === "faster") {
      changeWpm(a === "faster" ? 2 : -2);
      if (job) { stop(); play(); }
    } else if (a === "reveal") { out.classList.toggle("blurred"); fx("tick"); }
  });
  return { play, stop, out, isPlaying: () => !!job };
}
const spanify = (text, offset = 0) => tokenize(text).map((t, i) => `<span data-i="${i + offset}">${pretty(t)}</span>`).join("");

function changeWpm(d) {
  const s = S.set;
  const was = s.wpm;
  s.wpm = Math.max(5, Math.min(50, s.wpm + d));
  if (s.fw === was || s.fw > s.wpm) s.fw = s.wpm;
  syncSettings(); save();
  toast(`${d > 0 ? "🐇" : "🐢"} ${s.wpm} WPM`, 900);
}

/* ---------- COPY tab ---------- */
let copyText = "";
function newCopyText() {
  const c = S.copy;
  if (c.mode === "groups") {
    const chars = c.chars === "koch" ? kochSet(c.koch) : SETS[c.chars];
    copyText = groups(chars, c.size, c.count);
  } else if (c.mode === "words") copyText = Array.from({ length: c.count }, () => pick(WORDS)).join(" ");
  else if (c.mode === "calls") copyText = Array.from({ length: Math.max(3, Math.round(c.count / 2)) }, callsign).join(" ");
  else copyText = ($("#customText").value || "CQ").toUpperCase().trim();
  copyPlayer.out.innerHTML = spanify(copyText);
  copyPlayer.out.classList.add("blurred");
  $("#copyResult").innerHTML = "";
  $("#copyInput").value = "";
}
const copyPlayer = makePlayer($("#copyPlayer"), {
  getText: () => { if (S.copy.mode === "custom") { const t = ($("#customText").value || "CQ").toUpperCase().trim(); if (t !== copyText) newCopyText(); } return copyText; },
  render: (out, text) => { out.innerHTML = spanify(text); },
  prefix: () => (S.set.vvv ? "VVV <BT> " : ""),
});
$("#copyPlayer").addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "new") { copyPlayer.stop(); newCopyText(); fx("tick"); copyPlayer.play(); }
  if (a === "share") shareText(`I'm training Morse on Dit Dah Dojo at ${S.set.wpm} WPM! Can you copy this? ${copyText}`);
});

function syncCopyUi() {
  const c = S.copy;
  $$("#copyMode button").forEach((b) => b.classList.toggle("on", b.dataset.v === c.mode));
  $$("#charSet button").forEach((b) => b.classList.toggle("on", b.dataset.v === c.chars));
  $("#groupOpts").classList.toggle("hidden", c.mode === "custom");
  $("#charSet").parentElement.querySelector(".lbl").classList.toggle("hidden", c.mode !== "groups");
  $("#charSet").classList.toggle("hidden", c.mode !== "groups");
  $("#kochRow").classList.toggle("hidden", !(c.mode === "groups" && c.chars === "koch"));
  $("#groupSize").parentElement.classList.toggle("hidden", c.mode !== "groups");
  $("#customOpts").classList.toggle("hidden", c.mode !== "custom");
  $("#kochLesson").value = c.koch; $("#kochVal").textContent = c.koch;
  $("#kochChars").textContent = kochSet(c.koch).split("").join(" ");
  $("#groupSize").value = c.size; $("#gsVal").textContent = c.size;
  $("#groupCount").value = c.count; $("#gcVal").textContent = c.count;
  $("#customText").value = c.custom;
}
const seg = (id, fn) => $(id).addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; fx("tick"); fn(b.dataset.v); });
seg("#copyMode", (v) => { S.copy.mode = v; save(); syncCopyUi(); copyPlayer.stop(); newCopyText(); });
seg("#charSet", (v) => { S.copy.chars = v; save(); syncCopyUi(); copyPlayer.stop(); newCopyText(); });
const slider = (id, fn) => $(id).addEventListener("input", (e) => { fn(+e.target.value); save(); syncCopyUi(); });
slider("#kochLesson", (v) => { S.copy.koch = v; });
slider("#groupSize", (v) => { S.copy.size = v; });
slider("#groupCount", (v) => { S.copy.count = v; });
["#kochLesson", "#groupSize", "#groupCount"].forEach((id) => $(id).addEventListener("change", () => { copyPlayer.stop(); newCopyText(); }));
$("#customText").addEventListener("input", (e) => { S.copy.custom = e.target.value; save(); });

// Edit-distance alignment between what was sent and what was typed
function align(want, got) {
  const n = want.length, m = got.length;
  const D = Array.from({ length: n + 1 }, (_, i) => { const r = new Array(m + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (want[i - 1] === got[j - 1] ? 0 : 1));
  const ops = []; let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (want[i - 1] === got[j - 1] ? 0 : 1)) {
      ops.push(want[i - 1] === got[j - 1] ? ["ok", want[i - 1]] : ["sub", want[i - 1], got[j - 1]]); i--; j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { ops.push(["miss", want[i - 1]]); i--; }
    else { ops.push(["extra", got[j - 1]]); j--; }
  }
  return { dist: D[n][m], ops: ops.reverse() };
}

function scoreCopy() {
  const norm = (s) => s.toUpperCase().replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  const want = norm(copyText), got = norm($("#copyInput").value);
  if (!got) { toast("✍️ Type what you heard first!"); return; }
  const { dist, ops } = align(want, got);
  const pct = Math.max(0, Math.round((1 - dist / want.length) * 100));
  const right = ops.filter((o) => o[0] === "ok" && o[1] !== " ").length;
  const esc = (c) => (c === " " ? "&nbsp;" : escapeHtml(c));
  const diff = ops.map(([k, a, b]) =>
    k === "ok" ? `<span class="ok">${esc(a)}</span>` :
    k === "sub" ? `<span class="bad">${esc(b)}</span><span class="miss">${esc(a)}</span>` :
    k === "miss" ? `<span class="miss">${esc(a)}</span>` : `<span class="bad">${esc(a)}</span>`).join("");
  const band = pct === 100 ? 100 : pct >= 90 ? 90 : pct >= 70 ? 70 : pct >= 40 ? 40 : 0;
  const st = S.stats;
  st.sessions++; st.chars += right; if (pct === 100) st.perfect++;
  if (pct >= 90) st.maxWpm = Math.max(st.maxWpm, S.set.wpm);
  st.history = [...st.history, pct].slice(-20);
  if (S.copy.mode === "groups" && S.copy.chars === "koch" && pct >= 90 && S.copy.koch < 40) {
    S.copy.koch++; syncCopyUi();
    setTimeout(() => toast(`🎓 90%+! Koch lesson ${S.copy.koch} unlocked: new char "${KOCH[S.copy.koch - 1]}"`, 3200), 1200);
  }
  const gain = right * (S.set.wpm / 10) * (pct === 100 ? 1.5 : 1);
  $("#copyResult").innerHTML = `<div class="result">
    <div class="score-big">${pct}%</div>
    <div class="quip">${pick(QUIPS[band])}</div>
    <div class="diff">${diff}</div>
    <div class="xp-gain">+${Math.round(gain)} XP</div></div>`;
  copyPlayer.out.classList.remove("blurred");
  if (pct >= 90) { fx("good"); Confetti(pct === 100 ? 160 : 70, pct === 100 ? "💯" : "✨"); } else fx(pct >= 50 ? "tick" : "bad");
  addXp(gain);
}
$("#copyCheck").addEventListener("click", scoreCopy);

/* ---------- QSO tab ---------- */
let qso = null, qsoKind = "rag";
function renderQso(out) {
  let idx = 0;
  out.innerHTML = qso.lines.map((l) => {
    const toks = tokenize(l.text);
    const html = toks.map((t) => `<span data-i="${idx++}">${pretty(t)}</span>`).join("");
    idx += tokenize("  ").length; // gap between overs
    return `<span class="line"><span class="who">${l.who}</span>${html}</span>`;
  }).join("");
}
function newQso() {
  qso = makeQso(qsoKind);
  renderQso(qsoPlayer.out);
  qsoPlayer.out.classList.add("blurred");
  $("#quizCard").classList.add("hidden");
}
const qsoPlayer = makePlayer($("#qsoPlayer"), {
  getText: () => qso.lines.map((l) => l.text).join("  "),
  render: (out) => renderQso(out),
});
$("#qsoPlayer").addEventListener("click", (e) => {
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "new") { qsoPlayer.stop(); newQso(); fx("tick"); }
  if (a === "quiz") startQuiz();
});
seg("#qsoType", (v) => { qsoKind = v; $$("#qsoType button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); qsoPlayer.stop(); newQso(); });

function startQuiz() {
  const qs = shuffle(qsoQuiz(qso.facts)).slice(0, 5);
  let answered = 0, right = 0;
  const box = $("#quiz");
  box.innerHTML = qs.map((q, n) => `<div class="q" data-n="${n}"><p>${n + 1}. ${q.q}</p><div class="opts">${q.opts.map((o) => `<button>${o}</button>`).join("")}</div></div>`).join("");
  $("#quizCard").classList.remove("hidden");
  $("#quizCard").scrollIntoView({ behavior: "smooth", block: "start" });
  box.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const qd = b.closest(".q"); if (qd.dataset.done) return;
    qd.dataset.done = 1; answered++;
    const q = qs[+qd.dataset.n];
    if (b.textContent === q.right) { b.classList.add("right"); right++; fx("good"); }
    else { b.classList.add("wrong"); $$("button", qd).find((x) => x.textContent === q.right).classList.add("right"); fx("bad"); }
    if (answered === qs.length) {
      S.stats.qsos++;
      const perfect = right === qs.length;
      if (perfect) { S.stats.qsoPerfect++; Confetti(150, "📻"); }
      qsoPlayer.out.classList.remove("blurred");
      const msg = perfect ? "🕵️ Perfect! Nothing gets past your ears." : right >= qs.length - 1 ? "👂 Great copy! Almost a full QSL." : right >= 2 ? "📡 Decent! Maybe replay with 🐢?" : "🙉 Were you making coffee during that QSO?";
      box.insertAdjacentHTML("beforeend", `<div class="result"><div class="score-big">${right}/${qs.length}</div><div class="quip">${msg}</div><div class="xp-gain">+${right * 15 * (S.set.wpm / 15) | 0} XP</div></div>`);
      addXp(right * 15 * (S.set.wpm / 15));
    }
  };
}

/* ---------- GAMES: Reflex ---------- */
const RX = { on: false, set: "letters", streak: 0, score: 0, wpm: 20, lives: 3, cur: "", locked: true, n: 0 };
function rxChars() { return RX.set === "koch" ? kochSet(S.copy.koch).replace(/[^A-Z0-9.,?/=]/g, "") : SETS[RX.set]; }
function rxPad() { $("#rxPad").innerHTML = rxChars().split("").map((c) => `<button data-c="${c}">${c}</button>`).join(""); }
function rxHud() {
  $("#rxStreak").textContent = RX.streak; $("#rxScore").textContent = RX.score; $("#rxWpm").textContent = RX.wpm; $("#rxBest").textContent = S.stats.rxBest;
}
function rxMsg(t, cls = "") { const m = $("#rxMsg"); m.textContent = t; m.className = "rx-msg " + cls; }
function rxNext() {
  if (!RX.on) return;
  const chars = rxChars();
  let c; do c = pick(chars); while (c === RX.cur && chars.length > 1);
  RX.cur = c; RX.locked = false; RX.t = performance.now();
  rxMsg(`${"❤️".repeat(RX.lives)}${"🖤".repeat(3 - RX.lives)}  Listen…`);
  Sound.play(c, { wpm: RX.wpm, fw: RX.wpm, onTone: (on) => $("#rxLed").classList.toggle("on", on) });
}
function rxStart() {
  Sound.unlock();
  Object.assign(RX, { on: true, streak: 0, score: 0, wpm: S.set.wpm, lives: 3, cur: "", n: 0 });
  $("#rxStart").textContent = "⏹ Stop"; rxHud(); rxNext();
}
function rxStop(msg) {
  RX.on = false; RX.locked = true; Sound.stop();
  $("#rxStart").textContent = "⚡ Start";
  if (msg) rxMsg(msg);
}
$("#rxStart").addEventListener("click", () => (RX.on ? rxStop("Paused. Tap Start for a fresh round.") : rxStart()));
$("#rxPad").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-c]"); if (!b) return;
  if (!RX.on) { Sound.play(b.dataset.c, { onTone: (on) => $("#rxLed").classList.toggle("on", on) }); return; }
  if (RX.locked) return;
  RX.locked = true;
  const ms = performance.now() - RX.t;
  if (b.dataset.c === RX.cur) {
    RX.streak++; RX.n++;
    const bonus = ms < 1200 ? 2 : 1;
    RX.score += RX.wpm * bonus;
    if (RX.streak % 3 === 0) RX.wpm = Math.min(50, RX.wpm + 1);
    b.classList.add("right"); fx("good");
    rxMsg(bonus > 1 ? pick(["⚡ LIGHTNING!", "🔥 Blazing!", "🚀 Instant!", "😎 Too easy"]) : pick(["✅ Yep!", "👍 Got it", "🎯 Bullseye"]), "good");
    if (RX.streak > S.stats.rxBest) { S.stats.rxBest = RX.streak; checkBadges(); save(); }
    speak(sayChar(RX.cur));
    setTimeout(() => { b.classList.remove("right"); rxNext(); }, 550);
  } else {
    RX.lives--; RX.streak = 0; RX.wpm = Math.max(5, RX.wpm - 1);
    b.classList.add("wrong"); fx("bad");
    const rb = $(`#rxPad [data-c="${CSS.escape(RX.cur)}"]`); rb && rb.classList.add("hint");
    rxMsg(`❌ That was ${RX.cur}  ${CODE[RX.cur].replace(/\./g, "·").replace(/-/g, "–")}`, "bad");
    speak(`That was ${sayChar(RX.cur)}`);
    setTimeout(() => {
      b.classList.remove("wrong"); rb && rb.classList.remove("hint");
      if (RX.lives <= 0) {
        addXp(RX.score / 4);
        if (RX.score > 0) Confetti(60, "⚡");
        rxStop(`💀 Game over! Score ${RX.score}. Best streak ever: ${S.stats.rxBest}. +${Math.round(RX.score / 4)} XP`);
      } else Sound.play(RX.cur, { wpm: RX.wpm, onTone: (on) => $("#rxLed").classList.toggle("on", on), onEnd: () => setTimeout(rxNext, 500) });
    }, 900);
  }
  rxHud();
});
seg("#rxSet", (v) => { RX.set = v; $$("#rxSet button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); rxPad(); if (RX.on) rxStop("Set changed. Tap Start!"); });

/* ---------- GAMES: Call Sprint ---------- */
const SP = { on: false, n: 0, pts: 0, wpm: 20, call: "", repeated: false, total: 25 };
function spHud() { $("#spN").textContent = `${SP.n}/${SP.total}`; $("#spPts").textContent = SP.pts; $("#spWpm").textContent = SP.wpm; $("#spBest").textContent = S.stats.spBest; }
function spPlay() { Sound.play(SP.call, { wpm: SP.wpm, fw: SP.wpm, onTone: (on) => $("#spLed").classList.toggle("on", on) }); }
function spNext() {
  if (SP.n >= SP.total) return spEnd();
  SP.call = callsign(); SP.repeated = false; SP.n++;
  $("#spInput").value = ""; $("#spInput").focus();
  spHud(); spPlay();
}
function spEnd() {
  SP.on = false; $("#spGo").textContent = "🏁 Start";
  const best = SP.pts > S.stats.spBest;
  if (best) { S.stats.spBest = SP.pts; Confetti(180, "🏆"); fx("level"); }
  $("#spMsg").textContent = best ? `🏆 NEW RECORD: ${SP.pts} points! The pileup fears you.` : `🏁 Done! ${SP.pts} points. Record is ${S.stats.spBest}.`;
  addXp(SP.pts / 10); spHud();
}
function spSubmit() {
  if (!SP.on) return;
  const got = $("#spInput").value.toUpperCase().replace(/\s/g, "");
  if (!got) return spPlay();
  const ok = got === SP.call;
  let p = 0;
  if (ok) { p = Math.round(SP.call.length * SP.wpm * (SP.repeated ? 0.5 : 1)); SP.pts += p; SP.wpm = Math.min(60, SP.wpm + 2); fx("good"); }
  else { SP.wpm = Math.max(8, SP.wpm - 2); fx("bad"); }
  $("#spLog").insertAdjacentHTML("afterbegin", `<div class="${ok ? "ok" : "bad"}"><span>${ok ? "✅" : "❌"} ${SP.call}</span><span>${ok ? "" : escapeHtml(got) + " · "}${ok ? "+" + p : "0"}</span></div>`);
  $("#spMsg").textContent = ok ? pick(["🎯 Logged!", "📝 In the log!", "⚡ Next!", "🔥 You're a pileup machine"]) : `😬 It was ${SP.call}`;
  setTimeout(spNext, ok ? 350 : 900);
}
$("#spGo").addEventListener("click", () => {
  if (SP.on) return spSubmit();
  Sound.unlock();
  Object.assign(SP, { on: true, n: 0, pts: 0, wpm: S.set.wpm });
  $("#spLog").innerHTML = ""; $("#spGo").textContent = "✅ Submit"; $("#spMsg").textContent = "Go go go! Type the call and hit Submit.";
  spNext();
});
$("#spInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); spSubmit(); } });
$("#spRepeat").addEventListener("click", () => { if (SP.on) { SP.repeated = true; spPlay(); } });
seg("#gameMode", (v) => {
  $$("#gameMode button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  $("#reflexGame").classList.toggle("hidden", v !== "reflex"); $("#sprintGame").classList.toggle("hidden", v !== "sprint");
  rxStop(); Sound.stop();
});

/* ---------- KEY tab ---------- */
const K = { type: "straight", elems: "", text: "", ditMs: 60, gapT: null, wordT: null, target: "", lastDown: 0 };
const keyDitMs = () => 1200 / S.set.wpm;
function keyRender() {
  $("#keyElems").textContent = K.elems.replace(/\./g, "·").replace(/-/g, "–") || " ";
  $("#keyText").textContent = K.text || "…";
  $("#keyWpm").textContent = `Your speed: ~${Math.round(1200 / K.ditMs)} WPM`;
}
function keyNewTarget() {
  K.target = Math.random() < 0.3 ? callsign() : pick(WORDS.filter((w) => w.length <= 5));
  $("#keyTarget").textContent = K.target; K.text = ""; keyRender();
}
function keyCloseChar() {
  if (!K.elems) return;
  const ch = DECODE[K.elems] || "�";
  K.text = (K.text + ch).slice(-40); K.elems = "";
  keyRender();
  const sent = K.text.replace(/\s+/g, " ").trim();
  if (K.target && sent.endsWith(K.target)) {
    S.stats.sends++; fx("good"); Confetti(110, "🔑");
    toast(pick(["🔑 Beautiful fist!", "🎻 Sounds like music!", "🥇 Clean as a whistle!", "🤌 Chef's kiss keying"]));
    addXp(K.target.length * 8);
    setTimeout(keyNewTarget, 1200);
  }
}
function keySchedule() {
  clearTimeout(K.gapT); clearTimeout(K.wordT);
  const dit = K.type === "straight" ? K.ditMs : keyDitMs();
  K.gapT = setTimeout(keyCloseChar, dit * 2.5);
  K.wordT = setTimeout(() => { if (K.text && !K.text.endsWith(" ")) { K.text += " "; keyRender(); } }, dit * 7);
}
function keyAddElem(e) { K.elems += e; if (K.elems.length > 8) K.elems = K.elems.slice(-8); keyRender(); }

// straight key: classify by duration, adapt to the operator's speed
const sk = $("#skBtn");
const skDown = (e) => {
  e.preventDefault(); if (K.down) return;
  K.down = true; K.lastDown = performance.now(); sk.classList.add("down");
  clearTimeout(K.gapT); clearTimeout(K.wordT); Sound.keyDown();
};
const skUp = (e) => {
  e && e.preventDefault(); if (!K.down) return;
  K.down = false; sk.classList.remove("down"); Sound.keyUp();
  const d = performance.now() - K.lastDown;
  if (d < 2 * K.ditMs) { keyAddElem("."); K.ditMs = K.ditMs * 0.8 + d * 0.2; } else { keyAddElem("-"); K.ditMs = K.ditMs * 0.8 + (d / 3) * 0.2; }
  K.ditMs = Math.max(20, Math.min(240, K.ditMs));
  keySchedule();
};
sk.addEventListener("pointerdown", skDown); sk.addEventListener("pointerup", skUp);
sk.addEventListener("pointercancel", skUp); sk.addEventListener("pointerleave", skUp);
sk.addEventListener("contextmenu", (e) => e.preventDefault());

// iambic paddles (mode A)
const P = { dit: false, dah: false, busy: false, last: "" };
function paddleLoop() {
  if (P.busy) return;
  let e = null;
  if (P.dit && P.dah) e = P.last === "." ? "-" : ".";
  else if (P.dit) e = "."; else if (P.dah) e = "-";
  if (!e) { keySchedule(); return; }
  P.busy = true; P.last = e;
  clearTimeout(K.gapT); clearTimeout(K.wordT);
  const dit = keyDitMs(), dur = e === "." ? dit : 3 * dit;
  Sound.keyDown(); keyAddElem(e);
  setTimeout(() => { Sound.keyUp(); setTimeout(() => { P.busy = false; paddleLoop(); }, dit); }, dur);
}
for (const [id, k] of [["#pdDit", "dit"], ["#pdDah", "dah"]]) {
  const b = $(id);
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); P[k] = true; b.classList.add("down"); Sound.unlock(); paddleLoop(); });
  const up = (e) => { e.preventDefault(); P[k] = false; b.classList.remove("down"); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("pointerleave", up);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
}
seg("#keyType", (v) => {
  K.type = v; $$("#keyType button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  $("#straightKey").classList.toggle("hidden", v !== "straight"); $("#paddleKey").classList.toggle("hidden", v !== "paddle");
});
$("#keyClear").addEventListener("click", () => { K.text = ""; K.elems = ""; keyRender(); });
$("#keyNewTarget").addEventListener("click", () => { fx("tick"); keyNewTarget(); });
$("#keyHear").addEventListener("click", () => Sound.play(K.target));

/* ---------- CHART tab ---------- */
const LINGO = [["CQ", "Calling anyone"], ["DE", "From / this is"], ["73", "Best regards"], ["88", "Love & kisses"], ["QTH", "My location"], ["QRZ", "Who's calling?"],
  ["QSL", "Confirmed"], ["QRM", "Man-made QRM"], ["QRN", "Static noise"], ["QSB", "Fading"], ["QRP", "Low power"], ["QRS", "Send slower!"], ["QRQ", "Send faster"],
  ["RST", "Signal report"], ["5NN", "599, contest style"], ["FB", "Fine business"], ["OM", "Old man (any guy)"], ["YL", "Young lady"], ["XYL", "Wife"],
  ["TNX", "Thanks"], ["PSE", "Please"], ["AGN", "Again"], ["HI HI", "Laughing out loud"], ["ES", "And"], ["UR", "Your"], ["HR", "Here"], ["WX", "Weather"],
  ["CUL", "See you later"], ["GL", "Good luck"], ["DX", "Long distance"], ["GM", "Good morning"], ["GE", "Good evening"], ["SRI", "Sorry"], ["EE", "Dit dit (bye!)"]];
const PROS = [["<AR>", "End of message"], ["<SK>", "End of contact"], ["<BT>", "Break / new paragraph"], ["<KN>", "Only you go ahead"], ["<AS>", "Wait"], ["<BK>", "Back to you"], ["<SOS>", "Distress! 🆘"]];
function patternHtml(code) { return `<div class="pattern">${[...code].map((e) => `<i class="${e === "-" ? "d" : ""}"></i>`).join("")}</div>`; }
function renderChart(set) {
  let items;
  if (set === "pro") items = PROS.map(([k, d]) => [k, d, CODE[k]]);
  else if (set === "abbr") items = LINGO.map(([k, d]) => [k, d, null]);
  else items = (set === "punct" ? ".,?/=+-'():@!\"" : SETS[set]).split("").map((c) => [c, set === "letters" ? PHONETIC[c] : "", CODE[c]]);
  $("#chart").innerHTML = items.map(([k, d, code]) => `<button data-play="${escapeHtml(k)}"><b>${k.startsWith("<") ? `<span class="pro">${k.slice(1, -1)}</span>` : escapeHtml(k)}</b>${code ? patternHtml(code) : ""}<small>${d}</small></button>`).join("");
}
seg("#chartSet", (v) => { $$("#chartSet button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); renderChart(v); });
$("#chart").addEventListener("click", (e) => {
  const b = e.target.closest("[data-play]"); if (!b) return;
  $$("#chart .playing").forEach((x) => x.classList.remove("playing"));
  b.classList.add("playing");
  const k = b.dataset.play;
  Sound.play(k, { onEnd: () => { b.classList.remove("playing"); if (k.length === 1) speak(sayChar(k)); } });
});

/* ---------- ME tab ---------- */
function renderMe() {
  const l = levelOf(S.xp), [t, e] = titleOf(l), st = S.stats;
  $("#avatar").textContent = e; $("#meTitle").textContent = t;
  const next = titleOf(l + 1)[0];
  $("#meSub").textContent = `Level ${l} · ${xpFor(l + 1) - S.xp} XP to ${next === t ? "glory" : next}`;
  const avg = st.history.length ? Math.round(st.history.reduce((a, b) => a + b, 0) / st.history.length) : 0;
  $("#stats").innerHTML = [["⭐", S.xp, "Total XP"], ["🔥", S.streak, "Day streak"], ["🎧", st.sessions, "Copies"], ["🔤", st.chars, "Chars copied"], ["🎯", avg + "%", "Avg accuracy"],
    ["🚀", st.maxWpm || "—", "Top WPM 90%+"], ["📻", st.qsos, "QSO quizzes"], ["⚡", st.rxBest, "Reflex streak"], ["🏁", st.spBest, "Sprint record"]]
    .map(([i, v, n]) => `<div><b>${i} ${v}</b><small>${n}</small></div>`).join("");
  $("#badges").innerHTML = BADGES.map((b) => `<div class="badge ${S.badges[b.id] ? "" : "locked"}"><i>${b.i}</i><b>${b.n}</b><small>${b.d}</small></div>`).join("");
  $("#joke").textContent = "😄 " + pick(JOKES);
  // accuracy bars
  const c = $("#histo"), w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = 120 * devicePixelRatio), x = c.getContext("2d");
  const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim(), a2 = getComputedStyle(document.body).getPropertyValue("--accent2").trim();
  x.clearRect(0, 0, w, h);
  const hs = st.history, bw = w / 20;
  if (!hs.length) { x.fillStyle = "rgba(255,255,255,.4)"; x.font = `${14 * devicePixelRatio}px sans-serif`; x.textAlign = "center"; x.fillText("Check a copy to see your progress here", w / 2, h / 2); }
  hs.forEach((v, i) => {
    const bh = Math.max(3, (v / 100) * (h - 8));
    const g = x.createLinearGradient(0, h, 0, h - bh); g.addColorStop(0, a2); g.addColorStop(1, accent);
    x.fillStyle = g; x.beginPath();
    x.roundRect ? x.roundRect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh, 4 * devicePixelRatio) : x.rect(i * bw + bw * 0.15, h - bh, bw * 0.7, bh);
    x.fill();
  });
}
$("#settingsHere").innerHTML = `<button class="big" id="openSettings">🎛️ Speed, tone, noise &amp; theme</button>`;
$("#openSettings").addEventListener("click", () => openSheet());
$("#resetAll").addEventListener("click", () => {
  if (!confirm("Reset all XP, stats and badges? Your settings stay.")) return;
  const set = S.set; S = JSON.parse(JSON.stringify(DEFAULTS)); S.set = set; save(); renderHeader(); renderMe(); syncCopyUi(); toast("🧹 Fresh start. Every legend was a lid once!");
});

/* ---------- settings sheet ---------- */
function openSheet() { $("#sheet").classList.add("open"); $("#sheetBack").classList.remove("hidden"); }
function closeSheet() { $("#sheet").classList.remove("open"); $("#sheetBack").classList.add("hidden"); }
$("#speedChip").addEventListener("click", openSheet);
$("#sheetBack").addEventListener("click", closeSheet);
$("#sheetDone").addEventListener("click", closeSheet);

function syncSettings() {
  const s = S.set;
  for (const [id, v] of [["wpm", s.wpm], ["fw", s.fw], ["tone", s.tone], ["vol", s.vol], ["qrn", s.qrn]]) { $("#" + id).value = v; $(`#${id === "vol" ? "vol" : id}Val`).textContent = v; }
  for (const id of ["qsb", "sfx", "speak", "vvv"]) $("#" + id).checked = s[id];
  $$("#themes button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.theme));
  document.body.dataset.theme = s.theme;
  Object.assign(Sound.opts, { wpm: s.wpm, fw: Math.min(s.fw, s.wpm), tone: s.tone, vol: s.vol / 100, qrn: s.qrn / 100, qsb: s.qsb });
  if (Sound.master) Sound.master.gain.value = s.vol / 100;
  renderHeader();
}
for (const id of ["wpm", "fw", "tone", "vol", "qrn"]) {
  $("#" + id).addEventListener("input", (e) => {
    const s = S.set, v = +e.target.value, old = s.wpm;
    s[id] = v;
    if (id === "wpm" && (s.fw === old || s.fw > v)) s.fw = v;
    if (id === "fw" && v > s.wpm) s.fw = s.wpm;
    syncSettings(); save();
  });
}
$("#tone").addEventListener("change", () => Sound.play("E", { wpm: 15 }));
$("#wpm").addEventListener("change", () => Sound.play("PARIS"));
for (const id of ["qsb", "sfx", "speak", "vvv"]) $("#" + id).addEventListener("change", (e) => { S.set[id] = e.target.checked; save(); syncSettings(); if (id === "speak" && e.target.checked) { S.set.speak = true; speak("Robot announcer online. Seventy three!"); } });
seg("#themes", (v) => { S.set.theme = v; save(); syncSettings(); Confetti(40); });

/* ---------- tabs, install hint, share ---------- */
$(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tab]"); if (!b) return;
  $$(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
  copyPlayer.stop(); qsoPlayer.stop(); if (RX.on) rxStop("Paused. Tap Start for a fresh round.");
  if (SP.on) { SP.on = false; $("#spGo").textContent = "🏁 Start"; $("#spMsg").textContent = "Sprint stopped. Tap Start to try again."; }
  Sound.stop(); fx("tick");
  if (b.dataset.tab === "me") renderMe();
  scrollTo({ top: 0, behavior: "smooth" });
});
async function shareText(text) {
  const url = location.href.split("#")[0];
  try {
    if (navigator.share) await navigator.share({ title: "Dit Dah Dojo", text, url });
    else { await navigator.clipboard.writeText(`${text} ${url}`); toast("📋 Copied to clipboard!"); }
  } catch {}
}
const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
if (isIos && !standalone && !localStorage.getItem("ddd-nohint")) $("#installHint").classList.remove("hidden");
$$("[data-close]").forEach((b) => b.addEventListener("click", () => { $("#" + b.dataset.close).classList.add("hidden"); try { localStorage.setItem("ddd-nohint", "1"); } catch {} }));
document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
document.addEventListener("visibilitychange", () => { if (document.hidden) { copyPlayer.stop(); qsoPlayer.stop(); Sound.keyUp(); } });

/* ---------- go ---------- */
syncSettings(); syncCopyUi(); newCopyText(); newQso(); rxPad(); rxHud(); spHud(); keyNewTarget(); renderChart("letters"); renderHeader();
if (S.xp === 0) setTimeout(() => toast("👋 Welcome to the Dojo! Hit ▶ and copy what you hear.", 3200), 600);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
