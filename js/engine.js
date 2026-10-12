/* LinkUp - ENGINE
   Pure scheduling logic, time model, validation, and the slot matcher.
   No DOM access. Depends on nothing; used by store.js and tests.js. */


/* LinkUp local prototype. DEMO ONLY: identities are simulated, no auth, no real invitations/emails/calendars.

   Time model: every instant is "wall-clock minutes" in the EVENT's time zone (integer). Zones are FIXED UTC offsets (no DST);

   viewers see event time plus their own converted time. Events spanning midnight are not supported (validated). */

//#ENGINE

const MIN=60000,KEY='linkup-v1',TZ={'UTC':0,'WAT (UTC+1)':60,'EST (UTC-5)':-300,'IST (UTC+5:30)':330},WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const abs=(d,m)=>{const[y,o,a]=d.split('-').map(Number);return Date.UTC(y,o-1,a)/MIN+m};

const dateOf=a=>new Date(a*MIN).toISOString().slice(0,10),minOf=a=>((a%1440)+1440)%1440;

const hm=s=>{const[h,m]=s.split(':').map(Number);return h*60+m},fm=m=>String(m/60|0).padStart(2,'0')+':'+String(m%60).padStart(2,'0');

/** Merge overlapping, duplicate and adjacent intervals; drops zero/negative length. */

function merge(iv){const a=iv.filter(x=>x[1]>x[0]).map(x=>[x[0],x[1]]).sort((p,q)=>p[0]-q[0]),o=[];for(const x of a){const l=o[o.length-1];if(l&&x[0]<=l[1])l[1]=Math.max(l[1],x[1]);else o.push(x)}return o}

const covers=(m,s,e)=>m.some(x=>x[0]<=s&&x[1]>=e);

function dates(ev){const o=[];for(let t=abs(ev.from,0);t<=abs(ev.to,0);t+=1440)if(ev.days.includes(new Date(t*MIN).getUTCDay()))o.push(dateOf(t));return o}

function validateEvent(e){const r=[];if(!e.title.trim())r.push('Title is required.');if(!(e.dur>=5&&e.dur<=720))r.push('Duration must be 5–720 minutes.');if(!e.from||!e.to||e.to<e.from)r.push('Date range is invalid.');if(!e.days.length)r.push('Pick at least one allowed day.');

 if(!(e.le>e.es))r.push('Latest end must be after earliest start (events cannot span midnight in this prototype).');else if(e.le-e.es<e.dur)r.push('The daily window is shorter than the duration.');

 if(e.from&&e.to&&e.days.length&&!dates(e).length)r.push('No allowed weekday falls inside the date range.');return r}

const eligible=ps=>ps.filter(p=>p.resp!=='declined');

/** Policy check. Required participants must ALWAYS be available; "everyone" means every eligible (non-declined) participant. */

function meets(ev,av,el){const n=av.length,t=el.length;if(!t)return false;if(!el.filter(p=>p.req).every(p=>av.includes(p.id)))return false;

 return ev.policy==='everyone'?n===t:ev.policy==='min'?n>=ev.thr:n*100>=ev.thr*t}

/** Pure matcher: 15-minute candidate starts inside each allowed day window; runs of identical availability collapse to one suggestion. */

function candidates(ev,ps,subs){const el=eligible(ps),M={};el.forEach(p=>{const s=subs.find(x=>x.part===p.id);M[p.id]=s?merge(s.iv):[]});const out=[];

 for(const d of dates(ev)){const d0=abs(d,0);for(let s=d0+ev.es;s+ev.dur<=d0+ev.le;s+=15){const e=s+ev.dur,sm=s-d0;

  if(ev.xs!=null&&sm<ev.xe&&sm+ev.dur>ev.xs)continue;const av=el.filter(p=>covers(M[p.id],s,e)).map(p=>p.id);if(!meets(ev,av,el))continue;

  out.push({s,e,av,un:el.filter(p=>!av.includes(p.id)).map(p=>p.id),tot:el.length,pct:Math.round(av.length*100/el.length),pref:ev.ps==null||(sm>=ev.ps&&sm+ev.dur<=ev.pe),req:el.filter(p=>p.req&&av.includes(p.id)).length})}}

 const res=[];for(const c of out){const l=res[res.length-1];if(l&&c.s===l.last+15&&c.av.join()===l.av.join()&&c.pref===l.pref)l.last=c.s;else res.push({...c,last:c.s})}

 res.sort((a,b)=>b.av.length-a.av.length||b.pref-a.pref||b.req-a.req||a.s-b.s);

 return res.map((c,i)=>({...c,id:'M'+i,why:`${c.av.length} of ${c.tot} available (${c.pct}%)`+(ev.ps!=null?(c.pref?'; inside preferred time':'; outside preferred time'):'')+'; required available '+c.req+'; ties go to the earlier date'}))}

const policyText=ev=>ev.policy==='everyone'?'Only times when every invited person (not declined) is free.':ev.policy==='min'?`Times when at least ${ev.thr} people are free (required people must always be free).`:`Times when at least ${ev.thr}% of people are free (required people must always be free).`;

