/* HSPT Quest: game-style practice built only from Path's 20 HSPT sheets.
   Progress is stored in this browser (localStorage) and can be exported as JSON. Nothing is sent anywhere. */
(function () {
  "use strict";
  var KEY = "hsptq:v1";
  var AREAS = ["Verbal", "Quantitative", "Reading", "Mathematics", "Language"];
  var AREA = {
    Verbal: {e: "🗣️", c: "var(--v)", hex: "#ff5d8f", pace: 16, ds: "Synonyms, analogies, logic"},
    Quantitative: {e: "🔢", c: "var(--q)", hex: "#ffb020", pace: 35, ds: "Series, comparisons, word problems"},
    Reading: {e: "📖", c: "var(--r)", hex: "#3ec5ff", pace: 24, ds: "Main idea, details, vocab"},
    Mathematics: {e: "📐", c: "var(--m)", hex: "#4ade80", pace: 42, ds: "Algebra, geometry, percents"},
    Language: {e: "✍️", c: "var(--l)", hex: "#a78bfa", pace: 25, ds: "Grammar, punctuation, spelling"}
  };
  var TITLES = ["Rookie", "Warm-Up Star", "Quick Thinker", "Pattern Spotter", "Word Wizard", "Number Ninja", "Trailblazer", "Pathfinder", "Ace", "HSPT Legend"];
  var CHEERS = ["Nailed it! 🎯", "Locked in 🔒", "That's the one ✨", "Clean shot, goal! 🥍", "Big brain energy 🧠", "Smooth! 😎", "Yes! Exactly right 🙌", "You make it look easy 💫", "Sharp thinking ⚡", "Textbook! 📚", "Love that 💜", "Boom 💥"];
  var COMBO = ["Hot streak! 🔥", "Unstoppable 🚀", "On fire 🔥🔥", "Combo queen 👑"];
  var SOFT = ["Not quite, but that one's sneaky.", "Close! Here's the trick:", "Good try. Now you'll own it next time.", "Almost! Quick look at why:", "That's how we learn. Here's the key:"];
  var B = null, S = null, view = "home", sess = null, timerId = null, opts = {pace: "hspt"};

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); }
  function plain(h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent; }
  function todayIso(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(iso, n) { var p = iso.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return todayIso(d); }
  function fmtDate(iso) { if (!iso) return ""; var p = iso.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1] + " " + (+p[2]); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function byId(id) { return B._idx[id]; }

  /* ---------- state ---------- */
  function fresh() { return {v: 1, created: new Date().toISOString(), xp: 0, q: {}, days: {}, sessions: [], questDone: {}, bestStreak: 0, sound: false}; }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {} return fresh(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save progress on this device"); } }

  function levelOf(xp) { var L = 1; while (xp >= 50 * (L + 1) * L) L++; return {level: L, base: 50 * L * (L - 1), next: 50 * (L + 1) * L, title: TITLES[Math.min(L - 1, TITLES.length - 1)]}; }
  function activeDay(d) { var x = S.days[d]; return !!x && (x.answered >= 5 || S.questDone[d]); }
  function streak() {
    var t = todayIso(), n = 0, d = activeDay(t) ? t : addDays(t, -1);
    while (activeDay(d)) { n++; d = addDays(d, -1); }
    return {n: n, today: activeDay(t)};
  }
  function mastery(area) {
    var qs = B.questions.filter(function (q) { return q.area === area; }), sum = 0, solid = 0, seen = 0;
    qs.forEach(function (q) { var r = S.q[q.id]; if (!r) return; seen++; if (r.right && r.last) { sum += 1; solid++; } else if (r.right) sum += 0.5; });
    return {pct: qs.length ? Math.round(100 * sum / qs.length) : 0, solid: solid, seen: seen, total: qs.length};
  }
  function dueList() { var t = todayIso(); return Object.keys(S.q).filter(function (id) { var r = S.q[id]; return r.box > 0 && r.due <= t && byId(id); }); }
  function inReplay() { return Object.keys(S.q).filter(function (id) { return S.q[id].box > 0 && byId(id); }); }

  /* ---------- grading ---------- */
  var UNIT = /\s*(square inches|square feet|square units|sq\.? ?(?:in|ft|cm|m)|inches|inch|feet|foot|ft|cm²|cm2|cm|mm|m²|km|meters|meter|miles|mile|mph|minutes|minute|min|hours|hour|seconds|cups|cup|students|pencils|balls|degrees|°|in)\.?$/;
  function numericValue(s) {
    var t = String(s).toLowerCase().replace(/,/g, "").replace(/−|–/g, "-").trim();
    t = t.replace(/^[a-z]\s*=\s*/, "").replace(/\$/g, "").replace(/%/g, "").trim().replace(UNIT, "").trim();
    var m = t.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (m) return +m[3] ? (+m[1]) + (+m[1] >= 0 ? 1 : -1) * (+m[2]) / (+m[3]) : null;
    m = t.match(/^(-?\d+)\/(\d+)$/);
    if (m) return +m[2] ? (+m[1]) / (+m[2]) : null;
    if (/^-?\d+(\.\d+)?$|^-?\.\d+$/.test(t)) return parseFloat(t);
    return null;
  }
  function gradeInput(q, given) { var v = numericValue(given); return v != null && Math.abs(v - q.answer_value) < 1e-6; }

  /* ---------- sessions ---------- */
  function pool(area) { return B.questions.filter(function (q) { return !area || q.area === area; }); }
  function priority(q) { var r = S.q[q.id]; if (!r) return 1; if (r.box > 0 && r.due <= todayIso()) return 0; if (!r.last) return 2; if (r.right / (r.right + r.wrong) < 0.8) return 3; return 4; }
  function choose(list, n, r) {
    var groups = [[], [], [], [], []];
    shuffle(list, r).forEach(function (q) { groups[priority(q)].push(q); });
    return [].concat.apply([], groups).slice(0, n);
  }
  function startSession(mode, area) {
    var qs, r = rng(hashStr(todayIso() + mode + (area || "") + (mode === "quest" ? "" : Date.now())));
    if (mode === "quest") {
      qs = [];
      AREAS.forEach(function (a) { qs = qs.concat(choose(pool(a), 2, r)); });
      if (qs.length < 10) qs = qs.concat(choose(pool().filter(function (q) { return qs.indexOf(q) < 0; }), 10 - qs.length, r));
      qs = shuffle(qs, r);
    } else if (mode === "replay") {
      var due = dueList().map(byId);
      qs = shuffle(due, r).slice(0, 10);
    } else {
      qs = choose(pool(area), 10, r);
    }
    if (!qs.length) { toast("Nothing to practice here yet"); return; }
    sess = {id: "s" + Date.now().toString(36), mode: mode, area: area || null, qids: qs.map(function (q) { return q.id; }), i: 0, results: [], combo: 0, xp: 0,
            started: new Date().toISOString(), lvlBefore: levelOf(S.xp).level, t0: Date.now()};
    if (mode === "sprint") {
      var secs = 0;
      qs.forEach(function (q) { secs += AREA[q.area].pace * (opts.pace === "warm" ? 1.5 : 1) + (q.type === "mc" ? 0 : 8); });
      sess.limit = Math.round(secs); sess.deadline = Date.now() + sess.limit * 1000; sess.pace = opts.pace;
    }
    view = "quiz"; render();
  }

  function record(q, given, ok) {
    var t = todayIso(), r = S.q[q.id] || (S.q[q.id] = {seen: 0, right: 0, wrong: 0, last: null, box: 0, due: null});
    r.seen++; r.last = ok; r.lastAt = new Date().toISOString();
    if (ok) {
      r.right++;
      if (r.box > 0) { r.box++; if (r.box > 4) { r.box = 0; r.due = null; } else r.due = addDays(t, [0, 1, 3, 7][r.box - 1]); }
    } else { r.wrong++; r.box = 1; r.due = t; }
    var d = S.days[t] || (S.days[t] = {answered: 0, correct: 0});
    d.answered++; if (ok) d.correct++;
    var gain = ok ? (q.type === "mc" ? 10 : 12) + Math.min(10, 2 * sess.combo) + (sess.mode === "replay" ? 2 : 0) : 2;
    sess.combo = ok ? sess.combo + 1 : 0;
    sess.xp += gain; S.xp += gain;
    sess.results.push({qid: q.id, day: q.day, num: q.num, area: q.area, type: q.type, given: given, correct: ok, ms: Date.now() - (sess.qStart || Date.now())});
    var st = streak(); if (st.n > S.bestStreak) S.bestStreak = st.n;
    save();
    return gain;
  }

  function finish(timeUp) {
    clearInterval(timerId); timerId = null;
    var t = todayIso(), correct = sess.results.filter(function (x) { return x.correct; }).length, total = sess.qids.length;
    for (var i = sess.results.length; i < total; i++) { var q = byId(sess.qids[i]); sess.results.push({qid: q.id, day: q.day, num: q.num, area: q.area, type: q.type, given: null, correct: null, ms: 0}); }
    var bonus = sess.results.some(function (x) { return x.correct !== null; }) ? 20 : 0;
    if (sess.mode === "quest" && !S.questDone[t]) { bonus += 30; S.questDone[t] = true; }
    if (correct === total) bonus += 25;
    sess.xp += bonus; S.xp += bonus; sess.bonus = bonus;
    sess.ended = new Date().toISOString(); sess.timeUp = !!timeUp;
    S.sessions.push({id: sess.id, mode: sess.mode, area: sess.area, started_at: sess.started, ended_at: sess.ended, total: total,
                     answered: sess.results.filter(function (x) { return x.correct !== null; }).length, correct: correct, xp: sess.xp,
                     time_limit_s: sess.limit || null, pace: sess.pace || null, time_up: !!timeUp, items: sess.results});
    var st = streak(); if (st.n > S.bestStreak) S.bestStreak = st.n;
    save(); view = "results"; render();
    if (correct / Math.max(1, total) >= 0.7) burst(innerWidth / 2, innerHeight / 3, 140);
  }

  /* ---------- views ---------- */
  function topbar() {
    var lv = levelOf(S.xp), st = streak();
    return '<div class="bar"><button class="logo" data-go="home" aria-label="Home"><span class="gem">🧭</span><b>HSPT</b> <span class="word">Quest</span></button>' +
      '<div class="pills"><span class="pill flame' + (st.today ? "" : " off") + '" title="' + (st.today ? "Streak alive today!" : "Practice 5 questions today to keep it going") + '">🔥 ' + st.n + '</span>' +
      '<span class="pill">⚡ ' + S.xp + ' XP</span><span class="pill lvl">Lv ' + lv.level + "</span></div></div>";
  }
  function daysToTest() { var p = B.test_day.split("-"); return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - new Date(new Date().toDateString())) / 86400000); }

  function home() {
    var lv = levelOf(S.xp), frac = (S.xp - lv.base) / (lv.next - lv.base), C = 2 * Math.PI * 50, st = streak(), n = daysToTest();
    var answered = 0, right = 0; Object.keys(S.q).forEach(function (k) { answered += S.q[k].seen; right += S.q[k].right; });
    var due = dueList().length, waiting = inReplay().length, qd = S.questDone[todayIso()];
    var hero = '<div class="card hero"><div class="ring"><svg width="118" height="118" viewBox="0 0 118 118"><circle cx="59" cy="59" r="50" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="10"/>' +
      '<circle cx="59" cy="59" r="50" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (C * frac) + " " + C + '"/><defs><linearGradient id="g"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>' +
      '<div class="in"><div class="n">' + lv.level + '</div><div class="t">level</div></div></div>' +
      '<div style="flex:1;min-width:0;z-index:1"><div class="hello">Hey Char 👋</div><span class="title-chip">⭐ ' + esc(lv.title) + '</span>' +
      '<div class="xpbar"><i style="width:' + Math.round(100 * frac) + '%"></i></div><div class="sub">' + (lv.next - S.xp) + " XP to Level " + (lv.level + 1) + " · 🔥 " + st.n + "-day streak" + (st.today ? " ✓" : "") + "</div></div>" +
      (n >= 0 ? '<div class="count"><div class="n">' + n + '</div><div class="t">days to <br>HSPT</div></div>' : "") + "</div>";
    var modes = '<div class="modes">' +
      '<button class="mode quest' + (qd ? " done" : "") + '" data-start="quest"><span class="tag">' + (qd ? "✓ done today" : "+30 XP") + '</span><div class="ic">🗺️</div><div class="nm">Daily Quest</div><div class="ds">10 mixed questions, 2 from every area</div></button>' +
      '<button class="mode" data-go="pick-drill"><div class="ic">🎯</div><div class="nm">Area Drills</div><div class="ds">Pick one area and level it up</div></button>' +
      '<button class="mode sprint" data-go="pick-sprint"><span class="tag">⏱️ HSPT pace</span><div class="ic">⚡</div><div class="nm">Timed Sprint</div><div class="ds">Beat the clock at real test speed</div></button>' +
      '<button class="mode replay" data-start="replay"' + (due ? "" : ' data-empty="1"') + '><span class="tag">' + (due ? due + " ready" : waiting ? waiting + " waiting" : "all clear") + '</span><div class="ic">🔁</div><div class="nm">Mistake Replay</div><div class="ds">Misses come back until they stick</div></button></div>';
    var mast = '<div class="card"><h3>📊 Area mastery <span class="r">' + B.questions.length + " questions from Path</span></h3><div class=\"mastery\">" + AREAS.map(function (a) {
      var m = mastery(a);
      return '<div class="mrow"><span class="e">' + AREA[a].e + '</span><div><div class="nm">' + a + "<span>" + m.solid + "/" + m.total + ' solid</span></div><div class="mtrack"><i style="width:' + m.pct + "%;background:" + AREA[a].c + '"></i></div></div><span class="pct">' + m.pct + "%</span></div>";
    }).join("") + "</div></div>";
    var stats = '<div class="card"><h3>🏅 Your stats</h3><div class="stats"><div class="stat"><div class="n">' + answered + '</div><div class="t">answered</div></div><div class="stat"><div class="n">' +
      (answered ? Math.round(100 * right / answered) + "%" : "–") + '</div><div class="t">accuracy</div></div><div class="stat"><div class="n">' + S.bestStreak + '</div><div class="t">best streak</div></div></div></div>';
    var recent = S.sessions.slice(-4).reverse();
    var rec = '<div class="card"><h3>🕒 Recent</h3>' + (recent.length ? '<ul class="recent">' + recent.map(function (s) {
      return "<li>" + modeIcon(s.mode) + " " + esc(modeName(s.mode)) + (s.area ? " · " + esc(s.area) : "") + ' <span class="sub" style="margin:0">' + fmtDate(s.ended_at.slice(0, 10)) + '</span><span class="sc">' + s.correct + "/" + s.total + "</span></li>";
    }).join("") + "</ul>" : '<div class="empty">No sessions yet. Start with today\'s Daily Quest! 🗺️</div>') + "</div>";
    var tools = '<div class="card"><h3>💾 Progress</h3><div class="tools"><button class="btn primary" id="export">⬇️ Export my progress</button><button class="btn" id="import">⬆️ Import</button><button class="btn ghost small" id="reset">Reset</button></div>' +
      '<div class="note">Progress is saved on this device only. Export makes a JSON file that Path or a parent can read later (scores per session and question, with the source sheet and day).</div></div>';
    return topbar() + '<div class="grid"><div>' + hero + modes + "</div><div style=\"display:flex;flex-direction:column;gap:16px\">" + mast + stats + "</div></div>" +
      '<div class="grid" style="margin-top:16px">' + rec + tools + "</div>" + footer();
  }
  function footer() { return '<div class="footer">Built from Path\'s ' + B.sheets.length + " practice sheets (Day 1–" + B.sheets[B.sheets.length - 1].day + ") · " + B.questions.length + " questions · runs on this device · nothing is sent anywhere</div>"; }
  function modeName(m) { return {quest: "Daily Quest", drill: "Area Drill", sprint: "Timed Sprint", replay: "Mistake Replay"}[m] || m; }
  function modeIcon(m) { return {quest: "🗺️", drill: "🎯", sprint: "⚡", replay: "🔁"}[m] || "⭐"; }

  function picker(kind) {
    var paceSeg = kind === "sprint" ? '<div style="margin:6px 0 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div class="seg"><button data-pace="hspt" class="' + (opts.pace === "hspt" ? "on" : "") + '">⏱️ HSPT pace</button><button data-pace="warm" class="' + (opts.pace === "warm" ? "on" : "") + '">🌱 Warm-up (1.5×)</button></div><span class="sub" style="margin:0">Real HSPT: Verbal 16s · Quant 35s · Reading 24s · Math 42s · Language 25s per question</span></div>' : "";
    return topbar() + '<div class="card"><h3>' + (kind === "sprint" ? "⚡ Timed Sprint: pick an area" : "🎯 Area Drills: pick an area") + '</h3>' + paceSeg + '<div class="pick">' + AREAS.map(function (a) {
      var m = mastery(a), extra = kind === "sprint" ? AREA[a].pace + "s per question" : m.total + " questions";
      return '<button class="areabtn" data-start="' + kind + '" data-area="' + a + '"><div class="e">' + AREA[a].e + '</div><div class="nm">' + a + '</div><div class="ds">' + esc(AREA[a].ds) + "<br>" + extra + '</div><div class="mini"><i style="width:' + m.pct + "%;background:" + AREA[a].c + '"></i></div></button>';
    }).join("") + '</div><div style="margin-top:16px"><button class="btn" data-go="home">← Back</button></div></div>' + footer();
  }

  function quiz() {
    var q = byId(sess.qids[sess.i]), A = AREA[q.area], letters = "abcde";
    sess.qStart = Date.now(); sess.answered = false;
    var prog = '<div class="qprog">' + sess.qids.map(function (id, i) {
      var r = sess.results[i]; return '<i class="' + (r ? (r.correct ? "ok" : "no") : i === sess.i ? "cur" : "") + '"></i>';
    }).join("") + "</div>";
    var src = "Path · Day " + q.day + (q.date ? " (" + fmtDate(q.date) + (q.date_inferred ? "?" : "") + ")" : "") + " · Q" + q.num;
    var body;
    if (q.type === "mc") {
      var longc = q.choices.some(function (c) { return plain(c).length > 34; });
      body = '<div class="choices' + (longc ? " long" : "") + '">' + q.choices.map(function (c, i) {
        return '<button class="choice" data-letter="' + letters[i] + '" data-i="' + i + '"><span class="k">' + letters[i].toUpperCase() + "</span><span>" + c + "</span></button>";
      }).join("") + "</div>";
    } else if (q.type === "input") {
      body = '<form class="typein" id="typein" autocomplete="off"><input id="ans" inputmode="text" placeholder="Type your answer" aria-label="Your answer" enterkeyhint="done"><button class="btn primary" id="check" type="submit">Check</button></form>' +
        '<div class="hint">Numbers, fractions (7/8), decimals, $ and % all work. Units are optional.</div>';
    } else {
      body = '<div class="sub" style="margin-bottom:10px">Say or write your answer, then check it against Path\'s key.</div><button class="btn primary" id="reveal">👀 Show the answer</button>';
    }
    var timer = sess.limit ? '<div class="timer" id="timer"><i style="width:100%"></i></div>' : "";
    return topbar() + '<div class="quiz"><div class="qtop"><button class="btn small ghost" id="quit" aria-label="Quit">✕</button>' + prog +
      '<span class="pill">' + (sess.i + 1) + "/" + sess.qids.length + "</span>" + (sess.limit ? '<span class="pill" id="clock">⏱️</span>' : "") + "</div>" + timer +
      '<div class="card qcard" data-qid="' + q.id + '" data-type="' + q.type + '" data-day="' + q.day + '" data-num="' + q.num + '">' +
      '<div class="qmeta"><span class="chip" style="background:' + A.hex + '33;color:' + A.hex + '">' + A.e + " " + q.area + (q.skill ? " · " + esc(q.skill) : "") + '</span><span class="chip src">' + esc(src) + "</span>" +
      (sess.mode === "replay" ? '<span class="chip">🔁 replay</span>' : "") + "</div>" +
      (q.instruction ? '<div class="instr">' + q.instruction + "</div>" : "") + (q.passage ? '<div class="passage">' + q.passage + "</div>" : "") +
      '<div class="stem">' + q.stem + "</div>" + body + '<div class="fb" id="fb" aria-live="polite"></div>' +
      '<div class="qnav"><span class="sub" style="margin:0">' + (sess.combo >= 2 ? "🔥 " + sess.combo + " in a row" : "") + '</span><button class="btn primary" id="next" style="display:none">' + (sess.i + 1 < sess.qids.length ? "Next →" : "Finish 🏁") + "</button></div></div></div>";
  }

  function answer(given, ok, el) {
    if (sess.answered) return; sess.answered = true;
    var q = byId(sess.qids[sess.i]), gain = record(q, given, ok), fb = $("#fb");
    if (q.type === "mc") {
      document.querySelectorAll(".choice").forEach(function (b) { b.disabled = true; if (+b.dataset.i === q.answer) b.classList.add("right"); });
      if (!ok && el) el.classList.add("wrong");
    }
    if (q.type === "input") { $("#ans").disabled = true; $("#check").disabled = true; $("#ans").classList.add(ok ? "right" : "wrong"); }
    var expl = q.explanation ? '<div class="why">💡 ' + q.explanation + "</div>" : "";
    var key = q.type === "mc" ? "abcde"[q.answer].toUpperCase() + ") " + q.answer_text : q.answer_text;
    if (ok) {
      fb.className = "fb show good";
      fb.innerHTML = '<div class="big">' + (sess.combo >= 3 ? pick(COMBO) : pick(CHEERS)) + "</div>" + (q.type !== "mc" ? '<div class="why">Path\'s key: <b>' + key + "</b></div>" : "") + expl;
      var r = (el || fb).getBoundingClientRect(); burst(r.left + r.width / 2, r.top + 20, 40); floatXp("+" + gain + " XP", r.left + r.width / 2, r.top);
      chime(true);
    } else {
      fb.className = "fb show soft";
      fb.innerHTML = '<div class="big">' + pick(SOFT) + '</div><div class="why">Answer: <b>' + key + "</b></div>" + expl + '<div class="why" style="color:var(--muted)">🔁 Saved to Mistake Replay. It comes back until it sticks. (+' + gain + " XP for trying)</div>";
    }
    var nx = $("#next");
    if (sess.limit) { setTimeout(next, ok ? 650 : 1400); }
    else { nx.style.display = ""; nx.focus(); }
    $("#topbar-xp") && ($("#topbar-xp").textContent = S.xp);
  }
  function next() { if (view !== "quiz") return; if (sess.i + 1 >= sess.qids.length) return finish(false); sess.i++; render(); }

  function results() {
    var total = sess.qids.length, correct = sess.results.filter(function (x) { return x.correct; }).length, pct = correct / total, lv = levelOf(S.xp);
    var msg = pct === 1 ? "Perfect run! 🏆" : pct >= 0.8 ? "Awesome work! 🌟" : pct >= 0.6 ? "Solid session! 💪" : pct > 0 ? "Every rep counts. Nice work! 🌱" : "You showed up, and that's the first win 💜";
    var misses = sess.results.filter(function (x) { return x.correct === false; }).length;
    var rv = sess.results.map(function (x) {
      var q = byId(x.qid), key = q.type === "mc" ? "abcde"[q.answer].toUpperCase() + ") " + plain(q.answer_text) : plain(q.answer_text);
      var given = x.given == null ? "not reached" : q.type === "mc" ? String(x.given).toUpperCase() + ") " + plain(q.choices["abcde".indexOf(x.given)] || "") : q.type === "self" ? (x.correct ? "got it" : "not yet") : x.given;
      return '<li class="' + (x.correct === null ? "skip" : x.correct ? "ok" : "no") + '"><span class="m">' + (x.correct === null ? "–" : x.correct ? "✓" : "↺") + "</span><span>" + esc(plain(q.stem).slice(0, 110)) +
        '<span class="a">' + (x.correct ? "" : "You: " + esc(given) + " · ") + "Key: " + esc(key) + (x.correct === false && q.explanation ? " · " + esc(plain(q.explanation)) : "") + " · Day " + q.day + "</span></span></li>";
    }).join("");
    return topbar() + '<div class="res card" data-correct="' + correct + '" data-total="' + total + '" data-xp="' + sess.xp + '"><div class="sub">' + modeIcon(sess.mode) + " " + modeName(sess.mode) + (sess.area ? " · " + esc(sess.area) : "") + (sess.timeUp ? " · ⏱️ time!" : "") + "</div>" +
      '<div class="big">' + correct + "/" + total + '</div><div class="msg">' + msg + '</div><div class="row"><span class="pill">⚡ +' + sess.xp + " XP" + (sess.bonus ? " (incl. +" + sess.bonus + " bonus)" : "") + '</span><span class="pill">🔥 ' + streak().n + "-day streak</span>" +
      (misses ? '<span class="pill">🔁 ' + misses + " to replay</span>" : "") + "</div>" +
      (lv.level > sess.lvlBefore ? '<div class="lvlup">🎉 Level up! You\'re now Level ' + lv.level + ": " + esc(lv.title) + "</div>" : "") +
      '<div class="row">' + (misses ? '<button class="btn primary" data-start="replay">🔁 Replay misses now</button>' : "") + '<button class="btn" data-go="home">🏠 Home</button></div>' +
      '<ul class="review">' + rv + "</ul></div>" + footer();
  }

  var lastView = null;
  function render() {
    clearInterval(timerId); timerId = null;
    if (view !== lastView) { parts = []; if (cx) cx.clearRect(0, 0, cv.width, cv.height); lastView = view; }
    var html = view === "home" ? home() : view === "pick-drill" ? picker("drill") : view === "pick-sprint" ? picker("sprint") : view === "quiz" ? quiz() : results();
    $("#app").innerHTML = html; window.scrollTo(0, 0);
    if (view === "quiz") bindQuiz();
    if (view === "home") bindHome();
    if (view === "results" && sess.lvlBefore < levelOf(S.xp).level) setTimeout(function () { burst(innerWidth / 2, innerHeight / 2, 200); }, 300);
  }
  function bindQuiz() {
    var q = byId(sess.qids[sess.i]);
    document.querySelectorAll(".choice").forEach(function (b) { b.onclick = function () { answer(b.dataset.letter, +b.dataset.i === q.answer, b); }; });
    var f = $("#typein");
    if (f) { f.onsubmit = function (e) { e.preventDefault(); var v = $("#ans").value.trim(); if (!v) { toast("Type an answer first ✍️"); return; } answer(v, gradeInput(q, v)); }; setTimeout(function () { $("#ans") && $("#ans").focus(); }, 50); }
    var rv = $("#reveal");
    if (rv) rv.onclick = function () {
      var fb = $("#fb"); fb.className = "fb show"; fb.style.border = "1px solid var(--line)";
      fb.innerHTML = '<div class="why">Path\'s key: <b>' + q.answer_text + "</b></div>" + (q.explanation ? '<div class="why">💡 ' + q.explanation + "</div>" : "") +
        '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn good" id="gotit">✅ I got it</button><button class="btn" id="notyet">🔁 Not yet</button></div>';
      rv.style.display = "none";
      $("#gotit").onclick = function () { answer("self:got-it", true, $("#gotit")); };
      $("#notyet").onclick = function () { answer("self:not-yet", false, $("#notyet")); };
    };
    $("#next").onclick = next;
    $("#quit").onclick = function () { if (sess.results.length === 0 || confirm("Leave this session? Answers so far are saved.")) { if (sess.results.length) finish(false); else { view = "home"; render(); } } };
    if (sess.limit) {
      var tick = function () {
        var left = Math.max(0, sess.deadline - Date.now()), s = Math.ceil(left / 1000);
        var c = $("#clock"); if (c) c.textContent = "⏱️ " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
        var t = $("#timer"); if (t) { t.firstChild.style.width = (100 * left / (sess.limit * 1000)) + "%"; t.classList.toggle("low", left < 15000); }
        if (left <= 0) finish(true);
      };
      tick(); timerId = setInterval(tick, 500);
    }
  }
  function bindHome() {
    $("#export").onclick = exportFile; $("#import").onclick = importDialog;
    $("#reset").onclick = function () { if (confirm("Reset all progress on this device? Export first if you want to keep it.")) { S = fresh(); save(); render(); toast("Fresh start ✨"); } };
  }
  document.addEventListener("click", function (e) {
    var g = e.target.closest && e.target.closest("[data-go]"), s = e.target.closest && e.target.closest("[data-start]"), p = e.target.closest && e.target.closest("[data-pace]");
    if (p) { opts.pace = p.dataset.pace; render(); return; }
    if (g) { view = g.dataset.go; render(); return; }
    if (s) {
      if (s.dataset.start === "replay" && !dueList().length) {
        var w = inReplay().length; toast(w ? "🔁 " + w + " misses are resting. They'll be back on schedule!" : "No misses to replay. Nice! 🌈"); return;
      }
      startSession(s.dataset.start, s.dataset.area);
    }
  });
  document.addEventListener("keydown", function (e) {
    if (view !== "quiz" || (e.target && e.target.tagName === "INPUT")) { if (view === "quiz" && e.key === "Enter" && sess.answered && !sess.limit) next(); return; }
    var k = e.key.toLowerCase(), idx = "abcde".indexOf(k); if (idx < 0 && /^[1-5]$/.test(k)) idx = +k - 1;
    if (idx >= 0 && !sess.answered) { var b = document.querySelectorAll(".choice")[idx]; if (b) b.click(); }
    if (e.key === "Enter" && sess.answered && !sess.limit) next();
  });

  /* ---------- export / import ---------- */
  function exportData() {
    var by = {};
    AREAS.forEach(function (a) { var m = mastery(a); by[a] = {answered: 0, correct: 0, mastery_pct: m.pct, solid: m.solid, questions: m.total}; });
    Object.keys(S.q).forEach(function (id) { var q = byId(id); if (!q) return; by[q.area].answered += S.q[id].seen; by[q.area].correct += S.q[id].right; });
    var lv = levelOf(S.xp), tot = 0, cor = 0; AREAS.forEach(function (a) { tot += by[a].answered; cor += by[a].correct; });
    return {app: "HSPT Quest", format: 1, student: "Charlotte", exported_at: new Date().toISOString(), test_day: B.test_day,
      bank: {built_at: B.built_at, questions: B.questions.length, sheets: B.sheets.length},
      summary: {xp: S.xp, level: lv.level, title: lv.title, streak_days: streak().n, best_streak: S.bestStreak, answered: tot, correct: cor,
                accuracy_pct: tot ? Math.round(100 * cor / tot) : null, by_area: by, replay_waiting: inReplay().length, daily_quests_done: Object.keys(S.questDone).sort()},
      days: S.days, sessions: S.sessions, questions: S.q, _state: S};
  }
  function exportFile() {
    var data = JSON.stringify(exportData(), null, 1), name = "hspt-quest-progress-" + todayIso() + ".json";
    try {
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], {type: "application/json"})); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast("⬇️ Saved " + name);
    } catch (e) { toast("Couldn't download. Copy it from Import → it shows your data"); }
  }
  function importDialog() {
    var d = document.createElement("dialog");
    d.innerHTML = '<h3 style="margin-top:0">⬆️ Import progress</h3><p class="sub">Pick a file exported from HSPT Quest, or paste its JSON. This replaces the progress on this device.</p>' +
      '<input type="file" accept="application/json,.json" id="impf"><textarea id="impt" placeholder="…or paste JSON here"></textarea>' +
      '<div style="display:flex;gap:10px;margin-top:10px;justify-content:flex-end"><button class="btn" id="impc">Cancel</button><button class="btn primary" id="impo">Import</button></div>';
    document.body.appendChild(d); d.showModal();
    $("#impf", d).onchange = function (e) { var f = e.target.files[0]; if (!f) return; f.text().then(function (t) { $("#impt", d).value = t; }); };
    $("#impc", d).onclick = function () { d.close(); d.remove(); };
    $("#impo", d).onclick = function () {
      try { var j = JSON.parse($("#impt", d).value); if (j.app !== "HSPT Quest" || !j._state || j._state.v !== 1) throw new Error("not an HSPT Quest export"); S = j._state; save(); d.close(); d.remove(); view = "home"; render(); toast("Progress imported ✅"); }
      catch (err) { toast("Hmm, that file didn't work: " + err.message); }
    };
  }

  /* ---------- fx ---------- */
  var cv = $("#fx"), cx = cv.getContext("2d"), parts = [], raf = null;
  function burst(x, y, n) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cv.width = innerWidth; cv.height = innerHeight;
    var cols = ["#ff5d8f", "#ffb020", "#3ec5ff", "#4ade80", "#a78bfa", "#ffd166", "#ffffff"];
    for (var i = 0; i < n; i++) parts.push({x: x, y: y, vx: (Math.random() - .5) * 11, vy: -Math.random() * 10 - 2, r: Math.random() * 5 + 2.5, c: cols[i % cols.length], a: Math.random() * 6, life: 0});
    if (!raf) tick();
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(function (p) { return p.life < 90; });
    parts.forEach(function (p) { p.life++; p.vy += .32; p.x += p.vx; p.y += p.vy; p.a += .2; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.globalAlpha = 1 - p.life / 90; cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); });
    raf = parts.length ? requestAnimationFrame(tick) : null;
    if (!raf) cx.clearRect(0, 0, cv.width, cv.height);
  }
  function floatXp(t, x, y) { var d = document.createElement("div"); d.className = "xpfloat"; d.textContent = t; d.style.left = (x - 40) + "px"; d.style.top = (y - 10) + "px"; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 1200); }
  var tt = null;
  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("show"); }, 2800); }
  var actx = null;
  function chime(ok) {
    if (!S.sound) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = ok ? 880 : 330; g.gain.value = .05; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .25); o.stop(actx.currentTime + .26); } catch (e) {}
  }

  /* ---------- boot ---------- */
  function boot(bank) {
    B = bank; B._idx = {}; B.questions.forEach(function (q) { B._idx[q.id] = q; });
    S = load(); render();
  }
  window.HQ = {exportData: function () { return exportData(); }, get state() { return S; }, get bank() { return B; }, numericValue: numericValue};
  if (window.__BANK__) boot(window.__BANK__);
  else fetch("bank.json", {cache: "no-store"}).then(function (r) { return r.json(); }).then(boot).catch(function (e) { $("#app").innerHTML = '<div class="boot">Couldn\'t load the question bank (' + esc(e.message) + ").</div>"; });
})();
