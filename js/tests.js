/* LinkUp - TESTS
   Automated suite for the engine and store. Run from Settings -> Diagnostics.
   Depends on engine.js and store.js. */
//#TESTS

function runTests(){const bak=S,out=[],eq=(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error((m||'')+' got '+JSON.stringify(a)+' expected '+JSON.stringify(b))};

 const T=(n,f)=>{try{f();out.push([n,1,''])}catch(e){out.push([n,0,e.message])}};const D='2026-03-02',A=(a,b)=>[abs(D,a*60),abs(D,b*60)];

 const E=o=>({dur:60,from:D,to:D,days:[0,1,2,3,4,5,6],es:480,le:1200,ps:null,pe:null,xs:null,xe:null,policy:'everyone',thr:1,...o}),P=(id,req=true)=>({id,resp:'accepted',req}),U=(id,...iv)=>({part:id,iv});

 T('Full overlap',()=>{const c=candidates(E({}),[P('a'),P('b')],[U('a',A(9,12)),U('b',A(9,12))]);eq(c[0].av.length,2);eq(minOf(c[0].s),540)});

 T('Partial overlap',()=>{const c=candidates(E({}),[P('a'),P('b')],[U('a',A(9,12)),U('b',A(11,14))]);eq(c.length,1);eq([minOf(c[0].s),minOf(c[0].e)],[660,720])});

 T('No overlap',()=>eq(candidates(E({}),[P('a'),P('b')],[U('a',A(9,10)),U('b',A(12,13))]).length,0));

 T('Insufficient overlap duration',()=>eq(candidates(E({}),[P('a'),P('b')],[U('a',A(9,11)),U('b',A(10.5,12))]).length,0));

 T('Everyone policy',()=>eq(candidates(E({}),[P('a'),P('b'),P('c')],[U('a',A(9,12)),U('b',A(9,12)),U('c',A(14,16))]).length,0));

 T('Minimum participants',()=>eq(candidates(E({policy:'min',thr:2}),[P('a',false),P('b',false),P('c',false)],[U('a',A(9,12)),U('b',A(9,12)),U('c',A(14,16))])[0].av.length,2));

 T('Percentage threshold',()=>{const ps=[P('a',false),P('b',false),P('c',false)],s=[U('a',A(9,12)),U('b',A(9,12))];eq(candidates(E({policy:'pct',thr:60}),ps,s).length>0,true);eq(candidates(E({policy:'pct',thr:70}),ps,s).length,0)});

 T('Missing submission = unavailable',()=>{const c=candidates(E({policy:'min',thr:1}),[P('a',false),P('b',false)],[U('a',A(9,10))]);eq(c[0].un,['b']);eq(candidates(E({}),[P('a'),P('b')],[U('a',A(9,10))]).length,0)});

 T('Organizer preference ranks first',()=>{const c=candidates(E({ps:840,pe:1020}),[P('a')],[U('a',A(9,10),A(14,15))]);eq(c[0].pref,true);eq(minOf(c[0].s),840)});

 T('Excluded time rejected',()=>eq(candidates(E({xs:600,xe:660}),[P('a')],[U('a',A(10,11))]).length,0));

 T('Duplicate intervals merge',()=>eq(merge([A(9,10),A(9,10),A(9.5,11)]),[A(9,11)]));

 T('Adjacent intervals merge into one usable span',()=>{eq(merge([A(9,10),A(10,11)]),[A(9,11)]);eq(candidates(E({dur:90}),[P('a')],[U('a',A(9,10),A(10,11))]).length>0,true)});

 T('Window constraint respected',()=>{const c=candidates(E({es:600,le:660}),[P('a')],[U('a',A(8,14))]);eq(c.map(x=>minOf(x.s)),[600])});

 T('Validation rejects short window',()=>eq(validateEvent({title:'x',dur:120,from:D,to:D,days:[1],es:540,le:600}).length>0,true));

 T('Update invalidates old matches',()=>{seed();const ev=S.events[0],p=S.parts.find(x=>x.ev===ev.id&&x.user==='u4');eq(stale(ev),false);submitAvail(p.id,[[abs(ev.from,600),abs(ev.from,660)]]);eq(stale(ev),true);recalc(ev.id,'u1');eq(stale(ev),false)});

 T('Seed produces real matches',()=>{seed();eq(S.events[0].calc.slots.length>1,true);eq(S.events[2].calc.slots.length,0)});

 T('Confirmation + lock',()=>{seed();const ev=S.events[0];eq(confirmSlot(ev.id,ev.calc.slots[0],'u1',false),undefined);eq(ev.status,'confirmed');eq(typeof submitAvail(S.parts.find(x=>x.ev===ev.id).id,[[1,2]]),'string')});

 T('Persistence round-trip',()=>{seed();const s=JSON.stringify(S);eq(JSON.parse(s).events.length,4);eq(JSON.parse(s).v,1)});

 T('Reset reseeds consistently',()=>{seed();S.events=[];seed();eq(S.events.length,4);eq(S.parts.every(p=>S.events.some(e=>e.id===p.ev)),true)});

 S=bak;return out}

