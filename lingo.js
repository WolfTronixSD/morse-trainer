// Dit Dah Dojo: the refresher guide. Prosigns, ham lingo, Q codes and sample QSOs.
// Each entry: [what you hear, what it means, an example or tip].
"use strict";

const PROS = [
  ["VVV", "Test signal before a transmission", "Sent at the start so listeners can tune in and set their filters. Means nothing, it's just a tune-up."],
  ["CQ", "Calling anyone", "CQ CQ CQ DE W6WLF W6WLF K"],
  ["DE", "From, this is", "Goes between their call and yours: DL1ABC DE W6WLF"],
  ["K", "Over, anyone may answer", "Ends a CQ or an over when you don't mind who replies."],
  ["<KN>", "Over, only you go ahead", "No breakers please. Ends most overs in a QSO. Same code as ( ."],
  ["<BK>", "Break, straight back to you", "Quick hand-over without callsigns: FB BK. Also used to break into a QSO."],
  ["<BT>", "Pause, new paragraph", "Separates thoughts, like a full stop between topics: UR RST 579 <BT> NAME WOLF. Same code as = ."],
  ["<AR>", "End of message", "Sent at the end of an over, just before the callsigns: … <AR> DL1ABC DE W6WLF KN. Same code as + ."],
  ["<SK>", "End of contact", "The last over of a QSO: 73 <SK>. Sometimes written VA."],
  ["<CL>", "Closing, going off the air", "Final sign-off when you shut the station down: 73 <SK> <CL>"],
  ["<AS>", "Wait, stand by", "<AS> 5 means wait 5 minutes. Same meaning as QRX."],
  ["R", "Roger, received", "I copied everything fine. Often starts an over: R R TNX FER RPT"],
  ["<VE>", "Understood", "Verified. Rare on air, same idea as R."],
  ["<HH>", "Error, I made a mistake", "Eight dits. Most people just send EEEEEEEE or a quick ? and resend the word."],
  ["<KA>", "Start of message", "Attention! Used in formal traffic, rare in a ragchew."],
  ["EE", "Dit dit, goodbye", "The friendly last two dits after a QSO, like a wave."],
  ["5NN", "599, contest style", "Cut numbers: N = 9, T = 0, A = 1. So 5NN = 599 and 1TT = 100."],
  ["<SOS>", "Distress, emergency 🆘", "Only for real life-threatening emergencies."],
];

const LINGO = [
  ["73", "Best regards", "Said at the end of every QSO."], ["88", "Love and kisses", "For a YL or the XYL."], ["72", "Best regards, QRP style", "From low-power fans."],
  ["ABT", "About", ""], ["AGN", "Again", "PSE AGN = please repeat."], ["ANT", "Antenna", "ANT IS DIPOLE"], ["B4", "Before", "QSO B4"],
  ["BCNU", "Be seeing you", ""], ["CFM", "Confirm", ""], ["CPY", "Copy", "SOLID CPY = copied fine"], ["CUAGN", "See you again", ""],
  ["CUL", "See you later", ""], ["DR", "Dear", "DR OM"], ["DX", "Long distance", "A rare or far-away station."], ["ES", "And", "73 ES GL"],
  ["FB", "Fine business, great", "FB OM"], ["FER", "For", "TNX FER CALL"], ["FM", "From", ""], ["GA", "Good afternoon, or go ahead", ""],
  ["GE", "Good evening", ""], ["GM", "Good morning", ""], ["GN", "Good night", ""], ["GL", "Good luck", ""], ["GUD", "Good", "GUD SIGS"],
  ["HI HI", "Laughing out loud", "The CW giggle."], ["HR", "Here", "QTH HR IS …"], ["HW?", "How do you copy?", "Asked at the end of the first over."],
  ["HPE", "Hope", "HPE CUAGN"], ["LID", "Poor operator", "We all start as one!"], ["MNI", "Many", "MNI TNX"], ["NR", "Number, or near", ""],
  ["NW", "Now", ""], ["OM", "Old man, any male ham", ""], ["OP", "Operator, my name", "OP HR IS WOLF"], ["PSE", "Please", ""], ["PWR", "Power", "PWR 100W"],
  ["RIG", "Radio", "RIG IS IC7300"], ["RPT", "Report, or repeat", ""], ["RST", "Readability, strength, tone", "Signal report, like 579. Best is 599."],
  ["RX", "Receiver", ""], ["TX", "Transmitter", ""], ["SIG", "Signal", ""], ["SRI", "Sorry", ""], ["TNX", "Thanks", "Also TKS."], ["TU", "Thank you", "Short and sweet in contests."],
  ["U", "You", ""], ["UR", "Your, you're", "UR RST 599"], ["VY", "Very", "VY FB"], ["WID", "With", ""], ["WX", "Weather", "WX SUNNY ES WARM"],
  ["YL", "Young lady, any female ham", ""], ["XYL", "Wife", "Ex-young lady."], ["ELBUG", "Electronic keyer", ""], ["BUG", "Semi-automatic key", "A Vibroplex style key."],
  ["TEST", "Contest call", "CQ TEST W6WLF"], ["POTA", "Parks on the Air", "Activators call CQ POTA from a park."], ["SOTA", "Summits on the Air", "Same idea, on a mountain top."],
];

const QCODES = [
  ["QRL?", "Is this frequency busy?", "Always ask QRL? before calling CQ. Answer: C (yes, busy)."],
  ["QRM", "Interference from other stations", ""], ["QRN", "Static, atmospheric noise", ""], ["QSB", "Your signal is fading", ""],
  ["QRO", "Increase power", "Also means high power."], ["QRP", "Decrease power, low power", "5 W or less for QRP fans."],
  ["QRQ", "Send faster", ""], ["QRS", "Send slower", "Never be shy to ask: QRS PSE."], ["QRT", "Stop sending, closing down", "QRT NW 73"],
  ["QRU", "Have you anything for me?", "QRU = I have nothing more."], ["QRV", "I am ready", ""], ["QRX", "Wait, stand by", "QRX 5 MIN"],
  ["QRZ?", "Who is calling me?", "When you hear a call but miss the callsign."], ["QSK", "Full break-in", "You can hear between your own dits."],
  ["QSL", "I confirm, acknowledged", "Also the postcard you swap after a QSO."], ["QSO", "A contact, a conversation", ""], ["QSP", "Relay a message", ""],
  ["QSY", "Change frequency", "QSY UP 2 = move 2 kHz up."], ["QTH", "My location", "QTH SAN DIEGO"], ["QTR", "Exact time", ""],
];

const SAMPLE_QSOS = [
  { title: "📻 A friendly ragchew", lines: [
    ["QRL?", "First listen, then ask if the frequency is free."],
    ["CQ CQ CQ DE W6WLF W6WLF K", "W6WLF calls anyone. K means go ahead."],
    ["W6WLF DE DL1ABC DL1ABC K", "Hans answers: your call, DE, his call twice."],
    ["DL1ABC DE W6WLF GE OM TNX FER CALL <BT> UR RST 579 579 <BT> NAME WOLF WOLF <BT> QTH SAN DIEGO <BT> HW? <AR> DL1ABC DE W6WLF <KN>", "The first over: report, name, location, then HW? (how copy?). <BT> separates topics, <AR> ends the message, <KN> hands it back only to Hans."],
    ["W6WLF DE DL1ABC R FB WOLF TNX FER RPT <BT> UR RST 559 <BT> NAME HANS <BT> QTH BERLIN <BT> RIG IC7300 ES DIPOLE <BT> WX COLD <AR> W6WLF DE DL1ABC <KN>", "R = all copied. Hans sends his report, name, QTH, rig and weather."],
    ["R TNX HANS FB QSO <BT> 73 ES GL <SK> DL1ABC DE W6WLF EE", "Wrapping up: thanks, 73 and good luck. <SK> ends the contact, EE is the friendly dit dit."],
    ["73 WOLF CUAGN <SK> W6WLF DE DL1ABC EE", "Hans says see you again and signs off too."],
  ] },
  { title: "🏁 A quick contest QSO", lines: [
    ["CQ TEST W6WLF", "Contest CQ: as short as possible."],
    ["DL1ABC", "Just the call, once."],
    ["DL1ABC 5NN 05", "Report 599 in cut numbers plus the exchange (here a zone)."],
    ["TU 5NN 14", "Thank you, and the reply exchange."],
    ["TU W6WLF", "Thanks, and the call again for the next caller."],
  ] },
  { title: "⚡ Quick POTA contact", lines: [
    ["CQ POTA DE K6PRK K", "An activator in a park."],
    ["K6PRK DE W6WLF", "You answer once."],
    ["W6WLF GM UR 559 559 CA CA <BK>", "Report and state, then <BK> for a fast hand-back."],
    ["<BK> TU UR 579 579 CA CA 73 <BK>", "Your report and state, 73."],
    ["<BK> TU 73 EE", "Done! EE = dit dit, see ya."],
  ] },
];
