/* Toro — student tools */
const dnum=ds=>{const p=String(ds).split('-').map(Number),t=new Date();return Math.round((new Date(p[0],p[1]-1,p[2])-new Date(t.getFullYear(),t.getMonth(),t.getDate()))/864e5);};
const fmt=s=>pad(Math.floor(s/60))+':'+pad(s%60);
const okDate=d=>/^\d{4}-\d\d-\d\d$/.test(d);
function delItem(k,id){S[k]=S[k].filter(x=>x.id!==id);save();render();}
let curM=null;
function newM(){curM=motivRandom();render();}
function homeTop(){if(!curM)curM=motivOfDay();return `<div class="card hero"><small>✨ تحفيز اليوم</small><p class="mq">${esc(curM)}</p><button class="btn sm off" onclick="newM()">🔄 تحفيز جديد</button></div>`;}
function homeExtra(){const t=S.sched.filter(x=>x.day===new Date().getDay()).sort((a,b)=>a.time.localeCompare(b.time));
 const ex=S.exams.filter(e=>dnum(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0],tk=S.tasks.filter(x=>!x.done).length;
 return `<div class="card"><h3>📅 جدول اليوم</h3>${t.length?t.map(x=>`<div class="row"><span>${esc(x.subject)}</span><small>${esc(x.time)}</small></div>`).join(''):'<p class="mut">لا توجد دروس مضافة لهذا اليوم</p>'}</div>`
 +(ex?`<div class="card row"><span>🎯 ${esc(ex.subject)}</span><b>بعد ${dnum(ex.date)} يوم</b></div>`:'')+(tk?`<div class="card row"><span>📚 واجبات غير منجزة</span><b>${tk}</b></div>`:'');}
function vMore(v){v.innerHTML='<div class="grid">'+[['notes','📝','ملاحظات'],['goals','✅','إنجازات'],['sched','📅','الجدول'],['exams','🎯','امتحاناتي'],['tasks','📚','الواجبات'],['gpa','📊','المعدل'],['quiz','🧠','اختبار ذكي'],['plan','🗓','خطة ذكية'],['solve','📸','حل بالصورة'],['set','⚙️','الإعدادات']].map(x=>`<button class="tile" onclick="go('${x[0]}')"><span>${x[1]}</span>${x[2]}</button>`).join('')+'</div>';}
/* schedule */
function addS(){const s=$('#ss2').value.trim();if(!s)return toast('اكتب المادة');S.sched.push({id:Date.now(),day:+$('#sd2').value,time:$('#st2').value||'08:00',subject:s});save();render();}
function vSched(v){v.innerHTML=`<div class="card"><h3>📅 إضافة درس</h3><select id="sd2" class="in">${DAYN.map((n,i)=>`<option value="${i}" ${i===new Date().getDay()?'selected':''}>${n}</option>`).join('')}</select><input id="st2" type="time" class="in" value="08:00"><input id="ss2" class="in" placeholder="المادة"><button class="btn" onclick="addS()">➕ إضافة</button></div>`
 +DAYN.map((n,i)=>{const L=S.sched.filter(x=>x.day===i).sort((a,b)=>a.time.localeCompare(b.time));
  return L.length?`<div class="card"><h3>${n}</h3>${L.map(x=>`<div class="row"><span>${esc(x.time)} — ${esc(x.subject)}</span><button class="btn sm red" onclick="delItem('sched',${x.id})">🗑</button></div>`).join('')}</div>`:'';}).join('');}
/* exams */
function addE(){const s=$('#es').value.trim(),d=$('#ed').value;if(!s||!okDate(d))return toast('اكتب المادة واختر التاريخ');S.exams.push({id:Date.now(),subject:s,date:d});save();render();}
function vExams(v){const L=S.exams.slice().sort((a,b)=>a.date.localeCompare(b.date));
 v.innerHTML=`<div class="card"><h3>🎯 امتحان جديد</h3><input id="es" class="in" placeholder="المادة"><input id="ed" type="date" class="in"><button class="btn" onclick="addE()">➕ إضافة</button></div>`
 +L.map(e=>{const n=dnum(e.date);return `<div class="card row"><div><b>${esc(e.subject)}</b><br><small>${esc(e.date)}</small></div><div>${n>=0?`<b>${n===0?'اليوم!':'بعد '+n+' يوم'}</b>`:'<small>انتهى</small>'} <button class="btn sm red" onclick="delItem('exams',${e.id})">🗑</button></div></div>`;}).join('');}
/* tasks */
function addT(){const t=$('#tt').value.trim();if(!t)return toast('اكتب الواجب');const d=$('#td').value;S.tasks.push({id:Date.now(),t,due:okDate(d)?d:'',done:false});save();render();}
function togT(id){const x=S.tasks.find(x=>x.id===id);if(x){x.done=!x.done;save();render();}}
function vTasks(v){const L=S.tasks.slice().sort((a,b)=>a.done-b.done||(a.due||'9').localeCompare(b.due||'9'));
 v.innerHTML=`<div class="card"><h3>📚 واجب جديد</h3><input id="tt" class="in" placeholder="الواجب / المهمة"><input id="td" type="date" class="in"><button class="btn" onclick="addT()">➕ إضافة</button></div>`
 +L.map(x=>`<div class="card row"><label class="${x.done?'done':''}"><input type="checkbox" ${x.done?'checked':''} onchange="togT(${x.id})"> ${esc(x.t)}${x.due?`<br><small class="${!x.done&&dnum(x.due)<0?'late':''}">${esc(x.due)}</small>`:''}</label><button class="btn sm red" onclick="delItem('tasks',${x.id})">🗑</button></div>`).join('');}
/* grades */
function addG2(){const s=$('#gs').value.trim(),n=parseFloat($('#gn').value);if(!s||isNaN(n)||n<0||n>100)return toast('اكتب المادة ودرجة من 0 إلى 100');S.grades.push({id:Date.now(),subject:s,score:n});save();render();}
function vGpa(v){const g=S.grades,avg=g.length?g.reduce((a,x)=>a+x.score,0)/g.length:0;
 const lv=!g.length?'':avg>=90?'امتياز 🌟':avg>=80?'جيد جداً 👏':avg>=70?'جيد 👍':avg>=60?'متوسط 💪':avg>=50?'مقبول':'يحتاج جهد أكثر 🔥';
 v.innerHTML=`<div class="card ctr"><h3>📊 معدلك</h3><div class="huge">${avg.toFixed(1)}</div><p class="mq">${lv}</p></div><div class="card"><input id="gs" class="in" placeholder="المادة"><input id="gn" type="number" inputmode="decimal" class="in" placeholder="الدرجة (0-100)"><button class="btn" onclick="addG2()">➕ إضافة</button></div>`
 +g.map(x=>`<div class="card row"><span>${esc(x.subject)}</span><div><b>${x.score}</b> <button class="btn sm red" onclick="delItem('grades',${x.id})">🗑</button></div></div>`).join('');}
/* focus (pomodoro) */
const F={mode:'focus',left:null,end:0,run:false,fm:25,bm:5,n:0};
const fSecs=()=>F.run?Math.max(0,Math.round((F.end-Date.now())/1000)):(F.left!=null?F.left:(F.mode==='focus'?F.fm:F.bm)*60);
function fNotif(on){const LN=P('LocalNotifications');if(!LN)return;try{LN.cancel({notifications:[{id:7000001}]});
 if(on)LN.schedule({notifications:[{id:7000001,title:'Toro 🐂',body:F.mode==='focus'?'انتهى وقت التركيز! خذ استراحة ☕':'انتهت الاستراحة، يلا نكمل 💪',channelId:'alarm',schedule:{at:new Date(F.end),allowWhileIdle:true}}]});}catch(e){}}
function fStart(){F.left=fSecs();F.end=Date.now()+F.left*1000;F.run=true;fNotif(true);render();}
function fPause(){F.left=fSecs();F.run=false;fNotif(false);render();}
function fReset(){F.run=false;F.left=null;fNotif(false);render();}
function fMode(){F.mode=F.mode==='focus'?'break':'focus';fReset();}
function fPre(a,b){F.fm=a;F.bm=b;fReset();}
function chime(){try{const AC=window.AudioContext||window.webkitAudioContext,c=new AC(),o=c.createOscillator(),g=c.createGain();o.frequency.value=660;g.gain.value=.3;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.6);setTimeout(()=>c.close(),900);navigator.vibrate&&navigator.vibrate([300,150,300]);}catch(e){}}
function fTick(){if(F.run&&fSecs()===0){F.run=false;F.left=null;chime();
  if(F.mode==='focus'){S.minutes[dk()]=(S.minutes[dk()]||0)+F.fm;F.n++;save();toast('🎉 أنجزت جلسة تركيز! +'+F.fm+' دقيقة');}else toast('☕ انتهت الاستراحة');
  F.mode=F.mode==='focus'?'break':'focus';if(tab==='focus')render();return;}
 const e=$('#fdisp');if(e)e.textContent=fmt(fSecs());}
function vFocus(v){v.innerHTML=`<div class="card ctr"><h3>${F.mode==='focus'?'🎯 وقت التركيز':'☕ استراحة'}</h3><div id="fdisp" class="huge">${fmt(fSecs())}</div><p class="mut">جلسات اليوم المكتملة: ${F.n}</p>${F.run?'<button class="btn" onclick="fPause()">⏸ إيقاف مؤقت</button>':'<button class="btn" onclick="fStart()">▶ ابدأ</button>'} <button class="btn off" onclick="fReset()">↺</button> <button class="btn off" onclick="fMode()">⇄ ${F.mode==='focus'?'استراحة':'تركيز'}</button>
 <div class="chips" style="justify-content:center">${[[25,5],[45,10],[50,10]].map(p=>`<span class="dchip ${F.fm===p[0]?'on':''}" onclick="fPre(${p[0]},${p[1]})">${p[0]}/${p[1]}</span>`).join('')}</div></div>`;}
window.EXTRA={more:vMore,focus:vFocus,sched:vSched,exams:vExams,tasks:vTasks,gpa:vGpa};
