const cast = [
  {
    id: "amida",
    name: "阿弥陀如来",
    color: "#f5b942",
    specialName: "無量光来迎陣",
    doctrine: "無量寿・無量光の慈悲を象徴する光輪で相手を包む。",
    projectileColor: "#ffe27a",
  },
  {
    id: "yakushi",
    name: "薬師如来",
    color: "#49c1e2",
    specialName: "瑠璃光浄波",
    doctrine: "病苦を癒す瑠璃光を衝撃波に転じて放つ。",
    projectileColor: "#7be7ff",
  },
  {
    id: "dainichi",
    name: "大日如来",
    color: "#d77dff",
    specialName: "大日遍照マンダラ",
    doctrine: "遍照の智慧を曼荼羅陣として展開し、連続ヒットを狙う。",
    projectileColor: "#f2b3ff",
  },
  {
    id: "fudo",
    name: "不動明王",
    color: "#ff6f61",
    specialName: "煩悩断滅剣",
    doctrine: "煩悩を断つ忿怒の剣気で前方を薙ぎ払う。",
    projectileColor: "#ffb089",
  },
  {
    id: "kukai",
    name: "空海",
    color: "#73d08a",
    specialName: "真言雷蔵",
    doctrine: "真言密教の印契を結び、雷の法力を叩き込む。",
    projectileColor: "#b2ffb8",
  },
  {
    id: "saicho",
    name: "最澄",
    color: "#4d86ff",
    specialName: "一乗円頓華",
    doctrine: "法華一乗の円頓を象徴する花弁衝撃を放つ。",
    projectileColor: "#9cbcff",
  },
  {
    id: "shinran",
    name: "親鸞",
    color: "#ffaa3b",
    specialName: "絶対他力念陣",
    doctrine: "念仏の信を力に変え、不可避の光弾を撃つ。",
    projectileColor: "#ffcb82",
  },
  {
    id: "nichiren",
    name: "日蓮",
    color: "#ff4ea4",
    specialName: "題目轟天波",
    doctrine: "南無妙法蓮華経の勢いを轟音波として具現化。",
    projectileColor: "#ff9bd0",
  },
];

const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const p1Select = document.getElementById("p1-character");
const p2Select = document.getElementById("p2-character");

const controls = {
  p1: { left: "a", right: "d", jump: "w", down: "s", weak: "f", strong: "g", special: "h" },
  p2: {
    left: "ArrowLeft",
    right: "ArrowRight",
    jump: "ArrowUp",
    down: "ArrowDown",
    weak: "k",
    strong: "l",
    special: ";",
  },
};

const state = {
  running: false,
  timeLeft: 99,
  timerAccumulator: 0,
  keys: new Set(),
  particles: [],
  projectiles: [],
  winnerText: "STARTを押して開始",
  players: [],
};

function fillCharacterSelects() {
  cast.forEach((fighter, index) => {
    const opt1 = document.createElement("option");
    const opt2 = document.createElement("option");
    opt1.value = fighter.id;
    opt2.value = fighter.id;
    opt1.textContent = `${fighter.name} - ${fighter.specialName}`;
    opt2.textContent = `${fighter.name} - ${fighter.specialName}`;
    p1Select.appendChild(opt1);
    p2Select.appendChild(opt2);

    if (index === 0) p1Select.value = fighter.id;
    if (index === 3) p2Select.value = fighter.id;
  });
}

function makePlayer(slot, x, dir, control) {
  const selectedId = slot === 1 ? p1Select.value : p2Select.value;
  const fighter = cast.find((c) => c.id === selectedId) || cast[0];
  return {
    slot,
    fighter,
    x,
    y: 380,
    w: 70,
    h: 140,
    vx: 0,
    vy: 0,
    dir,
    onGround: true,
    hp: 100,
    meter: 0,
    hitstun: 0,
    attackCd: 0,
    control,
    flash: 0,
  };
}

function resetGame() {
  state.running = true;
  state.timeLeft = 99;
  state.timerAccumulator = 0;
  state.particles = [];
  state.projectiles = [];
  state.winnerText = "対戦中";
  state.players = [
    makePlayer(1, 210, 1, controls.p1),
    makePlayer(2, 920, -1, controls.p2),
  ];
}

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 25 + Math.random() * 15,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnProjectile(player, damage, speed, radius = 14, type = "special") {
  state.projectiles.push({
    owner: player.slot,
    x: player.x + player.w / 2 + player.dir * 30,
    y: player.y + 50,
    vx: speed * player.dir,
    radius,
    damage,
    type,
    color: player.fighter.projectileColor,
    life: 180,
  });
}

function collideRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function handleInput(player, enemy) {
  if (player.hitstun > 0) return;
  const { left, right, jump, down, weak, strong, special } = player.control;

  player.vx = 0;
  if (state.keys.has(left)) {
    player.vx = -4.5;
    player.dir = -1;
  }
  if (state.keys.has(right)) {
    player.vx = 4.5;
    player.dir = 1;
  }

  if (state.keys.has(jump) && player.onGround) {
    player.vy = -12;
    player.onGround = false;
  }

  if (state.keys.has(down) && player.onGround) {
    player.vx *= 0.5;
  }

  if (player.attackCd <= 0 && state.keys.has(weak)) {
    basicAttack(player, enemy, 6, 20, 18);
    player.attackCd = 14;
  }

  if (player.attackCd <= 0 && state.keys.has(strong)) {
    basicAttack(player, enemy, 10, 36, 24);
    player.attackCd = 25;
  }

  if (player.attackCd <= 0 && state.keys.has(special) && player.meter >= 50) {
    player.meter -= 50;
    player.attackCd = 42;
    spawnProjectile(player, 18, 7.2, 17, "special");
    spawnParticles(player.x + player.w / 2, player.y + 40, player.fighter.projectileColor, 24);
  }
}

function basicAttack(player, enemy, damage, reach, knockback) {
  const hitbox = {
    x: player.dir === 1 ? player.x + player.w : player.x - reach,
    y: player.y + 20,
    w: reach,
    h: 80,
  };

  if (collideRect(hitbox, enemy)) {
    enemy.hp -= damage;
    enemy.vx += knockback * 0.13 * player.dir;
    enemy.hitstun = 10;
    enemy.flash = 4;
    player.meter = Math.min(100, player.meter + 8);
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + 50, "#fff4b8", 18);
  }
}

function updateProjectiles(p1, p2) {
  state.projectiles.forEach((proj) => {
    proj.x += proj.vx;
    proj.life -= 1;

    const target = proj.owner === p1.slot ? p2 : p1;
    const hitbox = { x: proj.x - proj.radius, y: proj.y - proj.radius, w: proj.radius * 2, h: proj.radius * 2 };

    if (collideRect(hitbox, target)) {
      target.hp -= proj.damage;
      target.hitstun = 14;
      target.vx += Math.sign(proj.vx) * 3;
      target.flash = 6;
      spawnParticles(target.x + target.w / 2, target.y + 40, proj.color, 26);
      proj.life = 0;
    }
  });

  state.projectiles = state.projectiles.filter(
    (proj) => proj.life > 0 && proj.x > -30 && proj.x < canvas.width + 30,
  );
}

function updateParticles() {
  state.particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.life -= 1;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
}

function applyPhysics(player) {
  player.x += player.vx;
  player.y += player.vy;
  if (!player.onGround) player.vy += 0.58;

  if (player.y >= 380) {
    player.y = 380;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.x < 20) player.x = 20;
  if (player.x + player.w > canvas.width - 20) player.x = canvas.width - player.w - 20;

  if (player.attackCd > 0) player.attackCd -= 1;
  if (player.hitstun > 0) player.hitstun -= 1;
  if (player.flash > 0) player.flash -= 1;

  player.meter = Math.min(100, player.meter + 0.035);
}

function checkRoundEnd() {
  const [p1, p2] = state.players;
  if (p1.hp <= 0 || p2.hp <= 0 || state.timeLeft <= 0) {
    state.running = false;

    if (p1.hp === p2.hp) {
      state.winnerText = "引き分け";
    } else if (p1.hp > p2.hp) {
      state.winnerText = `勝者: P1 ${p1.fighter.name}`;
    } else {
      state.winnerText = `勝者: P2 ${p2.fighter.name}`;
    }
  }
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "#352114");
  grd.addColorStop(1, "#120b07");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 220, 130, 0.08)";
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath();
    ctx.arc(60 + i * 70, 90 + (i % 3) * 20, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 186, 88, 0.18)";
  ctx.fillRect(0, 448, canvas.width, 72);
}

function drawUI() {
  const [p1, p2] = state.players;
  ctx.fillStyle = "rgba(12, 8, 6, 0.85)";
  ctx.fillRect(0, 0, canvas.width, 82);

  drawHpBar(26, 20, 420, p1.hp, p1.fighter.name, "left");
  drawHpBar(canvas.width - 446, 20, 420, p2.hp, p2.fighter.name, "right");

  ctx.fillStyle = "#f5d18f";
  ctx.font = "bold 42px serif";
  ctx.textAlign = "center";
  ctx.fillText(state.timeLeft.toString(), canvas.width / 2, 54);

  drawMeter(26, 60, p1.meter, p1.fighter.specialName);
  drawMeter(canvas.width - 446, 60, p2.meter, p2.fighter.specialName, true);
}

function drawHpBar(x, y, w, hp, name, align) {
  const value = Math.max(0, hp) / 100;
  ctx.fillStyle = "#27190f";
  ctx.fillRect(x, y, w, 20);
  ctx.fillStyle = value > 0.35 ? "#efc257" : "#ea6d60";
  const hpw = w * value;
  if (align === "left") {
    ctx.fillRect(x, y, hpw, 20);
  } else {
    ctx.fillRect(x + w - hpw, y, hpw, 20);
  }
  ctx.strokeStyle = "#5a3c1c";
  ctx.strokeRect(x, y, w, 20);
  ctx.fillStyle = "#ffefce";
  ctx.font = "17px sans-serif";
  ctx.textAlign = align;
  ctx.fillText(name, align === "left" ? x : x + w, y - 4);
}

function drawMeter(x, y, meter, specialName, right = false) {
  const w = 240;
  const v = Math.max(0, Math.min(100, meter));
  ctx.fillStyle = "#1a253a";
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = "#6bb5ff";
  const mw = (w * v) / 100;
  if (right) {
    ctx.fillRect(x + w - mw, y, mw, 12);
  } else {
    ctx.fillRect(x, y, mw, 12);
  }
  ctx.strokeStyle = "#304a70";
  ctx.strokeRect(x, y, w, 12);

  ctx.fillStyle = "#cae4ff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = right ? "right" : "left";
  ctx.fillText(`${specialName} (${Math.floor(v)}/100)`, right ? x + w : x, y + 26);
}

function drawPlayer(player) {
  const main = player.flash > 0 ? "#ffffff" : player.fighter.color;
  ctx.fillStyle = main;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(player.x + 10, player.y + 10, player.w - 20, 24);

  ctx.fillStyle = "#1d150f";
  ctx.fillRect(player.x + 18, player.y + 54, player.w - 36, 74);

  if (player.hitstun <= 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 4;
    const handX = player.dir === 1 ? player.x + player.w + 8 : player.x - 8;
    ctx.beginPath();
    ctx.moveTo(player.x + player.w / 2, player.y + 62);
    ctx.lineTo(handX, player.y + 68);
    ctx.stroke();
  }
}

function drawProjectiles() {
  state.projectiles.forEach((proj) => {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = proj.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius * 1.8, 0, Math.PI * 2);
    ctx.strokeStyle = `${proj.color}66`;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

function drawDoctrineCards() {
  const [p1, p2] = state.players;
  ctx.fillStyle = "rgba(15, 9, 7, 0.62)";
  ctx.fillRect(18, 86, 420, 64);
  ctx.fillRect(canvas.width - 438, 86, 420, 64);

  ctx.fillStyle = "#ffd99e";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`P1 ${p1.fighter.specialName}`, 28, 108);
  ctx.fillStyle = "#f6e3c0";
  ctx.font = "13px sans-serif";
  ctx.fillText(p1.fighter.doctrine, 28, 130);

  ctx.fillStyle = "#ffd99e";
  ctx.textAlign = "right";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(`P2 ${p2.fighter.specialName}`, canvas.width - 28, 108);
  ctx.fillStyle = "#f6e3c0";
  ctx.font = "13px sans-serif";
  ctx.fillText(p2.fighter.doctrine, canvas.width - 28, 130);
}

function drawWinner() {
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffe7bc";
  ctx.font = "bold 54px serif";
  ctx.textAlign = "center";
  ctx.fillText(state.winnerText, canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = "24px sans-serif";
  ctx.fillText("STARTボタンで再戦", canvas.width / 2, canvas.height / 2 + 24);
}

function gameLoop() {
  drawBackground();

  if (state.players.length === 2) {
    const [p1, p2] = state.players;

    if (state.running) {
      handleInput(p1, p2);
      handleInput(p2, p1);

      applyPhysics(p1);
      applyPhysics(p2);

      updateProjectiles(p1, p2);
      updateParticles();

      state.timerAccumulator += 1;
      if (state.timerAccumulator >= 60) {
        state.timeLeft -= 1;
        state.timerAccumulator = 0;
      }

      checkRoundEnd();
    }

    drawUI();
    drawDoctrineCards();
    drawProjectiles();
    drawParticles();
    drawPlayer(p1);
    drawPlayer(p2);

    if (!state.running) {
      drawWinner();
    }
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => {
  state.keys.add(e.key);

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", ";"].includes(e.key)) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  state.keys.delete(e.key);
});

startBtn.addEventListener("click", () => {
  resetGame();
});

fillCharacterSelects();
resetGame();
gameLoop();
