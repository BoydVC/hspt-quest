/* HSPT Quest: 12-day sprint UI. Progress stays in this browser (localStorage). Nothing is sent anywhere. */
(function () {
  var S = window.Sched, KEY = "hspt-sprint-v1", B, ST, run = null, timerId = null;
  var qs = new URLSearchParams(location.search);
  function today() { if (qs.get("today")) return qs.get("today"); var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); }
  function fmtDate(iso) { var p = iso.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1] + " " + (+p[2]); }
  function dow(iso) { var p = iso.split("-"); return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function load() { try { var x = JSON.parse(localStorage.getItem(KEY)); if (x && x.v === 1) return x; } catch (e) {} return {v: 1, name: "Alex", q: {}, sessions: [], done: {}}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  function bar(p, cls) { return '<div class="bar ' + (cls || "") + '"><i style="width:' + Math.round(p * 100) + '%"></i></div>'; }
  function view(html) { stopTimer(); $("#app").innerHTML = html; window.scrollTo(0, 0); }
  function nav(active) {
    var t = [["home", "🏠 Today"], ["plan", "🗓️ Plan"], ["dash", "📊 Weak spots"], ["mock", "⏱️ Mock exam"], ["sheet", "🖨️ Answer sheet"]];
    return '<nav class="nav">' + t.map(function (x) { return '<a href="#' + x[0] + '" class="' + (x[0] === active ? "on" : "") + '">' + x[1] + "</a>"; }).join("") + "</nav>";
  }
  function head() {
    var left = S.daysLeft(today());
    return '<header class="top"><div class="brand">HSPT Quest <span>12-day sprint</span></div><div class="count" data-days-left="' + left + '"><b>' + (left > 0 ? left : 0) + "</b> " + (left === 1 ? "day" : "days") + " to the HSPT · Tue Nov 17</div>" +
      '<div class="who">Student: <b class="sname">' + esc(ST.name) + "</b></div></header>";
  }
  function todayPlan() { var i = S.dayIndex(today()), p = S.plan(); return i >= 0 && i < p.length ? p[i] : null; }
  function resolveSets(d) {
    if (!d) return [];
    if (d.kind === "weakest") return S.weakestSections(ST.q, B.items, 2).map(function (s) { return S.miniSet(s); });
    return d.sets;
  }

  function home() {
    var d = todayPlan(), dueN = S.due(ST.q, today()).length, acc = S.sectionAcc(ST.q, B.items);
    var card;
    if (!d) card = S.daysLeft(today()) <= 0 ? '<div class="card hero"><h2>Test day 🎯</h2><p>Sleep, breakfast, two #2 pencils. Answer every question: there is no guessing penalty.</p></div>'
      : '<div class="card hero"><h2>Sprint starts Thu Nov 5</h2><p>Warm up with a review set or browse the plan.</p></div>';
    else {
      var sets = resolveSets(d);
      card = '<div class="card hero"><div class="kicker">Day ' + d.day + " of 12 · " + dow(d.date) + " " + fmtDate(d.date) + (ST.done[d.date] ? ' · <span class="ok">✔ done</span>' : "") + '</div><h2>' + esc(d.kind === "weakest" ? "Weak-spot day: " + sets.map(function (s) { return s.section; }).join(" + ") : d.title) + "</h2>" +
        (d.mock ? '<p>Real HSPT timing, one section after another. Find a quiet table and a clock.</p><button class="btn big" data-mock="' + d.mock.join(",") + '">Start ' + (d.kind === "full-mock" ? "full" : "half") + " mock</button>"
          : d.kind === "light" ? '<p>Only the questions you missed. Then pack your bag and sleep early.</p>'
          : '<div class="sets">' + sets.map(function (s) { var sec = S.SEC[s.section]; return '<button class="btn set" data-set="' + s.section + '" data-n="' + s.n + '"><span class="ico">' + sec.icon + "</span><b>" + s.section + "</b><small>" + s.n + " questions · " + mmss(s.seconds) + " (real pace " + Math.round(sec.secPerItem) + "s each)</small></button>"; }).join("") + "</div>") + "</div>";
    }
    var rev = '<div class="card"><h3>🔁 Spaced review</h3><p><b class="due-n">' + dueN + "</b> missed " + (dueN === 1 ? "question is" : "questions are") + " due today. Misses come back after 1, 2, then 4 days until you get them right three times.</p>" +
      '<button class="btn" data-review="1"' + (dueN ? "" : " disabled") + ">Review due questions</button></div>";
    var secs = '<div class="card"><h3>Sections</h3><div class="secgrid">' + S.SECTIONS.map(function (s) { var a = acc[s.name]; return '<div class="sec"><div><span class="ico">' + s.icon + "</span> <b>" + s.name + '</b><small>' + s.items + " q · " + s.minutes + " min on the real test</small></div>" + bar(a.tries ? a.right / a.tries : 0) + "<small>" + (a.tries ? Math.round(100 * a.right / a.tries) + "% of " + a.tries : "not started") + '</small><button class="btn ghost" data-set="' + s.name + '" data-n="0">Practice set</button></div>'; }).join("") + "</div></div>";
    view(head() + nav("home") + card + rev + secs + foot());
  }
  function foot() { return '<footer class="foot">' + B.total + " original practice questions (" + S.SECTIONS.map(function (s) { return s.name + " " + B.counts[s.name]; }).join(", ") + ") · runs on this device · nothing is sent anywhere</footer>"; }

  function planView() {
    var t = today();
    view(head() + nav("plan") + '<div class="card"><h3>🗓️ The 12-day plan</h3><p>Each study day is two mini-sets: a quarter of a real section at the real per-question pace. Day 6 is a half mock, Day 9 a full 141-minute mock, Days 10–11 go after your two weakest sections, and Day 12 is light.</p><ol class="plan">' +
      S.plan().map(function (d) { var sets = resolveSets(d); return '<li class="pday ' + d.kind + (d.date === t ? " today" : "") + (ST.done[d.date] ? " done" : "") + '"><div class="pdate"><b>' + dow(d.date) + "</b> " + fmtDate(d.date) + '</div><div class="ptitle">' + esc(d.kind === "weakest" ? "Weak spots: " + sets.map(function (s) { return s.section; }).join(" + ") : d.title) + "</div><div class=\"pmeta\">" +
        (d.mock ? d.mock.map(function (m) { return S.SEC[m].items + " " + m.slice(0, 5) + " / " + S.SEC[m].minutes + "m"; }).join(" · ") : sets.map(function (s) { return s.n + " " + s.section + " / " + mmss(s.seconds); }).join(" · ")) + (d.review ? " · + due review" : "") + (ST.done[d.date] ? " ✔" : "") + "</div></li>"; }).join("") +
      '<li class="pday test"><div class="pdate"><b>Tue</b> Nov 17</div><div class="ptitle">HSPT 🎯</div><div class="pmeta">298 questions · 141 minutes · no calculator · no guessing penalty</div></li></ol></div>' + foot());
  }

  function dash() {
    var w = S.weakness(ST.q, B.items), tried = w.filter(function (x) { return x.tries; });
    view(head() + nav("dash") + '<div class="card"><h3>📊 Weakness dashboard</h3><p>' + (tried.length ? "Weakest skills first. Tap one to drill it." : "Answer a few sets and your weak spots show up here.") + '</p><div class="wlist">' +
      w.map(function (x) { var p = x.acc == null ? 0 : x.acc; return '<div class="wrow' + (x.tries ? "" : " untried") + '" data-skill="' + esc(x.key) + '"><div class="wname"><small>' + x.section + "</small> " + esc(x.skill) + '</div>' + bar(p, p < .6 ? "bad" : p < .8 ? "mid" : "good") + '<div class="wnum">' + (x.tries ? Math.round(100 * p) + "% · " + x.tries : "—") + '</div><button class="btn ghost sm" data-drill="' + esc(x.key) + '">Drill</button></div>'; }).join("") + "</div></div>" + foot());
  }

  function mockIntro() {
    view(head() + nav("mock") + '<div class="card"><h3>⏱️ Full timed mock</h3><p>All five sections in the real order with the real counts and times: 298 questions, 141 minutes. Each section ends when its clock runs out. Use the printable answer sheet if you want to practice bubbling.</p><table class="fmt"><tr><th>Section</th><th>Questions</th><th>Minutes</th><th>Pace</th></tr>' +
      S.SECTIONS.map(function (s) { return "<tr><td>" + s.icon + " " + s.name + "</td><td>" + s.items + "</td><td>" + s.minutes + "</td><td>" + Math.round(s.secPerItem) + " s/q</td></tr>"; }).join("") + '<tr class="tot"><td>Total</td><td>298</td><td>141</td><td></td></tr></table><button class="btn big" data-mock="' + S.SECTIONS.map(function (s) { return s.name; }).join(",") + '">Start full mock</button> <a class="btn ghost" href="#sheet">Print answer sheet</a>' + mockHistory() + "</div>" + foot());
  }
  function mockHistory() {
    var m = ST.sessions.filter(function (s) { return s.mode === "mock"; }).slice(-5).reverse();
    return m.length ? '<h4>Past mocks</h4><ul class="hist">' + m.map(function (s) { return "<li>" + fmtDate(s.date) + ": " + s.parts.map(function (p) { return p.section.slice(0, 5) + " " + p.correct + "/" + p.total; }).join(" · ") + "</li>"; }).join("") + "</ul>" : "";
  }

  function sheet() {
    var nm = esc(ST.name);
    view('<div class="noprint">' + head() + nav("sheet") + '<div class="card"><p>Bubble sheet numbered 1–298 like the real booklet. Print it and bubble your answers on it during a full mock, the way you will on Nov 17. <button class="btn" onclick="print()">🖨️ Print</button></p></div></div>' +
      '<div class="sheet"><div class="shead"><b>HSPT Quest practice answer sheet</b><span>Name: <u>' + nm + '</u></span><span>Date: ________</span><span>Use a #2 pencil. Fill each bubble completely.</span></div>' +
      S.sheetRanges().map(function (r) { var rows = ""; for (var i = r.from; i <= r.to; i++) rows += '<div class="srow"><b>' + i + "</b>" + "ABCD".split("").map(function (c) { return '<span class="bub">' + c + "</span>"; }).join("") + "</div>"; return '<section class="ssec"><h4>' + r.section + " (" + r.from + "–" + r.to + ", " + S.SEC[r.section].minutes + ' min)</h4><div class="scols">' + rows + "</div></section>"; }).join("") + "</div>");
  }

  // ---------- runner ----------
  function startSet(section, n, opts) {
    opts = opts || {};
    var items;
    if (opts.items) items = opts.items;
    else { if (!n) n = S.miniSet(section).n; items = S.pickSet(B.items, ST.q, section, n, Date.now() % 100000, today()); }
    var secs = opts.seconds != null ? opts.seconds : Math.round(items.reduce(function (t, q) { return t + S.SEC[q.section].secPerItem; }, 0));
    run = {mode: opts.mode || "set", label: opts.label || section, items: items, i: 0, ans: {}, left: secs, total: secs, feedback: opts.mode !== "mock", queue: opts.queue || null, parts: opts.parts || []};
    showQ();
  }
  function startTimer() { stopTimer(); timerId = setInterval(function () { run.left--; var t = $("#clock"); if (t) { t.textContent = mmss(run.left); t.classList.toggle("low", run.left <= 60); } if (run.left <= 0) finish(true); }, 1000); }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }
  function showQ() {
    var q = run.items[run.i], L = "ABCD";
    var html = '<div class="runner"><div class="rtop"><span class="rlabel">' + esc(run.label) + '</span><span class="rprog">' + (run.i + 1) + " / " + run.items.length + '</span><span id="clock" class="clock">' + mmss(run.left) + '</span><button class="btn ghost sm" data-quit="1">End</button></div>' +
      '<div class="pbar"><i style="width:' + Math.round(100 * run.i / run.items.length) + '%"></i></div>' +
      (q.passage ? '<div class="passage">' + q.passage + "</div>" : "") + '<div class="qcard" data-qid="' + q.id + '"><div class="qmeta">' + q.section + " · " + esc(q.skill) + '</div><div class="stem">' + q.stem + '</div><div class="choices">' +
      q.choices.map(function (c, k) { return '<button class="choice" data-k="' + k + '"><span class="lt">' + L[k] + "</span>" + c + "</button>"; }).join("") + '</div><div id="fb"></div></div></div>';
    $("#app").innerHTML = html;
    if (!timerId) startTimer();
  }
  function answer(k) {
    var q = run.items[run.i]; if (run.ans[q.id] != null && run.feedback) return;
    run.ans[q.id] = k; var ok = k === q.answer;
    ST.q[q.id] = S.review(ST.q[q.id], ok, today()); save();
    if (!run.feedback) return next();
    document.querySelectorAll(".choice").forEach(function (b) { var j = +b.dataset.k; b.disabled = true; if (j === q.answer) b.classList.add("right"); else if (j === k) b.classList.add("wrong"); });
    $("#fb").innerHTML = '<div class="fb ' + (ok ? "good" : "bad") + '"><b>' + (ok ? "✔ Correct" : "✘ Not yet: it's " + "ABCD"[q.answer]) + "</b> " + q.explanation + (ok ? "" : " <i>This one comes back tomorrow.</i>") + '</div><button class="btn" data-next="1">' + (run.i + 1 < run.items.length ? "Next →" : "See results") + "</button>";
  }
  function next() { run.i++; if (run.i >= run.items.length) finish(false); else showQ(); }
  function finish(timeUp) {
    stopTimer();
    var sc = S.score(run.items, run.ans), part = {section: run.label, correct: sc.correct, total: sc.total, blank: sc.blank, timeUp: timeUp};
    if (run.mode === "mock") {
      run.items.forEach(function (q) { if (run.ans[q.id] == null) ST.q[q.id] = S.review(ST.q[q.id], false, today()); });
      var parts = run.parts.concat([part]);
      if (run.queue && run.queue.length) { var nx = run.queue[0]; save(); return sectionBreak(parts, run.queue, timeUp); }
      ST.sessions.push({mode: "mock", date: today(), parts: parts}); markDone(); save(); return mockResults(parts);
    }
    ST.sessions.push({mode: run.mode, date: today(), label: run.label, correct: sc.correct, total: sc.total}); markDone(); save();
    var missed = run.items.filter(function (q) { return run.ans[q.id] !== q.answer; });
    view(head() + nav("") + '<div class="card results"><h2>' + (timeUp ? "⏰ Time! " : "") + sc.correct + " / " + sc.total + "</h2><p>" + esc(run.label) + (sc.blank ? " · " + sc.blank + " left blank (always guess: no penalty)" : "") + "</p>" + bar(sc.correct / sc.total, "good") +
      (missed.length ? "<h4>Coming back in your review</h4><ul class=\"miss\">" + missed.map(function (q) { return "<li><b>" + q.id + "</b> " + esc(q.skill) + "</li>"; }).join("") + "</ul>" : "<p>Clean sweep! 🎉</p>") + '<a class="btn" href="#home">Back to today</a> <a class="btn ghost" href="#dash">Weak spots</a></div>');
  }
  function markDone() { var d = todayPlan(); if (d) ST.done[d.date] = true; }
  function startMock(names) {
    var secs = S.buildMock(B.items, names, Date.now() % 1000);
    var first = secs[0], queue = secs.slice(1);
    startSet(first.section, 0, {mode: "mock", items: first.items, seconds: first.seconds, label: first.section, queue: queue, parts: []});
  }
  function sectionBreak(parts, queue, timeUp) {
    var nx = queue[0];
    view(head() + '<div class="card"><h3>' + (timeUp ? "⏰ Time is up for " : "✔ Finished ") + esc(parts[parts.length - 1].section) + '</h3><p>Next: <b>' + nx.section + "</b>, " + nx.items.length + " questions in " + Math.round(nx.seconds / 60) + ' minutes. Stretch for a moment.</p><button class="btn big" id="nextsec">Start ' + nx.section + "</button></div>");
    $("#nextsec").onclick = function () { startSet(nx.section, 0, {mode: "mock", items: nx.items, seconds: nx.seconds, label: nx.section, queue: queue.slice(1), parts: parts}); };
  }
  function mockResults(parts) {
    var c = 0, t = 0; parts.forEach(function (p) { c += p.correct; t += p.total; });
    view(head() + nav("mock") + '<div class="card results"><h2>Mock done: ' + c + " / " + t + '</h2><table class="fmt"><tr><th>Section</th><th>Right</th><th>%</th></tr>' + parts.map(function (p) { return "<tr><td>" + p.section + "</td><td>" + p.correct + "/" + p.total + "</td><td>" + Math.round(100 * p.correct / p.total) + "%</td></tr>"; }).join("") + '</table><p>Every miss is now in your spaced review.</p><a class="btn" href="#dash">See weak spots</a></div>');
  }

  function route() {
    if (run && timerId) { stopTimer(); run = null; }
    var h = (location.hash || "#home").slice(1);
    ({home: home, plan: planView, dash: dash, mock: mockIntro, sheet: sheet}[h] || home)();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button, .wrow"); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.k != null) return answer(+d.k);
    if (d.next) return next();
    if (d.quit) return finish(false);
    if (d.set) return startSet(d.set, +d.n || 0);
    if (d.review) { var ids = S.due(ST.q, today()), items = B.items.filter(function (q) { return ids.indexOf(q.id) >= 0; }); return startSet("Review", 0, {items: items, label: "Spaced review", mode: "review"}); }
    if (d.mock) return startMock(d.mock.split(","));
    if (d.drill) { var parts = d.drill.split(" · "), its = B.items.filter(function (q) { return q.section === parts[0] && q.skill === parts[1]; }).slice(0, 10); return startSet(parts[0], 0, {items: its, label: "Drill: " + parts[1], mode: "drill"}); }
  });
  document.addEventListener("keydown", function (e) { if (!run || !$(".choice")) return; var k = "abcd".indexOf(e.key.toLowerCase()); if (k < 0) k = "1234".indexOf(e.key); if (k >= 0 && k < run.items[run.i].choices.length) answer(k); else if (e.key === "Enter" && $("[data-next]")) next(); });
  window.addEventListener("hashchange", route);
  ST = load(); if (qs.get("name")) { ST.name = qs.get("name"); save(); }
  fetch("bank.json").then(function (r) { return r.json(); }).then(function (b) { B = b; window.HS = {bank: B, state: function () { return ST; }, today: today, run: function () { return run; }}; route(); });
})();
