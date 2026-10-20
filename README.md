# Dit Dah Dojo · Morse Trainer

A fun Morse code trainer for iPhone (works in any browser). Live at https://wolftronixsd.github.io/morse-trainer/

Open it in Safari, tap **Share → Add to Home Screen**, and it runs full screen and offline.

- 🎧 Copy: groups of 5 (letters, numbers, mixed, punctuation, Koch), words, callsigns, your own text, scored with a diff
- 📻 QSO simulator (rag chew, quick 5NN, contest) with a pop quiz
- ⚡ Games: Reflex and Callsign Sprint, each with letters, numbers or letters + numbers mixed
- 🔑 Straight key and iambic paddles with live decoding
- 👁️ Signal display: oscilloscope, flashing signal lamp, paper tape, waterfall or ripples in any color, plus a full-screen flash and a light-only mode for reading Morse by eye
- 🎙️ Mic decoder: hold the phone near a rig or speaker and it decodes the Morse it hears
- 🐺 Wolf mascot (tap it) and haptic feedback on iPhone (iOS 18+) and Android
- 🌙 Sleep mode: easy news, Wikipedia or bedtime fables in slow Morse with a sleep timer and fade out, an optional binaural relax primer (alpha, theta, delta), ocean, rain, fire or space sounds, and a dark night screen
- 📖 Chart and refresher guide: letters, numbers, prosigns (VVV, BT, BK, KN, AR, SK…), ham lingo, Q codes and annotated sample QSOs
- 🔦 Phone flashlight blinks along with the Morse (Android Chrome; iPhone browsers do not allow it)
- 🏆 XP, ranks, badges, daily streak, themes, Farnsworth, QRN and QSB

Plain static files: `index.html`, `style.css`, `morse.js` (Morse table, sound, generators), `dsp.js` (tone filter, runs in an AudioWorklet), `decoder.js` (adaptive mic decoder), `app.js` (UI), `sw.js` (offline).
Release: bump the `?v=` params in `index.html` and `CACHE` in `sw.js`.
