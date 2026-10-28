const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P=n=>(window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n])||null;
const pad=n=>String(n).padStart(2,'0');
const dk=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const KEY='study_app_v1';
const DEF=()=>({alarms:[],notes:[],goals:[],sched:[],exams:[],tasks:[],grades:[],quizzes:[],plan:null,theme:'dark',done:{},minutes:{},chat:[],dismissed:{},timer:null,seq:0,lastPro:0,
 settings:{key:'',name:'',branch:'',examDate:'2027-02-01',aiEvery:15,notifs:true,model:'claude-sonnet-5-5'}});
function merge(r){const d=DEF();if(!r||typeof r!=='object')return d;const o=Object.assign(d,r);o.settings=Object.assign(DEF().settings,r.settings||{});
 ['alarms','notes','goals','chat','sched','exams','tasks','grades','quizzes'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[];});
 ['done','minutes','dismissed'].forEach(k=>{if(!o[k]||typeof o[k]!=='object')o[k]={};});return o;}
let S;try{S=merge(JSON.parse(localStorage.getItem(KEY)));}catch(e){S=DEF();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
let tab='home',draft='',busy=false,editId=null,unread=0,busyP=false,ring=null,audio=null,beepT=null,mq=[],tt,ticks=0;

function examTarget(){const p=String(S.settings.examDate).split('-').map(Number);
 if(p.length!==3||p.some(isNaN))return new Date(2027,1,1,0,0,0);return new Date(p[0],p[1]-1,p[2],0,0,0);}
const daysLeftAt=t=>Math.max(0,Math.ceil((examTarget()-t)/864e5));
function toast(m){const e=$('#toast');e.textContent=m;e.style.opacity=1;clearTimeout(tt);tt=setTimeout(()=>e.style.opacity=0,3500);}
function go(t){tab=t;if(t==='chat'){unread=0;badge();}render();}
function badge(){const b=$('#bd');b.style.display=unread?'block':'none';b.textContent=unread;}

/* ---------- countdown ---------- */
function cdTick(){const df=examTarget()-Date.now(),el=$('#cd');
 if(df<=0){el.innerHTML='<b>🎯 بدأت الامتحانات — بالتوفيق!</b>';return;}
 const s=Math.floor(df/1000),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),c=s%60;
 el.innerHTML=[[d,'يوم'],[h,'ساعة'],[m,'دقيقة'],[c,'ثانية']].map(x=>`<div><b>${pad(x[0])}</b><small>${x[1]}</small></div>`).join('');}

/* ---------- AI ---------- */
async function ai(messages,system,max){
 const k=S.settings.key;if(!k)throw new Error('nokey');
 const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
  headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
  body:JSON.stringify({model:S.settings.model,max_tokens:max||700,system,messages})});
 const j=await r.json();if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));
 return j.content.filter(c=>c.type==='text').map(c=>c.text).join('').trim();}
const errMsg=e=>e.message==='nokey'?'أضف مفتاح API من الإعدادات حتى أشتغل 🔑':'تعذر الاتصال: '+e.message;
function cleanMsgs(){const out=[];for(const m of S.chat.slice(-20)){if(m.err)continue;
 if(!out.length&&m.r!=='user')continue;
 if(out.length&&out[out.length-1].role===m.r)out[out.length-1].content+='\n'+m.t;else out.push({role:m.r,content:m.t});}return out;}

function startSound(){try{const AC=window.AudioContext||window.webkitAudioContext;audio=new AC();
 beepT=setInterval(()=>{try{audio.resume&&audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.35);navigator.vibrate&&navigator.vibrate(400);}catch(e){}},700);}catch(e){}}
function stopSound(){clearInterval(beepT);beepT=null;try{audio&&audio.close();}catch(e){}audio=null;}
function takePhoto(){const C=P('Camera');
 if(C)return C.getPhoto({quality:55,width:900,resultType:'base64',source:'CAMERA',correctOrientation:true}).then(r=>r.base64String);
 return new Promise((res,rej)=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.setAttribute('capture','environment');
  i.onchange=()=>{const f=i.files[0];if(!f)return rej(new Error('none'));const rd=new FileReader();rd.onload=()=>res(String(rd.result).split(',')[1]);rd.onerror=rej;rd.readAsDataURL(f);};i.click();});}
async function verify(){const msg=t=>{const e=$('#rmsg');if(e)e.textContent=t;};
 if(!S.settings.key||!navigator.onLine){msg('ما في إنترنت/مفتاح: حل المسائل لإيقاف المنبه');return showMath();}
 let b64;try{b64=await takePhoto();}catch(e){return msg('ما انلتقطت صورة، حاول مرة ثانية 📷');}
 if(!b64)return msg('ما انلتقطت صورة، حاول مرة ثانية 📷');
 msg('⏳ الذكاء الاصطناعي يفحص الصورة...');
 try{const r=await ai([{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},
  {type:'text',text:'Is this a real photo of a bathroom sink / washbasin (basin or tap clearly visible)? Answer with exactly one word: YES or NO.'}]}],'You verify photos for an alarm app. Reply only YES or NO.',5);
  if(/^\s*YES/i.test(r))return dismissRing();msg('❌ ما ظهرت مغسلة بالصورة. صوّر المغسلة بوضوح وحاول مرة ثانية.');
 }catch(e){msg('تعذر الفحص ('+e.message+'). حل المسائل لإيقاف المنبه أو حاول مرة ثانية.');showMath();}}
function showMath(){mq=[0,1,2].map(()=>{const a=7+Math.floor(Math.random()*13),b=6+Math.floor(Math.random()*9),c=Math.floor(Math.random()*50);return{q:a+' × '+b+' + '+c,a:a*b+c};});
 $('#fb').innerHTML=mq.map((x,i)=>`<div style="margin:8px 0">${x.q} = <input type="number" inputmode="numeric" id="m${i}" class="in" style="width:100px;display:inline-block"></div>`).join('')+'<button class="btn" onclick="chkMath()">تحقق</button>';}
function chkMath(){if(mq.every((x,i)=>Number($('#m'+i).value)===x.a))dismissRing();else{$('#rmsg').textContent='❌ إجابة خاطئة، مسائل جديدة';showMath();}}
function dismissRing(){stopSound();if(ring&&!ring.test)S.dismissed[ring.id+'_'+dk()]=true;ring=null;save();
 $('#ring').style.display='none';toast('✅ تم إيقاف المنبه، صباح الخير!');scheduleAll();
 const LN=P('LocalNotifications');try{LN&&LN.removeAllDeliveredNotifications&&LN.removeAllDeliveredNotifications().catch(()=>{});}catch(e){}render();}

/* ---------- companion ---------- */
const FALLBACK=['شلونك؟ خلينا نكمل مراجعة 15 دقيقة 💪','لا تنسى تسجل إنجازاتك اليوم ✅','استراحة قصيرة، اشرب مي وكمّل 🔥','باقي وقت كافي إذا انتظمت كل يوم 📚'];
async function proactive(){if(busyP)return;busyP=true;S.lastPro=Date.now();save();let t;
 try{if(!S.settings.key||!navigator.onLine)throw new Error('nokey');
  t=await ai([{role:'user',content:'(تعليمات داخلية) أرسل لي الآن رسالة قصيرة من جملة أو جملتين: تحفيز أو سؤال مراجعة سريع أو تذكير بأهدافي، بدون مقدمات.'}],sysPrompt(),200);
 }catch(e){t=motivRandom();}
 S.chat.push({r:'assistant',t,ts:Date.now()});if(S.chat.length>200)S.chat=S.chat.slice(-200);save();busyP=false;
 toast('💬 '+t.slice(0,70));if(tab==='chat')render();else{unread++;badge();}}

/* ---------- study timer ---------- */
function startT(){S.timer={s:Date.now()};save();render();}
function stopT(){if(!S.timer)return;const m=Math.min(300,Math.round((Date.now()-S.timer.s)/60000));
 if(m>=1)S.minutes[dk()]=(S.minutes[dk()]||0)+m;S.timer=null;save();toast('تم تسجيل '+m+' دقيقة 👏');render();}
function streak(){let n=0;const d=new Date();for(let i=0;i<400;i++){const k=dk(d);
 if((S.done[k]||[]).length>0||(S.minutes[k]||0)>=20)n++;else if(i>0)break;d.setDate(d.getDate()-1);}return n;}
function bars(){const a=[],d=new Date(),nm=['ح','ن','ث','ر','خ','ج','س'];
 for(let i=6;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);a.push([x.getDay(),S.minutes[dk(x)]||0]);}
 const mx=Math.max(30,...a.map(z=>z[1]));
 return '<div class="bars">'+a.map(z=>`<div><i style="height:${Math.round(z[1]/mx*80)}px"></i><small>${z[1]}</small><small>${nm[z[0]]}</small></div>`).join('')+'</div>';}

/* ---------- goals / notes ---------- */
function addG(){const t=$('#gt').value.trim();if(!t)return;S.goals.push({id:Date.now(),t});save();render();}
function delG(id){S.goals=S.goals.filter(g=>g.id!==id);save();render();}
function togG(id){const k=dk(),a=S.done[k]||[];S.done[k]=a.includes(id)?a.filter(x=>x!==id):a.concat(id);save();render();}
function saveNote(){const t=$('#nt').value.trim(),x=$('#nx').value.trim();if(!t&&!x)return toast('اكتب شيء أولاً');
 const o={t:t||'بدون عنوان',sub:$('#ns').value.trim(),x};
 if(editId){const n=S.notes.find(n=>n.id===editId);if(n)Object.assign(n,o);editId=null;}else S.notes.push(Object.assign({id:Date.now(),ts:Date.now()},o));
 save();render();}
function cancelEdit(){editId=null;render();}
function editN(id){editId=id;render();window.scrollTo(0,0);}
function delN(id){S.notes=S.notes.filter(n=>n.id!==id);save();render();}
async function aiNote(id,mode){const n=S.notes.find(n=>n.id===id);if(!n)return;toast('🤖 يفكر...');
 try{n.ai=await ai([{role:'user',content:(mode==='sum'?'لخّص هذه الملاحظة بنقاط قصيرة:\n':'اسألني 3 أسئلة مراجعة على هذه الملاحظة (بدون إجابات):\n')+n.t+'\n'+n.x}],sysPrompt(),500);save();render();}
 catch(e){toast(errMsg(e));}}
function clearChat(){S.chat=[];save();render();}
function saveSet(){const s=S.settings;s.name=$('#sn').value.trim();s.branch=$('#sb').value.trim();
 const d=$('#sd').value;if(/^\d{4}-\d\d-\d\d$/.test(d))s.examDate=d;s.key=$('#sk').value.trim();
 s.model=$('#sm').value;s.aiEvery=Math.max(0,parseInt($('#se').value,10)||0);s.notifs=$('#sf').checked;S.theme=$('#sth').value==='light'?'light':'dark';applyTheme();save();scheduleAll();cdTick();toast('تم الحفظ ✅');}
function expB(){const c=JSON.parse(JSON.stringify(S));c.settings.key='';$('#bk').value=JSON.stringify(c);}
function impB(){try{const r=JSON.parse($('#bk').value);const k=S.settings.key;S=merge(r);S.settings.key=k;save();scheduleAll();cdTick();render();toast('تم الاستيراد ✅');}catch(e){toast('النسخة غير صالحة');}}

/* ---------- views ---------- */
function vHome(v){const k=dk(),gs=S.goals,dn=(S.done[k]||[]).filter(i=>gs.some(g=>g.id===i)).length;
 v.innerHTML=homeTop()+`<div class="card"><h2>أهلاً ${esc(S.settings.name||'بطل')} 👋</h2><p>🔥 سلسلة الدراسة: <b>${streak()}</b> يوم</p><p>✅ إنجازات اليوم: <b>${dn}/${gs.length}</b></p><p>⏱ دراسة اليوم: <b>${S.minutes[k]||0}</b> دقيقة</p></div>
 <div class="card"><h3>مؤقت الدراسة</h3><div id="tmr" class="big">00:00:00</div>${S.timer?'<button class="btn red" onclick="stopT()">⏹ إنهاء الجلسة</button>':'<button class="btn" onclick="startT()">▶ ابدأ الدراسة</button>'}</div>
 ${homeExtra()}<div class="card"><h3>آخر 7 أيام (دقائق)</h3>${bars()}</div>`;tmrTick();}
function tmrTick(){const e=$('#tmr');if(!e)return;const s=S.timer?Math.floor((Date.now()-S.timer.s)/1000):0;e.textContent=pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60);}
function vNotes(v){const e=S.notes.find(n=>n.id===editId)||{t:'',sub:'',x:''};
 v.innerHTML=`<div class="card"><h3>${editId?'تعديل ملاحظة':'ملاحظة جديدة'}</h3><input id="nt" class="in" placeholder="العنوان" value="${esc(e.t)}"><input id="ns" class="in" placeholder="المادة" value="${esc(e.sub)}"><textarea id="nx" class="in" rows="5" placeholder="اكتب ملاحظتك...">${esc(e.x)}</textarea><button class="btn" onclick="saveNote()">💾 حفظ</button>${editId?' <button class="btn off" onclick="cancelEdit()">إلغاء</button>':''}</div>`
 +S.notes.slice().reverse().map(n=>`<div class="card"><b>${esc(n.t)}</b> <small>${esc(n.sub)}</small><div class="pre">${esc(n.x)}</div>${n.ai?`<div class="ai">🤖 ${esc(n.ai)}</div>`:''}<div class="acts"><button class="btn sm" onclick="aiNote(${n.id},'sum')">🤖 لخّص</button><button class="btn sm" onclick="aiNote(${n.id},'quiz')">❓ اسألني</button><button class="btn sm off" onclick="editN(${n.id})">✏️</button><button class="btn sm red" onclick="delN(${n.id})">🗑</button></div></div>`).join('');}
function vGoals(v){const dn=S.done[dk()]||[];
 v.innerHTML=`<div class="card"><h3>إنجاز جديد (يتكرر كل يوم)</h3><input id="gt" class="in" placeholder="مثال: حل 20 سؤال رياضيات"><button class="btn" onclick="addG()">➕ إضافة</button></div>
 <div class="card"><h3>إنجازات اليوم</h3>${S.goals.length?S.goals.map(g=>`<div class="row"><label><input type="checkbox" ${dn.includes(g.id)?'checked':''} onchange="togG(${g.id})"> ${esc(g.t)}</label><button class="btn sm red" onclick="delG(${g.id})">🗑</button></div>`).join(''):'<p class="mut">ما أضفت إنجازات بعد</p>'}</div>
 <div class="card"><h3>نشاط الدراسة</h3><p>🔥 السلسلة: <b>${streak()}</b> يوم</p>${bars()}</div>`;}
function vSet(v){const s=S.settings;
 v.innerHTML=`<div class="card"><h3>الإعدادات</h3><small>اسمك</small><input id="sn" class="in" value="${esc(s.name)}"><small>الفرع المهني</small><input id="sb" class="in" value="${esc(s.branch)}" placeholder="مثال: كهرباء، حاسبات..."><small>موعد الامتحانات</small><input id="sd" type="date" class="in" value="${esc(s.examDate)}"><small>مفتاح Anthropic API (للمساعد وفحص صورة المغسلة)</small><input id="sk" type="password" class="in" value="${esc(s.key)}" placeholder="sk-ant-..."><small>نموذج الذكاء الاصطناعي</small><select id="sm" class="in">${[['claude-haiku-5-5','Haiku — سريع'],['claude-sonnet-5-5','Sonnet — متوازن (موصى به)'],['claude-opus-5-5','Opus — الأقوى والأذكى']].map(x=>`<option value="${x[0]}" ${s.model===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select><small>رسالة من المساعد كل (دقيقة، 0 = إيقاف)</small><input id="se" type="number" class="in" min="0" value="${esc(s.aiEvery)}"><small>المظهر</small><select id="sth" class="in"><option value="dark" ${S.theme!=='light'?'selected':''}>داكن مريح</option><option value="light" ${S.theme==='light'?'selected':''}>فاتح</option></select><label><input type="checkbox" id="sf" ${s.notifs?'checked':''}> إشعارات تحفيزية يومية</label><br><button class="btn" onclick="saveSet()">💾 حفظ</button></div>
 <div class="card"><h3>نسخة احتياطية</h3><textarea id="bk" class="in" rows="3"></textarea><button class="btn sm" onclick="expB()">تصدير</button> <button class="btn sm off" onclick="impB()">استيراد</button></div>`;}
const MAIN=['home','alarm','chat','focus'];
function render(){const v=$('#view'),m=Object.assign({home:vHome,alarm:vAlarm,notes:vNotes,goals:vGoals,chat:vChat,set:vSet},window.EXTRA||{});
 (m[tab]||vHome)(v);
 if(!MAIN.includes(tab)&&tab!=='more')v.insertAdjacentHTML('afterbegin','<button class="btn sm off" onclick="go(\'more\')">→ رجوع</button>');
 const g=MAIN.includes(tab)?tab:'more';document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===g));}
