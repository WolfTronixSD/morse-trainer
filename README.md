# Dit Dah Dojo · Morse Trainer

A fun Morse code trainer for iPhone (works in any browser). Live at https://wolftronixsd.github.io/morse-trainer/

Open it in Safari, tap **Share → Add to Home Screen**, and it runs full screen and offline.

- 🎧 Copy: groups of 5 (letters, numbers, mixed, punctuation, Koch), words, callsigns, your own text, scored with a diff
- 📻 QSO simulator (rag chew, quick 5NN, contest) with a pop quiz
- ⚡ Games: Reflex and Callsign Sprint
- 🔑 Straight key and iambic paddles with live decoding
- 📖 Chart of letters, numbers, prosigns and ham lingo
- 🏆 XP, ranks, badges, daily streak, themes, Farnsworth, QRN and QSB

Plain static files: `index.html`, `style.css`, `morse.js` (Morse table, sound, generators), `app.js` (UI), `sw.js` (offline).
Release: bump the `?v=` params in `index.html` and `CACHE` in `sw.js`.
