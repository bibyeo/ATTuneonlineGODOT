/* Shared page behaviour for attuneonline.com */
(function(){
  /* Put your contact address here, e.g. 'hello@attuneonline.com'. */
  window.ATTUNE_EMAIL = window.ATTUNE_EMAIL || '';
  const SITE = 'https://attuneonline.com';
  const onSite = /(^|\.)attuneonline\.com$/.test(location.hostname);
  // on the real domain, game links stay in the same tab; anywhere else they open the live site in a new tab
  document.querySelectorAll('[data-site]').forEach(a=>{
    const path = a.getAttribute('data-site');
    if (onSite) a.setAttribute('href', path);
    else { a.setAttribute('href', SITE + path); a.target = '_blank'; a.rel = 'noopener'; }
  });
  // email: show the address and copy it (mail links are unreliable inside some viewers)
  document.querySelectorAll('[data-email]').forEach(b=>{
    const addr = window.ATTUNE_EMAIL;
    if (addr){ b.textContent = addr; }
    b.addEventListener('click', ()=>{
      if (!addr){ note('Add your email address in site.js (ATTUNE_EMAIL).'); return; }
      const done = ()=>note('Copied ' + addr);
      if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, ()=>{ location.href = 'mailto:' + addr; });
      else location.href = 'mailto:' + addr;
    });
  });
  function note(msg){
    let t = document.getElementById('toast');
    if (!t){ t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status');
      Object.assign(t.style, { position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', background: 'rgba(47,42,54,.94)', color: '#fff',
        padding: '11px 16px', borderRadius: '12px', font: '14px Inter, system-ui, sans-serif', zIndex: 20, opacity: 0, transition: 'opacity .25s' });
      document.body.appendChild(t); }
    t.textContent = msg; t.style.opacity = 1; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(()=>{ t.style.opacity = ''; t.classList.remove('show'); if (!t.classList.length) t.style.opacity = 0; }, 2600);
  }
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- pixel icons for the four skills (drawn from little ascii maps) */
  const PAL = { k:'#2B2533', w:'#FFFFFF', b:'#4F6BFF', y:'#FFD53D', p:'#F48BC8', g:'#8FD6AE', o:'#F7A44E', l:'#C3B4FB', s:'#9CCBFF' };
  const ICONS = {
    ear: ['....kkkk....','...kppppk...','..kppkkppk..','..kpk..kpk..','..kpk..kpk..','...k..kppk..','.....kppk...','....kppk..s.','....kpk..s.s','....kpk...s.','.....kk.....','............'],
    line:['............','.kkkkkkkkkk.','.kggggggggk.','.kgkkkkkkgk.','.kggggggggk.','.kkkkkkkkkk.','............','..y.y.y.y...','............','.kkkkkkk....','.kbbbbbbk...','.kkkkkkk....'],
    hold:['...kkkkkk...','..kyyyyyyk..','..kykkkkyk..','..kyyyyyyk..','...kyyyyk...','....kyyk....','....kyyk....','...kyyyyk...','..kyykkyyk..','..kyyyyyyk..','..kkkkkkkk..','............'],
    pick:['............','.kkk....kkk.','.kpk....kwk.','.kkk....kkk.','............','.....kk.....','....kppk....','...kppppk...','..kppppppk..','...kkppkk...','....kppk....','....kkkk....'],
  };
  document.querySelectorAll('[data-icon]').forEach(el=>{
    const map = ICONS[el.dataset.icon]; if (!map) return;
    let r = ''; map.forEach((row, y)=>[...row].forEach((c, x)=>{ if (PAL[c]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL[c]}"/>`; }));
    el.innerHTML = `<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
  });

  /* ---------- pieces land on the desk as you scroll to them */
  const lands = document.querySelectorAll('.land');
  if (lands.length && 'IntersectionObserver' in window && !REDUCED){
    document.documentElement.classList.add('pre');
    const io = new IntersectionObserver(es=>es.forEach(e=>{ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    lands.forEach((el, i)=>{ el.style.transitionDelay = ((i % 4)*70) + 'ms'; io.observe(el); });
    setTimeout(()=>lands.forEach(el=>el.classList.add('in')), 6000);    // never leave anything hidden
  }

  /* ---------- mission graphic: a kid in class, and everything that steals their attention */
  const nz = document.getElementById('noisy');
  if (nz){
    const NS = 'http://www.w3.org/2000/svg';
    nz.setAttribute('viewBox', '0 0 160 152'); nz.setAttribute('shape-rendering', 'crispEdges');
    const C = { k:'#2B2533', w:'#FFFFFF', b:'#4F6BFF', B:'#2F45D8', y:'#FFD53D', p:'#F48BC8', g:'#8FD6AE', G:'#4FA878', o:'#F7A44E', l:'#C3B4FB', s:'#9CCBFF',
                f:'#F6CDA8', F:'#E3AE86', h:'#6B3F24', n:'#B98A5E', N:'#8E6440', r:'#E8604C', m:'#7A7082', c:'#EDE3D6', d:'#3E6B55', x:'#2C2638' };
    const el = (tag, a, parent = nz)=>{ const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); parent.appendChild(e); return e; };
    const R = (x, y, w, h, c, parent = nz)=>el('rect', { x, y, width: w, height: h, fill: C[c] || c }, parent);
    const M = (map, x, y, s = 1, parent = nz)=>{ const g = el('g', { transform: `translate(${x} ${y}) scale(${s})` }, parent);
      map.forEach((row, yy)=>[...row].forEach((ch, xx)=>{ if (C[ch]) R(xx, yy, 1.03, 1.03, ch, g); })); return g; };
    const T = (txt, x, y, size, fill, parent = nz, anchor = 'middle', font = 'Inter, ui-sans-serif, system-ui, sans-serif', weight = 700)=>{
      const t = el('text', { x, y, 'text-anchor': anchor, fill, style: `font:${weight} ${size}px ${font}` }, parent); t.textContent = txt; return t; };

    /* the classroom */
    R(0, 0, 160, 152, '#F2E6FF');
    R(0, 0, 160, 92, '#DCEBFF'); R(0, 92, 160, 48, '#C7B7A3'); R(0, 140, 160, 12, 'k'); R(0, 92, 160, 1.5, 'k');
    // board + teacher
    R(6, 26, 52, 30, 'k'); R(7.5, 27.5, 49, 27, 'd'); R(12, 33, 24, 1.5, 'w'); R(12, 39, 32, 1.5, 'w'); R(12, 45, 18, 1.5, 'w');
    const TEACHER = ['...kkkk...','..kmmmmk..','..kffffk..','..kfkfkk..','..kffffk..','...kkkk...','..kbbbbk..','.kbbbbbbk.','kfkbbbbkk.','.kkbbbbk..','..kbbbbk..','..kbkkbk..','..kbk.kbk.','..kkk.kkk.'];
    M(TEACHER, 38, 58, 2.4);
    // window with the outside world
    R(114, 26, 40, 32, 'k'); R(115.5, 27.5, 37, 29, '#BFE3FF'); R(133.2, 27.5, 1.6, 29, 'k'); R(115.5, 41, 37, 1.6, 'k');
    R(115.5, 50, 37, 6.5, '#A7DDB6');
    // the teacher's instruction
    const bub = el('g', {});
    el('path', { d: 'M56 19 L51 56 L66 19z', fill: '#fff', stroke: '#2B2533', 'stroke-width': 1 }, bub);
    const bubBox = el('rect', { x: 30, y: 6, width: 94, height: 15, rx: 4, fill: '#fff', stroke: '#2B2533', 'stroke-width': 1 }, bub);
    R(56.6, 20, 9, 1.2, '#fff', bub);
    const said = T('“Pack your bag and line up.”', 77, 16, 6, '#2B2533', bub);
    // classmate at the next desk
    const FRIEND = ['...kkkk...','..kkkkkk..','.kkkkkkkk.','.kffffffk.','.kfkffkfk.','.kffffffk.','..kffffk..','...kkkk...','..kgggggk.','.kgggggggk','kfkgggggkfk'];
    const friend = M(FRIEND, 14, 82, 1.8);
    R(6, 100, 36, 3.5, 'n'); R(8, 103.5, 2.5, 14, 'N'); R(38, 103.5, 2.5, 14, 'N');
    // our kid, at the front desk
    const kid = el('g', {});
    const body = M(['..kyyyyyyk..','.kyyyyyyyyk.','kyyyyyyyyyyk','kyyyyyyyyyyk','kfkyyyyyykfk'], 66, 98, 2.6, kid);
    const head = el('g', {}, kid);
    const headArt = M(['...kkkkkk...','..khhhhhhk..','.khhhhhhhhk.','.khffffffhk.','.kffffffffk.','.kffffffffk.','.kffffffffk.','.kfFffffFfk.','..kffffffk..','...kkkkkk...'], 0, 0, 2.6, head);
    const eyes = el('g', {}, head);
    const eyeL = R(9.4, 12, 2.6, 5.2, 'k', eyes), eyeR = R(18.8, 12, 2.6, 5.2, 'k', eyes);
    const mouth = R(13.6, 20.5, 4, 1.4, 'k', head);
    const bang = el('g', { opacity: 0 }, kid); T('!', 98, 76, 14, '#EE7A37', bang, 'middle', 'Silkscreen, monospace', 400);
    R(50, 112, 78, 5, 'n'); R(54, 117, 3, 23, 'N'); R(121, 117, 3, 23, 'N');
    const bag = M(['...kkkk...','..k....k..','.kkkkkkkk.','kbbbbbbbbk','kbBBBBBBbk','kbBbyybBbk','kbbbbbbbbk','.kkkkkkkk.'], 132, 124, 1.8);

    /* the distractions */
    const BIRD = ['..kkk...','.kssskk.','kssswsk.','kksssssk','..kssssk','...kkkk.'];
    const bird = M(BIRD, 0, 0, 1.6); bird.setAttribute('opacity', 0);
    const phone = el('g', { opacity: 0 }); /* on the desk */ M(['kkkkkk','klllllk'.slice(0,6),'klwwlk','klwwlk','kllllk','kkkkkk'], 0, 0, 2.2, phone);
    const buzz = T('bzz', 6, -2, 5, '#7B5BE0', phone, 'middle', 'Silkscreen, monospace', 400);
    const whisper = el('g', { opacity: 0 }); el('rect', { x: 0, y: 0, width: 24, height: 11, rx: 3, fill: '#FFE98A', stroke: '#2B2533', 'stroke-width': 1 }, whisper); T('psst!', 12, 8, 5.4, '#2B2533', whisper);
    const fly = el('g', { opacity: 0 }); R(0, 1, 2, 2, 'k', fly); R(-1.5, -.5, 2, 1.5, '#fff', fly); R(1.5, -.5, 2, 1.5, '#fff', fly);
    const ball = M(['..kkkk..','.kooook.','kookkook','koooooOk'.replace('O','o'),'kookkook','.kooook.','..kkkk..'], 0, 0, 1.4); ball.setAttribute('opacity', 0);
    // what the kid ends up thinking about
    const think = el('g', { opacity: 0 });
    el('rect', { x: 110, y: 64, width: 40, height: 18, rx: 8, fill: '#fff', stroke: '#2B2533', 'stroke-width': 1 }, think);
    el('rect', { x: 105, y: 83, width: 3.5, height: 3.5, fill: '#fff', stroke: '#2B2533', 'stroke-width': .8 }, think);
    el('rect', { x: 101, y: 88, width: 2.4, height: 2.4, fill: '#fff', stroke: '#2B2533', 'stroke-width': .8 }, think);
    const thinkTxt = T('', 130, 75.5, 6, '#2B2533', think);

    /* focus meter + caption */
    const hud = el('g', {});
    T('FOCUS', 116, 148.5, 4.2, '#fff', hud, 'end', 'Silkscreen, monospace', 400); R(119, 143.5, 37, 6, '#fff', hud); const bar = R(120, 144.5, 35, 4, 'g', hud);
    const status = T('', 4, 148.5, 4.6, '#fff', nz, 'start', 'Silkscreen, monospace', 400);

    // the order things happen in: each one wins the kid's attention for a moment
    const EVENTS = [
      { name: 'a bird outside', look: [1, -1], think: 'bird!', show(k, t){ bird.setAttribute('opacity', 1); const x = 150 - k*44, y = 34 + Math.sin(t*9)*2.5; bird.setAttribute('transform', `translate(${x} ${y}) scale(1.6)`); } },
      { name: 'a whisper', look: [-1, 0], think: 'what?', show(k, t){ whisper.setAttribute('opacity', 1); whisper.setAttribute('transform', `translate(${32 + Math.sin(t*6)} 70)`); friend.setAttribute('transform', `translate(${14 + Math.sin(t*8)*.8} 82) scale(1.8)`); } },
      { name: 'a buzzing phone', look: [.6, 1], think: 'who is it?', show(k, t){ phone.setAttribute('opacity', 1); phone.setAttribute('transform', `translate(${100 + Math.sin(t*60)*.8} 105) rotate(${Math.sin(t*50)*6})`); buzz.setAttribute('opacity', (Math.sin(t*20) > 0) ? 1 : .2); } },
      { name: 'a fly', look: null, think: 'bzzzz', show(k, t){ fly.setAttribute('opacity', 1); const a = t*3.2; fly.setAttribute('transform', `translate(${82 + Math.cos(a)*26} ${78 + Math.sin(a*1.7)*16}) scale(1.8)`); fly.fx = Math.cos(a); fly.fy = Math.sin(a*1.7); } },
      { name: 'a ball outside', look: [1, -1], think: 'recess?', show(k, t){ ball.setAttribute('opacity', 1); const x = 118 + k*30, y = 51 - Math.abs(Math.sin(k*Math.PI*3))*16; ball.setAttribute('transform', `translate(${x} ${y}) scale(1.4)`); } },
    ];
    const hideAll = ()=>{ [bird, phone, whisper, fly, ball].forEach(g=>g.setAttribute('opacity', 0)); friend.setAttribute('transform', 'translate(14 82) scale(1.8)'); };
    const WORDS = 'Pack your bag and line up.';
    let focus = 1;
    function frame(now){
      const t = now/1000, cyc = 3.4, k = (t % cyc)/cyc, ev = EVENTS[Math.floor(t/cyc) % EVENTS.length];
      hideAll();
      // 0-.18 listening · .18-.72 distracted · .72-1 snapping back
      const on = k > .18 && k < .9, pulled = k > .26 && k < .72;
      if (on) ev.show((k - .18)/.72, t);
      let lx = 0, ly = 0;
      if (pulled){ if (ev.look) [lx, ly] = ev.look; else { lx = fly.fx || 0; ly = fly.fy || 0; } }
      const turn = pulled ? 1 : 0;
      // head turns and tilts toward the distraction, eyes follow it
      head.setAttribute('transform', `translate(${66 + lx*2.2} ${72 - (pulled ? 1 : 0) + Math.sin(t*2)*.4}) rotate(${lx*9*turn} 15.6 13)`);
      eyeL.setAttribute('x', 9.4 + lx*2.2); eyeR.setAttribute('x', 18.8 + lx*2.2);
      eyeL.setAttribute('y', 12 + ly*1.8); eyeR.setAttribute('y', 12 + ly*1.8);
      mouth.setAttribute('width', pulled ? 2.6 : 4); mouth.setAttribute('height', pulled ? 2.6 : 1.4); mouth.setAttribute('x', pulled ? 14.3 : 13.6);
      bang.setAttribute('opacity', k > .2 && k < .34 ? 1 : 0);
      think.setAttribute('opacity', pulled ? 1 : 0); thinkTxt.textContent = ev.think;
      // the instruction fades and loses words while they're away
      focus += ((pulled ? .28 : 1) - focus)*.07;
      const keep = Math.round(WORDS.length*Math.min(1, focus*1.15));
      said.textContent = pulled ? WORDS.split('').map((c, i)=>c === ' ' || (i*7 % WORDS.length) < keep*.7 ? c : '·').join('') : WORDS;
      bub.setAttribute('opacity', (.35 + .65*focus).toFixed(2));
      bar.setAttribute('width', (35*focus).toFixed(1)); bar.setAttribute('fill', focus > .65 ? C.g : focus > .45 ? C.y : C.o);
      status.textContent = pulled ? `DISTRACTED: ${ev.name.toUpperCase()}` : k >= .72 && k < .95 ? 'WAIT… WHAT WAS THAT?' : 'LISTENING';
      status.setAttribute('fill', pulled ? '#FFB36B' : '#fff');
      if (!REDUCED && visible) requestAnimationFrame(frame);
    }
    let visible = true;
    if (REDUCED) frame(1.5*1000);
    else { new IntersectionObserver(([e])=>{ const was = visible; visible = e.isIntersecting; if (visible && !was) requestAnimationFrame(frame); }).observe(nz); requestAnimationFrame(frame); }
  }

  /* ---------- a tiny playable mission */
  const field = document.getElementById('miniField');
  if (field){
    const say = document.getElementById('miniSay'), fb = document.getElementById('miniFb'), score = document.getElementById('miniScore'), startBtn = document.getElementById('miniStart');
    const COLORS = [['blue','#4F6BFF'],['yellow','#FFD53D'],['pink','#F48BC8'],['green','#8FD6AE'],['orange','#F7A44E']];
    const NOISE = ['psst!','snack time?','who took my pencil','hehe','did you see that','*bell rings*','LOL','my turn!','shhh','can I go outside','ooh look','*chair scrape*','wait what','bzzzz'];
    const star = c=>`<svg viewBox="0 0 12 12" shape-rendering="crispEdges">${['.....kk.....','....kcck....','....kcck....','kkkkkcckkkkk','kccccccccck.','.kcccccccck.','..kcccccck..','..kccccccck.','.kccckkcccck','.kcck..kcck.','.kkk....kkk.','............'].map((row,y)=>[...row].map((ch,x)=>ch==='.'?'':`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${ch==='k'?'#2B2533':c}"/>`).join('')).join('')}</svg>`;
    let round = 0, pts = 0, answer = null, busy = false, movers = [], loopOn = false, last = 0;
    const px = (map, pal)=>`<svg viewBox="0 0 ${map[0].length} ${map.length}" shape-rendering="crispEdges">${map.map((row,y)=>[...row].map((c,x)=>pal[c]?`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${pal[c]}"/>`:'').join('')).join('')}</svg>`;
    const PB = { k:'#2B2533', s:'#9CCBFF', w:'#fff', o:'#F7A44E', b:'#4F6BFF', l:'#DDE6FF' };
    const BIRD_SVG = px(['...kkk....','..kssskk..','.ksssswk..','kkksssssk.','..kssssssk','..kssssskk','...kkkkk..'], PB);
    const PLANE_SVG = px(['k.........','kkk.......','kllkk.....','kllllkk...','kbbbbbbkkk','kllllkk...','kllkk.....','kkk.......','k.........'], PB);
    const BALL_SVG = px(['..kkkk..','.kooook.','kookkook','koooooook'.slice(0,8),'kookkook','.kooook.','..kkkk..'], PB);
    function loop(now){
      const dt = Math.min(.05, (now - last)/1000); last = now;
      const W = field.clientWidth, H = field.clientHeight;
      for (const m of movers){
        if (!m.el.isConnected) continue;
        if (m.fly){
          m.x += m.vx*dt; const y = m.y + Math.sin(now/1000*5 + m.ph)*m.wave;
          if (m.vx > 0 && m.x > W + 40) m.x = -80; if (m.vx < 0 && m.x < -80) m.x = W + 40;
          m.el.style.transform = `translate(${m.x}px, ${y}px)${m.flip ? ' scaleX(-1)' : ''}`;
        } else if (!m.el.classList.contains('hit')){
          m.x += m.vx*dt; m.y += m.vy*dt; m.r += m.spin*dt;
          if (m.x < 0){ m.x = 0; m.vx = Math.abs(m.vx); } if (m.x > W - m.w){ m.x = W - m.w; m.vx = -Math.abs(m.vx); }
          if (m.y < 0){ m.y = 0; m.vy = Math.abs(m.vy); } if (m.y > H - m.w){ m.y = H - m.w; m.vy = -Math.abs(m.vy); }
          m.el.style.transform = `translate(${m.x}px, ${m.y}px) rotate(${m.r}deg)`;
        }
      }
      if (REDUCED){ loopOn = false; return; }
      if (answer !== null) requestAnimationFrame(loop); else loopOn = false;
    }
    const rnd = (a, b)=>a + Math.random()*(b - a);
    function setRound(){
      field.innerHTML = ''; fb.textContent = ''; fb.className = 'fb'; busy = false;
      const n = 3 + Math.min(2, round);                               // more stars as it goes
      const pool = COLORS.slice().sort(()=>Math.random() - .5).slice(0, n);
      const target = pool[Math.floor(Math.random()*n)];
      const decoy = round >= 2 ? pool.find(c=>c !== target) : null;
      answer = target[0];
      say.textContent = decoy ? `“Not the ${decoy[0]} one. Tap the ${target[0]} star!”` : `“Tap the ${target[0]} star.”`;
      const W = field.clientWidth, H = field.clientHeight;
      movers = [];
      const speed = 18 + round*9;                                        // things move faster each round
      pool.forEach(([name, hex], i)=>{
        const b = document.createElement('button'); b.type = 'button'; b.innerHTML = star(hex); b.setAttribute('aria-label', name + ' star');
        const slot = (i + .5)/n, a = rnd(0, Math.PI*2);
        movers.push({ el: b, x: slot*(W - 60) + rnd(-10, 10), y: rnd(10, H - 64), vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, spin: rnd(-40, 40), r: 0, w: 54 });
        b.addEventListener('click', ()=>pick(b, name)); field.appendChild(b);
      });
      // things that zip across the screen and try to grab a tap
      const SPR = [['bird', BIRD_SVG], ['paper plane', PLANE_SVG], ['ball', BALL_SVG]];
      for (let i = 0; i < Math.min(3, 1 + round); i++){
        const [name, svg] = SPR[(i + round) % SPR.length];
        const b = document.createElement('button'); b.type = 'button'; b.className = 'decoy'; b.innerHTML = svg; b.setAttribute('aria-label', name + ' (a distraction)');
        const dir = i % 2 ? -1 : 1;
        movers.push({ el: b, x: dir > 0 ? -60 - i*120 : W + 20 + i*120, y: rnd(6, H - 50), vx: dir*(60 + round*18), vy: 0, wave: rnd(8, 18), ph: rnd(0, 6), fly: true, w: 44, flip: dir < 0 });
        b.addEventListener('click', ()=>{ if (busy) return; fb.className = 'fb bad'; fb.textContent = `That’s a ${name}. Nice try, distraction!`; b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss'); });
        field.appendChild(b);
      }
      if (!loopOn){ loopOn = true; last = performance.now(); requestAnimationFrame(loop); }
      for (let i = 0; i < 2 + round*2; i++){                          // chatter gets louder each round
        const t = document.createElement('span'); t.className = 'noise'; t.textContent = NOISE[Math.floor(Math.random()*NOISE.length)];
        t.style.top = rnd(4, H - 26) + 'px'; t.style.setProperty('--x0', rnd(-80, W*.4) + 'px'); t.style.setProperty('--x1', rnd(W*.3, W - 40) + 'px');
        t.style.setProperty('--d', rnd(3, 7) + 's'); if (REDUCED) t.style.left = rnd(0, W - 100) + 'px';
        field.appendChild(t);
      }
    }
    function pick(b, name){
      if (busy) return;
      if (name === answer){
        busy = true; pts++; b.classList.add('hit'); fb.textContent = ['Nice listening!','You found the message!','Spot on!','Great focus!','Nailed it!'][round] || 'Nice!';
        score.textContent = `★ ${pts} / 5`; round++;
        setTimeout(()=>round < 5 ? setRound() : finish(), 900);
      } else {
        b.classList.remove('miss'); void b.offsetWidth; b.classList.add('miss'); fb.className = 'fb bad'; fb.textContent = 'Not that one. Listen again!';
      }
    }
    function finish(){
      field.innerHTML = ''; answer = null; movers = [];
      say.textContent = pts === 5 ? '“Five out of five. You tuned out the noise!”' : '“All done. Want another go?”';
      fb.textContent = 'Mission complete'; startBtn.textContent = 'Again'; startBtn.hidden = false;
    }
    startBtn.addEventListener('click', ()=>{ round = 0; pts = 0; score.textContent = '★ 0 / 5'; startBtn.textContent = 'Start'; setRound(); field.querySelector('button')?.focus({ preventScroll: true }); });
  }
})();
