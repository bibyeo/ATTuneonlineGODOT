const $ = (s, r=document) => r.querySelector(s);
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const STAGE_CLIPS = {
  boot: ["chatter", "s1_open_a", "s1_open_b", "s1_open_c", "s1_a", "s1_b", "s1_c"],
  s2:   ["s2_intro", "s2_r1", "s2_r2", "s2_r3", "s2_r4", "k2_r1", "k2_r2"],
  s3:   ["s3_lecture", "s3_gossip", "k3_assembly", "k3_whispers"]
};
const CLIPS = [].concat(STAGE_CLIPS.boot, STAGE_CLIPS.s2, STAGE_CLIPS.s3);
const A = { live:new Set(), ctx:null, buffers:{}, loading:null, master:null, voiceBus:null, noiseBus:null, sfxBus:null, voiceAn:null, noiseAn:null, data:null };
let paused = false;
const ticks = new Set();

function now(){ return A.ctx ? A.ctx.currentTime : performance.now()/1000; }

function b64ToBuf(b64){
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

function initAudio(){
  if (A.loading) return A.loading;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  try { A.ctx = new Ctx({ sampleRate: 24000, latencyHint: "playback" }); }   // clips are 24 kHz; matching it halves decoded size
  catch(e) { A.ctx = new Ctx(); }
  const c = A.ctx;
  A.master = c.createGain(); A.master.gain.value = 0.9; A.master.connect(c.destination);
  const bus = () => { const g = c.createGain(); const an = c.createAnalyser(); an.fftSize = 512; g.connect(an); an.connect(A.master); return [g, an]; };
  [A.voiceBus, A.voiceAn] = bus();
  [A.noiseBus, A.noiseAn] = bus();
  A.sfxBus = c.createGain(); A.sfxBus.gain.value = 0.55; A.sfxBus.connect(A.master);
  A.data = new Float32Array(512);
  const inline = (typeof AUDIO_BASE64 !== "undefined" && AUDIO_BASE64) || (typeof AUDIO !== "undefined" && AUDIO) || null;
  const hosted = (typeof ASSET_URLS !== "undefined" && ASSET_URLS) || null;   // audio kept outside the page keeps it small enough for phones
  const source = n =>
    (hosted && hosted[n]) ? fetch(hosted[n]).then(r => { if (!r.ok) throw new Error(`${n} ${r.status}`); return r.arrayBuffer(); }) :
    (inline && inline[n]) ? Promise.resolve(b64ToBuf(inline[n])) :
    fetch(`audio/${n}.mp3`).then(r => { if (!r.ok) throw new Error(`audio/${n}.mp3 ${r.status}`); return r.arrayBuffer(); });
  const decode = n => (A.buffers[n] ? Promise.resolve() : source(n).then(buf => new Promise((res, rej) => {
    c.decodeAudioData(buf, b => { A.buffers[n] = b; res(); }, rej);
  })));
  A.decodeGroup = (group, withProgress) => {
    const list = STAGE_CLIPS[group]; let n = 0;
    return Promise.all(list.map(name => decode(name).then(() => { n++; if (withProgress && A.onProgress) A.onProgress(n/list.length); })));
  };
  A.freeGroup = group => { STAGE_CLIPS[group].forEach(n => { if (n !== "chatter") delete A.buffers[n]; }); };
  A.loading = A.decodeGroup("boot", true);
  // room tone
  const len = c.sampleRate * 4, nb = c.createBuffer(2, len, c.sampleRate);
  for (let ch=0; ch<2; ch++){ const d = nb.getChannelData(ch); let b0=0,b1=0,b2=0; for (let i=0;i<len;i++){ const w = Math.random()*2-1; b0 = .997*b0 + .029*w; b1 = .985*b1 + .032*w; b2 = .95*b2 + .048*w; d[i] = (b0+b1+b2)*.35; } }
  A.noiseBuf = nb;
  const amb = c.createBufferSource(); amb.buffer = nb; amb.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
  A.amb = c.createGain(); A.amb.gain.value = 0;
  amb.connect(lp); lp.connect(A.amb); A.amb.connect(A.master); amb.start();
  return A.loading;
}

function play(name, {bus="voice", gain=1, loop=false, when=null}={}){
  const c = A.ctx;
  const src = c.createBufferSource(); src.buffer = A.buffers[name]; src.loop = loop;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(g); g.connect(bus === "noise" ? A.noiseBus : A.voiceBus);
  const startAt = when ?? (c.currentTime + 0.06);
  src.start(startAt);
  const h = { src, g, startAt, stopped:false };
  A.live.add(h); src.addEventListener("ended", () => A.live.delete(h));
  h.ended = new Promise(r => { src.onended = () => r(); });
  h.stop = (fade=0.4) => {
    if (h.stopped) return; h.stopped = true;
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t+fade);
    try { src.stop(t+fade+0.02); } catch(e){}
  };
  return h;
}
function stopAllAudio(){
  A.live.forEach(h => { try { h.stop(0.15); } catch(e) {} });
  A.live.clear();
}
function ramp(h, value, secs=0.8){
  const c = A.ctx, t = c.currentTime;
  h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(h.g.gain.value, t); h.g.gain.linearRampToValueAtTime(value, t+secs);
}
function level(an){
  if (!an) return 0;
  an.getFloatTimeDomainData(A.data);
  let s = 0; for (let i=0;i<A.data.length;i++) s += A.data[i]*A.data[i];
  return Math.sqrt(s / A.data.length);
}
function wait(sec){
  return new Promise(res => {
    const end = now() + sec;
    const f = t => { if (t >= end) { ticks.delete(f); res(); } };
    ticks.add(f);
  });
}
function tone(freq, start, dur, {type="square", vol=0.05, pan=0.35, to=null}={}){
  const c = A.ctx;
  const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner();
  o.type = type; o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start+dur);
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start+0.01); g.gain.exponentialRampToValueAtTime(0.0001, start+dur);
  p.pan.value = pan;
  o.connect(g); g.connect(p); p.connect(A.sfxBus);
  o.start(start); o.stop(start+dur+0.03);
}
function whoosh(){
  if (!A.ctx) return;
  const c = A.ctx, t = c.currentTime + 0.02;
  const src = c.createBufferSource(); src.buffer = A.noiseBuf;
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.9);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  src.connect(bp); bp.connect(g); g.connect(A.master); src.start(t); src.stop(t + 1.2);
}
function tick(){ if (!A.ctx) return; const t = A.ctx.currentTime + 0.01; tone(1400, t, 0.05, {type:"sine", vol:0.04, pan:0}); }
const SFX = {
  coin(){ const t=A.ctx.currentTime+0.02; tone(988,t,0.07); tone(1319,t+0.07,0.16); },
  jump(){ const t=A.ctx.currentTime+0.02; tone(260,t,0.14,{to:620,vol:0.04}); },
  bonk(){ const t=A.ctx.currentTime+0.02; tone(180,t,0.18,{to:90,vol:0.05,type:"triangle"}); },
  level(){ const t=A.ctx.currentTime+0.02; [523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.09,0.12,{vol:0.045})); }
};

let lastFrameAt = 0;
function frame(){
  requestAnimationFrame(frame);
  lastFrameAt = performance.now();
  frameBody();
}
function frameBody(){
  if (!A.ctx) { try { render3D(performance.now()/1000); } catch(e){} return; }
  const t = now();
  const v = level(A.voiceAn), n = level(A.noiseAn);
  for (const f of Array.from(ticks)) { try { f(t, v, n); } catch(e) { console.error(e); } }
  try { render3D(t); } catch(e) { console.error(e); }
}
requestAnimationFrame(frame);
setInterval(() => {                                   // iOS parks animation frames around the keyboard: keep the game moving
  if (performance.now() - lastFrameAt > 300) { lastFrameAt = performance.now(); frameBody(); }
}, 120);
