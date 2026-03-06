/* Detective & Cat (iPad Landscape) - V1
   - Two profiles: Brother / Sister (localStorage)
   - Three games: Pattern Detective / Make 10 (Make 5 for sister) / Memory Match
   - Courage points -> unlock worlds (Home -> Garden -> Beach)
   - Coins daily cap (Brother 30, Sister 20)
   - Pet break daily limit (3)
   - Gentle hint system (2 layers)
*/

let UI = {
  btns: [],
  clear() { this.btns = []; },
  addButton(id, label, x, y, w, h, onClick, opts = {}) {
    this.btns.push({ id, label, x, y, w, h, onClick, opts });
  },
  drawButtons() {
    for (const b of this.btns) {
      const hovered = (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h);
      push();
      stroke(160);
      strokeWeight(2);
      fill(hovered ? 255 : 248);
      rect(b.x, b.y, b.w, b.h, 18);
      noStroke();
      fill(10);
      textSize(b.opts.textSize ?? Math.min(28, b.h * 0.45));
      text(b.label, b.x + b.w / 2, b.y + b.h / 2);
      pop();
    }
  },
  handlePress() {
    for (const b of this.btns) {
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        b.onClick?.();
        return true;
      }
    }
    return false;
  }
};

// ---------- Storage ----------
const STORAGE_KEY = "detective_cat_v1";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function defaultProfile(name) {
  const isBrother = name === "brother";
  return {
    name,
    worldIndex: 0,        // 0 home, 1 garden, 2 beach
    courage: 0,           // grows from trying, using hint, returning from pet break
    coins: 0,
    coinsEarnedToday: 0,
    dailyCoinCap: isBrother ? 30 : 20,
    petBreaksUsedToday: 0,
    dailyPetBreakCap: 3,
    englishClues: isBrother ? true : false,
    stats: {
      patternSolved: 0,
      makeSolved: 0,
      matchSolved: 0
    },
    lastDay: todayKey()
  };
}

function loadGameData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = {
        brother: defaultProfile("brother"),
        sister: defaultProfile("sister")
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    const data = JSON.parse(raw);
    // Ensure presence
    if (!data.brother) data.brother = defaultProfile("brother");
    if (!data.sister) data.sister = defaultProfile("sister");
    return data;
  } catch {
    const data = { brother: defaultProfile("brother"), sister: defaultProfile("sister") };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }
}

function saveGameData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameData));
}

function rolloverDaily(p) {
  const t = todayKey();
  if (p.lastDay !== t) {
    p.lastDay = t;
    p.coinsEarnedToday = 0;
    p.petBreaksUsedToday = 0;
  }
}

let gameData = loadGameData();
let profile = null; // current profile object
let activeProfileName = null;

// ---------- App State ----------
let screen = "profileSelect"; // profileSelect | hub | pattern | make | match | pet | settings
let message = "";
let messageTimer = 0;

// pattern game state
let pat = null;

// make10 state
let makeState = null;

// memory match state
let matchState = null;

// ---------- Visual Theme / Worlds ----------
const WORLDS = [
  { name: "Home", emoji: "🏠", bg1: [230,245,255], bg2: [200,235,255] },
  { name: "Garden", emoji: "🌳", bg1: [232,250,238], bg2: [205,240,215] },
  { name: "Beach", emoji: "🌊", bg1: [235,245,255], bg2: [210,235,255] }
];

function ensureLandscape() {
  // We won't hard-lock in code; we just lay out for landscape.
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  ensureLandscape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  // Background
  let w = width, h = height;

  if (profile) {
    const world = WORLDS[profile.worldIndex] ?? WORLDS[0];
    drawSoftBackground(world);
  } else {
    background(230, 245, 255);
  }

  // Top bar
  drawTopBar();

  // Screen
  UI.clear();
  if (screen === "profileSelect") drawProfileSelect();
  else if (screen === "hub") drawHub();
  else if (screen === "pattern") drawPatternGame();
  else if (screen === "make") drawMakeGame();
  else if (screen === "match") drawMatchGame();
  else if (screen === "pet") drawPetBreak();
  else if (screen === "settings") drawSettings();

  // Message
  if (messageTimer > 0) {
    messageTimer--;
    push();
    fill(0, 120, 0);
    textSize(Math.min(26, width * 0.03));
    text(message, width * 0.65, height * 0.90);
    pop();
  }

  UI.drawButtons();
}

function drawSoftBackground(world) {
  // simple gradient-like split (low stimulation)
  noStroke();
  fill(world.bg1[0], world.bg1[1], world.bg1[2]);
  rect(0, 0, width, height);
  fill(world.bg2[0], world.bg2[1], world.bg2[2], 70);
  rect(0, height * 0.55, width, height * 0.45);

  // tiny world emoji corner (light touch)
  push();
  textSize(Math.min(48, width * 0.045));
  fill(0, 30);
  text(world.emoji, width - 40, 35);
  pop();
}

function drawTopBar() {
  // slim top bar with profile, world, coins, caps
  push();
  noStroke();
  fill(0, 20);
  rect(0, 0, width, 60);
  fill(20);
  textSize(20);

  if (!profile) {
    text("Detective & Cat (iPad)", width / 2, 30);
    pop();
    return;
  }

  rolloverDaily(profile);

  const world = WORLDS[profile.worldIndex] ?? WORLDS[0];
  const who = (profile.name === "brother") ? "👦 Brother" : "👧 Sister";
  const coinsTxt = `💰 ${profile.coins}  (Today ${profile.coinsEarnedToday}/${profile.dailyCoinCap})`;
  const petTxt = `🐾 Break ${profile.petBreaksUsedToday}/${profile.dailyPetBreakCap}`;
  const mid = `${world.emoji} ${world.name}`;

  text(who, 110, 30);
  text(mid, width / 2, 30);
  text(coinsTxt, width - 220, 22);
  text(petTxt, width - 220, 44);

  pop();
}

// ---------- Navigation helpers ----------
function gotoHub() {
  screen = "hub";
  pat = null;
  makeState = null;
  matchState = null;
}

function selectProfile(name) {
  activeProfileName = name;
  profile = gameData[name];
  rolloverDaily(profile);
  saveGameData();
  gotoHub();
}

function addCourage(amount) {
  profile.courage += amount;
  // Unlock worlds by courage thresholds (gentle, not too fast)
  // Home->Garden at 25, Garden->Beach at 70
  if (profile.worldIndex < 1 && profile.courage >= 25) {
    profile.worldIndex = 1;
    toast("🌳 New place discovered: Garden!");
  }
  if (profile.worldIndex < 2 && profile.courage >= 70) {
    profile.worldIndex = 2;
    toast("🌊 New place discovered: Beach!");
  }
  saveGameData();
}

function canEarnCoins() {
  rolloverDaily(profile);
  return profile.coinsEarnedToday < profile.dailyCoinCap;
}

function giveCoins(amount) {
  if (!canEarnCoins()) return;
  const remaining = profile.dailyCoinCap - profile.coinsEarnedToday;
  const grant = Math.max(0, Math.min(amount, remaining));
  profile.coins += grant;
  profile.coinsEarnedToday += grant;
  saveGameData();
}

function toast(t) {
  message = t;
  messageTimer = 160;
}

// ---------- Profile Select ----------
function drawProfileSelect() {
  push();
  fill(0);
  textSize(Math.min(48, width * 0.05));
  text("Who’s exploring?", width / 2, height * 0.28);

  // Big buttons centered
  const bw = Math.min(420, width * 0.35);
  const bh = 90;
  const gap = 40;
  const x1 = width / 2 - bw - gap / 2;
  const x2 = width / 2 + gap / 2;
  const y = height * 0.45;

  UI.addButton("brother", "👦 Brother", x1, y, bw, bh, () => selectProfile("brother"), { textSize: 34 });
  UI.addButton("sister", "👧 Sister", x2, y, bw, bh, () => selectProfile("sister"), { textSize: 34 });

  textSize(20);
  fill(30);
  text("iPad landscape • No ads • Gentle brain games", width / 2, height * 0.80);
  pop();
}

// ---------- Hub ----------
function drawHub() {
  push();
  fill(0);
  textSize(Math.min(46, width * 0.045));
  text("🕵️ Detective & Cat", width * 0.5, height * 0.14);

  // Left: Cat stage (simple)
  drawCatStage(width * 0.18, height * 0.52, width * 0.30, height * 0.62);

  // Right: 3 game cards
  const rightX = width * 0.40;
  const cardW = width * 0.55;
  const cardH = height * 0.16;
  const startY = height * 0.26;
  const gap = height * 0.04;

  UI.addButton("pattern", "🕵️ Pattern Detective", rightX, startY, cardW, cardH, () => startPattern(), { textSize: 34 });
  UI.addButton("make", (profile.name==="brother" ? "🔟 Make 10 (Find the pair)" : "🔟 Make 5 (Find the pair)"), rightX, startY + (cardH+gap), cardW, cardH, () => startMake(), { textSize: 34 });
  UI.addButton("match", "🧠 Memory Match", rightX, startY + 2*(cardH+gap), cardW, cardH, () => startMatch(), { textSize: 34 });

  // Bottom small buttons
  UI.addButton("pet", "🐾 Pet Break", width*0.40, height*0.86, width*0.18, 64, () => startPetBreak());
  UI.addButton("settings", "⚙️ Settings", width*0.60, height*0.86, width*0.18, 64, () => screen="settings");
  UI.addButton("switch", "🔁 Switch Kid", width*0.80, height*0.86, width*0.18, 64, () => { profile=null; activeProfileName=null; screen="profileSelect"; });

  pop();
}

function drawCatStage(cx, cy, w, h) {
  // A calm “companion area” (no heavy animation yet)
  push();
  // stage panel
  stroke(160);
  strokeWeight(2);
  fill(255, 220);
  rect(cx - w/2, cy - h/2, w, h, 22);

  // cat drawing (simple vector)
  const isBrother = profile.name === "brother";
  const catColor = isBrother ? [70, 70, 80] : [180, 120, 150];
  const x = cx, y = cy + h*0.10;

  // body
  noStroke();
  fill(catColor[0], catColor[1], catColor[2], 220);
  ellipse(x, y, w*0.32, h*0.28);
  // head
  ellipse(x, y - h*0.18, w*0.22, h*0.20);
  // ears
  triangle(x - w*0.11, y - h*0.26, x - w*0.06, y - h*0.38, x - w*0.01, y - h*0.26);
  triangle(x + w*0.11, y - h*0.26, x + w*0.06, y - h*0.38, x + w*0.01, y - h*0.26);
  // eyes
  fill(20);
  ellipse(x - w*0.04, y - h*0.20, 8, 8);
  ellipse(x + w*0.04, y - h*0.20, 8, 8);

  // caption
  fill(20);
  textSize(18);
  const world = WORLDS[profile.worldIndex] ?? WORLDS[0];
  text(`${world.emoji} ${world.name}`, cx, cy - h*0.40);
  textSize(16);
  text(`Courage: ${profile.courage}`, cx, cy - h*0.32);

  // gentle hint
  textSize(16);
  fill(40);
  text("I’m here. Take your time.", cx, cy + h*0.38);

  pop();
}

// ---------- Settings ----------
function drawSettings() {
  push();
  fill(0);
  textSize(Math.min(44, width*0.04));
  text("⚙️ Settings", width/2, height*0.16);

  const panelW = width*0.72;
  const panelH = height*0.58;
  const px = (width-panelW)/2;
  const py = height*0.24;

  stroke(160); strokeWeight(2); fill(255, 230);
  rect(px, py, panelW, panelH, 22);

  noStroke();
  fill(20);
  textSize(24);
  text("English Clues (light, hidden learning)", width/2, py + 90);

  if (profile.name === "sister") {
    textSize(18);
    fill(60);
    text("Default OFF for sister. You can turn it ON later if you want.", width/2, py + 125);
  }

  const toggleLabel = profile.englishClues ? "ON" : "OFF";
  UI.addButton("toggleEnglish", `English Clues: ${toggleLabel}`, width/2 - 180, py + 155, 360, 80, () => {
    profile.englishClues = !profile.englishClues;
    saveGameData();
    toast(profile.englishClues ? "English clues ON" : "English clues OFF");
  }, { textSize: 28 });

  textSize(22);
  fill(20);
  text("Reset this kid’s progress (careful)", width/2, py + 290);
  UI.addButton("reset", "Reset", width/2 - 120, py + 320, 240, 70, () => {
    // reset only current profile
    gameData[profile.name] = defaultProfile(profile.name);
    profile = gameData[profile.name];
    saveGameData();
    toast("Reset done.");
  }, { textSize: 28 });

  UI.addButton("back", "← Back", 40, height - 90, 160, 60, () => gotoHub());
  pop();
}

// ---------- Pet Break ----------
function startPetBreak() {
  rolloverDaily(profile);
  screen = "pet";
}

function drawPetBreak() {
  push();
  fill(0);
  textSize(Math.min(44, width*0.04));
  text("🐾 Pet Break", width/2, height*0.14);

  const panelW = width*0.80;
  const panelH = height*0.68;
  const px = (width-panelW)/2;
  const py = height*0.20;

  stroke(160); strokeWeight(2); fill(255, 235);
  rect(px, py, panelW, panelH, 22);

  noStroke();
  fill(20);
  textSize(22);
  rolloverDaily(profile);

  const remaining = profile.dailyPetBreakCap - profile.petBreaksUsedToday;
  text(`Today: ${profile.petBreaksUsedToday}/${profile.dailyPetBreakCap} breaks used`, width/2, py + 55);
  textSize(18);
  fill(50);
  text("This is a calm place. No coins here. Just a reset.", width/2, py + 85);

  // If no breaks left, show gentle idle
  if (remaining <= 0) {
    fill(20);
    textSize(24);
    text("Cat is resting now. You can just watch.", width/2, py + 150);
    drawCatIdle(width/2, py + 320);

    textSize(18);
    fill(60);
    text("When you’re ready, go back to exploring.", width/2, py + 470);

  } else {
    // actions
    UI.addButton("feed", "🍗 Feed", px + 80, py + 160, 220, 90, () => doPetAction("feed"), { textSize: 30 });
    UI.addButton("brush", "🪮 Brush", px + 80, py + 270, 220, 90, () => doPetAction("brush"), { textSize: 30 });
    UI.addButton("bath", "🧼 Bath", px + 80, py + 380, 220, 90, () => doPetAction("bath"), { textSize: 30 });

    // big cat
    drawCatIdle(px + panelW*0.63, py + panelH*0.53);
    textSize(18);
    fill(60);
    text("After a break, you can try again.", px + panelW*0.63, py + panelH*0.80);
  }

  UI.addButton("back", "← Back", 40, height - 90, 160, 60, () => gotoHub());
  pop();
}

function drawCatIdle(cx, cy) {
  push();
  const isBrother = profile.name === "brother";
  const catColor = isBrother ? [70, 70, 80] : [180, 120, 150];

  noStroke();
  fill(catColor[0], catColor[1], catColor[2], 220);
  ellipse(cx, cy + 40, 220, 140);
  ellipse(cx, cy - 40, 160, 130);
  triangle(cx - 80, cy - 70, cx - 50, cy - 140, cx - 20, cy - 70);
  triangle(cx + 80, cy - 70, cx + 50, cy - 140, cx + 20, cy - 70);

  fill(20);
  ellipse(cx - 30, cy - 50, 12, 12);
  ellipse(cx + 30, cy - 50, 12, 12);

  pop();
}

function doPetAction(type) {
  rolloverDaily(profile);
  if (profile.petBreaksUsedToday >= profile.dailyPetBreakCap) {
    toast("No more breaks today.");
    return;
  }
  profile.petBreaksUsedToday += 1;
  // “returning” & “staying” is courage
  addCourage(2);
  saveGameData();

  if (type === "feed") toast("🐱 Purr... thanks.");
  if (type === "brush") toast("🐱 So soft...");
  if (type === "bath") toast("🐱 Clean and cozy.");
}

// ---------- Pattern Detective ----------
function startPattern() {
  screen = "pattern";
  pat = newPatternQuestion(profile);
}

function drawPatternGame() {
  push();
  fill(0);
  textSize(Math.min(40, width*0.038));
  text("🕵️ Pattern Detective", width*0.67, height*0.12);

  // layout: left companion, right puzzle
  drawCatStage(width*0.18, height*0.50, width*0.30, height*0.72);

  const rightX = width*0.40;
  const rightW = width*0.58;

  // puzzle panel
  stroke(160); strokeWeight(2); fill(255, 235);
  rect(rightX, height*0.18, rightW, height*0.62, 22);

  noStroke();
  fill(20);
  textSize(22);
  text("What comes next?", rightX + rightW/2, height*0.24);

  // pattern display
  textSize(Math.min(44, rightW*0.07));
  fill(0);
  text(pat.display, rightX + rightW/2, height*0.36);

  // options
  drawOptionButtons(pat.options, pat.optionLayout);

  // tools
  const hintLabel = `🔍 Hint (${pat.hintLevel}/2)`;
  UI.addButton("hint", hintLabel, rightX + 20, height*0.82, 220, 64, () => usePatternHint());

  UI.addButton("back", "← Back", 40, height - 90, 160, 60, () => gotoHub());

  pop();
}

function drawOptionButtons(opts, layout) {
  const rightX = width*0.40;
  const rightW = width*0.58;
  const y = height*0.52;
  const btnH = 88;
  const gap = 26;

  const n = opts.length;
  const btnW = Math.min(200, (rightW - 60 - gap*(n-1))/n);
  const startX = rightX + (rightW - (btnW*n + gap*(n-1)))/2;

  for (let i=0;i<n;i++){
    const x = startX + i*(btnW+gap);
    const label = opts[i];
    UI.addButton(`opt_${i}`, label, x, y, btnW, btnH, () => choosePattern(label), { textSize: 40 });
  }

  // gentle highlight region if hintLevel>=1 (visual cue)
  if (pat.hintLevel >= 1 && pat.hintHighlight) {
    push();
    noFill();
    stroke(255, 190, 0);
    strokeWeight(6);
    const hx = rightX + rightW*0.18;
    const hy = height*0.32;
    const hw = rightW*0.64;
    const hh = 80;
    rect(hx, hy, hw, hh, 18);
    pop();
  }
}

function choosePattern(choice) {
  // record attempt as courage (staying)
  addCourage(1);

  if (choice === pat.answer) {
    profile.stats.patternSolved += 1;
    // small coins: give per “case”
    pat.correctCount += 1;
    toast("⭐ You found a clue!");
    // every 3 correct = case solved => coins
    if (pat.correctCount % 3 === 0) {
      giveCoins(10); // case reward
      toast("🏅 Case solved! +coins");
    }
    saveGameData();
    pat = newPatternQuestion(profile);
  } else {
    pat.wrongStreak += 1;
    toast("🔍 Look again.");
    // after 2 wrongs, auto make next question easier OR encourage hint (we keep same question)
    if (pat.wrongStreak >= 2) {
      pat.hintNudge = true;
    }
  }
}

function usePatternHint() {
  if (pat.hintLevel >= 2) {
    toast("Hint is maxed.");
    return;
  }
  pat.hintLevel += 1;
  addCourage(2);

  if (pat.hintLevel === 1) {
    pat.hintHighlight = true; // highlight pattern area
    toast("🔍 Hint: Look for the repeating part.");
  } else if (pat.hintLevel === 2) {
    // reduce options (more for sister)
    if (pat.options.length > 2) {
      // keep answer + one distractor
      const keep = [pat.answer];
      for (const o of pat.options) {
        if (o !== pat.answer) { keep.push(o); break; }
      }
      pat.options = shuffleArray(keep);
    }
    toast("🔍 Hint: Fewer choices now.");
  }
}

// Generator: pattern / logic / memory-lite mix inside
function newPatternQuestion(p) {
  const isBrother = p.name === "brother";
  const englishOn = !!p.englishClues && isBrother;

  // Determine option count
  const optCount = isBrother ? 4 : 2 + (random() < 0.15 ? 1 : 0);

  // Choose template pool
  // Brother: 60% pattern, 25% logic, 15% memory-lite
  // Sister: 80% pattern, 15% logic, 5% memory-lite
  const r = random();
  let kind = "pattern";
  if (isBrother) {
    if (r < 0.60) kind = "pattern";
    else if (r < 0.85) kind = "logic";
    else kind = "memorylite";
  } else {
    if (r < 0.80) kind = "pattern";
    else if (r < 0.95) kind = "logic";
    else kind = "memorylite";
  }

  // Icons: use simple emoji now (V1). Later you’ll swap to your icon library.
  const SHAPES = ["🔵","🟠","🟢","🟡","🟣"];
  const FORMS  = ["⬛","⬜","🔺","⭐","🔶"];

  const WORDS = ["the","and","you","I","to","a","is","cat","dog","fish"]; // light

  let seq = [];
  let answer = null;

  if (kind === "pattern") {
    const t = isBrother ? randomChoice(["ABAB","AABB","ABCABC","PLUS2","MIRROR","MIX"]) : randomChoice(["ABAB","AABB","MIRROR"]);
    if (t === "ABAB") {
      const a = randomChoice(SHAPES);
      let b = randomChoice(SHAPES);
      while (b === a) b = randomChoice(SHAPES);
      seq = [a,b,a,b,"?"];
      answer = a;
    } else if (t === "AABB") {
      const a = randomChoice(FORMS);
      let b = randomChoice(FORMS);
      while (b === a) b = randomChoice(FORMS);
      seq = [a,a,b,b,"?"];
      answer = a;
    } else if (t === "ABCABC") {
      const a = randomChoice(SHAPES);
      let b = randomChoice(SHAPES);
      let c = randomChoice(SHAPES);
      while (b===a) b = randomChoice(SHAPES);
      while (c===a || c===b) c = randomChoice(SHAPES);
      seq = [a,b,c,a,b,c,"?"];
      answer = a;
    } else if (t === "PLUS2") {
      // represent numbers as plain digits (brother only)
      const start = Math.floor(random(1, 8));
      seq = [`${start}`, `${start+2}`, `${start+4}`, `${start+6}`, "?"];
      answer = `${start+8}`;
    } else if (t === "MIRROR") {
      const a = randomChoice(FORMS);
      const b = randomChoice(FORMS);
      seq = [a,b,b,a,"?"];
      answer = a;
    } else { // MIX
      const a = randomChoice(SHAPES);
      const n = Math.floor(random(1, 4));
      seq = [a, `${n}`, a, `${n}`, a, "?"];
      answer = `${n}`;
    }
  } else if (kind === "logic") {
    // “odd one out” with emojis or words
    const useWords = englishOn && random() < 0.35;
    if (useWords) {
      // 3 animals + 1 non-animal
      const animals = ["cat","dog","fish"];
      const non = ["red","blue","moon","sun","hat"];
      const a1 = randomChoice(animals);
      let a2 = randomChoice(animals);
      let a3 = randomChoice(animals);
      const x = randomChoice(non);
      seq = [a1,a2,a3,x,"?"];
      answer = x; // “which doesn't belong” => choose odd (we ask next? but keep as “pick odd” disguised)
      // We'll display as "Find the odd clue" with ? slot.
    } else {
      // 3 same category shapes + 1 different
      const catA = SHAPES;
      const catB = FORMS;
      const pickA = randomChoice(catA);
      const pickB = randomChoice(catB);
      const pool = [pickA, randomChoice(catA), randomChoice(catA), pickB];
      seq = pool.map(x => x);
      // Use question as: "Which clue is different?"
      answer = pickB;
      // We'll show "Find the different clue" by using display string without "?" and treat options = seq (choose odd)
      // But for consistency, keep as seq + ? and answer is odd; display will be special.
      seq = [...pool, "?"];
    }
  } else { // memorylite
    // show 3 icons, ask “what was first?” by treating as pattern with '?'
    const a = randomChoice(SHAPES);
    let b = randomChoice(FORMS);
    let c = randomChoice(SHAPES);
    seq = [a,b,c,"?"];
    answer = a; // simplest
  }

  // Build options
  let options = buildOptions(answer, optCount, SHAPES, FORMS, WORDS);

  // Display string
  let prompt = "What comes next?";
  if (kind === "logic") prompt = "Find the different clue.";
  if (kind === "memorylite") prompt = "What was first?";

  let display = seq.join("   ");

  return {
    kind,
    prompt,
    seq,
    display,
    answer,
    options,
    optionLayout: {},
    hintLevel: 0,
    hintHighlight: false,
    wrongStreak: 0,
    hintNudge: false,
    correctCount: (pat?.correctCount ?? 0) // carry streak of correct inside mode
  };
}

function buildOptions(answer, count, SHAPES, FORMS, WORDS) {
  const set = new Set([answer]);
  const candidates = [];

  // numeric distractors
  if (/^\d+$/.test(answer)) {
    const a = parseInt(answer, 10);
    candidates.push(String(a+1), String(a-1), String(a+2), String(a-2), String(a+3));
  } else {
    candidates.push(...SHAPES, ...FORMS, ...WORDS);
  }

  // filter & random fill
  for (let i=0;i<50 && set.size < count;i++){
    const pick = randomChoice(candidates);
    if (pick !== answer) set.add(pick);
  }

  let arr = Array.from(set);
  // Ensure exact count
  while (arr.length > count) arr.pop();
  while (arr.length < count) arr.push(randomChoice(candidates));

  arr = shuffleArray(arr);
  return arr;
}

// ---------- Make 10 / Make 5 ----------
function startMake() {
  screen = "make";
  makeState = newMakeQuestion(profile);
}

function drawMakeGame() {
  push();
  fill(0);
  textSize(Math.min(40, width*0.038));
  text(profile.name==="brother" ? "🔟 Make 10" : "🔟 Make 5", width*0.67, height*0.12);

  drawCatStage(width*0.18, height*0.50, width*0.30, height*0.72);

  const rightX = width*0.40;
  const rightW = width*0.58;

  stroke(160); strokeWeight(2); fill(255, 235);
  rect(rightX, height*0.18, rightW, height*0.62, 22);

  noStroke(); fill(20);
  textSize(22);
  text("Find the pair!", rightX + rightW/2, height*0.24);

  textSize(56);
  fill(0);
  text(`${makeState.a} + ? = ${makeState.target}`, rightX + rightW/2, height*0.36);

  // options
  const opts = makeState.options;
  const y = height*0.52;
  const btnH = 88;
  const gap = 26;
  const n = opts.length;
  const btnW = Math.min(200, (rightW - 60 - gap*(n-1))/n);
  const startX = rightX + (rightW - (btnW*n + gap*(n-1)))/2;

  for (let i=0;i<n;i++){
    const x = startX + i*(btnW+gap);
    const label = String(opts[i]);
    UI.addButton(`mk_${i}`, label, x, y, btnW, btnH, () => chooseMake(opts[i]), { textSize: 44 });
  }

  // hint button (one layer)
  UI.addButton("mk_hint", "🔍 Hint", rightX + 20, height*0.82, 220, 64, () => useMakeHint());

  UI.addButton("back", "← Back", 40, height - 90, 160, 60, () => gotoHub());
  pop();
}

function newMakeQuestion(p) {
  const isBrother = p.name === "brother";
  const target = isBrother ? 10 : 5;
  const maxA = isBrother ? 9 : 4; // keep simple
  const a = Math.floor(random(1, maxA+1));
  const answer = target - a;

  // options: brother 4, sister 2/3
  const count = isBrother ? 4 : (random()<0.2 ? 3 : 2);
  const optionsSet = new Set([answer]);

  // plausible distractors near answer
  const near = [answer-1, answer+1, answer-2, answer+2, answer+3, answer-3]
    .filter(x => x >= 0 && x <= target);

  while (optionsSet.size < count && near.length>0) {
    optionsSet.add(near.splice(Math.floor(random(0, near.length)),1)[0]);
  }
  while (optionsSet.size < count) {
    optionsSet.add(Math.floor(random(0, target+1)));
  }

  let options = Array.from(optionsSet);
  options = shuffleArray(options);

  return {
    target,
    a,
    answer,
    options,
    hintUsed: false,
    wrong: 0,
    correctCount: (makeState?.correctCount ?? 0)
  };
}

function chooseMake(choice) {
  addCourage(1);

  if (choice === makeState.answer) {
    profile.stats.makeSolved += 1;
    makeState.correctCount += 1;
    toast("⭐ Nice pair!");

    // every 3 correct => case coins
    if (makeState.correctCount % 3 === 0) {
      giveCoins(10);
      toast("🏅 Case solved! +coins");
    }

    saveGameData();
    makeState = newMakeQuestion(profile);
  } else {
    makeState.wrong += 1;
    toast("💛 Try again.");
  }
}

function useMakeHint() {
  if (makeState.hintUsed) {
    toast("Hint already used.");
    return;
  }
  makeState.hintUsed = true;
  addCourage(2);

  // Reduce options to answer + one distractor
  if (makeState.options.length > 2) {
    const keep = [makeState.answer];
    for (const o of makeState.options) {
      if (o !== makeState.answer) { keep.push(o); break; }
    }
    makeState.options = shuffleArray(keep);
  }
  toast("🔍 Fewer choices now.");
}

// ---------- Memory Match ----------
function startMatch() {
  screen = "match";
  matchState = newMatch(profile);
}

function drawMatchGame() {
  push();
  fill(0);
  textSize(Math.min(40, width*0.038));
  text("🧠 Memory Match", width*0.67, height*0.12);

  drawCatStage(width*0.18, height*0.50, width*0.30, height*0.72);

  const rightX = width*0.40;
  const rightW = width*0.58;

  stroke(160); strokeWeight(2); fill(255, 235);
  rect(rightX, height*0.18, rightW, height*0.62, 22);

  noStroke(); fill(20);
  textSize(22);
  text(`Find pairs • Matched: ${matchState.matchedPairs}/${matchState.totalPairs}`, rightX + rightW/2, height*0.24);

  drawMatchGrid(rightX, rightW);

  UI.addButton("back", "← Back", 40, height - 90, 160, 60, () => gotoHub());
  pop();
}

function newMatch(p) {
  const isBrother = p.name === "brother";
  const pairs = isBrother ? 6 : 3; // 12 cards vs 6 cards
  const totalCards = pairs * 2;

  // theme icons depend on world
  const world = WORLDS[p.worldIndex]?.name ?? "Home";
  let pool = ["⭐","🔵","⬜","🔺","🔶","🟢","🟡","🟣","🟠","🌙","☁️","🌸","🍃","🐚","🐟"];
  if (world === "Garden") pool = ["🌸","🍃","🐝","🦋","🟢","🟡","⭐","🔺","⬜","🔷"];
  if (world === "Beach") pool = ["🐟","🐚","⭐","🌊","🟦","🟨","🔵","🔶","🌙","☁️"];

  pool = shuffleArray(pool).slice(0, pairs);

  // build deck
  let deck = [];
  for (const icon of pool) {
    deck.push({ icon, revealed:false, matched:false });
    deck.push({ icon, revealed:false, matched:false });
  }
  deck = shuffleArray(deck);

  // grid
  const cols = isBrother ? 4 : 3;
  const rows = Math.ceil(totalCards / cols);

  return {
    deck,
    cols,
    rows,
    firstIndex: null,
    secondIndex: null,
    lock: false,
    matchedPairs: 0,
    totalPairs: pairs,
    correctCount: (matchState?.correctCount ?? 0)
  };
}

function drawMatchGrid(panelX, panelW) {
  const top = height*0.30;
  const bottom = height*0.76;
  const areaH = bottom - top;

  const cols = matchState.cols;
  const rows = matchState.rows;

  const gap = 14;
  const cardW = Math.min(140, (panelW - 80 - gap*(cols-1))/cols);
  const cardH = Math.min(140, (areaH - gap*(rows-1))/rows);

  const gridW = cardW*cols + gap*(cols-1);
  const gridH = cardH*rows + gap*(rows-1);

  const startX = panelX + (panelW - gridW)/2;
  const startY = top + (areaH - gridH)/2;

  for (let i=0;i<matchState.deck.length;i++){
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = startX + c*(cardW+gap);
    const y = startY + r*(cardH+gap);

    const card = matchState.deck[i];

    // draw card
    push();
    stroke(160); strokeWeight(2);
    fill(255);
    rect(x, y, cardW, cardH, 18);

    noStroke();
    if (card.matched) {
      fill(0, 160, 0, 40);
      rect(x, y, cardW, cardH, 18);
    }

    fill(0);
    textSize(Math.min(54, cardH*0.55));
    const face = (card.revealed || card.matched) ? card.icon : "❓";
    text(face, x + cardW/2, y + cardH/2);
    pop();

    // clickable via invisible UI button
    UI.addButton(`card_${i}`, "", x, y, cardW, cardH, () => clickCard(i), { textSize: 1 });
  }
}

function clickCard(i) {
  if (matchState.lock) return;
  const card = matchState.deck[i];
  if (card.matched || card.revealed) return;

  addCourage(1);

  card.revealed = true;

  if (matchState.firstIndex === null) {
    matchState.firstIndex = i;
    return;
  }
  if (matchState.secondIndex === null) {
    matchState.secondIndex = i;
    matchState.lock = true;

    const a = matchState.deck[matchState.firstIndex];
    const b = matchState.deck[matchState.secondIndex];

    if (a.icon === b.icon) {
      // match
      setTimeout(() => {
        a.matched = true;
        b.matched = true;
        matchState.matchedPairs += 1;
        matchState.firstIndex = null;
        matchState.secondIndex = null;
        matchState.lock = false;

        profile.stats.matchSolved += 1;
        matchState.correctCount += 1;

        toast("⭐ Match!");

        // Every 3 matches => case reward
        if (matchState.correctCount % 3 === 0) {
          giveCoins(10);
          toast("🏅 Case solved! +coins");
        }

        // Finish round
        if (matchState.matchedPairs >= matchState.totalPairs) {
          toast("🌟 Nice! New round.");
          // courage boost for completion
          addCourage(4);
          matchState = newMatch(profile);
        }
        saveGameData();
      }, 250);
    } else {
      // flip back
      setTimeout(() => {
        a.revealed = false;
        b.revealed = false;
        matchState.firstIndex = null;
        matchState.secondIndex = null;
        matchState.lock = false;
        toast("💛 Try again.");
      }, 650);
    }
  }
}

// ---------- Mouse ----------
function mousePressed() {
  // Global press handler
  if (UI.handlePress()) return;
}

// ---------- Utilities ----------
function randomChoice(arr) {
  return arr[Math.floor(random(0, arr.length))];
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(random(0, i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
