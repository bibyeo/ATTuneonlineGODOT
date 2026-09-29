/* Attune parent portal: auth, children, ABC behavior log, academic tracking, export, account tools.
   DATA LAYER: everything is stored in localStorage (prototype). To go live, replace `Auth` and `load/save`
   with calls to Supabase/Firebase/your API; the UI code below doesn't need to change. */
(function(){
  const app = document.getElementById('app'); if (!app) return;
  const $ = (s, r = app)=>r.querySelector(s);
  const esc = s=>String(s ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const uid = ()=>Math.random().toString(36).slice(2, 10);
  const KEY = 'attune.portal.v1';
  const load = ()=>{ try { return JSON.parse(localStorage.getItem(KEY)) || { users:{}, data:{} }; } catch(e){ return { users:{}, data:{} }; } };
  let db = load();
  const save = ()=>{ try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e){ alert('Could not save: browser storage is unavailable or full.'); } };

  /* ---------- auth (PBKDF2-hashed passwords; session ends when the tab closes) */
  const hex = b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2, '0')).join('');
  async function hash(pw, salt){
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:new TextEncoder().encode(salt), iterations:210000 }, k, 256));
  }
  const rcode = ()=>hex(crypto.getRandomValues(new Uint8Array(6))).toUpperCase().match(/.{4}/g).join('-');
  const okPw = pw=>{ if (pw.length < 8) throw Error('Use at least 8 characters for your password.'); };
  const Auth = {
    current: ()=>sessionStorage.getItem('attune.user'),
    async signUp(name, email, pw){
      email = email.trim().toLowerCase();
      if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) throw Error('Enter your name and a valid email.');
      okPw(pw); if (db.users[email]) throw Error('An account with that email already exists.');
      const salt = uid() + uid(), rc = rcode();
      db.users[email] = { name:name.trim(), salt, hash:await hash(pw, salt), rec:await hash(rc, salt + 'r'), consent:new Date().toISOString() }; db.data[email] = { children:[] };
      save(); sessionStorage.setItem('attune.user', email); return rc;
    },
    async signIn(email, pw){
      email = email.trim().toLowerCase(); const u = db.users[email];
      if (!u || u.hash !== await hash(pw, u.salt)) throw Error('Email or password is incorrect.');
      sessionStorage.setItem('attune.user', email);
    },
    async reset(email, code, pw){                       // recovery code is shown once at sign-up (no email server in a static site)
      email = email.trim().toLowerCase(); const u = db.users[email]; okPw(pw);
      if (!u || !u.rec || u.rec !== await hash(code.trim().toUpperCase(), u.salt + 'r')) throw Error('Email or recovery code is incorrect.');
      const salt = uid() + uid(), rc = rcode(); Object.assign(u, { salt, hash:await hash(pw, salt), rec:await hash(rc, salt + 'r') });
      save(); sessionStorage.setItem('attune.user', email); return rc;
    },
    async changePw(email, old, pw){
      const u = db.users[email]; if (u.hash !== await hash(old, u.salt)) throw Error('Current password is incorrect.'); okPw(pw);
      u.hash = await hash(pw, u.salt); save();
    },
    async remove(email, pw){
      const u = db.users[email]; if (u.hash !== await hash(pw, u.salt)) throw Error('Password is incorrect.');
      delete db.users[email]; delete db.data[email]; save(); Auth.signOut();
    },
    signOut(){ sessionStorage.removeItem('attune.user'); sessionStorage.removeItem('attune.child'); },
  };

  /* ---------- constants + helpers */
  const PRE = {
    a:['Transitioning activities','Denied a request','Tired/Hungry','Peer conflict','Sensory overload'],
    b:['Tantrum / Meltdown','Refusal / Non-compliance','Aggression','Elopement / Running away','Self-injurious behavior'],
    c:['Verbal redirection','Time out / Break given','Loss of privilege','Item provided / Demand removed','Positive reinforcement'],
  };
  const LBL = { a:'Antecedent', b:'Behavior', c:'Consequence' };
  const SUBJ = [['reading','Reading','#CDEFD9'], ['writing','Writing','#FFE98A'], ['maths','Maths','#C9E9FF']];
  const PRIVACY = `<p class="small">What we store: your name, email, a salted password hash, and the child names, behavior events, notes and grades you enter. Where: only in this browser on this device (not sent to Attune or anyone else). Who can see it: anyone with access to this browser profile. Your rights: use Account → Export to download everything, and Account → Delete to erase it. Please use a first name or nickname for your child. This is a personal log, not medical advice or a diagnostic tool.</p>`;
  const p2 = n=>String(n).padStart(2, '0');
  const dkey = d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  const nowLocal = ()=>{ const d = new Date(); return `${dkey(d)}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fmt = ts=>{ const d = new Date(ts); return isNaN(d) ? ts : d.toLocaleString([], { day:'numeric', month:'short', year:'2-digit', hour:'numeric', minute:'2-digit' }); };
  const download = (name, text, type)=>{ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); };
  const csvCell = v=>{ v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  let user = Auth.current(), tab = 'behavior', mode = 'in', lastEmail = '', editEv = null, editGr = null;
  const acct = ()=>db.data[user];
  const kids = ()=>acct().children;
  const kid = ()=>kids().find(k=>k.id === sessionStorage.getItem('attune.child')) || kids()[0];

  /* ---------- auth screens (errors are shown in place; fields are never wiped) */
  function renderAuth(){
    const up = mode === 'up', rs = mode === 'reset';
    app.innerHTML = `<form class="pcard authcard" id="auth" novalidate><p class="eyebrow" style="--c:var(--orange)">Parent portal</p><h1>${rs ? 'Reset password' : up ? 'Create your account' : 'Welcome back'}</h1>
      ${up ? '<label>Your name<input name="name" autocomplete="name" required></label>' : ''}
      <label>Email<input name="email" type="email" autocomplete="email" value="${esc(lastEmail)}" required></label>
      ${rs ? '<label>Recovery code<input name="code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>' : ''}
      <label>${rs ? 'New password' : 'Password'}<input name="pw" type="password" autocomplete="${up || rs ? 'new-password' : 'current-password'}" minlength="8" required></label>
      ${up ? `<label class="chk"><input type="checkbox" name="ok"> I’ve read the privacy notice and agree to store my children’s information in this portal.</label><details><summary class="small">Privacy notice</summary>${PRIVACY}</details>` : ''}
      <p class="perr" role="alert" aria-live="polite"></p><button class="btn" type="submit">${rs ? 'Reset password' : up ? 'Sign up' : 'Log in'}</button>
      ${!up && !rs ? '<button class="pbtn" type="button" data-m="reset">Forgot password?</button>' : ''}
      <button class="pbtn" type="button" data-m="${up || rs ? 'in' : 'up'}">${up || rs ? 'Back to log in' : 'Create an account'}</button>
      <p class="small">Prototype: data is stored only in this browser on this device.</p></form>`;
    const f = $('#auth'), err = $('.perr');
    f.querySelectorAll('[data-m]').forEach(b=>b.onclick = ()=>{ lastEmail = f.elements.email.value; mode = b.dataset.m; renderAuth(); });
    f.onsubmit = async e=>{
      e.preventDefault(); const v = n=>f.elements[n]?.value ?? '', btn = $('button[type=submit]', f);
      lastEmail = v('email'); err.textContent = '';
      if (up && !f.elements.ok.checked){ err.textContent = 'Please tick the box to agree to the privacy notice.'; return; }
      btn.disabled = true;
      try {
        let rc = null;
        if (up) rc = await Auth.signUp(v('name'), v('email'), v('pw')); else if (rs) rc = await Auth.reset(v('email'), v('code'), v('pw')); else await Auth.signIn(v('email'), v('pw'));
        user = Auth.current(); mode = 'in'; rc ? renderRecovery(rc) : renderApp();
      } catch(x){ err.textContent = x.message; f.elements.pw.value = ''; f.elements.pw.focus(); }   // keep everything else, clear only the password
      btn.disabled = false;
    };
  }
  function renderRecovery(code){
    app.innerHTML = `<div class="pcard authcard"><p class="eyebrow" style="--c:var(--yellow)">Save this now</p><h1>Your recovery code</h1>
      <p>If you forget your password, this code is the only way to get back in. It is shown once. Write it down or save it in a password manager.</p>
      <p class="hand" style="font-size:38px;letter-spacing:.06em;user-select:all">${code}</p><button class="pbtn" id="cp" type="button">Copy code</button>
      <button class="btn" id="go" type="button">I’ve saved it</button></div>`;
    $('#cp').onclick = ()=>navigator.clipboard?.writeText(code).then(()=>{ $('#cp').textContent = 'Copied'; });
    $('#go').onclick = renderApp;
  }

  /* ---------- shell: child switcher + tabs + account */
  function renderApp(){
    if (!user || !db.users[user]) return renderAuth();
    const c = kid(), list = kids();
    app.innerHTML = `<div class="phead"><div><p class="eyebrow" style="--c:var(--mint)">Parent portal</p><h1>Hi ${esc(db.users[user].name)}</h1></div>
      <div class="prow">${list.length ? `<label class="sr" style="position:absolute;left:-9999px" for="kidSel">Child</label><select id="kidSel" style="width:auto">${list.map(k=>`<option value="${k.id}"${c && k.id === c.id ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select>` : ''}
        <button class="pbtn" id="addKid">+ Add child</button>${c ? '<button class="pbtn danger" id="delKid">Delete child</button>' : ''}<button class="pbtn" id="out">Sign out</button></div></div>
      <div class="pcard" id="acct" ${tab === 'account' ? '' : 'hidden'}><h2>Account &amp; privacy</h2>
        <div class="prow"><button class="pbtn" id="exJson">Export everything (JSON)</button>${c ? '<button class="pbtn" id="exCsv">Export behavior + grades (CSV)</button>' : ''}</div>
        <form id="pwForm" class="pgrid" novalidate><label>Current password<input name="o" type="password" autocomplete="current-password"></label><label>New password<input name="n" type="password" autocomplete="new-password" minlength="8"></label>
          <p class="perr" id="pwErr" role="alert" style="grid-column:1/-1"></p><button class="pbtn" type="submit">Change password</button></form>
        <form id="rmForm" class="prow" novalidate><label>Confirm password to delete your account<input name="p" type="password" autocomplete="current-password"></label><button class="pbtn danger" type="submit">Delete account &amp; all data</button></form><p class="perr" id="rmErr" role="alert"></p>
        <details><summary class="small">Privacy notice</summary>${PRIVACY}</details></div>
      <form class="pcard" id="kidForm" ${list.length ? 'hidden' : ''}><h2>${list.length ? 'Add a child' : 'Add your first child'}</h2><label>Child’s first name or nickname<input name="n" maxlength="40" required></label><button class="btn" type="submit">Save child</button></form>
      <div class="ptabs" role="group" aria-label="Section"><button type="button" data-t="behavior" aria-pressed="${tab === 'behavior'}">Behavior (ABC)</button><button type="button" data-t="academic" aria-pressed="${tab === 'academic'}">Academics</button><button type="button" data-t="account" aria-pressed="${tab === 'account'}">Account</button></div><div id="panel"></div>`;
    if (list.length) $('#kidSel').onchange = e=>{ sessionStorage.setItem('attune.child', e.target.value); editEv = editGr = null; renderApp(); };
    $('#addKid').onclick = ()=>{ const f = $('#kidForm'); f.hidden = !f.hidden; f.querySelector('input').focus(); };
    app.appendChild($('#acct'));            // Account tab content sits under the tab bar
    app.querySelectorAll('.ptabs button').forEach(b=>b.onclick = ()=>{ tab = b.dataset.t; editEv = editGr = null; renderApp(); });
    if (!c && tab !== 'account') $('#panel').innerHTML = '<p class="empty-note" style="margin:10px">Add a child above to start tracking.</p>';
    $('#out').onclick = ()=>{ Auth.signOut(); user = null; renderAuth(); };
    $('#kidForm').onsubmit = e=>{ e.preventDefault(); const n = new FormData(e.target).get('n').trim(); if (!n) return;
      const k = { id:uid(), name:n, scale:'percent', presets:{ a:[], b:[], c:[] }, events:[], grades:[] }; kids().push(k); save(); sessionStorage.setItem('attune.child', k.id); renderApp(); };
    $('#exJson').onclick = ()=>download('attune-portal-export.json', JSON.stringify({ exported:new Date().toISOString(), account:{ name:db.users[user].name, email:user }, children:kids() }, null, 2), 'application/json');
    if (c) $('#exCsv').onclick = ()=>{
      const rows = [['type','child','date','antecedent','behavior','consequence','intensity','notes','subject','period','value']];
      c.events.forEach(e=>rows.push(['behavior', c.name, e.ts, e.a, e.b, e.c, e.int, e.note, '', '', '']));
      c.grades.forEach(g=>rows.push(['academic', c.name, g.d, '', '', '', '', '', g.s, g.p, g.v]));
      download(`attune-${c.name.replace(/\W+/g, '_')}.csv`, rows.map(r=>r.map(csvCell).join(',')).join('\r\n'), 'text/csv');
    };
    $('#pwForm').onsubmit = async e=>{ e.preventDefault(); const f = e.target.elements, er = $('#pwErr'); er.textContent = '';
      try { await Auth.changePw(user, f.o.value, f.n.value); e.target.reset(); er.style.color = 'var(--ink)'; er.textContent = 'Password changed.'; } catch(x){ er.style.color = ''; er.textContent = x.message; } };
    $('#rmForm').onsubmit = async e=>{ e.preventDefault(); if (!confirm('Permanently delete your account and every child record? This can’t be undone.')) return;
      try { await Auth.remove(user, e.target.elements.p.value); user = null; mode = 'in'; renderAuth(); } catch(x){ $('#rmErr').textContent = x.message; } };
    if (c){
      $('#delKid').onclick = ()=>{ if (confirm(`Delete ${c.name} and all their records? This can't be undone.`)){ acct().children = list.filter(k=>k !== c); save(); sessionStorage.removeItem('attune.child'); renderApp(); } };
      tab === 'behavior' ? panelB(c) : tab === 'academic' ? panelA(c) : ($('#panel').innerHTML = '');
    }
  }

  /* ---------- ABC behavior */
  function sel(k, c, cur){
    const all = [...PRE[k], ...c.presets[k]]; if (cur && !all.includes(cur)) all.push(cur);
    return `<label>${LBL[k]}<select name="${k}" data-k="${k}">${all.map(o=>`<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}<option value="__other">Other (type your own)…</option></select></label>
      <div class="oth" hidden data-o="${k}"><input name="${k}_c" maxlength="80" placeholder="Type your own ${LBL[k].toLowerCase()}" aria-label="Custom ${LBL[k].toLowerCase()}"><label class="chk"><input type="checkbox" name="${k}_s" checked> Save for future entries</label></div>`;
  }
  function panelB(c){
    const ed = c.events.find(e=>e.id === editEv) || null; if (!ed) editEv = null;
    const saved = ['a','b','c'].flatMap(k=>c.presets[k].map(v=>`<span class="chip">${LBL[k][0]}: ${esc(v)}<button type="button" data-rm="${k}" data-v="${esc(v)}" aria-label="Remove saved option ${esc(v)}">×</button></span>`)).join('');
    $('#panel').innerHTML = `<div class="pgrid"><form class="pcard" id="abc" novalidate><h2>${ed ? 'Edit event' : 'Log a behavior event'}</h2>
      <label>Date &amp; time<input type="datetime-local" name="ts" value="${ed ? esc(ed.ts) : nowLocal()}" required></label>${sel('a', c, ed?.a)}${sel('b', c, ed?.b)}${sel('c', c, ed?.c)}
      <label>Intensity<select name="int">${['Very low','Low','Medium','High','Very high'].map((t, i)=>`<option value="${i+1}"${(ed ? ed.int : 3) === i + 1 ? ' selected' : ''}>${i+1} · ${t}</option>`).join('')}</select></label>
      <label>Notes<textarea name="note" rows="3" maxlength="500">${ed ? esc(ed.note) : ''}</textarea></label><p class="perr" id="abcErr" role="alert"></p>
      <div class="prow"><button class="btn" type="submit">${ed ? 'Update event' : 'Save event'}</button>${ed ? '<button class="pbtn" type="button" id="cancelEd">Cancel</button>' : ''}</div>${saved ? `<div><p class="small" style="margin:0 0 6px">Your saved options for ${esc(c.name)}</p><div class="chips" id="saved">${saved}</div></div>` : ''}</form>
      <div class="pcard"><h2>Trends</h2><label>Range<select id="rng"><option value="14">Last 14 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label><div id="chart"></div><div class="bars" id="pat"></div></div></div>
      <div class="pcard"><h2>History</h2><div class="filters"><label>From<input type="date" id="fFrom"></label><label>To<input type="date" id="fTo"></label><label>Antecedent<select id="fA"></select></label><label>Behavior<select id="fB"></select></label></div><div class="tw" id="hist"></div></div>`;
    const f = $('#abc');
    f.querySelectorAll('select[data-k]').forEach(s=>s.onchange = ()=>{ const o = f.querySelector(`[data-o="${s.dataset.k}"]`); o.hidden = s.value !== '__other'; if (!o.hidden) o.querySelector('input').focus(); });
    f.onsubmit = e=>{
      e.preventDefault(); const d = new FormData(f), ev = { id:ed ? ed.id : uid(), ts:d.get('ts'), int:+d.get('int'), note:d.get('note').trim() };
      for (const k of ['a','b','c']){
        let v = d.get(k); if (v === '__other'){ v = (d.get(k + '_c') || '').trim(); if (!v){ $('#abcErr').textContent = `Type your own ${LBL[k].toLowerCase()} or pick one from the list.`; return; }
          if (d.get(k + '_s') && ![...PRE[k], ...c.presets[k]].some(x=>x.toLowerCase() === v.toLowerCase())) c.presets[k].push(v); }
        ev[k] = v;
      }
      if (!ev.ts){ $('#abcErr').textContent = 'Choose a date and time.'; return; }
      if (ed) c.events[c.events.indexOf(ed)] = ev; else c.events.push(ev);
      editEv = null; save(); panelB(c);
    };
    if (ed) $('#cancelEd').onclick = ()=>{ editEv = null; panelB(c); };
    const sv = $('#saved'); if (sv) sv.onclick = e=>{ const b = e.target.closest('[data-rm]'); if (!b) return; c.presets[b.dataset.rm] = c.presets[b.dataset.rm].filter(x=>x !== b.dataset.v); save(); panelB(c); };
    const fill = (id, k)=>{ const vals = [...new Set(c.events.map(e=>e[k]))].sort(); $(id).innerHTML = '<option value="">All</option>' + vals.map(v=>`<option>${esc(v)}</option>`).join(''); };
    fill('#fA', 'a'); fill('#fB', 'b');
    ['#fFrom','#fTo','#fA','#fB'].forEach(i=>$(i).onchange = ()=>hist(c)); $('#rng').onchange = ()=>trend(c);
    $('#hist').onclick = e=>{
      const b = e.target.closest('[data-del]'), m = e.target.closest('[data-edit]');
      if (m){ editEv = m.dataset.edit; panelB(c); $('#abc').scrollIntoView({ behavior:'smooth', block:'center' }); }
      else if (b && confirm('Delete this event?')){ c.events = c.events.filter(x=>x.id !== b.dataset.del); if (editEv === b.dataset.del) editEv = null; save(); panelB(c); }
    };
    hist(c); trend(c);
  }
  function hist(c){
    const from = $('#fFrom').value, to = $('#fTo').value, a = $('#fA').value, b = $('#fB').value;
    const rows = c.events.filter(e=>(!from || e.ts.slice(0, 10) >= from) && (!to || e.ts.slice(0, 10) <= to) && (!a || e.a === a) && (!b || e.b === b)).sort((x, y)=>y.ts.localeCompare(x.ts));
    $('#hist').innerHTML = rows.length ? `<table><thead><tr><th>When</th><th>Antecedent</th><th>Behavior</th><th>Consequence</th><th>Int.</th><th>Notes</th><th></th></tr></thead><tbody>${rows.map(e=>`<tr><td>${esc(fmt(e.ts))}</td><td>${esc(e.a)}</td><td>${esc(e.b)}</td><td>${esc(e.c)}</td><td>${e.int}</td><td>${esc(e.note)}</td><td style="white-space:nowrap"><button class="pbtn" data-edit="${e.id}" aria-label="Edit event">Edit</button> <button class="pbtn" data-del="${e.id}" aria-label="Delete event">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty-note">No events match. Log one, or loosen the filters.</p>';
  }
  function trend(c){
    const n = +$('#rng').value, days = [], cnt = {}, sum = {};
    for (let i = n - 1; i >= 0; i--){ const d = new Date(); d.setDate(d.getDate() - i); days.push(dkey(d)); }
    const inR = c.events.filter(e=>days.includes(e.ts.slice(0, 10)));
    inR.forEach(e=>{ const k = e.ts.slice(0, 10); cnt[k] = (cnt[k] || 0) + 1; sum[k] = (sum[k] || 0) + e.int; });
    const max = Math.max(2, ...days.map(d=>cnt[d] || 0)), W = 600, H = 150, bw = W/n;
    $('#chart').innerHTML = inR.length ? `<svg class="chart" viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="Events per day over the last ${n} days"><line x1="0" x2="${W}" y1="${H}" y2="${H}" stroke="#2B2533"/>
      ${days.map((d, i)=>{ const v = cnt[d] || 0, h = v/max*(H - 10), avg = v ? sum[d]/v : 0; return v ? `<rect x="${i*bw + 1}" y="${H - h}" width="${Math.max(2, bw - 2)}" height="${h}" rx="2" fill="${avg >= 4 ? '#F48BC8' : avg >= 2.5 ? '#F7A44E' : '#8FD6AE'}"><title>${d}: ${v} event${v > 1 ? 's' : ''}, avg intensity ${avg.toFixed(1)}</title></rect>` : ''; }).join('')}
      <text x="0" y="${H + 14}">${days[0]}</text><text x="${W}" y="${H + 14}" text-anchor="end">${days[n-1]}</text><text x="4" y="10">max ${max}/day</text></svg><p class="small" style="margin:0">Bar height = events per day. Colour = average intensity (green low, orange medium, pink high).</p>` : '<p class="empty-note">No events in this range yet.</p>';
    const top = k=>{ const m = {}; inR.forEach(e=>m[e[k]] = (m[e[k]] || 0) + 1); return Object.entries(m).sort((x, y)=>y[1] - x[1]).slice(0, 3); };
    const bars = (t, k)=>{ const r = top(k); return r.length ? `<h3 style="font-size:15px;margin:8px 0 0">${t}</h3>` + r.map(([v, x])=>`<div><span>${esc(v)}</span><i style="width:${x/r[0][1]*100}%"></i><b>${x}</b></div>`).join('') : ''; };
    $('#pat').innerHTML = bars('Most common antecedents', 'a') + bars('Most common behaviors', 'b');
  }

  /* ---------- academics */
  function panelA(c){
    const lv = c.scale === 'level', max = lv ? 8 : 100, unit = lv ? 'Level' : '%';
    const ed = c.grades.find(g=>g.id === editGr) || null; if (!ed) editGr = null;
    const by = s=>c.grades.filter(g=>g.s === s).sort((x, y)=>x.d.localeCompare(y.d) || x.id.localeCompare(y.id));
    const card = ([s, name, col])=>{
      const g = by(s), last = g[g.length - 1], prev = g[g.length - 2]; if (!last) return `<div class="scard" style="--c:${col}"><span>${name}</span><b>–</b><small>No entries yet</small></div>`;
      const diff = prev ? last.v - prev.v : 0, arrow = !prev ? 'First entry' : diff > 0 ? `▲ Up ${+diff.toFixed(1)} since ${esc(prev.p)}` : diff < 0 ? `▼ Down ${+Math.abs(diff).toFixed(1)} since ${esc(prev.p)}` : '● Steady';
      const X = i=>g.length > 1 ? i/(g.length - 1)*116 + 2 : 60;
      return `<div class="scard" style="--c:${col}"><span>${name}</span><b>${lv ? 'Level ' : ''}${+last.v.toFixed(1)}${lv ? '' : '%'}</b><small>${arrow}</small><small>${esc(last.p)} · ${g.length} entr${g.length > 1 ? 'ies' : 'y'}</small><svg viewBox="0 0 120 44" role="img" aria-label="${name} trend"><polyline points="${g.map((x, i)=>`${X(i)},${40 - x.v/max*36}`).join(' ')}" fill="none" stroke="#2B2533" stroke-width="2"/>${g.map((x, i)=>`<circle cx="${X(i)}" cy="${40 - x.v/max*36}" r="2.5" fill="#fff" stroke="#2B2533"/>`).join('')}</svg></div>`;
    };
    const rows = [...c.grades].sort((x, y)=>y.d.localeCompare(x.d));
    $('#panel').innerHTML = `<div class="subj">${SUBJ.map(card).join('')}</div>
      <div class="pgrid"><form class="pcard" id="gf" novalidate><h2>${ed ? 'Edit entry' : 'Add a grade or level'}</h2>
        <label>Scoring style for ${esc(c.name)}<select id="scale"><option value="percent"${lv ? '' : ' selected'}>Percent (0–100)</option><option value="level"${lv ? ' selected' : ''}>Curriculum level (1–8)</option></select></label>
        <label>Subject<select name="s">${SUBJ.map(([k, n])=>`<option value="${k}"${ed?.s === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Term / period<input name="p" list="terms" maxlength="30" placeholder="e.g. Term 2 2026" value="${ed ? esc(ed.p) : ''}" required></label><datalist id="terms">${[1,2,3,4].map(t=>`<option value="Term ${t} ${new Date().getFullYear()}">`).join('')}</datalist>
        <label>Date<input type="date" name="d" value="${ed ? esc(ed.d) : dkey(new Date())}" required></label>
        <label>${lv ? 'Level (e.g. 2.5)' : 'Score (%)'}<input name="v" type="number" min="${lv ? 1 : 0}" max="${max}" step="0.1" value="${ed ? ed.v : ''}" required></label>
        <p class="perr" id="gErr" role="alert"></p><div class="prow"><button class="btn" type="submit">${ed ? 'Update' : 'Save'}</button>${ed ? '<button class="pbtn" type="button" id="cancelGr">Cancel</button>' : ''}</div></form>
      <div class="pcard"><h2>History</h2><div class="tw">${rows.length ? `<table><thead><tr><th>Subject</th><th>Period</th><th>Date</th><th>${unit}</th><th></th></tr></thead><tbody>${rows.map(g=>`<tr><td>${esc(SUBJ.find(x=>x[0] === g.s)[1])}</td><td>${esc(g.p)}</td><td>${esc(g.d)}</td><td>${+g.v.toFixed(1)}</td><td style="white-space:nowrap"><button class="pbtn" data-edit="${g.id}" aria-label="Edit entry">Edit</button> <button class="pbtn" data-del="${g.id}" aria-label="Delete entry">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty-note">No entries yet.</p>'}</div></div></div>`;
    $('#scale').onchange = e=>{ if (c.grades.length && !confirm('Existing entries keep their numbers. Switch scoring style anyway?')){ e.target.value = c.scale; return; } c.scale = e.target.value; save(); panelA(c); };
    $('#gf').onsubmit = e=>{ e.preventDefault(); const d = new FormData(e.target), v = parseFloat(d.get('v')), p = d.get('p').trim();
      if (!p || !d.get('d') || isNaN(v) || v < (lv ? 1 : 0) || v > max){ $('#gErr').textContent = `Enter a period, a date, and a value between ${lv ? 1 : 0} and ${max}.`; return; }
      const g = { id:ed ? ed.id : uid(), s:d.get('s'), p, d:d.get('d'), v }; if (ed) c.grades[c.grades.indexOf(ed)] = g; else c.grades.push(g);
      editGr = null; save(); panelA(c); };
    if (ed) $('#cancelGr').onclick = ()=>{ editGr = null; panelA(c); };
    $('#panel').onclick = e=>{
      const b = e.target.closest('[data-del]'), m = e.target.closest('[data-edit]');
      if (m){ editGr = m.dataset.edit; panelA(c); $('#gf').scrollIntoView({ behavior:'smooth', block:'center' }); }
      else if (b && confirm('Delete this entry?')){ c.grades = c.grades.filter(g=>g.id !== b.dataset.del); if (editGr === b.dataset.del) editGr = null; save(); panelA(c); }
    };
  }

  user && db.users[user] ? renderApp() : renderAuth();
})();
