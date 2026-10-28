/* Toro — wake-up alarms + notifications */
const DAYN=['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
const dayOn=(a,d)=>!a.days||!a.days.length||a.days.includes(d);
const pastToday=t=>{const [h,m]=t.split(':').map(Number),x=new Date();x.setHours(h,m,0,0);return Date.now()>=x.getTime();};
function addAlarm(){const t=$('#atime').value;if(!t)return toast('اختر الوقت');if(S.alarms.length>=6)return toast('الحد الأقصى 6 منبهات');
 const days=[...document.querySelectorAll('.dchip.on')].map(e=>+e.dataset.d);
 do{S.seq=(S.seq%900)+1;}while(S.alarms.some(x=>x.id===S.seq));
 const a={id:S.seq,time:t,label:$('#alabel').value.trim()||'منبه الاستيقاظ',on:true,days,photo:$('#aph').checked};
 if(pastToday(t))S.dismissed[a.id+'_'+dk()]=true;S.alarms.push(a);save();scheduleAll();render();toast('تمت الإضافة ✅');}
function togA(id){const a=S.alarms.find(x=>x.id===id);if(!a)return;a.on=!a.on;if(a.on&&pastToday(a.time))S.dismissed[a.id+'_'+dk()]=true;save();scheduleAll();render();}
function delA(id){S.alarms=S.alarms.filter(x=>x.id!==id);save();scheduleAll();render();}
function testRing(){const n=new Date();startRing({id:0,label:'منبه تجريبي',time:pad(n.getHours())+':'+pad(n.getMinutes()),test:true,photo:true});}
function checkRing(){if(ring)return;const now=new Date(),day=dk(now);
 for(const a of S.alarms){if(!a.on||!dayOn(a,now.getDay())||S.dismissed[a.id+'_'+day])continue;
  const [h,m]=a.time.split(':').map(Number),t=new Date(now);t.setHours(h,m,0,0);const df=now-t;
  if(df>=0&&df<3600000){startRing(a);return;}}}
function startRing(a){if(ring)return;ring=a;const need=a.photo!==false;
 $('#ring').style.display='flex';
 $('#ring').innerHTML=`<div class="rb"><div class="huge">⏰</div><h1>${esc(a.label)}</h1><div class="big">${esc(a.time)}</div><p class="mq">${esc(motivRandom())}</p><p id="rmsg">${need?'المنبه ما يوقف إلا إذا صوّرت المغسلة ووافق عليها الذكاء الاصطناعي 🚰':'صباح الخير! حان وقت الاستيقاظ ☀️'}</p>${need?'<button class="btn lg" onclick="verify()">📷 صوّر المغسلة</button>':'<button class="btn lg" onclick="dismissRing()">☀️ صحيت، إيقاف</button>'}<div id="fb"></div>${a.test&&need?'<button class="btn off sm" onclick="dismissRing()">إغلاق (تجريبي)</button>':''}</div>`;
 startSound();wakeAI();}
function vAlarm(v){v.innerHTML=`<div class="card"><h3>⏰ منبه جديد</h3><input id="atime" type="time" class="in" value="06:30"><input id="alabel" class="in" placeholder="اسم المنبه (اختياري)"><small>الأيام (بدون اختيار = كل يوم)</small><div class="chips">${DAYN.map((n,i)=>`<span class="dchip" data-d="${i}" onclick="this.classList.toggle('on')">${n}</span>`).join('')}</div><label class="chk"><input type="checkbox" id="aph" checked> إيقاف المنبه بتصوير المغسلة</label><button class="btn" onclick="addAlarm()">➕ إضافة</button></div>`
 +S.alarms.map(a=>`<div class="card row"><div><div class="big">${esc(a.time)}</div><small>${esc(a.label)} • ${a.days&&a.days.length?a.days.map(d=>DAYN[d]).join('، '):'كل يوم'} ${a.photo===false?'':'📷'}</small></div><div><button class="btn sm ${a.on?'':'off'}" onclick="togA(${a.id})">${a.on?'مفعّل':'متوقف'}</button> <button class="btn sm red" onclick="delA(${a.id})">🗑</button></div></div>`).join('')
 +'<button class="btn off" onclick="testRing()">🔔 جرّب المنبه</button>';}
async function scheduleAll(){const LN=P('LocalNotifications');if(!LN)return;
 try{const pend=await LN.getPending(),old=(pend.notifications||[]).filter(n=>n.id!==7000001);
  if(old.length)await LN.cancel({notifications:old.map(n=>({id:n.id}))});
  const now=Date.now(),list=[];
  S.alarms.filter(a=>a.on).forEach(a=>{const [h,m]=a.time.split(':').map(Number);
   for(let d=0;d<5;d++){const base=new Date();base.setDate(base.getDate()+d);
    if(!dayOn(a,base.getDay())||(d===0&&S.dismissed[a.id+'_'+dk(base)]))continue;base.setHours(h,m,0,0);
    for(let k=0;k<8;k++){const at=base.getTime()+k*60000;
     if(at>now+1500)list.push({id:a.id*1000+d*20+k,title:'⏰ '+a.label,body:a.photo===false?motivAt(daySeed(base)+k):'قم وصوّر المغسلة لإيقاف المنبه 🚰',channelId:'alarm',schedule:{at:new Date(at),allowWhileIdle:true},extra:{alarm:a.id}});}}});
  if(S.settings.notifs)[9,13,17,21].forEach((h,i)=>{for(let d=0;d<5;d++){const t=new Date();t.setDate(t.getDate()+d);t.setHours(h,0,0,0);
   if(t.getTime()>now+1500)list.push({id:5000000+d*10+i,title:'Toro 🐂',body:motivAt(daySeed(t)+i+1),channelId:'buddy',schedule:{at:t,allowWhileIdle:true}});}});
  if(list.length)await LN.schedule({notifications:list});
 }catch(e){console.log('schedule',e);}}
async function initNative(){const LN=P('LocalNotifications');if(!LN)return;
 try{await LN.requestPermissions();}catch(e){}
 try{if(LN.checkExactNotificationSetting){const s=await LN.checkExactNotificationSetting();if(s&&s.exact_alarm!=='granted'&&LN.changeExactNotificationSetting)await LN.changeExactNotificationSetting();}}catch(e){}
 try{await LN.createChannel({id:'alarm',name:'المنبه',description:'منبه الاستيقاظ',importance:5,visibility:1,vibration:true});
  await LN.createChannel({id:'buddy',name:'تحفيز Toro',description:'رسائل تحفيزية',importance:3,vibration:true});}catch(e){}
 try{LN.addListener('localNotificationReceived',()=>checkRing());LN.addListener('localNotificationActionPerformed',()=>checkRing());}catch(e){}
 scheduleAll();}
