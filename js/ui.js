/* LinkUp - UI
   DOM rendering and event handlers. Depends on engine.js, store.js, tests.js. */
//#UI

const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');

let AV={ev:null,date:null,set:new Set()},PICK=null,TR=null,EDIT=null;

const me=()=>S.users.find(u=>u.id===S.me),myPart=ev=>S.parts.find(p=>p.ev===ev.id&&p.user===S.me);

const fd=a=>WD[new Date(a*MIN).getUTCDay()]+' '+dateOf(a),ft=a=>fm(minOf(a));

const mine=(a,ev)=>a+((TZ[me().tz]||0)-(TZ[ev.tz]||0)),slotTxt=(ev,s,e)=>`${fd(s)} ${ft(s)}–${ft(e)} (${ev.tz})`+((TZ[me().tz]||0)!==(TZ[ev.tz]||0)?` · your time ${ft(mine(s,ev))}–${ft(mine(e,ev))}`:'');

function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3800)}

function act(f,msg){const r=f();if(typeof r==='string'){toast(r);return}if(msg)toast(msg+' (local simulation)');save();render()}

const tag=(s,c)=>`<span class="tag ${c||s.toLowerCase().split(' ')[0]}">${s}</span>`;

const myEvents=()=>S.events.filter(e=>e.org===S.me||S.parts.some(p=>p.ev===e.id&&p.user===S.me));

const role=ev=>ev.org===S.me?'Organizer':'Participant';

function next(ev){const p=myPart(ev),st=evStatus(ev);if(ev.status==='confirmed')return'Confirmed: '+slotTxt(ev,ev.slot.s,ev.slot.e);if(ev.status==='cancelled')return'Cancelled';if(p&&p.resp==='invited')return'Respond to invitation';if(p&&p.resp!=='declined'&&!p.sub)return'Submit your availability';if(ev.org===S.me)return st==='Suggestions available'&&!stale(ev)?'Review suggestions and confirm':st==='Waiting for responses'?'Waiting for responses':'Recalculate matches';return'Waiting on organizer'}

const evRow=ev=>`<div class="li"><div><b>${esc(ev.title)}</b> ${tag(evStatus(ev),ev.status==='open'?'open':ev.status)}<br><span class="m">${role(ev)} · ${ev.from} → ${ev.to} · ${ev.dur} min · ${esc(next(ev))}</span></div><button onclick="openEv('${ev.id}')">Open</button></div>`;

const list=(a,empty)=>a.length?a.map(evRow).join(''):`<p class="m">${empty}</p>`;

const openEv=id=>{S.view='room';S.sel=id;PICK=null;render()},go=v=>{S.view=v;S.sel=null;EDIT=null;render()};

const V={

home(){
  const E=myEvents(), open=E.filter(e=>e.status==='open'), confirmed=E.filter(e=>e.status==='confirmed'),
    invited=S.parts.filter(p=>p.user===S.me&&p.resp==='invited'&&S.events.find(e=>e.id===p.ev)?.status==='open'),
    awaiting=open.filter(e=>{const p=myPart(e);return p&&p.resp!=='declined'&&!p.sub}),
    needsCalc=open.filter(e=>e.org===S.me&&(!e.calc||stale(e))),
    ready=open.filter(e=>e.org===S.me&&e.calc&&!stale(e)&&e.calc.slots.length),
    recent=S.log.filter(l=>E.some(e=>e.id===l.ev)).slice(0,5),
    allPeople=new Set(E.flatMap(e=>evParts(e.id).filter(p=>p.resp!=='declined').map(p=>p.user))).size,
    submitted=E.reduce((n,e)=>n+evParts(e.id).filter(p=>p.resp!=='declined'&&p.sub).length,0),
    possible=E.reduce((n,e)=>n+evParts(e.id).filter(p=>p.resp!=='declined').length,0),
    percent=possible?Math.round(submitted/possible*100):0,
    fmtDate=ev=>{const d=new Date(ev.from+'T12:00:00Z');return {day:String(d.getUTCDate()).padStart(2,'0'),mon:d.toLocaleString('en',{month:'short',timeZone:'UTC'})}},
    card=ev=>{const d=fmtDate(ev),p=myPart(ev);return `<div class="event-card"><div class="event-date"><span>${d.mon}</span><b>${d.day}</b></div><div class="event-info"><strong>${esc(ev.title)}</strong><div class="event-meta">${esc(ev.type)} · ${ev.dur} min · ${ev.status==='confirmed'?'Time confirmed':(evParts(ev.id).filter(x=>x.resp!=='declined').length+' participants')}</div></div>${tag(evStatus(ev),ev.status==='open'?'open':ev.status)}<button onclick="openEv('${ev.id}')">Open</button></div>`};
  const action=(ev,title,desc,cta)=>`<div class="action-item"><span class="action-dot"></span><div class="action-copy"><strong>${title}</strong><p>${desc}</p></div><button onclick="openEv('${ev.id}')">${cta}</button></div>`;
  const activityIcon=l=>l.type.includes('confirm')?'✓':l.type.includes('Availability')?'◷':l.type.includes('invited')?'＋':'↗';
  return `<section class="dashboard-hero"><div><div class="hero-eyebrow">Your scheduling space</div><h2>Good ${new Date().getHours()<12?'morning':new Date().getHours()<18?'afternoon':'evening'}, ${esc(me().name.split(' ')[0])}.</h2><p class="page-intro">A little less back-and-forth. A lot more time together.</p></div><div class="hero-actions"><button onclick="guide()">Explore demo</button><button class="pri" onclick="EDIT=null;go('create')">＋ Create event</button></div></section>
  <section class="stats-grid" aria-label="Scheduling overview">
    <div class="stat-card"><div class="stat-top">Open events <span class="stat-icon">◷</span></div><div class="stat-number">${open.length}</div><div class="stat-foot">Still finding a time</div></div>
    <div class="stat-card"><div class="stat-top">Confirmed <span class="stat-icon">✓</span></div><div class="stat-number">${confirmed.length}</div><div class="stat-foot">Ready to happen</div></div>
    <div class="stat-card"><div class="stat-top">Needs your attention <span class="stat-icon">↗</span></div><div class="stat-number">${awaiting.length+invited.length+needsCalc.length}</div><div class="stat-foot">Invites, availability or matches</div></div>
    <div class="stat-card"><div class="stat-top">People in your events <span class="stat-icon">♧</span></div><div class="stat-number">${allPeople}</div><div class="stat-foot">Across your current events</div></div>
  </section>
  <section class="dashboard-grid"><div class="panel"><div class="panel-head"><div><h3>Your events</h3><div class="subhead">Everything you're organizing or attending</div></div><button class="text-action" onclick="go('events')">View all ↗</button></div><div class="event-list">${E.length?E.slice().sort((a,b)=>(a.status==='confirmed'?0:1)-(b.status==='confirmed'?0:1)||b.upd-a.upd).slice(0,5).map(card).join(''):'<div class="empty">No events yet. Create one to get started.</div>'}</div></div>
  <div class="right-stack"><div class="panel"><div class="panel-head"><div><h3>Keep things moving</h3><div class="subhead">Your next best actions</div></div><span class="tag ${awaiting.length+invited.length+needsCalc.length?'open':'ok'}">${awaiting.length+invited.length+needsCalc.length} pending</span></div><div class="action-list">${invited.slice(0,2).map(p=>{const e=S.events.find(x=>x.id===p.ev);return action(e,'Respond to invitation',e.title,'Review')}).join('')}${awaiting.slice(0,2).map(e=>action(e,'Share your availability',e.title,'Add times')).join('')}${needsCalc.slice(0,2).map(e=>action(e,'Refresh time suggestions',e.title,'Review')).join('')}${ready.slice(0,1).map(e=>action(e,'Choose a time',e.title,'Choose')).join('')}${!(invited.length+awaiting.length+needsCalc.length+ready.length)?'<div class="empty">You’re all caught up. Nice work.</div>':''}</div></div>
  <div class="panel"><div class="panel-head"><div><h3>Availability progress</h3><div class="subhead">Submissions across your events</div></div><span class="tag">${percent}%</span></div><div class="progress-wrap"><div class="progress-line"><span class="m">Availability submitted</span><strong>${submitted} / ${possible}</strong></div><div class="progress"><span style="width:${percent}%"></span></div><div class="stat-foot" style="margin-top:10px">${possible-submitted} ${possible-submitted===1?'response':'responses'} still outstanding</div></div></div></div></section>
  <section class="panel" style="margin-top:18px"><div class="panel-head"><div><h3>Recent activity</h3><div class="subhead">A simple timeline of what’s changed</div></div><button class="text-action" onclick="go('events')">Open events ↗</button></div><div class="activity-list">${recent.length?recent.map(l=>`<div class="activity-item"><div class="activity-icon">${activityIcon(l)}</div><div class="activity-copy"><strong>${esc(uname(l.actor))}</strong> ${esc(l.type.toLowerCase())}<p>${esc((S.events.find(e=>e.id===l.ev)||{title:'Event'}).title)} · ${esc(l.d||'')} · ${new Date(l.t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</p></div></div>`).join(''):'<div class="empty">Activity will appear here as people respond and times are confirmed.</div>'}</div></section>`},

events(){return `<h2>My events</h2>${list(myEvents(),'No events yet. Create one.')}`},

create(){const e=EDIT?S.events.find(x=>x.id===EDIT):{title:'',desc:'',type:'hangout',loc:'',dur:me().dur,from:'',to:'',days:[1,2,3,4,5],es:me().es,le:me().le,ps:null,pe:null,xs:null,xe:null,tz:me().tz,policy:'everyone',thr:2},ids=EDIT?[]:[];

 const sel=(n,o,v)=>`<select name="${n}">${o.map(x=>`<option ${x==v?'selected':''}>${x}</option>`).join('')}</select>`,tm=v=>v==null?'':fm(v);

 return `<h2>${EDIT?'Edit event':'Create event'}</h2><form onsubmit="return saveEv(event)"><label>Title<input name="title" value="${esc(e.title)}" required></label><label>Description<textarea name="desc">${esc(e.desc)}</textarea></label>

 <label>Type${sel('type',['hangout','study session','meeting','game night','custom'],e.type)}</label><label>Location or meeting link (optional)<input name="loc" value="${esc(e.loc)}"></label>

 <label>Duration (minutes)${sel('dur',[15,30,45,60,90,120,'custom'],[15,30,45,60,90,120].includes(e.dur)?e.dur:'custom')}</label><label>Custom duration (if chosen)<input name="cdur" type="number" min="5" max="720" value="${e.dur}"></label>

 <label>Earliest date<input type="date" name="from" value="${e.from}" required></label><label>Latest date<input type="date" name="to" value="${e.to}" required></label>

 <div class="chk">Allowed days: ${WD.map((w,i)=>`<label><input type="checkbox" name="days" value="${i}" ${e.days.includes(i)?'checked':''}> ${w}</label>`).join('')}</div>

 <label>Earliest start<input type="time" name="es" value="${fm(e.es)}"></label><label>Latest end<input type="time" name="le" value="${fm(e.le)}"></label>

 <label>Preferred window (optional)<input type="time" name="ps" value="${tm(e.ps)}"><input type="time" name="pe" value="${tm(e.pe)}"></label><label>Excluded window (optional)<input type="time" name="xs" value="${tm(e.xs)}"><input type="time" name="xe" value="${tm(e.xe)}"></label>

 <label>Event time zone (fixed offsets, no DST)${sel('tz',Object.keys(TZ),e.tz)}</label>

 <label>Participation rule<select name="policy" onchange="this.nextElementSibling.textContent=policyText({policy:this.value,thr:form.thr.value})"><option value="everyone" ${e.policy==='everyone'?'selected':''}>Everyone</option><option value="min" ${e.policy==='min'?'selected':''}>Minimum participants</option><option value="pct" ${e.policy==='pct'?'selected':''}>Percentage threshold</option></select><span class="m">${policyText(e)}</span></label>

 <label>Minimum count or percentage<input type="number" name="thr" min="1" value="${e.thr}"></label>

 ${EDIT?'':`<div class="chk">Invite: ${S.users.filter(u=>u.id!==S.me).map(u=>`<label><input type="checkbox" name="inv" value="${u.id}"> ${esc(u.name)}</label>`).join('')}</div>`}

 <div class="row"><button class="pri">${EDIT?'Save changes':'Create event'}</button><button type="button" onclick="go(EDIT?'room':'home');if(EDIT)S.sel=EDIT">Cancel</button></div></form>`},

avail(){const E=myEvents().filter(e=>e.status==='open'&&myPart(e)&&myPart(e).resp!=='declined');if(!E.length)return'<h2>Availability</h2><p class="m">No open events need your availability.</p>';

 if(!AV.ev||!E.some(e=>e.id===AV.ev))loadAV(E[0].id);const ev=S.events.find(e=>e.id===AV.ev),ds=dates(ev);const rows=[];

 for(let h=Math.floor(ev.es/60);h*60<ev.le;h++){let c=`<span>${fm(h*60)}</span>`;for(let q=0;q<4;q++){const m=h*60+q*15,ok=m>=ev.es&&m+15<=ev.le,a=abs(AV.date,m);c+=`<button ${ok?'':'disabled style="opacity:.2"'} class="${AV.set.has(a)?'on':''}" aria-pressed="${AV.set.has(a)}" onclick="cell(${a})" aria-label="${fm(m)}">${q*15||'00'}</button>`}rows.push(c)}

 const p=myPart(ev);return `<h2>Availability</h2><div class="row"><select onchange="loadAV(this.value);render()">${E.map(e=>`<option value="${e.id}" ${e.id===AV.ev?'selected':''}>${esc(e.title)}</option>`).join('')}</select><span class="m">Times are in ${ev.tz} (event time). ${p.sub?tag('Submitted','ok'):tag('Not submitted','w')}</span></div>

 <div class="row"><button onclick="nav(-1)">Previous date</button><select onchange="AV.date=this.value;render()">${ds.map(d=>`<option ${d===AV.date?'selected':''}>${d}</option>`).join('')}</select><button onclick="nav(1)">Next date</button></div>

 <div class="grid">${rows.join('')}</div><h3>Add an interval (easier on mobile)</h3><div class="row"><input type="time" id="ia" step="900"><input type="time" id="ib" step="900"><button onclick="addIv()">Add to ${AV.date}</button><button onclick="AV.set.clear();render()">Clear all</button><button class="pri" onclick="saveAV()">Save availability</button></div>

 <h3>Selected</h3>${selTxt(ev)}`},

invites(){const a=S.parts.filter(p=>p.user===S.me).map(p=>[p,S.events.find(e=>e.id===p.ev)]);return `<h2>Invitations</h2><p class="m">Simulated invitations: no emails are sent. Participants need no account or subscription.</p>${a.length?a.map(([p,e])=>`<div class="li"><div><b>${esc(e.title)}</b> ${tag(p.resp,p.resp==='declined'?'cancelled':p.resp==='accepted'?'ok':'w')}<br><span class="m">Organizer ${esc(uname(e.org))} · token ${p.token}</span></div>${p.resp==='invited'&&e.status==='open'?`<button class="pri" onclick="act(()=>respond('${p.id}','accepted'),'Accepted')">Accept</button><button onclick="act(()=>respond('${p.id}','declined'),'Declined')">Decline</button>`:''}<button onclick="openEv('${e.id}')">Open</button></div>`).join(''):'<p class="m">No invitations.</p>'}`},

settings(){const u=me();return `<h2>Settings & profiles</h2><p class="m">Profiles are saved only in this browser. They are local demo identities, not secure accounts or sign-in credentials. Each profile keeps its own username, display name, and scheduling preferences; event records are shared in this browser so you can test collaboration by switching profiles.</p><form onsubmit="return saveSet(event)"><label>Display name<input name="name" value="${esc(u.name)}" required></label><label>Username<input name="username" value="${esc(u.username||'')}" pattern="[A-Za-z0-9_.-]{3,24}" minlength="3" maxlength="24" required><span class="m">3–24 characters: letters, numbers, dots, underscores or hyphens.</span></label><label>Default time zone<select name="tz">${Object.keys(TZ).map(z=>`<option ${z===u.tz?'selected':''}>${z}</option>`).join('')}</select></label><label>Preferred start<input type="time" name="es" value="${fm(u.es)}"></label><label>Preferred end<input type="time" name="le" value="${fm(u.le)}"></label><label>Default duration (min)<input type="number" name="dur" min="5" max="720" value="${u.dur}"></label><button class="pri">Save profile</button></form>

 <h3>Add a person</h3><form onsubmit="return addProfile(event)"><label>Person's name<input name="newName" placeholder="e.g. Alex Johnson" required maxlength="60"></label><label>Username<input name="newUsername" placeholder="e.g. alexj" pattern="[A-Za-z0-9_.-]{3,24}" minlength="3" maxlength="24" required><span class="m">Usernames must be unique in this browser.</span></label><button class="pri">＋ Add person</button></form>

 <h3>Invite-based collaboration</h3><div class="banner"><b>Local demo, not cross-device sync.</b><br>Invite codes and links can be copied or shared, but this standalone prototype does not transmit events, availability, or confirmations to another device. Real cross-device collaboration needs a hosted backend or a separate sync service. Do not put private information in demo invites.</div>

 <div class="row"><button onclick="if(confirm('Restore demo data? Current events and profiles will be replaced.')){seed();save();render();toast('Demo data restored')}">Restore demo data</button><button class="d" onclick="if(confirm('Reset the whole prototype?')){localStorage.removeItem(KEY);seed();save();render()}">Reset prototype</button></div>

 <h3>Diagnostics</h3><button class="pri" onclick="TR=runTests();render()">Run scheduling tests</button>${TR?tbl(['Test','Result','Detail'],TR.map(x=>[x[0],x[1]?'<span class="ok">PASS</span>':'<span class="bad">FAIL</span>',esc(x[2])])):''}`},

room(){const ev=S.events.find(e=>e.id===S.sel);if(!ev)return'<p>Event not found.</p>';const ps=evParts(ev.id),org=ev.org===S.me,st=evStatus(ev),open=ev.status==='open',p=myPart(ev);

 const heat=dates(ev).map(d=>{let c=`<span class="m" style="width:96px">${WD[new Date(abs(d,0)*MIN).getUTCDay()]} ${d.slice(5)}</span>`;for(let h=Math.ceil(ev.es/60);h*60+60<=ev.le;h++){const n=eligible(ps).filter(q=>{const s=S.subs.find(x=>x.part===q.id);return s&&covers(merge(s.iv),abs(d,h*60),abs(d,h*60+60))}).length;c+=`<i title="${fm(h*60)}: ${n} free" style="background:rgba(111,155,191,${n/Math.max(1,eligible(ps).length)*.9})">${h}</i>`}return`<div class="heat">${c}</div>`}).join('');

 let ms='';if(ev.calc){ms=(stale(ev)?'<div class="banner">These suggestions are outdated: availability or settings changed. Recalculate.</div>':'')+(ev.calc.slots.length?ev.calc.slots.slice(0,8).map(s=>`<div class="li" style="${stale(ev)?'opacity:.5':''}"><div><b>${slotTxt(ev,s.s,s.e)}</b>${s.last>s.s?`<br><span class="m">Can start any time until ${ft(s.last)}</span>`:''}<br><span class="m">${s.why}</span><br><span class="ok">Free: ${s.av.map(uname).join(', ')}</span> <span class="bad">${s.un.length?'Unavailable: '+s.un.map(uname).join(', '):''}</span></div>${org&&open?`<button onclick="PICK='${s.id}';render()">Select</button>`:''}</div>`).join(''):'<p class="bad">No time satisfies the rule. Try widening the window, lowering the threshold, or asking people to add availability.</p>')}

 let pk='';if(PICK&&ev.calc){const s=ev.calc.slots.find(x=>x.id===PICK),n=slotNow(ev,s);pk=`<div class="banner"><b>Confirm ${slotTxt(ev,s.s,s.e)}</b><br>Available: ${n.av.map(uname).join(', ')||'-'}<br>Unavailable: ${n.un.map(uname).join(', ')||'-'}<br>${s.pref?'Preferred time satisfied.':'Preferred time not satisfied.'} ${n.ok?'Rule satisfied.':'<b>Rule NOT satisfied by current availability.</b>'}<div class="row"><button class="pri" onclick="doConfirm('${s.id}')">${n.ok?'Confirm event':'Confirm with override'}</button><button onclick="PICK=null;render()">Back</button></div></div>`}

 return `<h2>${esc(ev.title)} ${tag(st,ev.status==='open'?'open':ev.status)}</h2><p class="m">${esc(ev.type)} · ${esc(ev.desc||'No description')} ${ev.loc?'· '+esc(ev.loc):''}<br>Organizer ${esc(uname(ev.org))} · ${ev.from} → ${ev.to} · ${ev.dur} min · window ${fm(ev.es)}–${fm(ev.le)} ${ev.tz} · ${policyText(ev)}</p>

 <div class="row">${org&&open?`<button onclick="EDIT='${ev.id}';S.view='create';render()">Edit settings</button><button class="pri" onclick="act(()=>recalc('${ev.id}','${S.me}'),'Recalculated')">Recalculate matches</button><button class="d" onclick="if(confirm('Cancel this event?'))act(()=>setStatus('${ev.id}','${S.me}','cancelled'),'Cancelled')">Cancel event</button>`:''}${org&&!open?`<button onclick="if(confirm('Reopen scheduling? The confirmed time is cleared.'))act(()=>setStatus('${ev.id}','${S.me}','open'),'Reopened')">Reopen scheduling</button>`:''}${p&&open&&p.resp!=='declined'?`<button onclick="AV.ev=null;loadAV('${ev.id}');go('avail')">${p.sub?'Edit my availability':'Add my availability'}</button>`:''}</div>

 ${ev.status==='confirmed'?`<div class="banner ok"><b>Confirmed: ${slotTxt(ev,ev.slot.s,ev.slot.e)}</b><br>Attending: ${ev.slot.av.map(uname).join(', ')||'-'} · Unavailable: ${ev.slot.un.map(uname).join(', ')||'-'}${ev.slot.override?'<br>Confirmed with a policy override.':''}<br><span class="m">No calendar invitations were sent (local demo).</span></div>`:''}

 ${pk}<h3>Matches</h3>${ms||'<p class="m">Not calculated yet.</p>'}<h3>Availability heat (free participants per hour, ${ev.tz})</h3>${heat}

 <h3>Participants</h3>${tbl(['Name','Status','Availability','Role','Actions'],ps.map(q=>[esc(uname(q.user)),q.resp,q.sub?'submitted':'not submitted',q.req?'required':'optional',`<button onclick="S.me='${q.user}';render()">View as</button>${org&&open?` <button onclick="act(()=>{q=S.parts.find(x=>x.id=='${q.id}');q.req=!q.req;bump(S.events.find(e=>e.id==q.ev))})">Toggle required</button>${q.user!==ev.org?` <button class="d" onclick="act(()=>rmPart('${q.id}'))">Remove</button>`:''}`:''}${q.user===S.me&&q.resp==='invited'&&open?` <button onclick="act(()=>respond('${q.id}','accepted'),'Accepted')">Accept</button> <button onclick="act(()=>respond('${q.id}','declined'),'Declined')">Decline</button>`:''}`]))}

 ${org&&open?`<div class="row"><select id="np">${S.users.filter(u=>!ps.some(q=>q.user===u.id)).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select><button onclick="const v=$('#np').value;v&&act(()=>addPart('${ev.id}',v),'Invited')">Add demo participant</button></div>`:''}

 <div class="banner"><b>Invite code:</b> <code>${esc((p||ps[0]).token)}</code><br><span class="m">Shareable reference only. This prototype stores the event on this browser; opening the link on another device will not sync event data.</span><div class="row"><button onclick="copyInvite('${(p||ps[0]).token}')">Copy invite link</button></div></div>

 <h3>Activity</h3>${tbl(['When','Who','What'],S.log.filter(l=>l.ev===ev.id).map(l=>[new Date(l.t).toLocaleString(),esc(uname(l.actor)),l.type+': '+esc(l.d)]))}`}};

function tbl(h,r){return r.length?`<div class="tw"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${r.map(x=>`<tr>${x.map(y=>`<td>${y}</td>`).join('')}</tr>`).join('')}</table></div>`:'<p class="m">Nothing yet.</p>'}

/* availability draft helpers: the draft is a Set of 15-minute slot starts; saving converts it to merged intervals */

function loadAV(id){const ev=S.events.find(e=>e.id===id),p=myPart(ev),sub=S.subs.find(s=>s.part===p.id);AV={ev:id,date:dates(ev)[0],set:new Set()};if(sub)sub.iv.forEach(([a,b])=>{for(let t=a;t<b;t+=15)AV.set.add(t)})}

const cell=a=>{AV.set.has(a)?AV.set.delete(a):AV.set.add(a);render()};

function nav(d){const ds=dates(S.events.find(e=>e.id===AV.ev)),i=ds.indexOf(AV.date)+d;if(i>=0&&i<ds.length){AV.date=ds[i];render()}}

function addIv(){const ev=S.events.find(e=>e.id===AV.ev),a=$('#ia').value,b=$('#ib').value;if(!a||!b)return toast('Enter both times.');const s=hm(a),e=hm(b);if(e<=s)return toast('End must be after start (zero-length intervals are not allowed).');if(s<ev.es||e>ev.le||s%15||e%15)return toast(`Use 15-minute steps within ${fm(ev.es)}–${fm(ev.le)}.`);for(let t=abs(AV.date,s);t<abs(AV.date,e);t+=15)AV.set.add(t);render()}

const selIv=()=>{const a=[...AV.set].sort((x,y)=>x-y).map(t=>[t,t+15]);return merge(a)};

const selTxt=ev=>{const m=selIv();return m.length?m.map(x=>`<div>${fd(x[0])} ${ft(x[0])}–${ft(x[1])}</div>`).join(''):'<p class="m">Nothing selected.</p>'};

function saveAV(){const ev=S.events.find(e=>e.id===AV.ev);act(()=>submitAvail(myPart(ev).id,selIv()),'Availability saved')}

function saveEv(e){e.preventDefault();const f=e.target,g=n=>f[n].value,tv=n=>g(n)?hm(g(n)):null,dur=g('dur')==='custom'?parseInt(g('cdur')):parseInt(g('dur')),days=[...f.querySelectorAll('[name=days]:checked')].map(x=>+x.value);

 const o={title:g('title'),desc:g('desc'),type:g('type'),loc:g('loc'),dur,from:g('from'),to:g('to'),days,es:hm(g('es')),le:hm(g('le')),ps:tv('ps'),pe:tv('pe'),xs:tv('xs'),xe:tv('xe'),tz:g('tz'),policy:g('policy'),thr:parseInt(g('thr'))||1,org:S.me};

 if((o.ps==null)!==(o.pe==null)||(o.xs==null)!==(o.xe==null)){toast('Fill both ends of preferred/excluded windows, or neither.');return false}

 const r=EDIT?updateEvent(EDIT,o):createEvent(o,[...f.querySelectorAll('[name=inv]:checked')].map(x=>x.value));if(Array.isArray(r)){toast(r.join(' '));return false}

 EDIT=null;save();openEv(r.id);toast('Saved (local simulation, no invitations delivered)');return false}

function saveSet(e){e.preventDefault();const f=e.target,u=me(),username=f.username.value.trim().replace(/^@/,'').toLowerCase();if(S.users.some(x=>x.id!==u.id&&(x.username||'').toLowerCase()===username)){toast('That username is already in use.');return false}u.name=f.name.value.trim()||u.name;u.username=username;u.tz=f.tz.value;u.es=hm(f.es.value);u.le=hm(f.le.value);u.dur=parseInt(f.dur.value)||60;save();render();toast('Profile saved locally');return false}

function addProfile(e){e.preventDefault();const f=e.target,name=f.newName.value.trim(),username=f.newUsername.value.trim().replace(/^@/,'').toLowerCase();if(!name){toast('Enter a name.');return false}if(!/^[A-Za-z0-9_.-]{3,24}$/.test(username)){toast('Use a valid username (3–24 characters).');return false}if(S.users.some(u=>(u.username||'').toLowerCase()===username)){toast('That username is already in use.');return false}const id=uid('u');S.users.push({id,name,username,tz:me().tz,es:me().es,le:me().le,dur:me().dur});S.me=id;S.log.unshift({id:uid('a'),ev:'',actor:id,type:'Local profile created',t:nowMs(),d:'@'+username+' · this browser only'});save();render();toast('Profile added on this device');return false}

function inviteLink(token){return location.href.split('#')[0]+'#join/'+encodeURIComponent(token)}
function copyInvite(token){const url=inviteLink(token);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(()=>toast('Invite link copied. Local demo only; no cross-device sync.')).catch(()=>prompt('Copy this demo invite link (not a sync connection):',url))}else prompt('Copy this demo invite link (not a sync connection):',url)}

function doConfirm(id){const ev=S.events.find(e=>e.id===S.sel),s=ev.calc.slots.find(x=>x.id===id);let r=confirmSlot(ev.id,s,S.me,false);if(r==='NEEDOVERRIDE'){if(!confirm('Current availability no longer satisfies the rule. Confirm anyway?'))return;r=confirmSlot(ev.id,s,S.me,true)}PICK=null;if(typeof r==='string')toast(r);else toast('Confirmed (local simulation: no calendar invites sent)');save();render()}

function guide(){const ev=S.events.find(e=>e.title==='Study group: Algorithms');if(!ev)return toast('Seed event missing. Restore demo data.');S.me='u1';openEv(ev.id);toast('Guided demo: switch between Person 1 and Person 4, edit availability, recalculate matches, then select and confirm.')}

const NAV=[['home','Home'],['events','My events'],['create','Create event'],['avail','Availability'],['invites','Invitations'],['settings','Settings']];

function applyTheme(t){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==='dark'?'dark':'light';try{localStorage.setItem('linkup-theme',t)}catch(e){}}
function toggleTheme(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');render()}
try{applyTheme(localStorage.getItem('linkup-theme')||'light')}catch(e){applyTheme('light')}

function render(){const v=S.view;$('#nav').innerHTML='<div class="brand"><div class="brand-mark">L</div><div><div class="brand-name">LinkUp</div><div class="brand-sub">Make time together</div></div></div><div><div class="nav-label">Workspace</div>'+NAV.map((n,i)=>`<a tabindex="0" class="${v===n[0]||(v==='room'&&n[0]==='events')?'on':''}" onclick="${n[0]==='create'?'EDIT=null;':''}go('${n[0]}')" onkeydown="if(event.key==='Enter')this.click()"><span class="nav-icon">${['⌂','▦','＋','◷','✉','⚙'][i]}</span>${n[1]}</a>`).join('')+'</div><div class="sidebar-bottom"><strong>Scheduling, simplified.</strong><p>Find a time that works for everyone.</p><button onclick="EDIT=null;go(\'create\')">＋ New event</button></div>';

 $('#hd').innerHTML=`<div class="header-context"><div class="header-kicker">WORKSPACE / LOCAL DEMO</div><div class="header-title">Scheduling overview · @${esc(me().username||'person1')}</div></div><div class="header-actions"><button class="theme-btn" onclick="toggleTheme()" aria-label="Toggle light and dark theme" title="Toggle theme">${document.documentElement.dataset.theme==='dark'?'☼':'☾'}</button><select onchange="S.me=this.value;save();render()" aria-label="Switch local profile">${S.users.map(u=>`<option value="${u.id}" ${u.id===S.me?'selected':''}>${esc(u.name)} (@${esc(u.username||'person')})</option>`).join('')}</select><button onclick="go('settings')">＋ Person</button></div>`;

 $('#v').innerHTML=(ERR?`<div id="err">${esc(ERR)}</div>`:'')+V[v]();save()}

if(typeof document!=='undefined'){load();render()}

