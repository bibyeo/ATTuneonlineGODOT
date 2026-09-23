/* ---------- 3D world ---------- */
const W3 = { ok:false, renderer:null, camera:null, room:null, rooms:{}, mouse:{x:0,y:0}, camPos:null, camLook:null, curPos:null, curLook:null, t:0 };
const V = (x,y,z) => (window.THREE ? new THREE.Vector3(x,y,z) : { x, y, z });

function init3D(){
  if (!window.THREE) return false;
  try {
    W3.small = innerWidth <= 820 || (window.matchMedia && matchMedia("(pointer: coarse)").matches);   // phones and tablets: lighter render, same rooms
    const r = new THREE.WebGLRenderer({ antialias: !W3.small, powerPreference:"high-performance" });
    r.setPixelRatio(W3.small ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = !W3.small; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); if (window.showFatal) showFatal("This device ran out of graphics memory."); });
    document.getElementById("stage").appendChild(r.domElement);
    W3.renderer = r;
    W3.camera = new THREE.PerspectiveCamera(56, innerWidth/innerHeight, 0.05, 90);
    W3.curPos = V(0, 6, 12); W3.curLook = V(0, 1, 0); W3.camPos = W3.curPos.clone(); W3.camLook = W3.curLook.clone();
    W3.lastW = innerWidth;
    addEventListener("resize", () => {
      if (W3.small && innerWidth === W3.lastW) return;      // soft keyboard: leave the canvas alone
      W3.lastW = innerWidth;
      r.setSize(innerWidth, innerHeight); W3.camera.aspect = innerWidth/innerHeight; W3.camera.updateProjectionMatrix();
    });
    addEventListener("pointermove", e => { W3.mouse.x = (e.clientX/innerWidth)*2 - 1; W3.mouse.y = (e.clientY/innerHeight)*2 - 1; });
    W3.ok = true;
    W3.builders = { classroom: buildClassroom, lecture: buildLecture };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (W3.texts || []).forEach(redrawTex));
    return true;
  } catch(e) { console.error(e); W3.ok = false; return false; }
}

/* materials */
const M = {};
function mats(){
  if (M.world) return M;
  M.world = new THREE.MeshStandardMaterial({ color:0xF2F3F6, roughness:0.92, flatShading:true });
  M.floor = new THREE.MeshStandardMaterial({ color:0xE4E7ED, roughness:0.95 });
  M.soft = new THREE.MeshStandardMaterial({ color:0xD5D9E1, roughness:0.9, flatShading:true });
  M.board = new THREE.MeshStandardMaterial({ color:0x2A2E38, roughness:0.85 });
  M.light = new THREE.MeshBasicMaterial({ color:0xFFFFFF });
  return M;
}
const RED = 0xE3312B, BLACK = 0x17191F, GREY = 0xC4C8D1;
function figMat(color){
  const shiny = color === BLACK;
  return new THREE.MeshStandardMaterial({ color, roughness: shiny ? 0.16 : (color === RED ? 0.34 : 0.75), metalness: shiny ? 0.3 : 0.06, flatShading:true, emissive:0x000000 });
}
function facet(geo, amt=0.01){
  const p = geo.attributes.position, seen = new Map();
  for (let i=0;i<p.count;i++){
    const k = `${Math.round(p.getX(i)*1e4)},${Math.round(p.getY(i)*1e4)},${Math.round(p.getZ(i)*1e4)}`;
    if (!seen.has(k)) seen.set(k, [(Math.random()-.5)*amt, (Math.random()-.5)*amt, (Math.random()-.5)*amt]);
    const o = seen.get(k);
    p.setXYZ(i, p.getX(i)+o[0], p.getY(i)+o[1], p.getZ(i)+o[2]);
  }
  geo.computeVertexNormals();
  return geo;
}
function box(w,h,d, mat, x,y,z, parent, shadow=true){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  m.position.set(x,y,z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function canvasTex(w, h, draw){
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.userData = { ctx, draw, w, h };
  return tex;
}
function fitText(c, text, weightFamily, size, maxW){
  let px = size; c.font = `${weightFamily.replace('{px}', px)}`;
  while (c.measureText(text).width > maxW && px > 10) { px -= 4; c.font = weightFamily.replace('{px}', px); }
}
function redrawTex(tex){ const u = tex.userData; u.ctx.clearRect(0,0,u.w,u.h); u.draw(u.ctx,u.w,u.h); tex.needsUpdate = true; }

/* low-poly person */
function makeFigure(color, { seated=false, scale=1, shadow=true, horse=false }={}){
  const mat = figMat(color);
  const g = new THREE.Group();
  const add = (geo, parent, x,y,z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = shadow; parent.add(m); return m; };
  const hips = new THREE.Group(); hips.position.y = seated ? 0.47 : 0.93; g.add(hips);
  add(facet(new THREE.CylinderGeometry(0.15,0.17,0.17,6)), hips, 0, 0.02, 0);
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  add(facet(new THREE.CylinderGeometry(0.215,0.145,0.54,6), 0.02), torso, 0, 0.27, 0);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.56; torso.add(headPivot);
  add(facet(new THREE.CylinderGeometry(0.045,0.06,0.1,5)), headPivot, 0, 0.03, 0);
  let head;
  if (horse) {
    head = add(facet(new THREE.IcosahedronGeometry(0.115, 0), 0.012), headPivot, 0, 0.21, 0);
    head.scale.set(0.85, 1.05, 1.15);
    const muzzle = add(facet(new THREE.CylinderGeometry(0.055, 0.078, 0.27, 6), 0.008), headPivot, 0, 0.17, 0.2);
    muzzle.rotation.x = Math.PI/2 + 0.12;
    add(facet(new THREE.SphereGeometry(0.058, 6, 4), 0.006), headPivot, 0, 0.145, 0.32);
    [-1, 1].forEach(side => { const ear = add(new THREE.ConeGeometry(0.034, 0.12, 4), headPivot, 0.058*side, 0.33, -0.02); ear.rotation.z = 0.28*side; ear.rotation.x = -0.12; });
    [0, 1, 2, 3].forEach(i => { const mane = add(facet(new THREE.BoxGeometry(0.05, 0.08, 0.05), 0.006), headPivot, 0, 0.3 - i*0.075, -0.1 - i*0.015); mane.rotation.x = -0.22; });
  } else {
    head = add(facet(new THREE.IcosahedronGeometry(0.128, 0), 0.018), headPivot, 0, 0.2, 0.01);
    head.scale.set(0.9, 1.2, 1);
  }
  const arm = s => {
    const sh = new THREE.Group(); sh.position.set(0.26*s, 0.5, 0); torso.add(sh);
    add(facet(new THREE.CylinderGeometry(0.06,0.045,0.33,5)), sh, 0, -0.165, 0);
    const el = new THREE.Group(); el.position.y = -0.33; sh.add(el);
    add(facet(new THREE.CylinderGeometry(0.046,0.035,0.3,5)), el, 0, -0.15, 0);
    add(facet(new THREE.IcosahedronGeometry(0.048, 0)), el, 0, -0.33, 0);
    return { sh, el };
  };
  const L = arm(-1), R = arm(1);
  const leg = s => {
    const hip = new THREE.Group(); hip.position.set(0.09*s, -0.03, 0); hips.add(hip);
    add(facet(new THREE.CylinderGeometry(0.085,0.06,0.46,5)), hip, 0, -0.23, 0);
    const knee = new THREE.Group(); knee.position.y = -0.46; hip.add(knee);
    add(facet(new THREE.CylinderGeometry(0.06,0.045,0.44,5)), knee, 0, -0.22, 0);
    add(facet(new THREE.BoxGeometry(0.1,0.06,0.22)), knee, 0, -0.45, 0.05);
    return { hip, knee };
  };
  const LL = leg(-1), LR = leg(1);
  g.userData = { mat, color, hips, torso, headPivot, L, R, LL, LR, seated, stand:seated?0:1, standTarget:seated?0:1, phase:Math.random()*10, talk:0, talkTarget:0, turn:0, turnTarget:0, lean:0, gesture:false, walk:0 };
  poseFigure(g, 0);
  g.scale.setScalar(scale);
  return g;
}
function setFigColor(g, color){ if (!g || !g.userData || !g.userData.mat) return; const u = g.userData; u.color = color; u.mat.color.setHex(color); const shiny = color === BLACK; u.mat.roughness = shiny ? .16 : (color === RED ? .34 : .75); u.mat.metalness = shiny ? .3 : .06; }
function poseFigure(g, t){
  const u = g.userData;
  u.stand += (u.standTarget - u.stand) * 0.08;
  const s = u.stand; // 0 seated, 1 standing
  u.hips.position.y = 0.47 + 0.46*s;
  const walkSwing = u.walk ? Math.sin(t*7)*0.5*u.walk : 0;
  u.LL.hip.rotation.x = -Math.PI/2*(1-s) + walkSwing; u.LR.hip.rotation.x = -Math.PI/2*(1-s) - walkSwing;
  u.LL.knee.rotation.x = Math.PI/2*(1-s); u.LR.knee.rotation.x = Math.PI/2*(1-s);
  u.talk += (u.talkTarget - u.talk) * 0.2;
  u.turn += (u.turnTarget - u.turn) * 0.06;
  const k = u.talk;
  u.headPivot.rotation.y = u.turn;
  u.headPivot.rotation.x = Math.sin(t*9 + u.phase)*0.07*k + Math.sin(t*0.7+u.phase)*0.03;
  u.headPivot.rotation.z = Math.sin(t*4.3 + u.phase)*0.05*k;
  u.torso.rotation.y = u.turn*0.35;
  u.torso.rotation.z = u.lean;
  u.torso.scale.y = 1 + Math.sin(t*1.7 + u.phase)*0.012;
  const baseSh = -0.5*(1-s), baseEl = -0.9*(1-s);
  const gest = u.gesture ? k*(0.5 + 0.35*Math.sin(t*5 + u.phase)) : 0;
  u.R.sh.rotation.x = baseSh - gest - (u.holdBook ? 0.9 : 0); u.R.el.rotation.x = baseEl - gest*0.8 - (u.holdBook ? 0.7 : 0);
  u.L.sh.rotation.x = baseSh - (u.holdBook ? 0.9 : k*0.15); u.L.el.rotation.x = baseEl - (u.holdBook ? 0.7 : 0);
  u.R.sh.rotation.z = -0.08*s - (u.walk ? 0 : 0); u.L.sh.rotation.z = 0.08*s;
  if (u.walk) { u.R.sh.rotation.x += -walkSwing*0.6; u.L.sh.rotation.x += walkSwing*0.6; }
  if (u.color === RED || u.color === BLACK) {
    const glow = u.color === RED ? k*0.55 : k*0.12;
    u.mat.emissive.setRGB(glow, u.color === RED ? glow*0.12 : glow, u.color === RED ? glow*0.1 : glow);
  } else u.mat.emissive.setRGB(0,0,0);
}
function headWorld(g, up=0.42){ if (!W3.ok || !g) return null; const v = V(0,0,0); g.userData.headPivot.getWorldPosition(v); v.y += up*g.scale.y; return v; }

function desk(parent, x, z, withChair=true){
  const m = mats();
  box(1.05, 0.05, 0.62, m.world, x, 0.74, z, parent);
  [[-0.47,-0.26],[0.47,-0.26],[-0.47,0.26],[0.47,0.26]].forEach(([dx,dz]) => box(0.045, 0.72, 0.045, m.soft, x+dx, 0.36, z+dz, parent));
  if (withChair){
    box(0.46, 0.05, 0.44, m.world, x, 0.45, z+0.5, parent);
    box(0.46, 0.5, 0.04, m.world, x, 0.72, z+0.72, parent);
    [[-0.2,0.3],[0.2,0.3],[-0.2,0.7],[0.2,0.7]].forEach(([dx,dz]) => box(0.035, 0.45, 0.035, m.soft, x+dx, 0.225, z+dz, parent));
  }
}
function lights(scene, dirPos){
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0xB9BFCC, 1.25));
  const d = new THREE.DirectionalLight(0xFFFFFF, 2.1);
  d.position.set(...dirPos); d.castShadow = !W3.small;
  d.shadow.mapSize.set(1024, 1024); d.shadow.camera.left = -9; d.shadow.camera.right = 9; d.shadow.camera.top = 9; d.shadow.camera.bottom = -9; d.shadow.camera.far = 40; d.shadow.bias = -0.0008; d.shadow.normalBias = 0.02;
  scene.add(d);
}

function buildClassroom(){
  const m = mats();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xEDEFF3);
  scene.fog = new THREE.Fog(0xEDEFF3, 9, 24);
  lights(scene, [-7, 9, 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 18), m.floor); floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
  box(16, 4.2, 0.2, m.world, 0, 2.1, -6.2, scene, false);
  box(0.2, 4.2, 18, m.world, 7, 2.1, 0, scene, false);
  // left wall with windows
  box(0.2, 1.0, 18, m.world, -7, 0.5, 0, scene, false); box(0.2, 1.0, 18, m.world, -7, 3.7, 0, scene, false);
  for (let i=0;i<5;i++){ box(0.2, 2.2, 0.5, m.world, -7, 2.1, -6 + i*3.2, scene, false); const w = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.2), m.light); w.position.set(-6.88, 2.1, -4.4 + i*3.2); w.rotation.y = Math.PI/2; scene.add(w); }
  const boardTex = canvasTex(1024, 384, (c, w, h) => {
    c.fillStyle = "#2A2E38"; c.fillRect(0,0,w,h);
    c.fillStyle = "#EDEFF3"; fitText(c, "The Lighthouse Keeper", "900 {px}px 'Big Shoulders Display', Impact, sans-serif", 130, w - 120); c.fillText("The Lighthouse Keeper", 60, 175);
    c.fillStyle = "rgba(237,239,243,.6)"; fitText(c, "Read aloud, then questions", "600 {px}px 'Bricolage Grotesque', sans-serif", 54, w - 130); c.fillText("Read aloud, then questions", 64, 275);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.72, 0.06), [m.board, m.board, m.board, m.board, new THREE.MeshStandardMaterial({ map:boardTex, roughness:.9 }), m.board]);
  board.position.set(-0.6, 2.05, -6.05); scene.add(board);
  box(4.8, 0.05, 0.14, m.soft, -0.6, 1.16, -6.0, scene);
  box(1.6, 0.78, 0.8, m.world, 2.6, 0.39, -4.6, scene);
  // pupils
  const cols = [-2.5, -0.85, 0.85, 2.5], rows = [-2.8, -1.25, 0.3, 1.85];
  const kids = [];
  rows.forEach((z, ri) => cols.forEach((x, ci) => {
    desk(scene, x, z);
    if ((ri*4+ci) % 7 === 5) return;
    const isHorse = ri === 3 && ci === 3;      // one classmate is, inexplicably, a horse
    const f = makeFigure(RED, { seated:true, scale: isHorse ? 1.02 : 0.9 + Math.random()*0.12, horse:isHorse });
    f.position.set(x, 0, z + 0.5); f.rotation.y = Math.PI;
    scene.add(f); kids.push(f);
    f.userData.name = ri === 3 && ci === 1 ? "Sam" : ri === 3 && ci === 2 ? "Mia" : ri === 2 && ci === 3 ? "Leo" : null;
    f.userData.horse = isHorse;
  }));
  desk(scene, 0, 3.35, false);
  // player's desk items
  box(0.22, 0.03, 0.3, m.soft, -0.28, 0.785, 3.3, scene);
  box(0.22, 0.03, 0.3, m.world, -0.02, 0.785, 3.34, scene);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), m.light); sheet.rotation.x = -Math.PI/2; sheet.rotation.z = 0.15; sheet.position.set(0.28, 0.771, 3.3); scene.add(sheet);
  [0.02, 0.06].forEach((o, i) => { const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), i ? M.board : m.soft); pen.rotation.z = Math.PI/2; pen.rotation.y = 0.4; pen.position.set(0.45, 0.78, 3.18 + o); scene.add(pen); });
  const teacher = makeFigure(BLACK, { scale:1.05 });
  teacher.position.set(0.4, 0, -4.7); teacher.userData.gesture = true; teacher.userData.holdBook = true;
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.04), m.light); book.position.set(0, 0.35, 0.36); book.rotation.x = -0.5; teacher.userData.torso.add(book); teacher.userData.book = book;
  scene.add(teacher);
  W3.texts = (W3.texts || []).concat([boardTex]);
  return { scene, kids, teacher, figures:[...kids, teacher],
    views:{ back:{ pos:V(0, 1.2, 3.75), look:V(0.1, 1.45, -4.7) }, desk:{ pos:V(0, 1.22, 3.9), look:V(0.05, 1.42, 1.1) }, fly:{ pos:V(0, 4.5, 9), look:V(0, 1.2, -3) } } };
}

function buildLecture(){
  const m = mats();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE8EAEF);
  scene.fog = new THREE.Fog(0xE8EAEF, 7, 26);
  lights(scene, [6, 12, 6]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 30), m.floor); floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);
  box(22, 7, 0.2, m.world, 0, 3.5, -8.5, scene, false);
  const screenTex = canvasTex(1024, 512, (c, w, h) => {
    const title = (W3.screenText && W3.screenText.title) || "Soil drainage";
    const sub = (W3.screenText && W3.screenText.sub) || "Week 3, lecture 2";
    c.fillStyle = "#FFFFFF"; c.fillRect(0,0,w,h);
    c.fillStyle = "#17191F"; fitText(c, title, "900 {px}px 'Big Shoulders Display', Impact, sans-serif", 170, w - 150); c.fillText(title, 70, 235);
    c.fillStyle = "#7D8394"; c.font = "600 44px 'Bricolage Grotesque', sans-serif"; c.fillText(sub, 76, 310);
    c.fillStyle = "#E4E7ED"; c.fillRect(76, 370, 520, 22); c.fillRect(76, 410, 380, 22);
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6), new THREE.MeshBasicMaterial({ map:screenTex }));
  screen.position.set(-0.6, 3.7, -8.35); scene.add(screen);
  box(1.0, 1.15, 0.7, m.soft, 1.9, 0.575, -5.6, scene);
  const lecturer = makeFigure(BLACK, { scale:1.02 }); lecturer.position.set(1.35, 0, -5.9); lecturer.rotation.y = -0.2; lecturer.userData.gesture = true; scene.add(lecturer);
  const others = [], TIER_H = 0.46, TIER_D = 1.45;
  for (let i=0;i<8;i++){
    const y = i*TIER_H, z = -2.6 + i*TIER_D;
    box(20, y + 0.02, TIER_D, m.world, 0, (y+0.02)/2, z + 0.1, scene, false);
    if (i > 0) box(20, TIER_H, 0.03, m.soft, 0, y - TIER_H/2, z - 0.625, scene, false);
    box(18, 0.05, 0.45, m.world, 0, y + 0.76, z - 0.5, scene);
    box(18, 0.74, 0.05, m.soft, 0, y + 0.37, z - 0.27, scene);
    if (i === 4) continue;
    for (let s=0;s<9;s++){
      const x = -7 + s*1.75 + (i%2)*0.5;
      if ((s*3 + i*5) % 4 === 0 || (i === 3 && Math.abs(x) < 2.6)) continue;
      if (W3.small && (s % 2)) continue;                 // fewer background figures on phones
      const f = makeFigure(GREY, { seated:true, scale:0.92, shadow:false }); f.position.set(x, y, z + 0.18); f.rotation.y = Math.PI; scene.add(f); others.push(f);
    }
  }
  const y3 = 3*TIER_H, z3 = -2.6 + 3*TIER_D;
  const gamer = makeFigure(RED, { seated:true }); gamer.position.set(0.62, y3, z3 + 0.18); gamer.rotation.y = Math.PI; scene.add(gamer);
  const g1 = makeFigure(RED, { seated:true }); g1.position.set(-0.98, y3, z3 + 0.18); g1.rotation.y = Math.PI; scene.add(g1);
  const g2 = makeFigure(RED, { seated:true }); g2.position.set(-0.4, y3, z3 + 0.18); g2.rotation.y = Math.PI; scene.add(g2);
  g1.userData.turnTarget = -0.55; g2.userData.turnTarget = 0.55; g1.userData.lean = -0.08; g2.userData.lean = 0.08;
  // laptop
  const laptop = new THREE.Group(); laptop.position.set(1.08, y3 + 0.785, z3 - 0.52); scene.add(laptop);
  box(0.42, 0.02, 0.3, m.board, 0, 0, 0, laptop);
  const gameTex = canvasTex(256, 160, () => {});
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.27), new THREE.MeshBasicMaterial({ map:gameTex }));
  scr.position.set(0, 0.14, -0.15); scr.rotation.x = -0.25; scr.rotation.y = Math.PI; laptop.add(scr);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.28), m.board); back.position.set(0, 0.14, -0.155); back.rotation.x = -0.25; laptop.add(back);
  scr.rotation.y = 0; scr.position.z = -0.148;
  const glow = new THREE.PointLight(0xFF6655, 0.0, 1.6); glow.position.set(1.08, y3 + 1.0, z3 - 0.4); scene.add(glow);
  const yC = 4*TIER_H, zC = -2.6 + 4*TIER_D;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), m.light); pad.rotation.x = -Math.PI/2; pad.rotation.z = -0.12; pad.position.set(0.25, yC + 0.79, zC - 0.45); scene.add(pad);
  for (let l=0;l<6;l++){ const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.006), M.soft); ln.rotation.x = -Math.PI/2; ln.rotation.z = -0.12; ln.position.set(0.25 + l*0.006, yC + 0.792, zC - 0.6 + l*0.05); scene.add(ln); }
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), M.board); pen.rotation.z = Math.PI/2; pen.rotation.y = 0.7; pen.position.set(0.5, yC + 0.8, zC - 0.42); scene.add(pen);
  W3.texts = (W3.texts || []).concat([screenTex]);
  return { scene, lecturer, gamer, gossip:[g1, g2], others, gameTex, screenTex, glow, figures:[lecturer, gamer, g1, g2, ...others],
    views:{ seat:{ pos:V(0.15, yC + 1.3, zC + 0.55), look:V(0.9, 2.05, -8) }, seatSmall:{ pos:V(0.3, yC + 1.45, zC + 1.15), look:V(0.5, 1.55, -8) }, fly:{ pos:V(0, 7, 14), look:V(0, 2, -6) } } };
}

/* laptop game drawing */
const GAME = { x:0, score:0, jumpAt:-9, coins:[], flash:null, next:0 };
function drawGame(tex, t){ if (!tex) return;
  const c = tex.userData.ctx, w = 256, h = 160;
  GAME.x += 2.2;
  c.fillStyle = "#0B0C10"; c.fillRect(0,0,w,h);
  c.fillStyle = "#FFFFFF";
  for (let k=0;k<9;k++){ const bx = ((k*44 - GAME.x) % 396 + 396) % 396 - 40; c.fillRect(bx, 132, 38, 14); }
  if (Math.random() < 0.03) GAME.coins.push({ x:270, y:40 + Math.random()*50 });
  GAME.coins = GAME.coins.filter(o => (o.x -= 2.2) > -10);
  GAME.coins.forEach(o => { c.beginPath(); c.arc(o.x, o.y, 6, 0, Math.PI*2); c.fill(); });
  const jh = Math.max(0, Math.sin(Math.min(1, (t - GAME.jumpAt)/0.55)*Math.PI))*42;
  c.fillStyle = "#E3312B"; c.fillRect(50, 104 - jh, 22, 28);
  c.fillStyle = "#FFFFFF"; c.font = "900 20px 'Big Shoulders Display', Impact, sans-serif"; c.fillText(String(GAME.score), 200, 26);
  if (GAME.flash && t - GAME.flash.t < 0.9){ c.globalAlpha = 1 - (t - GAME.flash.t)/0.9; c.font = "900 30px 'Big Shoulders Display', Impact, sans-serif"; c.fillText(GAME.flash.text, 80, 70); c.globalAlpha = 1; }
  tex.needsUpdate = true;
}

/* stand-ins used when 3D is off: same shape, no meshes */
function stubFigure(){ return { userData:{ talkTarget:0, turnTarget:0, standTarget:0, lean:0, name:null }, position:{ set(){}, }, rotation:{} }; }
function stubRooms(){
  const kids = Array.from({length:12}, stubFigure);
  kids[7].userData.name = "Sam"; kids[8].userData.name = "Mia"; kids[5].userData.name = "Leo";
  W3.rooms.classroom = { scene:null, kids, teacher:stubFigure(), figures:[], views:{ back:null, desk:null, fly:null } };
  W3.rooms.lecture = { scene:null, lecturer:stubFigure(), gamer:stubFigure(), gossip:[stubFigure(), stubFigure()], others:[],
    gameTex:null, screenTex:null, glow:{ intensity:0 }, figures:[], views:{ seat:null, seatSmall:null, fly:null } };
}
function setFlatScene(kind){
  const stage = document.getElementById("stage");
  if (!stage) return;
  // simple flat stand-ins: red = the things competing for your attention, dark = the person talking
  const rows = (ys, sizes, xs) => ys.flatMap((y, i) => xs[i].map(x => [x, y, sizes[i], ""]));
  const bars = ys => ys.map(([y, h]) => ({ bar:true, y, h }));
  const layout = {
    classroom: {
      shapes: rows([46, 60, 78], [7, 9, 12], [[18, 38, 62, 82], [12, 34, 58, 84], [22, 50, 78]])
        .concat([[50, 26, 9, "ink"], [50, 14, 26, "board"]]),
      bars: bars([[52, 3], [67, 3.5], [87, 4]])
    },
    desk: {
      shapes: [[50, 40, 18, "ink"], [14, 56, 13, ""], [86, 56, 13, ""], [30, 30, 7, ""], [70, 28, 7, ""], [50, 12, 22, "board"]],
      bars: bars([[72, 8]])
    },
    intro: {                       // quiet cluster to the side of the opening text
      shapes: [[62, 34, 8, ""], [78, 30, 6, ""], [92, 38, 7, ""], [70, 52, 11, ""], [86, 48, 9, ""], [58, 66, 13, ""], [76, 70, 12, ""], [93, 62, 10, ""], [66, 86, 15, ""], [88, 84, 14, ""]],
      bars: bars([[40, 2], [58, 2.5], [76, 3], [94, 3.5]])
    },
    lecture: {
      shapes: [[34, 26, 30, "board"], [56, 46, 7, "ink"], [22, 64, 11, ""], [38, 66, 11, ""], [70, 66, 11, ""], [86, 62, 8, "grey"]],
      bars: bars([[74, 3.5], [88, 5]])
    }
  }[kind] || { shapes:[], bars:[] };
  const shape = ([x, y, size, cls]) => cls === "board"
    ? `<i class="board" style="left:${x}%;top:${y}%;width:${size*2.4}vmin;height:${size*1.5}vmin"></i>`
    : `<i class="${cls}" style="left:${x}%;top:${y}%;width:${size}vmin;height:${size}vmin"></i>`;
  stage.innerHTML = `<div class="flat">${layout.bars.map(b => `<i class="deskbar" style="top:${b.y}%;height:${b.h}vmin"></i>`).join("")}${layout.shapes.map(shape).join("")}</div>`;
}

/* camera + render */
function setView(view, snap=false){ if (!W3.ok || !view) return; W3.camPos = view.pos.clone(); W3.camLook = view.look.clone(); if (snap){ W3.curPos.copy(view.pos); W3.curLook.copy(view.look); } }
function ensureRoom(name){
  if (!W3.ok) return null;
  if (!W3.rooms[name]) { W3.rooms[name] = W3.builders[name](); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (W3.texts || []).forEach(redrawTex)); }
  return W3.rooms[name];
}
function setRoom(name){ if (!W3.ok) return; ensureRoom(name); W3.room = W3.rooms[name]; }
function render3D(t){
  if (!W3.ok || !W3.room || W3.hold) return;
  const cam = W3.camera;
  const nowMs = performance.now(), dt = Math.min(0.25, (nowMs - (W3.lastMs || nowMs))/1000); W3.lastMs = nowMs;
  W3.curPos.lerp(W3.camPos, 1 - Math.exp(-dt*2.2)); W3.curLook.lerp(W3.camLook, 1 - Math.exp(-dt*3.0));
  const par = V(W3.mouse.x*0.55, -W3.mouse.y*0.3, 0);
  cam.position.set(W3.curPos.x + Math.sin(t*0.5)*0.015, W3.curPos.y + Math.sin(t*1.1)*0.012, W3.curPos.z);
  cam.lookAt(W3.curLook.x + par.x, W3.curLook.y + par.y, W3.curLook.z);
  for (const f of W3.room.figures) poseFigure(f, t);
  W3.renderer.render(W3.room.scene, cam);
}
function setScreen(title, sub){ if (!W3.ok) { W3.screenText = { title, sub }; return; } W3.screenText = { title, sub }; if (W3.rooms.lecture) redrawTex(W3.rooms.lecture.screenTex); }
function project(v){ if (!W3.ok || !v) return null;
  const p = v.clone().project(W3.camera);
  if (p.z > 1 || p.z < -1) return null;
  return { x:(p.x+1)/2*innerWidth, y:(-p.y+1)/2*innerHeight };
}
