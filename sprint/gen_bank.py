#!/usr/bin/env python3
"""Generate the original HSPT Quest sprint bank (sprint/data/bank.json).
All items are original writing or programmatically generated; nothing is copied from any published test.
Deterministic: seeded RNG, so re-running gives the same bank."""
import json, os, random, re
from fractions import Fraction as F

R = random.Random(1117)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "sprint", "bank.json")
items = []
L = "ABCD"

def add(section, skill, stem, correct, wrong, expl, diff=2, passage=None, fixed=None):
    """correct: str; wrong: list[str]. fixed: keep this exact choice order (list) with correct inside."""
    if fixed:
        choices = list(fixed)
    else:
        choices = [correct] + list(wrong)
        R.shuffle(choices)
    it = {"section": section, "skill": skill, "stem": stem, "choices": choices,
          "answer": choices.index(correct), "explanation": expl, "difficulty": diff}
    if passage: it["passage"] = passage
    items.append(it)

def numwrong(v, k=3, spread=None):
    out, seen = [], {v}
    cands = [v + d for d in (1, -1, 2, -2, 3, 5, -3, 10, -5, 4)]
    if isinstance(v, int) and v not in (0,):
        cands += [v * 2, v // 2 if v % 2 == 0 else v + 7]
    R.shuffle(cands)
    for c in cands:
        if c not in seen and (not isinstance(c, (int, float)) or c >= 0 or v < 0):
            seen.add(c); out.append(c)
        if len(out) == k: break
    return [fmt(x) for x in out]

def fmt(x):
    if isinstance(x, F):
        return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"
    if isinstance(x, float):
        return ("%.2f" % x).rstrip("0").rstrip(".")
    return str(x)

# ---------------- VERBAL ----------------
SYN = [("ample","plentiful","narrow","tired","sudden"),("candid","frank","sweet","hidden","slow"),
("diligent","hardworking","careless","joyful","brief"),("feeble","weak","bold","cheap","loud"),
("vacant","empty","busy","gloomy","costly"),("prudent","wise","rude","proud","hasty"),
("lethargic","sluggish","lively","angry","curious"),("serene","calm","harsh","bright","false"),
("meager","scanty","generous","quiet","modern"),("obstinate","stubborn","flexible","noisy","grateful"),
("conceal","hide","reveal","borrow","praise"),("hasten","hurry","delay","gather","soften"),
("tranquil","peaceful","chaotic","eager","dense"),("frugal","thrifty","wasteful","fragile","friendly"),
("elated","overjoyed","gloomy","bored","puzzled"),("fragile","delicate","sturdy","sticky","rapid"),
("novice","beginner","expert","critic","stranger"),("vivid","bright","dull","silent","rigid"),
("commence","begin","finish","pause","measure"),("benevolent","kind","cruel","lazy","clever"),
("timid","shy","brave","clumsy","greedy"),("abundant","plentiful","rare","hollow","stale"),
("ponder","consider","ignore","shout","shiver"),("rigid","stiff","bendable","moist","cheerful"),
("jovial","merry","sullen","sleepy","stern"),("gaunt","thin","plump","tall","pale"),
("mend","repair","break","sell","dye"),("perilous","dangerous","safe","tedious","polite"),
("cease","stop","continue","grow","listen"),("authentic","genuine","fake","ancient","shiny")]
for w, s, *d in SYN:
    add("Verbal","synonyms",f"<b>{w.upper()}</b> most nearly means",s,d,f"“{w}” means {s}. None of the other choices shares that meaning.",2)
ANT = [("generous","stingy","kind","wealthy","giving"),("expand","shrink","stretch","grow","widen"),
("ancient","modern","old","historic","dusty"),("courageous","cowardly","bold","heroic","daring"),
("scarce","plentiful","rare","few","limited"),("humble","arrogant","modest","meek","plain"),
("transparent","opaque","clear","glassy","sheer"),("reluctant","eager","hesitant","unwilling","slow"),
("praise","criticize","admire","applaud","honor"),("victory","defeat","triumph","success","win"),
("vertical","horizontal","upright","steep","tall"),("permanent","temporary","lasting","fixed","stable"),
("innocent","guilty","pure","blameless","naive"),("conceal","expose","hide","cover","bury"),
("frequent","rare","common","regular","often"),("optimistic","pessimistic","hopeful","cheerful","bright"),
("vague","precise","unclear","hazy","dim"),("ascend","descend","climb","rise","soar"),
("tedious","exciting","dull","boring","long"),("include","exclude","contain","involve","add"),
("hostile","friendly","unfriendly","angry","cold"),("abundant","sparse","plentiful","rich","full")]
for w, a, *d in ANT:
    add("Verbal","antonyms",f"<b>{w.upper()}</b> means the opposite of",a,d,f"The opposite of “{w}” is {a}; the other choices are similar in meaning, not opposite.",2)
ANA = [("Feather is to bird as scale is to","fish","wing","snake skin","weight","A bird is covered in feathers; a fish is covered in scales."),
("Glove is to hand as sock is to","foot","shoe","knee","thread","A glove covers a hand; a sock covers a foot."),
("Author is to novel as composer is to","symphony","piano","orchestra","audience","An author creates a novel; a composer creates a symphony."),
("Hot is to cold as tall is to","short","warm","high","wide","Opposites: hot/cold, tall/short."),
("Puppy is to dog as calf is to","cow","horse","goat","barn","A puppy is a young dog; a calf is a young cow."),
("Pen is to write as knife is to","cut","fork","sharp","kitchen","The tool and its use."),
("Page is to book as brick is to","wall","clay","house painter","red","A page is a part of a book; a brick is a part of a wall."),
("Thermometer is to temperature as scale is to","weight","fish","music","height in inches","Each tool measures something."),
("Hive is to bee as den is to","fox","honey","forest","cave painting","Where the animal lives."),
("Drought is to water as famine is to","food","rain","desert","thirst","A drought is a lack of water; a famine is a lack of food."),
("Teacher is to school as chef is to","restaurant","food","oven","recipe","Where each person works."),
("Petal is to flower as spoke is to","wheel","bicycle seat","speak","chain","Part to whole."),
("Whisper is to shout as walk is to","sprint","stroll","talk","step","Mild to intense version of the action."),
("Seed is to tree as egg is to","bird","nest","shell","yolk","What it grows into."),
("Pilot is to airplane as captain is to","ship","crew","ocean","anchor","The person who commands the vehicle."),
("Cup is to liquid as basket is to","fruit","handle","weave","picnic blanket","A container and what it holds."),
("Minute is to hour as month is to","year","day","week","calendar","A smaller unit within a larger one: 60 minutes per hour, 12 months per year."),
("Angry is to furious as happy is to","ecstatic","sad","calm","content","Mild to extreme degree."),
("Lock is to key as problem is to","solution","question","trouble","door","A key opens a lock; a solution resolves a problem."),
("Library is to books as gallery is to","paintings","visitors","frames","walls","What each place displays.")]
for st, c, *rest in ANA:
    d, e = rest[:3], rest[3]
    add("Verbal","analogies",st,c,d,e,2)
CLS = [(["apple","banana","pear","carrot"],"carrot","Carrot is a vegetable; the others are fruits."),
(["violin","cello","trumpet","harp"],"trumpet","The trumpet is a brass instrument; the others have strings."),
(["Mars","Venus","Moon","Jupiter"],"Moon","The Moon is not a planet."),
(["whisper","murmur","mutter","scream"],"scream","Scream is loud; the others are quiet ways of speaking."),
(["oak","maple","rose","pine"],"rose","Rose is a flower; the others are trees."),
(["triangle","square","cube","pentagon"],"cube","A cube is three-dimensional; the others are flat shapes."),
(["delighted","pleased","content","furious"],"furious","Furious is a negative feeling."),
(["inch","foot","pound","yard"],"pound","A pound measures weight; the others measure length."),
(["copper","iron","plastic","silver"],"plastic","Plastic is not a metal."),
(["sprint","dash","race","stroll"],"stroll","A stroll is slow; the others are fast."),
(["eagle","hawk","bat","owl"],"bat","A bat is a mammal; the others are birds."),
(["ancient","old","aged","novel"],"novel","Novel means new."),
(["hammer","saw","wrench","nail"],"nail","A nail is a fastener, not a tool."),
(["lake","pond","river","island"],"island","An island is land; the others are bodies of water."),
(["shy","timid","bashful","bold"],"bold","Bold is the opposite of the others."),
(["seven","eleven","nine","thirteen"],"nine","Nine is not a prime number."),
(["shark","whale","dolphin","seal"],"shark","A shark is a fish; the others are mammals."),
(["chapter","page","paragraph","pencil"],"pencil","The others are parts of a book."),
(["gallon","quart","pint","ounce of weight"],"ounce of weight","The others are measures of liquid volume."),
(["thrifty","frugal","economical","lavish"],"lavish","Lavish means spending freely; the others mean careful with money.")]
for ch, odd, e in CLS:
    add("Verbal","classification","Which word does <i>not</i> belong with the others?",odd,[c for c in ch if c != odd],e,2,fixed=ch)
TFU = ["True","False","Uncertain"]
LOG = [("Maple Street is longer than Oak Street. Oak Street is longer than Elm Street. Maple Street is longer than Elm Street.","True","If Maple > Oak and Oak > Elm, then Maple > Elm."),
("Rina is older than Theo. Theo is older than Juno. Juno is older than Rina.","False","Rina > Theo > Juno, so Juno is the youngest."),
("All of the cats in the shelter are gray. Pip is in the shelter. Pip is a gray cat.","Uncertain","Pip might not be a cat at all, so we can't tell."),
("Team Red scored more points than Team Blue. Team Green scored more than Team Blue. Team Green scored more than Team Red.","Uncertain","We know both beat Blue, but not how Red and Green compare."),
("Box A is heavier than Box B. Box C is lighter than Box B. Box A is heavier than Box C.","True","A > B > C."),
("Every student in the chess club plays on Tuesdays. Omar is in the chess club. Omar plays on Tuesdays.","True","Omar is in the club, and every member plays on Tuesdays."),
("The blue kite flew higher than the red kite. The green kite flew lower than the red kite. The green kite flew higher than the blue kite.","False","Blue > Red > Green, so Green is lowest."),
("Lena runs faster than Kai. Kai runs faster than Mo. Mo runs faster than Lena.","False","Lena > Kai > Mo, so Mo is slowest."),
("Some birds cannot fly. A penguin is a bird. A penguin cannot fly.","Uncertain","From these statements alone, we can't tell whether penguins are among the birds that cannot fly."),
("Bus 4 arrives before Bus 9. Bus 2 arrives after Bus 9. Bus 4 arrives before Bus 2.","True","4 then 9 then 2."),
("The library opens earlier than the bakery. The pharmacy opens earlier than the bakery. The library opens earlier than the pharmacy.","Uncertain","Both open before the bakery; their order is unknown."),
("Jar X holds more marbles than Jar Y. Jar Z holds fewer marbles than Jar Y. Jar Z holds more than Jar X.","False","X > Y > Z.")]
for s, a, e in LOG:
    parts = s.split(". ")
    stem = ". ".join(parts[:2]) + ".<br><b>If the first two statements are true, the third statement is:</b><br><i>" + parts[2] + "</i>"
    add("Verbal","logic",stem,a,[t for t in TFU if t != a],e,3,fixed=TFU)

# ---------------- QUANTITATIVE ----------------
for i in range(18):
    kind = i % 3
    if kind == 0:
        a, d = R.randint(2, 30), R.choice([3, 4, 6, 7, 9, -4, -6])
        seq = [a + d * k for k in range(6)]; ans = seq[5]; e = f"Each term changes by {d:+d}."
    elif kind == 1:
        a, r = R.randint(1, 5), R.choice([2, 3])
        seq = [a * r ** k for k in range(6)]; ans = seq[5]; e = f"Each term is multiplied by {r}."
    else:
        a, b, p, q = R.randint(2, 20), R.randint(30, 60), R.choice([3, 4, 5]), R.choice([-2, -3, 2])
        seq = []; x, y = a, b
        for k in range(6):
            seq.append(x if k % 2 == 0 else y)
            if k % 2 == 0: x += p
            else: y += q
        ans = seq[5]; e = f"Two series alternate: one goes up by {p}, the other changes by {q:+d}."
    add("Quantitative","number series","Look at this series: " + ", ".join(map(str, seq[:5])) + ", … What number should come next?",str(ans),numwrong(ans),e,2 + (kind == 2))
for i in range(18):
    k = i % 6
    if k == 0:
        a, b = R.choice([12, 18, 24, 30, 36]), R.randint(2, 9); ans = a // 3 + b
        st = f"What number is {b} more than 1/3 of {a}?"; e = f"1/3 of {a} = {a//3}; {a//3} + {b} = {ans}."
    elif k == 1:
        a = R.choice([20, 40, 60, 80]); p = R.choice([25, 50, 75]); ans = a * p // 100 - 3
        st = f"What number is 3 less than {p}% of {a}?"; e = f"{p}% of {a} = {a*p//100}; minus 3 = {ans}."
    elif k == 2:
        x = R.randint(3, 12); m = R.randint(2, 6); ans = x
        st = f"{m} times what number is {m*x - 4} more than 4... rephrased: what number multiplied by {m} gives {m*x}?"
        st = f"What number multiplied by {m} equals {m*x}?"; e = f"{m*x} ÷ {m} = {x}."
    elif k == 3:
        a = R.randint(2, 9); b = a * a; ans = b + a
        st = f"What is the sum of {a} squared and {a}?"; e = f"{a}² = {b}; {b} + {a} = {ans}."
    elif k == 4:
        a = R.choice([16, 24, 32, 48]); ans = a * 3 // 4 // 2
        st = f"What is one-half of three-fourths of {a}?"; e = f"3/4 of {a} = {a*3//4}; half of that is {ans}."
    else:
        x = R.randint(4, 15); ans = 2 * x + 5
        st = f"If a number is doubled and then increased by 5, the result is {ans}. What is the number?"; ans = x
        e = f"Work backwards: {2*x+5} − 5 = {2*x}; ÷ 2 = {x}."
    add("Quantitative","number manipulation",st,str(ans),numwrong(ans),e,2)
CMP = ["I > II > III", "I = II and both > III", "III > I > II", "II = III and both < I"]
def cmp_item(vals, labels):
    order = sorted(range(3), key=lambda j: -vals[j])
    names = ["I", "II", "III"]
    def rel(a, b): return "=" if vals[a] == vals[b] else (">" if vals[a] > vals[b] else "<")
    true_stmt = f"{names[order[0]]} {'=' if vals[order[0]]==vals[order[1]] else '>'} {names[order[1]]} {'=' if vals[order[1]]==vals[order[2]] else '>'} {names[order[2]]}"
    return true_stmt
for i in range(14):
    a, b, c = R.randint(2, 6), R.randint(2, 9), R.randint(10, 40)
    exprs = [(f"{a}²", a * a), (f"{b} × 3", b * 3), (f"{c} − {R.randint(1,9)}", None)]
    exprs[2] = (exprs[2][0], c - int(exprs[2][0].split("− ")[1]))
    if i % 3 == 1:
        n = R.choice([20, 40, 60]); exprs = [(f"50% of {n}", n // 2), (f"{n//4} + {n//4}", n // 2), (f"{n//2 - 3}", n // 2 - 3)]
    if i % 3 == 2:
        d = R.choice([2, 4, 5]); exprs = [(f"1/{d} of {d*6}", 6), (f"0.{5 if d==2 else (25 if d==4 else 2)} × 12", round(12 / d, 2)), (f"{d+1}", d + 1)]
    vals = [v for _, v in exprs]
    truth = cmp_item(vals, None)
    names = ["I", "II", "III"]
    # build 3 false statements
    fakes = set()
    import itertools
    for p in itertools.permutations(range(3)):
        for ops in itertools.product([">", "="], repeat=2):
            s = f"{names[p[0]]} {ops[0]} {names[p[1]]} {ops[1]} {names[p[2]]}"
            ok = all((vals[p[k]] > vals[p[k+1]]) if ops[k] == ">" else (vals[p[k]] == vals[p[k+1]]) for k in range(2))
            if not ok: fakes.add(s)
    wrong = R.sample(sorted(fakes), 3)
    st = "Examine I, II and III and choose the correct answer.<br>(I) " + exprs[0][0] + "&nbsp;&nbsp; (II) " + exprs[1][0] + "&nbsp;&nbsp; (III) " + exprs[2][0]
    e = "Values: I = " + fmt(vals[0]) + ", II = " + fmt(vals[1]) + ", III = " + fmt(vals[2]) + ", so " + truth + "."
    add("Quantitative","non-geometric comparison",st,truth,wrong,e,3)
for i in range(12):
    s = R.randint(3, 9)
    if i % 2 == 0:
        vals = [s * s, 4 * s, 2 * s + 2 * (s - 1)]
        names_ = [f"the area of a square with side {s}", f"the perimeter of that square", f"the perimeter of a {s} by {s-1} rectangle"]
    else:
        vals = [s * (s + 2), (s + 1) * (s + 1), 2 * (2 * s + 2)]
        names_ = [f"the area of a {s} by {s+2} rectangle", f"the area of a square with side {s+1}", f"the perimeter of a square with side {s+1}"]
    truth = cmp_item(vals, None)
    fakes = set()
    import itertools
    for p in itertools.permutations(range(3)):
        for ops in itertools.product([">", "="], repeat=2):
            st_ = f"{['I','II','III'][p[0]]} {ops[0]} {['I','II','III'][p[1]]} {ops[1]} {['I','II','III'][p[2]]}"
            ok = all((vals[p[k]] > vals[p[k+1]]) if ops[k] == ">" else (vals[p[k]] == vals[p[k+1]]) for k in range(2))
            if not ok: fakes.add(st_)
    st = "Compare: (I) " + names_[0] + "; (II) " + names_[1] + "; (III) " + names_[2] + "."
    add("Quantitative","geometric comparison",st,truth,R.sample(sorted(fakes), 3),f"I = {vals[0]}, II = {vals[1]}, III = {vals[2]}, so {truth}.",3)

# ---------------- MATHEMATICS ----------------
def M(skill, st, ans, e, d=2, wrong=None):
    add("Mathematics", skill, st, fmt(ans), wrong or numwrong(ans), e, d)
for i in range(10):
    a, b, c, d = R.randint(1, 5), R.choice([2,3,4,5,6,8]), R.randint(1, 5), R.choice([2,3,4,5,6,8])
    if a >= b: a = b - 1
    if c >= d: c = d - 1
    s = F(a, b) + F(c, d)
    w = [fmt(F(a + c, b + d)), fmt(s + F(1, b * d)), fmt(F(a * c, b * d))]
    w = [x for x in dict.fromkeys(w) if x != fmt(s)]
    while len(w) < 3: w.append(fmt(s + len(w) + 1))
    M("fractions", f"{a}/{b} + {c}/{d} =", s, f"Common denominator: {a}/{b} + {c}/{d} = {fmt(s)}. (Never add denominators.)", 2, w[:3])
for i in range(10):
    p, n = R.choice([10, 15, 20, 25, 30, 40, 60, 75]), R.choice([40, 60, 80, 120, 200, 240])
    v = F(p * n, 100)
    M("percents", f"What is {p}% of {n}?", v, f"{p}% = {p}/100; {p}/100 × {n} = {fmt(v)}.")
for i in range(10):
    x, a, b = R.randint(-6, 12), R.randint(2, 7), R.randint(-10, 15)
    M("algebra", f"Solve for x: {a}x {'+' if b>=0 else '−'} {abs(b)} = {a*x+b}", x, f"Subtract {b}: {a}x = {a*x}; divide by {a}: x = {x}.", 3)
for i in range(10):
    k = i % 4
    if k == 0:
        l, w = R.randint(3, 15), R.randint(2, 12); M("geometry", f"A rectangle is {l} cm long and {w} cm wide. What is its area in square centimeters?", l * w, f"Area = length × width = {l} × {w} = {l*w}.")
    elif k == 1:
        a, b = R.randint(30, 80), R.randint(30, 80); M("geometry", f"Two angles of a triangle measure {a}° and {b}°. What is the third angle in degrees?", 180 - a - b, f"Angles in a triangle sum to 180°: 180 − {a} − {b} = {180-a-b}.")
    elif k == 2:
        b, h = R.choice([4, 6, 8, 10, 12]), R.randint(3, 11); M("geometry", f"A triangle has base {b} in and height {h} in. What is its area in square inches?", b * h // 2, f"Area = ½ × base × height = ½ × {b} × {h} = {b*h//2}.")
    else:
        r = R.randint(2, 9); M("geometry", f"A circle has radius {r}. What is its circumference, in terms of π?", f"{2*r}π", f"C = 2πr = 2 × π × {r} = {2*r}π.", 2, [f"{r*r}π", f"{r}π", f"{4*r}π"])
for i in range(8):
    n = sorted(R.sample(range(2, 40), 5))
    if i % 2 == 0:
        while sum(n) % 5: n[-1] += 1
        M("statistics", "What is the mean of " + ", ".join(map(str, n)) + "?", sum(n) // 5, f"Sum = {sum(n)}; {sum(n)} ÷ 5 = {sum(n)//5}.")
    else:
        sh = n[:]; R.shuffle(sh)
        M("statistics", "What is the median of " + ", ".join(map(str, sh)) + "?", n[2], f"In order: {', '.join(map(str, n))}. The middle value is {n[2]}.")
for i in range(6):
    r, b, g = R.randint(1, 6), R.randint(1, 6), R.randint(1, 6); t = r + b + g
    M("probability", f"A bag has {r} red, {b} blue and {g} green marbles. If one is picked at random, what is the probability it is blue?", F(b, t), f"{b} blue out of {t} total = {fmt(F(b,t))}.", 2,
      list(dict.fromkeys([f"{b}/{t-b}", fmt(F(r, t)) if r != b else f"{b+1}/{t}", f"1/{t}" if b != 1 else f"2/{t}"])))
CONV = [("feet are in {n} yards", 3, "1 yard = 3 feet"), ("inches are in {n} feet", 12, "1 foot = 12 inches"), ("ounces are in {n} pounds", 16, "1 pound = 16 ounces"),
        ("cups are in {n} quarts", 4, "1 quart = 4 cups"), ("minutes are in {n} hours", 60, "1 hour = 60 minutes"), ("centimeters are in {n} meters", 100, "1 meter = 100 cm"),
        ("quarts are in {n} gallons", 4, "1 gallon = 4 quarts"), ("grams are in {n} kilograms", 1000, "1 kg = 1000 g")]
for t, f, e in CONV:
    n = R.randint(2, 9); M("measurement", "How many " + t.format(n=n) + "?", n * f, f"{e}, so {n} × {f} = {n*f}.")
for i in range(10):
    k = i % 5
    if k == 0:
        p, d = R.choice([40, 60, 80, 120]), R.choice([10, 20, 25]); M("word problems", f"A jacket costs ${p}. It is on sale for {d}% off. What is the sale price in dollars?", F(p * (100 - d), 100), f"{d}% of {p} = {fmt(F(p*d,100))}; {p} − {fmt(F(p*d,100))} = {fmt(F(p*(100-d),100))}.")
    elif k == 1:
        s, h = R.choice([45, 50, 55, 60]), R.randint(2, 5); M("word problems", f"A bus travels at {s} miles per hour for {h} hours. How many miles does it travel?", s * h, f"Distance = rate × time = {s} × {h} = {s*h}.")
    elif k == 2:
        a, b = R.randint(2, 5), R.randint(2, 5); n = (a + b) * R.randint(3, 8); M("word problems", f"The ratio of cats to dogs at a shelter is {a}:{b}. There are {n} animals in all. How many are cats?", n * a // (a + b), f"{a}+{b} = {a+b} parts; each part is {n//(a+b)}; cats = {a} × {n//(a+b)} = {n*a//(a+b)}.", 3)
    elif k == 3:
        c, q = R.choice([3, 4, 6]), R.randint(5, 12); M("word problems", f"Pencils cost ${c} for a pack of 2. How much do {2*q} pencils cost in dollars?", c * q, f"{2*q} pencils = {q} packs; {q} × {c} = {c*q}.")
    else:
        a = R.randint(70, 95); b = R.randint(70, 95); need = 3 * 85 - a - b
        if 0 < need <= 100: M("word problems", f"Ana scored {a} and {b} on two tests. What must she score on the third test to average 85?", need, f"Total needed = 3 × 85 = 255; 255 − {a} − {b} = {need}.", 3)
        else: M("word problems", f"Ana scored 80 and 86 on two tests. What must she score on the third test to average 85?", 89, "255 − 80 − 86 = 89.", 3)
for i in range(8):
    k = i % 4
    if k == 0: n = R.randint(2, 4); b = R.randint(2, 5); M("numbers & numeration", f"What is {b} to the power of {n}?", b ** n, f"{b}^{n} = {' × '.join([str(b)]*n)} = {b**n}.")
    elif k == 1: a = R.choice([12, 18, 24, 30, 36]); b = R.choice([8, 16, 20, 42]); import math; M("numbers & numeration", f"What is the greatest common factor of {a} and {b}?", math.gcd(a, b), f"The largest number dividing both {a} and {b} is {math.gcd(a,b)}.")
    elif k == 2: a = R.choice([4, 6, 8, 9, 10]); b = R.choice([6, 12, 15]); import math; M("numbers & numeration", f"What is the least common multiple of {a} and {b}?", a * b // math.gcd(a, b), f"Smallest number both divide into: {a*b//math.gcd(a,b)}.")
    else: n = R.choice([16, 25, 36, 49, 64, 81, 100, 144]); M("numbers & numeration", f"What is the square root of {n}?", int(n ** 0.5), f"{int(n**0.5)} × {int(n**0.5)} = {n}.")

# ---------------- LANGUAGE ----------------
PUNC = [("Choose the sentence with correct punctuation.", "After the game, we went out for pizza.", ["After the game we, went out for pizza.", "After, the game we went out for pizza.", "After the game we went, out for pizza."], "An introductory phrase is followed by a comma."),
("Choose the sentence with correct punctuation.", "My aunt lives in Denver, Colorado.", ["My aunt lives in Denver Colorado.", "My aunt, lives in Denver Colorado.", "My aunt lives, in Denver, Colorado."], "Put a comma between a city and its state."),
("Choose the sentence with correct punctuation.", "We bought apples, pears, and plums.", ["We bought apples pears, and plums.", "We bought, apples, pears, and plums.", "We bought apples, pears and, plums."], "Commas separate items in a list."),
("Choose the sentence with correct punctuation.", "The dog wagged its tail.", ["The dog wagged it's tail.", "The dog wagged its' tail.", "The dog wagged their's tail."], "“Its” (no apostrophe) is possessive; “it's” means “it is.”"),
("Choose the sentence with correct punctuation.", "“Where are you going?” asked Mom.", ["“Where are you going”? asked Mom.", "“Where are you going,” asked Mom?", "Where are you going? “asked Mom.”"], "The question mark goes inside the closing quotation mark."),
("Choose the sentence with correct punctuation.", "I wanted to swim; however, the pool was closed.", ["I wanted to swim, however the pool was closed.", "I wanted to swim however; the pool was closed.", "I wanted, to swim however the pool was closed."], "Use a semicolon before “however” joining two complete sentences."),
("Choose the sentence with correct punctuation.", "The girls' lockers are down the hall.", ["The girl's lockers are down the hall (many girls).", "The girls lockers are down the hall.", "The girls's lockers are down the hall."], "For a plural noun ending in s, add only an apostrophe."),
("Choose the sentence with correct punctuation.", "Bring three things: a pencil, a ruler, and an eraser.", ["Bring three things a pencil: a ruler, and an eraser.", "Bring: three things a pencil, a ruler, and an eraser.", "Bring three things, a pencil a ruler and an eraser."], "A colon introduces a list after a complete sentence."),
("Choose the sentence with correct punctuation.", "Mr. Reyes, our coach, gave a speech.", ["Mr. Reyes our coach, gave a speech.", "Mr. Reyes, our coach gave a speech.", "Mr. Reyes our coach gave, a speech."], "An appositive (“our coach”) needs commas on both sides."),
("Choose the sentence with correct punctuation.", "It was cold, so we wore our coats.", ["It was cold so, we wore our coats.", "It was cold, so, we wore our coats.", "It was, cold so we wore our coats."], "Put a comma before “so” when it joins two sentences."),
("Choose the sentence with correct punctuation.", "The children's books were on sale.", ["The childrens' books were on sale.", "The childrens books were on sale.", "The children's' books were on sale."], "“Children” is already plural, so add 's.")]
for st, c, w, e in PUNC: add("Language","punctuation",st,c,w,e,2)
CAP = [("We visited the Grand Canyon last July.", ["We visited the grand canyon last July.", "We visited the Grand canyon last july.", "we visited the Grand Canyon last July."], "Capitalize names of specific places and months."),
("My favorite subject is Spanish.", ["My favorite subject is spanish.", "My Favorite Subject is Spanish.", "my favorite subject is Spanish."], "Languages are capitalized."),
("On Friday, Uncle Dev drove us to Lake Erie.", ["On friday, uncle Dev drove us to Lake Erie.", "On Friday, uncle Dev drove us to lake Erie.", "On Friday, Uncle Dev drove us to lake erie."], "Days, titles used as names, and specific lakes are capitalized."),
("We read a book called <i>The Secret Garden</i>.", ["We read a book called <i>the secret garden</i>.", "We read a book called <i>The secret garden</i>.", "We read a Book called <i>The Secret Garden</i>."], "Capitalize the main words in a title."),
("She was born in the South but moved north for school.", ["She was born in the south but moved North for school.", "She was born in the South but moved North for School.", "She was Born in the south but moved north for school."], "A region (the South) is capitalized; a direction (north) is not."),
("The Pacific Ocean is the largest ocean.", ["The pacific ocean is the largest ocean.", "The Pacific ocean is the largest Ocean.", "the Pacific Ocean is the largest ocean."], "The full name of an ocean is capitalized.")]
for c, w, e in CAP: add("Language","capitalization","Choose the sentence with correct capitalization.",c,w,e,1)
SPELL = [("necessary","neccessary"),("separate","seperate"),("definitely","definately"),("receive","recieve"),("believe","beleive"),
("calendar","calender"),("embarrass","embarass"),("occasion","ocassion"),("tomorrow","tommorow"),("beginning","begining"),
("government","goverment"),("library","libary"),("February","Febuary"),("restaurant","restaraunt"),("environment","enviroment"),
("immediately","immediatly"),("knowledge","knowlege"),("privilege","priviledge"),("rhythm","rythm"),("weird","wierd"),
("accommodate","accomodate"),("conscience","concience"),("license","lisence"),("noticeable","noticable")]
fill = ["window","garden","quickly","teacher","history","mountain","journey","picture","station","village","bottle","harbor","whistle","puzzle","silver","ladder","pocket","thunder"]
for good, bad in SPELL:
    others = R.sample(fill, 3)
    add("Language","spelling","Which word is spelled <i>incorrectly</i>?",bad,others,f"The correct spelling is “{good}.”",2)
USAGE = [("Neither of the boys has finished.", ["Neither of the boys have finished.", "Neither of the boy has finished.", "Neither of the boys are finish."], "“Neither” is singular, so use “has.”"),
("She and I went to the store.", ["Her and me went to the store.", "Me and her went to the store.", "Her and I went to the store."], "Use subject pronouns (She, I) as the subject."),
("The team is practicing today.", ["The team are practicing today.", "The team were practicing today.", "The team be practicing today."], "A collective noun acting as one unit takes a singular verb."),
("Between you and me, the test was easy.", ["Between you and I, the test was easy.", "Between I and you, the test was easy.", "Between yourself and I, the test was easy."], "After a preposition, use object pronouns (me)."),
("He ran more quickly than his brother.", ["He ran more quicker than his brother.", "He ran quicker-ly than his brother.", "He ran most quickly than his brother."], "Use “more quickly”; don't double comparatives."),
("Each of the students brought a lunch.", ["Each of the students brought their lunches all.", "Each of the students have brought a lunch.", "Each of the students were bringing a lunch."], "“Each” is singular."),
("I could have gone earlier.", ["I could of gone earlier.", "I could have went earlier.", "I could of went earlier."], "It's “could have gone,” never “could of.”"),
("There are fewer cookies than yesterday.", ["There are less cookies than yesterday.", "There is fewer cookies than yesterday.", "Their are fewer cookies than yesterday."], "Use “fewer” for things you can count."),
("Their dog is bigger than ours.", ["There dog is bigger than ours.", "They're dog is bigger than ours.", "Their dog is more bigger than ours."], "“Their” shows ownership."),
("The book was lying on the table.", ["The book was laying on the table.", "The book was layed on the table.", "The book was lain on the table."], "“Lie” (rest) has no object; “lying” is correct."),
("Whom did you invite?", ["Who did you invited?", "Whom did you invited?", "Who you did invite?"], "“Whom” is the object of “invite.”"),
("She doesn't like spinach.", ["She don't like spinach.", "She do not likes spinach.", "She doesn't likes spinach."], "Use “doesn't” with she/he/it."),
("Of the two runners, Mia is the faster.", ["Of the two runners, Mia is the fastest.", "Of the two runners, Mia is the most fast.", "Of the two runner, Mia is faster."], "Comparing two, use the comparative (-er)."),
("The cookies tasted good.", ["The cookies tasted well.", "The cookies tasted goodly.", "The cookies tastes good."], "Linking verbs like “taste” take adjectives."),
("Everyone has his or her own locker.", ["Everyone have their own locker.", "Everyone have his or her own locker.", "Everyone has they're own locker."], "“Everyone” is singular."),
("If I were taller, I could reach it.", ["If I was taller, I could reached it.", "If I am taller, I could reach it.", "If I be taller, I could reach it."], "Use “were” for wishes and contrary-to-fact ideas."),
("We should have brought an umbrella.", ["We should have brang an umbrella.", "We should have bringed an umbrella.", "We should of brought an umbrella."], "Past participle of “bring” is “brought.”"),
("The data from both labs agree.", ["The datas from both labs agrees.", "The data from both lab agrees.", "The data from both labs agrees with eachother."], "Keep subject and verb in agreement."),
]
for c, w, e in USAGE: add("Language","usage","Choose the sentence that is correct.",c,w,e,2)
COMP = [("Choose the word that best completes the sentence: “It started to rain; ____, the game went on.”", "nevertheless", ["because", "therefore", "for example"], "The game went on despite the rain, so a contrast word fits."),
("Choose the word that best completes the sentence: “She studied every night; ____, she aced the test.”", "as a result", ["however", "in contrast", "instead"], "Studying caused the good score: a result word fits."),
("Which sentence expresses the idea most clearly?", "Because the bridge was icy, the bus drove slowly.", ["The bus, the bridge being icy, it drove slowly.", "Icy was the bridge, so slowly the bus.", "The bus drove slowly the bridge was icy."], "It is complete, clear and correctly joined."),
("Which sentence expresses the idea most clearly?", "Running to the bus, Jon dropped his phone.", ["Running to the bus, the phone was dropped by Jon.", "Jon's phone, running to the bus, dropped.", "The phone dropped running to the bus by Jon."], "The opening phrase must describe Jon, not the phone."),
("Which topic is best for a one-paragraph report?", "How honeybees make honey", ["The history of all insects", "Everything about farming", "World food production since 1800"], "A paragraph needs a narrow topic."),
("Which sentence does <i>not</i> belong in a paragraph about how to plant a tomato seedling?", "My cousin prefers cucumbers to tomatoes.", ["Dig a hole twice as wide as the pot.", "Set the seedling in and firm the soil.", "Water it well right after planting."], "That sentence is off-topic."),
("Choose the word that best completes the sentence: “Owls hunt at night, ____ hawks hunt by day.”", "whereas", ["because", "so that", "therefore"], "A contrast between two habits."),
("Which is a complete sentence?", "The fox slipped under the fence.", ["Under the fence and into the woods.", "Because the fox was hungry.", "Slipping quietly past the hens."], "It has a subject and a verb and expresses a full thought."),
("Which is a run-on sentence?", "The bell rang everyone ran outside.", ["The bell rang, and everyone ran outside.", "When the bell rang, everyone ran outside.", "The bell rang. Everyone ran outside."], "Two sentences are joined with no punctuation or conjunction."),
("Which is the best topic sentence for a paragraph about recycling at school?", "Our school could cut its trash in half by recycling more.", ["Paper is made from trees.", "Some cans are blue.", "Last week was rainy."], "It states the paragraph's main point."),
("Choose the word that best completes the sentence: “The trail was steep; ____, the view at the top was worth it.”", "however", ["similarly", "for instance", "because"], "A contrast between effort and reward."),
("Which sentence is written most concisely?", "The meeting starts at noon.", ["The meeting, it starts at the time of noon.", "At noon is when the meeting will be starting up.", "The meeting is starting at the hour of twelve noon o'clock."], "It says the same thing in the fewest words."),
("Choose the best way to combine: “Lena plays piano. Lena plays violin.”", "Lena plays piano and violin.", ["Lena plays piano, Lena plays violin.", "Lena plays piano she plays violin.", "Playing piano, violin is played by Lena."], "Combine the shared subject and verb."),
("Which sentence is in the passive voice?", "The window was broken by the ball.", ["The ball broke the window.", "Sam threw the ball.", "The window shattered loudly."], "The subject receives the action.")]
for st, c, w, e in COMP: add("Language","composition",st,c,w,e,2)

# ---------------- READING ----------------
PASS = [
("The Lighthouse Keeper's Log", """For forty years the lighthouse on Gull Point was tended by hand. Each evening the keeper climbed ninety-two steps, trimmed the wick and wound the clockwork that turned the great lens. In storms she stayed awake all night, because a stopped lens could mean a ship on the rocks. When the light was automated in 1962, the keeper's log ended with a single line: "Light burning bright. Gone ashore." Today, visitors can climb the same steps and read that log, now kept behind glass in the keeper's cottage.""",
 [("main idea","What is the passage mainly about?","how the Gull Point lighthouse was kept running and what remains of that work",["how lenses are made","why ships wreck in storms","the history of clockwork"]),
  ("detail","How many steps did the keeper climb?","ninety-two",["forty","sixty-two","nineteen"]),
  ("inference","Why did the keeper stay awake during storms?","Ships were in greater danger and the light had to keep turning.",["She was afraid of thunder.","Visitors arrived at night.","The cottage had no beds."]),
  ("vocabulary","In this passage, <i>tended</i> most nearly means","cared for",["leaned","stretched","offered"]),
  ("tone","The keeper's last line suggests she felt","calm and satisfied that her work was done",["angry at the change","confused about the light","afraid of the sea"])]),
("Moss Map", """Hikers once said that moss grows on the north side of trees, so it can serve as a compass. Scientists who study forests say this is only partly true. Moss needs shade and moisture. In the Northern Hemisphere, the north side of a tree often gets less sun, so moss may grow there. But in a deep, damp forest, moss can cover every side of a trunk. A tree near a stream may have the most moss on whatever side faces the water. A wise hiker carries a real compass.""",
 [("main idea","The author's main point is that","moss is not a reliable way to find north",["moss grows only on the north side","streams are good guides","moss needs sunlight"]),
  ("detail","What two things does moss need?","shade and moisture",["sun and wind","soil and sand","heat and light"]),
  ("cause and effect","Why might moss grow on the north side of a tree?","That side often gets less sun.",["That side faces the wind.","Birds rest there.","The bark is thicker there."]),
  ("purpose","Why does the author mention a tree near a stream?","to give an example where moss grows on another side",["to describe a good campsite","to explain where water comes from","to warn about floods"]),
  ("inference","The author would most likely advise a hiker to","bring a compass",["follow the moss","walk near streams","hike only in the north"])]),
("Tamsin's Garden Plot", """Tamsin had never grown anything but a bean in a paper cup. When the community garden offered free plots, she signed up and was handed a square of hard, pale dirt. The first week she pulled weeds until her palms blistered. The second week she mixed in compost from the shared bin. By June, her neighbor Mr. Okafor was leaning over the fence to ask how she had coaxed such tall sunflowers from "that hopeless corner." Tamsin just grinned and handed him a bag of seeds.""",
 [("character","Which word best describes Tamsin?","determined",["lazy","boastful","fearful"]),
  ("vocabulary","As used in the passage, <i>coaxed</i> means","gently encouraged",["forced quickly","bought cheaply","hid carefully"]),
  ("detail","What did Tamsin add to the soil in the second week?","compost",["sand","sunflower seeds","water from a stream"]),
  ("inference","Mr. Okafor's comment shows that he","thought the plot would be hard to grow anything in",["owned the plot before","dislikes sunflowers","wanted Tamsin to leave"]),
  ("theme","Which is a theme of the story?","Hard work can turn something unpromising into a success.",["Gardens are too much trouble.","Neighbors should mind their own business.","Beans grow best in cups."])]),
("The Silk Road", """The Silk Road was not one road but a web of routes linking China to the Mediterranean. Few traders traveled the whole way. Instead, goods passed from merchant to merchant, city to city. Silk moved west; glassware, horses and silver moved east. Ideas traveled too: paper-making, new crops and religions spread along the same paths. Oasis cities such as Samarkand grew rich by offering water, markets and rest to caravans crossing the deserts.""",
 [("main idea","Which title best fits the passage?","A Web of Trade and Ideas",["The Life of a Silk Worm","Deserts of the World","How Glass Is Made"]),
  ("detail","Which good moved west?","silk",["horses","glassware","silver"]),
  ("inference","Why did few traders travel the whole way?","Goods were passed along in shorter trips between cities.",["The road was too smooth.","Silk was too light to carry.","No one lived in Samarkand."]),
  ("vocabulary","In the passage, <i>web</i> most nearly means","network",["trap","cloth","spider"]),
  ("cause and effect","Oasis cities grew rich because they","served the caravans that passed through",["grew silk","made paper first","sold glassware to China"])]),
("Night Shift at the Bakery", """At 3 a.m., while the town slept, the ovens at Ruiz Bakery were already roaring. Gabe measured flour by the bucketful, his breath clouding in the cold back room. He liked this hour best. No phones rang; no customers waited. There was only the soft thump of dough on the steel table and the smell of yeast slowly waking. By the time the first bus rumbled past at six, two hundred rolls sat cooling in neat rows, as if they had appeared by magic.""",
 [("mood","The mood of the passage is best described as","quiet and peaceful",["tense and frightening","noisy and crowded","sad and lonely"]),
  ("figurative language","“The smell of yeast slowly waking” is an example of","personification",["a simile","rhyme","exaggeration of numbers"]),
  ("detail","When does the first bus pass?","at six",["at three","at midnight","at noon"]),
  ("inference","Why does Gabe like this hour best?","It is calm, with no interruptions.",["He is paid more then.","He can sleep at work.","Customers bring him coffee."]),
  ("vocabulary","As used in the passage, <i>roaring</i> means","burning strongly",["shouting","laughing","breaking"])]),
("Why Leaves Change Color", """Leaves are green because of chlorophyll, which helps trees turn sunlight into food. Other colors, yellow and orange, are in the leaf all summer, but the green hides them. As autumn days shorten, trees stop making chlorophyll. The green fades, and the hidden yellows show through. Reds are different: many trees make red pigments only in fall, especially after sunny days and cool nights. That is why a dry, bright autumn often brings the most brilliant reds.""",
 [("main idea","The passage mainly explains","why leaves turn different colors in autumn",["how to plant a tree","why trees need water","how chlorophyll is sold"]),
  ("detail","What makes leaves green?","chlorophyll",["red pigment","cool nights","yellow pigment"]),
  ("cause and effect","Yellow appears in fall because","the green chlorophyll fades away",["trees make yellow only in fall","rain washes leaves","leaves dry out"]),
  ("inference","Which fall weather would likely bring the brightest reds?","sunny days and cool nights",["cloudy, warm days","heavy rain every day","snow in September"]),
  ("vocabulary","In the passage, <i>brilliant</i> most nearly means","vivid",["smart","dim","costly"])]),
("The Debate", """Priya had argued against the longer school day for weeks, filling a notebook with facts. But the night before the debate, she read an article that made her doubt herself: students in one district said the extra hour finally gave them time for music. Priya did not throw out her notes. Instead, she added a new page titled "What the other side gets right," and the next day she opened by admitting the strongest point against her.""",
 [("character","Priya's choice shows that she is","fair-minded",["stubborn","careless","shy"]),
  ("detail","What benefit of the longer day did the article mention?","time for music",["more recess","less homework","later start times"]),
  ("inference","Why did Priya open by admitting a point against her?","to show she had considered both sides",["because she had lost her notes","because she changed teams","to end the debate early"]),
  ("plot","What is the turning point of the story?","Priya reads an article that makes her doubt herself.",["Priya fills her notebook.","The debate begins.","Priya wins a prize."]),
  ("purpose","The author's purpose is mainly to","show how a character responds to new information",["argue for longer school days","teach debate rules","describe a school district"])]),
("Octopus Escape Artists", """Octopuses have no bones, so any opening larger than their beak is a doorway. Aquarium workers tell stories of octopuses that slipped out of tanks at night, crossed the floor, and raided a neighboring tank for snacks before returning home. Scientists think such feats show real problem-solving. In lab tests, octopuses have unscrewed jar lids to reach crabs inside, and some learned the task faster after watching another octopus do it.""",
 [("main idea","The passage mainly shows that octopuses","are clever and flexible problem-solvers",["are dangerous to people","live only in aquariums","have strong bones"]),
  ("detail","What is the only hard part that limits where an octopus can fit?","its beak",["its shell","its spine","its tentacles"]),
  ("inference","Learning faster after watching another octopus suggests they can","learn by observing",["read labels","hear human speech","see in the dark only"]),
  ("vocabulary","In the passage, <i>feats</i> most nearly means","impressive acts",["parts of a foot","meals","mistakes"]),
  ("purpose","Why does the author include the aquarium stories?","to give vivid examples of octopus escapes",["to complain about aquarium workers","to explain how tanks are built","to sell aquarium tickets"])])]
for title, text, qs in PASS:
    psg = f"<b>{title}</b><br>{text}"
    for sk, st, c, w in qs:
        add("Reading", sk, st, c, w, f"The passage supports this answer: {c.rstrip('.')}.", 2, passage=psg)
VOC = [("a <u>jubilant</u> crowd","joyful",["silent","angry","small"]),("a <u>meticulous</u> worker","careful",["sloppy","fast","tired"]),
("an <u>arduous</u> climb","difficult",["easy","short","pleasant"]),("a <u>brief</u> visit","short",["long","happy","secret"]),
("<u>reluctant</u> to leave","unwilling",["eager","able","forced"]),("a <u>novel</u> idea","new",["boring","written","old"]),
("a <u>somber</u> mood","serious",["cheerful","busy","sleepy"]),("<u>abundant</u> rain","plentiful",["light","cold","rare"]),
("a <u>frail</u> branch","weak",["thick","leafy","tall"]),("<u>vivid</u> memories","clear",["faded","sad","few"]),
("a <u>hostile</u> reply","unfriendly",["polite","quick","funny"]),("an <u>elated</u> winner","thrilled",["tired","humble","nervous"]),
("<u>conceal</u> the gift","hide",["open","wrap","buy"]),("a <u>placid</u> lake","calm",["stormy","deep","frozen"]),
("<u>ample</u> space","enough",["little","empty","strange"]),("a <u>keen</u> eye","sharp",["closed","lazy","blue"]),
("<u>baffled</u> by the clue","puzzled",["pleased","bored","scared"]),("a <u>robust</u> plant","sturdy",["dying","tiny","bitter"]),
("<u>diminish</u> the noise","lessen",["increase","record","enjoy"]),("a <u>loyal</u> friend","faithful",["new","distant","rude"]),
("<u>exhausted</u> runners","worn out",["energetic","quick","proud"]),("a <u>candid</u> answer","honest",["shy","long","false"])]
for ph, c, w in VOC:
    add("Reading","vocabulary",f"Choose the word that means the same, or about the same, as the underlined word: {ph}",c,w,f"In context, the underlined word means “{c}.”",2)

# ---------------- ids + validation ----------------
pref = {"Verbal": "V", "Quantitative": "Q", "Reading": "R", "Mathematics": "M", "Language": "L"}
cnt = {}
for it in items:
    p = pref[it["section"]]; cnt[p] = cnt.get(p, 0) + 1
    it["id"] = f"{p}{cnt[p]:03d}"

def validate(items):
    errs, seen = [], {}
    for it in items:
        ch = it["choices"]
        if not (0 <= it["answer"] < len(ch)): errs.append(f"{it['id']} answer out of range")
        if len(set(ch)) != len(ch): errs.append(f"{it['id']} duplicate choices {ch}")
        if len(ch) not in (3, 4): errs.append(f"{it['id']} has {len(ch)} choices")
        key = re.sub(r"\W+", " ", (it.get("passage", "")[:40] + it["stem"] + "|" + "|".join(sorted(ch))).lower())
        if key in seen: errs.append(f"{it['id']} duplicates {seen[key]}")
        seen[key] = it["id"]
        if not it["explanation"]: errs.append(f"{it['id']} no explanation")
    return errs

if __name__ == "__main__":
    errs = validate(items)
    if errs:
        print("\n".join(errs)); raise SystemExit(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    by = {}
    for it in items: by[it["section"]] = by.get(it["section"], 0) + 1
    bank = {"version": 2, "test_day": "2026-11-17", "generated_by": "sprint/gen_bank.py (seed 1117)", "counts": by, "total": len(items), "items": items}
    json.dump(bank, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(json.dumps(by), len(items))
