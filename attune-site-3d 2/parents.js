/* "A day through their eyes": spot the signs of inattention across an ordinary day. */
(function(){
  const art = document.getElementById('sceneArt'); if (!art) return;
  const NS = 'http://www.w3.org/2000/svg';
  const P = { k:'#2B2533', w:'#FFFFFF', b:'#4F6BFF', B:'#2F45D8', y:'#FFD53D', p:'#F48BC8', g:'#8FD6AE', G:'#4FA878', o:'#F7A44E', l:'#C3B4FB', s:'#9CCBFF',
              f:'#F6CDA8', h:'#6B3F24', r:'#E8604C', n:'#B98A5E', N:'#8E6440', c:'#EDE3D6', d:'#D9CCBC', m:'#7A7082' };
  const R = (x, y, w, h, c)=>{ const e = document.createElementNS(NS, 'rect'); e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', w); e.setAttribute('height', h); e.setAttribute('fill', P[c] || c); art.appendChild(e); };
  const M = (map, x, y, s = 1)=>map.forEach((row, yy)=>[...row].forEach((c, xx)=>{ if (P[c]) R(x + xx*s, y + yy*s, s + .03, s + .03, c); }));

  /* little pixel things */
  const KID = ['...kkkk...','..khhhhk..','.khhhhhhk.','.kffffffk.','.kfkffkfk.','.kffppffk.','..kffffk..','...kkkk...','..kyyyyk..','.kyyyyyyk.','kfkyyyykfk','.kkyyyykk.','..kbbbbk..','..kbkkbk..','..kfk.kfk.','..kkk.kkk.'];
  const KIDSAD = KID.map((r, i)=>i === 5 ? '.kffkkffk.' : r);
  const CLOCK = ['..kkkk..','.kwwwwk.','kwwkwwwk','kwwkwwwk','kwwkkkwk','kwwwwwwk','.kwwwwk.','..kkkk..'];
  const BAG = ['...kkkk...','..k....k..','.kkkkkkkk.','kbbbbbbbbk','kbBBBBBBbk','kbBbbbbBbk','kbBbyybBbk','kbBBBBBBbk','kbbbbbbbbk','.kkkkkkkk.'];
  const SHOE = ['.kkk....','kooook..','kooooook','kkkkkkkk'];
  const BOOK = ['kkkkkkkkkk','krrrrwwwwk','krrrrwkkwk','krrrrwwwwk','krrrrwkkwk','krrrrwwwwk','kkkkkkkkkk'];
  const PAPER = ['kkkkkkkk','kwwwwwwk','kwkkkwwk','kwwwwwwk','kwkkwkrk','kwwwwwwk','kwkkkwrk','kkkkkkkk'];
  const BALL = ['..kkkk..','.kwwkwk.','kwkkkwwk','kwwkwwwk','kwwwkkwk','kwkwwwwk','.kwwkwk.','..kkkk..'];
  const BUB = ['.kkkkkkkk.','kwwwwwwwwk','kwwwwwwwwk','kwwwwwwwwk','.kkkkkkkk.','..kk......','.k........'];
  const THINK = ['..kkkkk..','.kwwwwwk.','kwwwwwwwk','kwwwwwwwk','.kwwwwwk.','..kkkkk..','.....kk..','......k..'];
  const PLATE = ['..kkkkkk..','.kwwwwwwk.','kwwgGGowwk','kwwGggoowk','.kwwwwwwk.','..kkkkkk..'];
  const BIRD = ['..kkk...','.kssskk.','kssswsk.','kksssssk','..kssssk','...kkkk.'];
  const MOON = ['..kkk.','.kyyk.','kyyk..','kyyk..','.kyyk.','..kkk.'];
  const STAR = ['..k..','.kyk.','kyyyk','.kyk.','..k..'];

  const room = (wall, floor, split)=>{ R(0, 0, 160, split, wall); R(0, split, 160, 110 - split, floor); R(0, split, 160, 2, 'k'); };
  const windowAt = (x, y, w, h, sky)=>{ R(x - 2, y - 2, w + 4, h + 4, 'k'); R(x, y, w, h, sky); R(x + w/2 - 1, y, 2, h, 'k'); R(x, y + h/2 - 1, w, 2, 'k'); };

  const SCENES = [
    { id: 'morning', time: '7:30', label: 'Getting ready', bg: '#FFE9B8',
      draw(){ room('#FFE3A3', '#E9C98E', 62); windowAt(110, 14, 34, 28, '#BFE3FF'); M(CLOCK, 18, 14, 2);
              R(60, 28, 22, 34, 'n'); R(62, 30, 18, 32, 'N'); R(76, 44, 3, 3, 'y');      // door
              M(KID, 86, 58, 2); M(BAG, 30, 76, 2); M(SHOE, 124, 96, 2); M(THINK, 104, 36, 1.6); M(BIRD, 114, 20, 1.4); },
      signs: [
        { x: 84, y: 91, t: 'Only one shoe on', see: 'You’ve asked three times: shoes, bag, teeth. Ten minutes later, one shoe is on.', why: 'Instructions with several steps can slip away before they’re finished. It often isn’t defiance.', them: '“I was going to do it, then I was thinking about the bird and… what did Mum say?”', you: 'Late again, and you hear yourself nagging before the day has started.' },
        { x: 26, y: 78, t: 'Library book forgotten (again)', see: 'The note, the library book and the lunchbox are still on the floor by the door.', why: 'Forgetting and losing things needed for tasks is one of the most common signs of inattention.', them: '“I put it somewhere. I always forget. Everyone else remembers.”', you: 'Another trip back to school, and another reminder that didn’t stick.' },
        { x: 108, y: 42, t: 'Drifted off mid-routine', see: 'Standing by the window, toothbrush in hand, staring at a bird.', why: 'Daydreaming and being pulled away by whatever is interesting in the moment are classic signs.', them: '“I wasn’t being naughty. The bird was just there.”', you: 'It can look like they’re ignoring you on purpose.' },
      ] },
    { id: 'class', time: '9:00', label: 'In class', bg: '#DCEBFF',
      draw(){ room('#D6E6FF', '#BFD2EE', 64); R(12, 10, 70, 38, 'k'); R(14, 12, 66, 34, '#3E6B55'); R(20, 20, 30, 2, 'w'); R(20, 28, 42, 2, 'w'); R(20, 36, 24, 2, 'w');
              windowAt(116, 12, 32, 30, '#BFE3FF'); M(BIRD, 126, 20, 1.4);
              R(40, 78, 70, 6, 'n'); R(44, 84, 4, 20, 'N'); R(102, 84, 4, 20, 'N'); M(KID, 64, 50, 2); M(PAPER, 44, 66, 1.6); M(BUB, 6, 52, 2); },
      signs: [
        { x: 18, y: 58, t: 'Didn’t hear the instruction', see: 'The teacher says “page 12, questions 1 to 4”. Your child is still on page 10.', why: 'Seeming not to listen when spoken to directly is a sign of inattention, even when they can hear perfectly well.', them: '“Everyone started writing and I didn’t know what we were doing.”', you: 'At parent evening: “They’re bright, but they don’t seem to listen.”' },
        { x: 51, y: 64, t: 'Careless mistakes', see: 'The worksheet is half done, with simple slips on questions they know.', why: 'Making careless mistakes and finding it hard to stay on a task are common, even for capable children.', them: '“I knew that one! I just didn’t see the minus sign.”', you: 'Confusing: they can clearly do it, so why does it keep going wrong?' },
        { x: 84, y: 30, t: 'Gazing out the window', see: 'Eyes on the bird outside, not the board.', why: 'Being easily distracted by things happening around them, or by their own thoughts.', them: '“I only looked for a second.”', you: 'Reports that say “needs to focus more”, term after term.' },
      ] },
    { id: 'play', time: '12:30', label: 'Playground', bg: '#DDF3E4',
      draw(){ R(0, 0, 160, 50, '#CDEBFF'); R(0, 50, 160, 60, '#A7DDB6'); R(0, 50, 160, 2, 'G'); R(128, 8, 14, 14, 'y');
              R(14, 70, 44, 5, 'n'); R(16, 75, 3, 12, 'N'); R(53, 75, 3, 12, 'N');       // bench
              M(KID, 26, 42, 2);
              [[82, 46], [104, 50], [126, 44]].forEach(([x, y], i)=>M(KID.map(r=>r.replace(/y/g, i === 1 ? 'p' : 'g').replace(/h/g, i === 2 ? 'k' : 'n')), x, y, 2));
              M(BALL, 104, 88, 2); M(BUB, 88, 24, 2); },
      signs: [
        { x: 69, y: 83, t: 'Lost track of the game', see: 'Mid-game, they wander off or don’t notice it’s their turn. Next time, nobody asks them to play.', why: 'Children who are mainly inattentive are more often overlooked than disliked by other children.', them: '“They changed the rules and I didn’t get it. I’ll just sit here.”', you: '“Who did you play with today?” “No one.”' },
        { x: 30, y: 56, t: 'Sitting alone', see: 'On the bench, a little apart, while the others play.', why: 'In one study, more than half of children with ADHD had no mutual friendship, and their friendships tended to be shorter.', them: '“It’s easier on my own. I always say the wrong thing at the wrong time.”', you: 'Worry that they’re lonely, and not knowing how to help.' },
      ] },
    { id: 'homework', time: '16:00', label: 'Homework', bg: '#FFE0EE',
      draw(){ room('#FFDDEA', '#E9BCCB', 60); windowAt(118, 10, 30, 26, '#FFD9A8'); M(CLOCK, 20, 12, 2);
              R(24, 74, 112, 6, 'n'); R(28, 80, 4, 24, 'N'); R(128, 80, 4, 24, 'N'); M(KIDSAD, 66, 46, 2); M(BOOK, 44, 64, 1.8); M(PAPER, 104, 64, 1.6);
              R(8, 50, 24, 6, 'k'); M(STAR, 12, 38, 2); },
      signs: [
        { x: 21, y: 18, t: '20 minutes takes two hours', see: 'A short worksheet stretches through the whole evening.', why: 'Avoiding tasks that need long, steady mental effort is a sign of inattention. Homework is where many families feel it most.', them: '“I start, then my brain goes somewhere else, then it’s dark outside.”', you: 'Homework time turns into the hardest hour of your day.' },
        { x: 50, y: 58, t: 'Tears and arguments', see: 'Frustration, a slammed book, and both of you in tears.', why: 'Parents in a large survey said the strain on the parent–child relationship peaked in the late afternoon and evening.', them: '“Why is everything so hard for me?”', you: 'You love them, and you’re exhausted. Both are true.' },
      ] },
    { id: 'evening', time: '19:30', label: 'Dinner & bed', bg: '#E8E2FF',
      draw(){ room('#DCD4FF', '#BDB2E6', 58); windowAt(116, 10, 32, 26, '#2E2A55'); M(MOON, 130, 14, 2); M(STAR, 120, 14, 1); M(STAR, 142, 26, 1);
              R(10, 72, 56, 6, 'n'); R(14, 78, 4, 26, 'N'); R(58, 78, 4, 26, 'N'); M(PLATE, 20, 64, 2);
              R(84, 76, 66, 18, 'w'); R(84, 72, 20, 8, 'l'); R(80, 70, 4, 34, 'N'); R(150, 80, 4, 24, 'N'); R(100, 78, 50, 16, 'b');
              M(KIDSAD.slice(0, 8), 88, 62, 2); M(THINK, 108, 40, 2); },
      signs: [
        { x: 24, y: 64, t: 'Doesn’t hear their name', see: 'Called for dinner three times. On the fourth, they look up, surprised.', why: 'Getting absorbed and not responding when spoken to is part of the picture, not rudeness.', them: '“I honestly didn’t hear you.”', you: 'It feels like you’re always raising your voice.' },
        { x: 78, y: 42, t: '“I’m stupid”', see: 'At bedtime they say they’re bad at everything.', why: 'Children with attention difficulties often hear more corrections than praise. They’re also more likely to have anxiety and low mood.', them: '“Everyone gets told off less than me.”', you: 'Heartbreak, and a strong wish that they could see what you see in them.' },
      ] },
  ];
  const TOTAL = SCENES.reduce((n, s)=>n + s.signs.length, 0);

  const times = document.getElementById('times'), scene = document.getElementById('scene'), title = document.getElementById('sceneTitle');
  const card = document.getElementById('card'), meter = document.getElementById('meter'), count = document.getElementById('count'), badge = document.getElementById('badge');
  const lensYou = document.getElementById('lensYou'), lensThem = document.getElementById('lensThem');
  let cur = 0, lens = 'you', active = null;
  const seen = new Set();

  SCENES.forEach((s, i)=>{
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'tab-' + s.id;
    b.innerHTML = `<span class="dot">${s.time}</span><span class="lbl">${s.label}</span>`;
    b.addEventListener('click', ()=>show(i)); times.appendChild(b);
  });

  function show(i){
    cur = i; active = null; const s = SCENES[i];
    [...times.children].forEach((b, j)=>b.setAttribute('aria-selected', j === i));
    scene.style.setProperty('--bg', s.bg); title.textContent = `${s.time} · ${s.label}`;
    art.innerHTML = ''; s.draw();
    scene.querySelectorAll('.spot').forEach(e=>e.remove());
    s.signs.forEach((g, j)=>{
      const b = document.createElement('button'); b.type = 'button'; b.className = 'spot' + (seen.has(s.id + j) ? ' seen' : '');
      b.style.left = (g.x/160*100) + '%'; b.style.top = (g.y/110*100) + '%'; b.style.setProperty('--dl', (j*.3) + 's');
      b.textContent = seen.has(s.id + j) ? '✓' : '?'; b.setAttribute('aria-label', 'Sign: ' + g.t);
      b.addEventListener('click', ()=>open(j, b)); scene.appendChild(b);
    });
    renderCard();
  }
  function open(j, btn){
    const s = SCENES[cur]; active = j;
    scene.querySelectorAll('.spot').forEach(e=>e.classList.remove('active')); btn.classList.add('active');
    if (!seen.has(s.id + j)){ seen.add(s.id + j); btn.classList.add('seen'); btn.textContent = '✓'; progress(); }
    renderCard();
  }
  function renderCard(){
    const s = SCENES[cur];
    const left = s.signs.filter((_, j)=>!seen.has(s.id + j)).length;
    if (active === null){
      card.innerHTML = `<span class="k">${s.time} · ${s.label}</span><h3>${left ? `${left} sign${left > 1 ? 's' : ''} hiding here` : 'All signs found here'}</h3>
        <p class="empty">${left ? 'Tap a glowing star in the picture to see what might be going on.' : 'Nice spotting. Move on to the next part of the day.'}</p>` + navHtml();
    } else {
      const g = s.signs[active];
      card.innerHTML = lens === 'you'
        ? `<span class="k">What you might see</span><h3>${g.t}</h3><p>${g.see}</p><div class="feel"><b>What might be going on</b>${g.why}</div>` + navHtml()
        : `<span class="k">Through their eyes</span><h3>${g.t}</h3><div class="feel" style="background:#E9E3FF"><b>How it can feel for them</b>${g.them}</div><div class="feel"><b>How it can feel for you</b>${g.you}</div>` + navHtml();
    }
    card.querySelector('[data-prev]')?.addEventListener('click', ()=>show((cur + SCENES.length - 1) % SCENES.length));
    card.querySelector('[data-next]')?.addEventListener('click', ()=>show((cur + 1) % SCENES.length));
  }
  const navHtml = ()=>`<div class="nav"><button type="button" data-prev>← Earlier</button><button type="button" data-next>Later →</button></div>`;
  function progress(){
    meter.style.width = (seen.size/TOTAL*100) + '%'; count.textContent = `${seen.size} / ${TOTAL}`;
    SCENES.forEach((s, i)=>times.children[i].classList.toggle('done', s.signs.every((_, j)=>seen.has(s.id + j))));
    if (seen.size === TOTAL) badge.classList.add('on');
  }
  function setLens(l){ lens = l; lensYou.setAttribute('aria-pressed', l === 'you'); lensThem.setAttribute('aria-pressed', l === 'them'); renderCard(); }
  lensYou.addEventListener('click', ()=>setLens('you')); lensThem.addEventListener('click', ()=>setLens('them'));

  // badge art: a gold star
  const bArt = document.getElementById('badgeArt');
  ['.....kk.....','....kyyk....','....kyyk....','kkkkkyykkkkk','kyyyyyyyyyk.','.kyyyyyyyyk.','..kyyyyyyk..','..kyyyyyyyk.','.kyyykkyyyyk','.kyyk..kyyk.','.kkk....kkk.','............'].forEach((row, y)=>[...row].forEach((c, x)=>{
    if (c === '.') return; const e = document.createElementNS(NS, 'rect'); e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', 1.02); e.setAttribute('height', 1.02); e.setAttribute('fill', c === 'k' ? '#fff' : '#FFD53D'); bArt.appendChild(e); }));

  show(0);

  /* ---------- myth or fact */
  const MF = [
    { q: 'Kids with attention difficulties are always hyperactive.', a: 'myth', why: 'Many are quiet daydreamers. Girls in particular tend to show more inattention and less disruption, and are often diagnosed later.', c: '#FFE98A', r: '-2deg' },
    { q: 'Children usually just grow out of it.', a: 'myth', why: 'Signs start in childhood and can continue into adulthood. Children don’t simply grow out of them, though they can change with age.', c: '#C9E9FF', r: '1.5deg' },
    { q: 'Inattention can make it harder to keep friends.', a: 'fact', why: 'Children who are mainly inattentive are more often overlooked than disliked, and their friendships tend to be shorter.', c: '#CDEFD9', r: '-1deg' },
    { q: 'If they can play video games for hours, they can’t have trouble focusing.', a: 'myth', why: 'Fast, rewarding activities hold attention very differently from slow tasks that need steady effort, like homework or a long instruction.', c: '#FFD0E6', r: '2deg' },
    { q: 'Your family doctor is a good first step if you’re worried.', a: 'fact', why: 'In New Zealand your GP can talk it through and refer to a paediatrician, child psychiatrist or psychologist for an assessment.', c: '#E0D8FF', r: '-1.5deg' },
  ];
  const mf = document.getElementById('mf'), score = document.getElementById('mfscore');
  let right = 0, answered = 0;
  MF.forEach(m=>{
    const d = document.createElement('div'); d.className = 'mfc'; d.style.setProperty('--c', m.c); d.style.setProperty('--r', m.r);
    d.innerHTML = `<q>${m.q}</q><div class="btns"><button type="button" data-a="myth">Myth</button><button type="button" data-a="fact">Fact</button></div><div class="ans" aria-live="polite"></div>`;
    d.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
      if (d.classList.contains('done')) return;
      d.classList.add('done'); b.classList.add('pick'); answered++;
      const ok = b.dataset.a === m.a; if (ok) right++;
      d.querySelector('.ans').innerHTML = `<b>${ok ? 'Correct' : 'Not quite'} · it’s a ${m.a}</b>${m.why}`;
      if (answered === MF.length) score.textContent = right === MF.length ? `${right} out of ${MF.length}. You know your stuff!` : `${right} out of ${MF.length}. Now you know a little more.`;
    }));
    mf.appendChild(d);
  });
})();
