/* LinkUp - STORE
   State management, local persistence, and every event / participant /
   availability operation. Depends on engine.js. */
//#STATE

let S,ERR='',nowMs=()=>Date.now();

const uid=p=>p+Math.random().toString(36).slice(2,8);

const off=(S_,id)=>TZ[S_.users.find(u=>u.id===id).tz]||0;

function logE(evId,actor,type,d){S.log.unshift({id:uid('a'),ev:evId,actor,type,t:nowMs(),d})}

function bump(ev){ev.ver++;ev.upd=nowMs()}

function mkParts(evId,ids,orgId){ids.forEach(u=>S.parts.push({id:uid('p'),ev:evId,user:u,token:uid('tok'),resp:u===orgId?'accepted':'invited',req:u===orgId,sub:false}))}

function createEvent(o,ids){const r=validateEvent(o);if(!ids.length)r.push('Invite at least one participant.');if(o.policy!=='everyone'){const t=ids.length;if(o.policy==='min'&&!(o.thr>=1&&o.thr<=t))r.push(`Minimum must be between 1 and ${t}.`);if(o.policy==='pct'&&!(o.thr>=1&&o.thr<=100))r.push('Percentage must be 1–100.')}

 if(r.length)return r;const ev={...o,id:uid('e'),status:'open',slot:null,ver:1,calc:null,created:nowMs(),upd:nowMs()};S.events.push(ev);mkParts(ev.id,[...new Set([o.org,...ids])],o.org);logE(ev.id,o.org,'Event created',ev.title);ids.filter(u=>u!==o.org).forEach(u=>logE(ev.id,o.org,'Participant invited',uname(u)+' (simulated invite)'));return ev}

function updateEvent(id,o){const ev=S.events.find(e=>e.id===id);if(ev.status!=='open')return['Only open events can be edited.'];const r=validateEvent(o);if(r.length)return r;Object.assign(ev,o);bump(ev);logE(id,ev.org,'Event updated','Settings changed; suggestions are now outdated');return ev}

const uname=id=>(S.users.find(u=>u.id===id)||{name:id}).name,evParts=id=>S.parts.filter(p=>p.ev===id);

function addPart(evId,u){const ev=S.events.find(e=>e.id===evId);if(ev.status!=='open')return 'Locked after confirmation.';if(S.parts.some(p=>p.ev===evId&&p.user===u))return 'Already invited.';mkParts(evId,[u],ev.org);bump(ev);logE(evId,ev.org,'Participant invited',uname(u)+' (simulated invite)')}

function rmPart(pid){const p=S.parts.find(x=>x.id===pid),ev=S.events.find(e=>e.id===p.ev);if(ev.status!=='open')return 'Locked after confirmation.';if(p.user===ev.org)return 'Organizer cannot be removed.';S.parts=S.parts.filter(x=>x!==p);S.subs=S.subs.filter(s=>s.part!==pid);bump(ev);logE(ev.id,ev.org,'Participant removed',uname(p.user))}

function respond(pid,r){const p=S.parts.find(x=>x.id===pid),ev=S.events.find(e=>e.id===p.ev);if(ev.status!=='open')return 'Event is '+ev.status+'.';p.resp=r;bump(ev);logE(ev.id,p.user,r==='accepted'?'Invitation accepted':'Invitation declined',uname(p.user))}

function submitAvail(pid,iv){const p=S.parts.find(x=>x.id===pid),ev=S.events.find(e=>e.id===p.ev);if(ev.status!=='open')return 'Availability is locked ('+ev.status+'). Reopen scheduling first.';if(p.resp==='declined')return 'Declined participants cannot submit.';

 const m=merge(iv);if(!m.length)return 'Select at least one interval.';const old=S.subs.find(s=>s.part===pid);if(old){old.iv=m;old.upd=nowMs()}else S.subs.push({id:uid('s'),ev:ev.id,part:pid,iv:m,upd:nowMs()});

 if(p.resp==='invited')p.resp='accepted';p.sub=true;bump(ev);logE(ev.id,p.user,old?'Availability updated':'Availability submitted',m.length+' interval(s)')}

const evStatus=ev=>{if(ev.status!=='open')return ev.status==='confirmed'?'Confirmed':'Cancelled';if(ev.calc)return ev.calc.slots.length?'Suggestions available':'No viable overlap found';return S.parts.some(p=>p.ev===ev.id&&p.sub)?'Ready to calculate matches':'Waiting for responses'};

const stale=ev=>!!ev.calc&&ev.calc.ver!==ev.ver;

function recalc(evId,actor){const ev=S.events.find(e=>e.id===evId),slots=candidates(ev,evParts(evId),S.subs.filter(s=>s.ev===evId));ev.calc={ver:ev.ver,at:nowMs(),slots};logE(evId,actor,'Matches recalculated',slots.length+' suggestion(s)')}

/** Re-evaluates a chosen slot against CURRENT availability. */

function slotNow(ev,sl){const el=eligible(evParts(ev.id)),subs=S.subs.filter(s=>s.ev===ev.id),av=el.filter(p=>{const s=subs.find(x=>x.part===p.id);return s&&covers(merge(s.iv),sl.s,sl.e)}).map(p=>p.id);return{av,un:el.filter(p=>!av.includes(p.id)).map(p=>p.id),ok:meets(ev,av,el)}}

function confirmSlot(evId,sl,actor,override){const ev=S.events.find(e=>e.id===evId);if(ev.status!=='open')return 'Event is '+ev.status+'.';if(stale(ev)||!ev.calc)return 'Suggestions are outdated: recalculate first.';const n=slotNow(ev,sl);

 if(!n.ok&&!override)return 'NEEDOVERRIDE';ev.status='confirmed';ev.slot={s:sl.s,e:sl.e,av:n.av,un:n.un,override:!n.ok};bump(ev);logE(evId,actor,'Event confirmed',dateOf(sl.s)+' '+fm(minOf(sl.s))+'–'+fm(minOf(sl.e))+(n.ok?'':' (policy override)')+'; no external invites sent')}

function setStatus(evId,actor,st){const ev=S.events.find(e=>e.id===evId);if(st==='cancelled'){ev.status='cancelled';logE(evId,actor,'Event cancelled','Local simulation only')}else{ev.status='open';ev.slot=null;ev.calc=null;logE(evId,actor,'Scheduling reopened','Suggestions cleared')}bump(ev)}

function seed(){const d0=Math.floor(Date.now()/864e5)*1440,D=n=>dateOf(d0+n*1440),I=(n,a,b)=>[abs(D(n),a*60),abs(D(n),b*60)];

 S={v:1,me:'u1',view:'home',sel:null,

  users:[['u1','Person 1','person1','WAT (UTC+1)'],['u2','Person 2','person2','WAT (UTC+1)'],['u3','Person 3','person3','EST (UTC-5)'],['u4','Person 4','person4','UTC'],['u5','Person 5','person5','WAT (UTC+1)']].map(([id,name,username,tz])=>({id,name,username,tz,es:540,le:1260,dur:60})),events:[],parts:[],subs:[],log:[]};

 const mk=(o,ids,av,calc)=>{const ev=createEvent({desc:'',type:'hangout',loc:'',days:[0,1,2,3,4,5,6],ps:null,pe:null,xs:null,xe:null,tz:'WAT (UTC+1)',thr:1,...o},ids);ids.forEach(u=>{const p=S.parts.find(x=>x.ev===ev.id&&x.user===u);if(av[u]){respond(p.id,'accepted');submitAvail(p.id,av[u])}});if(calc)recalc(ev.id,o.org);return ev};

 mk({title:'Study group: Algorithms',type:'study session',org:'u1',dur:90,from:D(2),to:D(6),es:540,le:1200,policy:'everyone',ps:840,pe:1080},['u1','u2','u3','u4'],{u1:[I(2,14,18),I(3,10,13)],u2:[I(2,15,19),I(3,11,14)],u3:[I(2,13,17),I(3,10,12.5)],u4:[I(2,15,18),I(3,11,13)]},1);

 mk({title:'Game night',type:'game night',org:'u2',dur:120,from:D(4),to:D(8),es:1080,le:1380,policy:'min',thr:3},['u1','u2','u3','u4','u5'],{u2:[I(5,19,23)]},0);

 mk({title:'Club meeting',type:'meeting',org:'u3',dur:60,from:D(2),to:D(3),es:540,le:1080,policy:'everyone'},['u1','u2','u3'],{u1:[I(2,9,11)],u2:[I(2,13,15)],u3:[I(3,9,11)]},1);

 const e4=mk({title:'Project sync',type:'meeting',org:'u1',dur:30,from:D(1),to:D(1),es:600,le:1020,policy:'pct',thr:60},['u1','u2','u3','u4'],{u1:[I(1,15,17)],u2:[I(1,15,18)],u3:[I(1,16,17)],u4:[I(1,9,12)]},1);

 confirmSlot(e4.id,e4.calc.slots[0],'u1',false);S.log.forEach(l=>l.t=Date.now())}

function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){ERR='localStorage unavailable: changes will not persist.'}}

function load(){try{const r=localStorage.getItem(KEY);if(!r)return seed();const o=JSON.parse(r);if(o.v!==1||['users','events','parts','subs','log'].some(k=>!Array.isArray(o[k])))throw Error('schema mismatch');S=o;S.users.forEach((u,i)=>{if(!u.username)u.username='person'+(i+1);if(/^u[1-5]$/.test(u.id))u.name='Person '+u.id.slice(1)})}catch(e){ERR='Saved data is invalid ('+e.message+'). Reset the demo to continue safely.';seed()}}

