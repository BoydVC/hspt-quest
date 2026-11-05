/* HSPT sprint logic: pure functions, no DOM. Used by the app (window.Sched) and by node unit tests (module.exports). */
(function (root) {
  // Real HSPT format (STS manual counts; diocese-published times). See docs/HSPT-FORMAT.md.
  var SECTIONS = [
    {name: "Verbal", items: 60, minutes: 16, icon: "🔤"},
    {name: "Quantitative", items: 52, minutes: 30, icon: "🔢"},
    {name: "Reading", items: 62, minutes: 25, icon: "📖"},
    {name: "Mathematics", items: 64, minutes: 45, icon: "📐"},
    {name: "Language", items: 60, minutes: 25, icon: "✏️"}];
  var SEC = {}; SECTIONS.forEach(function (s) { s.secPerItem = s.minutes * 60 / s.items; SEC[s.name] = s; });
  var TEST_DAY = "2026-11-17", START = "2026-11-05";

  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(s, n) { var p = s.split("-"); return iso(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
  function diffDays(a, b) { var p = a.split("-"), q = b.split("-"); return Math.round((new Date(+q[0], +q[1] - 1, +q[2]) - new Date(+p[0], +p[1] - 1, +p[2])) / 86400000); }

  // A mini-set is a quarter of a real section at real pace (e.g. Verbal 15 items in 4:00).
  function miniSet(section, n) { var s = SEC[section]; n = n || Math.round(s.items / 4); return {section: section, n: n, seconds: Math.round(n * s.secPerItem)}; }

  // 12 study days, Nov 5 to Nov 16, then test day Nov 17.
  var ROT = [["Verbal", "Quantitative"], ["Reading", "Mathematics"], ["Language", "Verbal"], ["Quantitative", "Mathematics"], ["Reading", "Language"]];
  function plan() {
    var days = [];
    for (var i = 0; i < 12; i++) {
      var date = addDays(START, i), d = {day: i + 1, date: date, sets: [], review: true, kind: "study"};
      if (i === 5) { d.kind = "half-mock"; d.title = "Half mock: Verbal + Quant + Reading at full length"; d.mock = ["Verbal", "Quantitative", "Reading"]; }
      else if (i === 8) { d.kind = "full-mock"; d.title = "Full timed mock (all 5 sections, 141 min)"; d.mock = SECTIONS.map(function (s) { return s.name; }); }
      else if (i === 11) { d.kind = "light"; d.title = "Light day: review misses only, sleep early"; }
      else if (i >= 9) { d.kind = "weakest"; d.title = "Target your 2 weakest sections"; d.sets = ["weak1", "weak2"].map(function (w) { return {section: w, n: 0, seconds: 0}; }); }
      else { var r = ROT[i % ROT.length]; d.title = r.join(" + "); d.sets = r.map(function (s) { return miniSet(s); }); }
      days.push(d);
    }
    return days;
  }
  function dayIndex(today) { return diffDays(START, today); }
  function daysLeft(today) { return diffDays(today, TEST_DAY); }

  // Spaced repetition (Leitner): miss -> box 1, due tomorrow. Each right answer moves up a box: 1,2,4 days.
  var GAPS = [0, 1, 2, 4];
  function review(rec, correct, today) {
    rec = rec || {box: 0, right: 0, wrong: 0, seen: 0};
    rec = {box: rec.box, right: rec.right, wrong: rec.wrong, seen: rec.seen + 1, last: correct};
    if (correct) { rec.right++; if (rec.box > 0) { rec.box = rec.box >= 3 ? 0 : rec.box + 1; } }
    else { rec.wrong++; rec.box = 1; }
    rec.due = rec.box > 0 ? addDays(today, GAPS[rec.box]) : null;
    return rec;
  }
  function due(state, today) { return Object.keys(state).filter(function (id) { var r = state[id]; return r.box > 0 && r.due && r.due <= today; }).sort(); }

  // Weakness per skill: accuracy with a small prior so 1 miss doesn't dominate. Lower = weaker.
  function weakness(state, bank) {
    var by = {};
    bank.forEach(function (q) { var k = q.section + " · " + q.skill; by[k] = by[k] || {key: k, section: q.section, skill: q.skill, right: 0, wrong: 0, total: 0}; by[k].total++; var r = state[q.id]; if (r) { by[k].right += r.right; by[k].wrong += r.wrong; } });
    return Object.keys(by).map(function (k) { var x = by[k]; x.tries = x.right + x.wrong; x.acc = x.tries ? x.right / x.tries : null; x.score = (x.right + 1) / (x.tries + 2); return x; })
      .sort(function (a, b) { return (a.tries ? 0 : 1) - (b.tries ? 0 : 1) || a.score - b.score || (a.key < b.key ? -1 : 1); });
  }
  function sectionAcc(state, bank) {
    var o = {}; SECTIONS.forEach(function (s) { o[s.name] = {right: 0, tries: 0}; });
    bank.forEach(function (q) { var r = state[q.id]; if (r) { o[q.section].right += r.right; o[q.section].tries += r.right + r.wrong; } });
    return o;
  }
  function weakestSections(state, bank, n) {
    var a = sectionAcc(state, bank);
    return SECTIONS.map(function (s) { var x = a[s.name]; return {name: s.name, score: (x.right + 1) / (x.tries + 2)}; }).sort(function (p, q) { return p.score - q.score; }).slice(0, n || 2).map(function (x) { return x.name; });
  }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Pick n items in a section: due misses first, then unseen, then weakest skills. Reading keeps passages together.
  function pickSet(bank, state, section, n, seed, today) {
    var r = rng(seed || 1), pool = shuffle(bank.filter(function (q) { return q.section === section; }), r);
    function pri(q) { var s = state[q.id]; if (!s) return 1; if (s.box > 0 && s.due <= today) return 0; return 2 + s.right / (s.right + s.wrong + 1); }
    pool.sort(function (a, b) { return pri(a) - pri(b); });
    var out = pool.slice(0, n);
    if (section === "Reading") out.sort(function (a, b) { return (a.passage || "~").localeCompare(b.passage || "~") || (a.id < b.id ? -1 : 1); });
    return out;
  }
  function buildMock(bank, sections, seed) {
    var r = rng(seed || 17);
    return (sections || SECTIONS.map(function (s) { return s.name; })).map(function (name) {
      var s = SEC[name], pool = bank.filter(function (q) { return q.section === name; });
      var pick = name === "Reading" ? pool.slice(0, s.items) : shuffle(pool, r).slice(0, s.items);
      return {section: name, seconds: s.minutes * 60, items: pick};
    });
  }
  function score(items, answers) { var c = 0; items.forEach(function (q) { if (answers[q.id] === q.answer) c++; }); return {correct: c, total: items.length, blank: items.filter(function (q) { return answers[q.id] == null; }).length}; }
  // Answer sheet numbering: sections run consecutively 1..298 like the real booklet.
  function sheetRanges() { var n = 1; return SECTIONS.map(function (s) { var r = {section: s.name, from: n, to: n + s.items - 1, choices: s.name === "Verbal" ? 4 : 4}; n += s.items; return r; }); }

  var api = {SECTIONS: SECTIONS, SEC: SEC, TEST_DAY: TEST_DAY, START: START, addDays: addDays, diffDays: diffDays, miniSet: miniSet, plan: plan, dayIndex: dayIndex, daysLeft: daysLeft,
    review: review, due: due, weakness: weakness, sectionAcc: sectionAcc, weakestSections: weakestSections, pickSet: pickSet, buildMock: buildMock, score: score, sheetRanges: sheetRanges, rng: rng};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Sched = api;
})(this);
