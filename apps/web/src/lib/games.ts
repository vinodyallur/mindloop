export interface GameDef {
  key: string; title: string; domain: string; minutes: number;
  mechanic: string; evidence: string; href: string;
}

// 30 research-grounded tasks/games. Evidence notes are conservative:
// near-transfer only (Melby-Lervag 2016; Sala & Gobet 2017). All feed the
// personal baseline via submitSession; none diagnose.
export const GAMES: GameDef[] = [
  { key: "cpt", title: "Sustained Focus", domain: "Attention", minutes: 4, mechanic: "CPT: respond to rare targets", evidence: "Conners CPT-3 / TOVA paradigm", href: "/assessment/cpt" },
  { key: "shelf", title: "Remember the Shelf", domain: "Memory", minutes: 2, mechanic: "Memorize 6 objects in 20s, tap what was there — green = remembered, red = intruder", evidence: "Visual recognition memory", href: "/games/shelf" },
  { key: "orbit", title: "Orbit Odd-One-Out", domain: "Attention", minutes: 1, mechanic: "9 balls orbit, 1 goes the wrong way — find it in 15s (15+ if over)", evidence: "Motion-direction oddball", href: "/games/orbit" },
  { key: "schulte", title: "Schulte 25", domain: "Attention", minutes: 1, mechanic: "Tap 1→25 in order, STOP when done — 25+ if over 25s", evidence: "Schulte table / visual scanning", href: "/games/schulte" },
  { key: "stroop", title: "Color Clash", domain: "Inhibition", minutes: 3, mechanic: "Name ink color, ignore word", evidence: "Stroop effect", href: "/assessment/stroop" },
  { key: "flanker", title: "Flanker Field", domain: "Attention", minutes: 3, mechanic: "Respond to center arrow among flankers", evidence: "Eriksen flanker task", href: "/games/flanker" },
  { key: "sart", title: "Steady Response", domain: "Attention", minutes: 3, mechanic: "Go-heavy vigilance, withhold rare digit", evidence: "SART mind-wandering paradigm", href: "/games/sart" },
  { key: "pvt", title: "Vigilance Tap", domain: "Attention", minutes: 3, mechanic: "Tap the instant the cue appears", evidence: "Psychomotor Vigilance Task (Dinges)", href: "/games/pvt" },
  { key: "stopsignal", title: "Stop Signal", domain: "Inhibition", minutes: 3, mechanic: "Stop an initiated response on signal", evidence: "Stop-Signal Task (Verbruggen)", href: "/games/stopsignal" },
  { key: "switch", title: "Rule Switch", domain: "Flexibility", minutes: 3, mechanic: "Alternate sorting rules on cue", evidence: "Task-switching / WCST paradigm", href: "/games/switch" },
  { key: "corsi", title: "Block Recall", domain: "Memory", minutes: 3, mechanic: "Repeat growing block sequences", evidence: "Corsi block-tapping span ~5-6", href: "/assessment/corsi" },
  { key: "nback1", title: "N-Back 1", domain: "Memory", minutes: 3, mechanic: "Match stimulus 1 step back", evidence: "N-back updating (Jaeggi 2008)", href: "/games/nback" },
  { key: "nback2", title: "N-Back 2", domain: "Memory", minutes: 4, mechanic: "Match stimulus 2 steps back", evidence: "Dual n-back training model", href: "/games/nback" },
  { key: "span", title: "Digit Span", domain: "Memory", minutes: 3, mechanic: "Recall growing digit strings", evidence: "WAIS digit span", href: "/games/span" },
  { key: "pairs", title: "Pair Match", domain: "Memory", minutes: 3, mechanic: "Remember card positions", evidence: "Paired-associate learning", href: "/games/pairs" },
  { key: "sequence", title: "Sequence Echo", domain: "Memory", minutes: 3, mechanic: "Echo lengthening tone/color runs", evidence: "Serial recall training", href: "/games/sequence" },
  { key: "reaction", title: "Reaction Sprint", domain: "Speed", minutes: 2, mechanic: "Simple reaction time trials", evidence: "Simple RT paradigm", href: "/assessment/reaction" },
  { key: "choice", title: "Choice Rush", domain: "Speed", minutes: 2, mechanic: "Two-choice reaction under time", evidence: "Choice RT paradigm", href: "/games/choice" },
  { key: "search", title: "Visual Search", domain: "Attention", minutes: 3, mechanic: "Find target among distractors", evidence: "Treisman visual search", href: "/games/search" },
  { key: "odd", title: "Odd One Out", domain: "Attention", minutes: 2, mechanic: "Spot the differing item fast", evidence: "Visual discrimination", href: "/games/odd" },
  { key: "trail", title: "Trail Connect", domain: "Flexibility", minutes: 3, mechanic: "Connect alternating numbers/letters", evidence: "Trail-Making Test A/B", href: "/games/trail" },
  { key: "math", title: "Mental Math", domain: "Speed", minutes: 3, mechanic: "Timed arithmetic verification", evidence: "Processing-speed drills", href: "/games/math" },
  { key: "rotate", title: "Rotate Fit", domain: "Spatial", minutes: 3, mechanic: "Mental rotation matching", evidence: "Shepard-Metzler rotation", href: "/games/rotate" },
  { key: "pattern", title: "Pattern Complete", domain: "Reasoning", minutes: 3, mechanic: "Complete matrix patterns", evidence: "Raven-style matrices", href: "/games/pattern" },
  { key: "memory-grid", title: "Grid Recall", domain: "Memory", minutes: 3, mechanic: "Recall highlighted grid cells", evidence: "Spatial span variant", href: "/games/grid" },
  { key: "dual", title: "Dual Track", domain: "Attention", minutes: 4, mechanic: "Track two streams at once", evidence: "Divided-attention paradigm", href: "/games/dual" },
  { key: "breathe", title: "Breath Pace", domain: "Calm", minutes: 2, mechanic: "Paced breathing exercise", evidence: "Mrazek 2013; Jha 2007 mindfulness", href: "/games/breathe" },
  { key: "focus-read", title: "Deep Read", domain: "Habit", minutes: 10, mechanic: "Bounded offline reading", evidence: "Deliberate practice transfer", href: "/games/read" },
  { key: "steadiness", title: "Hold Steady", domain: "Coordination", minutes: 1, mechanic: "Hold phone steady 30s (gyro)", evidence: "Exploratory; mPower tremor protocol", href: "/assessment/steadiness" },
  { key: "tap-sync", title: "Rhythm Tap", domain: "Coordination", minutes: 2, mechanic: "Tap in time with a beat", evidence: "Sensorimotor synchronization", href: "/games/rhythm" },
  { key: "trace", title: "Trace Path", domain: "Coordination", minutes: 2, mechanic: "Trace a path steadily", evidence: "Visuomotor tracking", href: "/games/trace" },
  { key: "checkin", title: "Daily Check-in", domain: "Context", minutes: 1, mechanic: "Self-report focus, mood, sleep", evidence: "Ecological momentary assessment", href: "/games/checkin" },
];
