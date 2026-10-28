/* Toro — advanced AI layer: context-aware assistant with actions, photo solver, smart quiz, study plan, reports */
const DAYS_AR=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const uid=()=>Date.now()*10+Math.floor(Math.random()*10);
async function aiCall(o){const k=S.settings.key;if(!k)throw new Error('nokey');
 const body={model:S.settings.model,max_tokens:o.max||800,system:o.system,messages:o.messages};if(o.tools)body.tools=o.tools;
 const ac=typeof AbortController!=='undefined'?new AbortController():null,to=setTimeout(()=>ac&&ac.abort(),70000);
 try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ac?ac.signal:undefined,
   headers:{'content-type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify(body)});
  const j=await r.json();if(!r.ok)throw new Error((j.error&&j.error.message)||('HTTP '+r.status));return j;
 }catch(e){throw new Error(e.name==='AbortError'?'انتهت المهلة':e.message);}finally{clearTimeout(to);}}
function stats(){const d=new Date();let min=0,days=0,gd=0;
 for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()-i);const k=dk(x),m=S.minutes[k]||0;min+=m;if(m>0)days++;gd+=(S.done[k]||[]).length;}
 const q=S.quizzes.slice(-10),qa=q.length?Math.round(q.reduce((a,x)=>a+x.score/x.total*100,0)/q.length):null;
 return{min,days,gd,td:S.tasks.filter(t=>t.done).length,to:S.tasks.filter(t=>!t.done).length,qa};}
function sysPrompt(){const st=S.settings,now=new Date(),k=dk(now),dn=S.done[k]||[],J=(a,f)=>a.length?a.map(f).join('؛ '):'لا شيء';
 const ex=S.exams.filter(e=>dnum(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
 const tk=S.tasks.filter(x=>!x.done).slice(0,10),sc=S.sched.filter(x=>x.day===now.getDay()).sort((a,b)=>a.time.localeCompare(b.time));
 const gr=S.grades,avg=gr.length?(gr.reduce((a,x)=>a+x.score,0)/gr.length).toFixed(1):'—',s7=stats(),qz=S.quizzes.slice(-5);
 return `أنت "Toro"، مساعد دراسة ذكي ودود جداً يتكلم باللهجة العراقية البسيطة مع ${st.name||'الطالب'}، طالب السادس الإعدادي المهني${st.branch?' (فرع '+st.branch+')':''} في العراق.
اليوم ${DAYS_AR[now.getDay()]} ${k}. التمهيدي بعد ${daysLeftAt(now)} يوم.
بيانات الطالب الآن — دروس اليوم: ${J(sc,x=>x.time+' '+x.subject)}. الامتحانات: ${J(ex,e=>e.subject+' بعد '+dnum(e.date)+' يوم')}. واجبات غير منجزة: ${J(tk,x=>x.t+(x.due?' (تسليم '+x.due+')':''))}. إنجازات اليوم: ${J(S.goals,g=>(dn.includes(g.id)?'✔ ':'✘ ')+g.t)}. المعدل: ${avg}. دراسة اليوم ${S.minutes[k]||0} دقيقة وآخر 7 أيام ${s7.min} دقيقة. آخر اختبارات: ${J(qz,q=>q.topic+' '+q.score+'/'+q.total)}.
القواعد: ساعده يفهم ولا تكتفِ بإعطاء الجواب؛ ردودك قصيرة وواضحة ومنظمة؛ إذا ما متأكد من معلومة بمنهج العراق قل ذلك ولا تخترع. عندك أدوات لإضافة واجبات وامتحانات وإنجازات وملاحظات ودروس ومنبهات: استخدمها فقط عندما يطلب الطالب أو يوافق على اقتراحك، التواريخ YYYY-MM-DD والوقت HH:MM، وبعد التنفيذ أكّد بجملة قصيرة.`;}
/* ---- agent tools ---- */
const S_=(d)=>({type:'string',description:d});
const TOOLS=[
 {name:'add_task',description:'إضافة واجب أو مهمة',input_schema:{type:'object',properties:{title:S_('العنوان'),due:S_('تاريخ التسليم YYYY-MM-DD (اختياري)')},required:['title']}},
 {name:'add_exam',description:'إضافة امتحان',input_schema:{type:'object',properties:{subject:S_('المادة'),date:S_('YYYY-MM-DD')},required:['subject','date']}},
 {name:'add_goal',description:'إضافة إنجاز يومي متكرر',input_schema:{type:'object',properties:{title:S_('الإنجاز')},required:['title']}},
 {name:'add_note',description:'حفظ ملاحظة دراسية',input_schema:{type:'object',properties:{title:S_('العنوان'),text:S_('المحتوى'),subject:S_('المادة')},required:['title','text']}},
 {name:'add_schedule',description:'إضافة درس لجدول الأسبوع',input_schema:{type:'object',properties:{day:{type:'integer',description:'0=الأحد ... 6=السبت'},time:S_('HH:MM'),subject:S_('المادة')},required:['day','time','subject']}},
 {name:'add_alarm',description:'إضافة منبه استيقاظ',input_schema:{type:'object',properties:{time:S_('HH:MM'),label:S_('الاسم'),days:{type:'array',items:{type:'integer'},description:'أيام التكرار 0-6، فارغ = كل يوم'},photo:{type:'boolean',description:'إيقافه بتصوير المغسلة (الافتراضي نعم)'}},required:['time']}}];
const T24=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(t||'').trim());return m&&+m[1]<24&&+m[2]<60?pad(+m[1])+':'+m[2]:null;};
function runTool(n,a){const ok=m=>({ok:true,msg:m,label:m}),bad=m=>({ok:false,msg:m,label:'تعذر: '+m});
 try{
  if(n==='add_task'){if(!a.title)return bad('العنوان مطلوب');S.tasks.push({id:uid(),t:String(a.title).slice(0,200),due:okDate(a.due)?a.due:'',done:false});save();return ok('أضفت واجب: '+a.title);}
  if(n==='add_exam'){if(!a.subject||!okDate(a.date))return bad('المادة والتاريخ مطلوبان');S.exams.push({id:uid(),subject:String(a.subject).slice(0,100),date:a.date});save();return ok('أضفت امتحان '+a.subject+' بتاريخ '+a.date);}
  if(n==='add_goal'){if(!a.title)return bad('العنوان مطلوب');S.goals.push({id:uid(),t:String(a.title).slice(0,200)});save();return ok('أضفت إنجاز: '+a.title);}
  if(n==='add_note'){if(!a.title||!a.text)return bad('العنوان والنص مطلوبان');S.notes.push({id:uid(),ts:Date.now(),t:String(a.title).slice(0,200),sub:String(a.subject||'').slice(0,100),x:String(a.text).slice(0,6000)});save();return ok('حفظت ملاحظة: '+a.title);}
  if(n==='add_schedule'){const t=T24(a.time);if(!a.subject||!t||!(a.day>=0&&a.day<=6))return bad('بيانات الدرس غير صحيحة');S.sched.push({id:uid(),day:a.day,time:t,subject:String(a.subject).slice(0,100)});save();return ok('أضفت درس '+a.subject+' يوم '+DAYN[a.day]+' '+t);}
  if(n==='add_alarm'){const t=T24(a.time);if(!t)return bad('وقت غير صحيح');if(S.alarms.length>=6)return bad('وصلت الحد الأقصى 6 منبهات');
   do{S.seq=(S.seq%900)+1;}while(S.alarms.some(x=>x.id===S.seq));
   const al={id:S.seq,time:t,label:String(a.label||'منبه الاستيقاظ').slice(0,60),on:true,days:(Array.isArray(a.days)?a.days:[]).filter(d=>d>=0&&d<=6),photo:a.photo!==false};
   if(pastToday(t))S.dismissed[al.id+'_'+dk()]=true;S.alarms.push(al);save();scheduleAll();return ok('ضبطت منبه الساعة '+t);}
  return bad('أداة غير معروفة');
 }catch(e){return bad(e.message);}}
async function agent(msgs,sys,max){const acts=[];let out='';
 for(let i=0;i<5;i++){const j=await aiCall({messages:msgs,system:sys,max,tools:TOOLS});
  const txt=j.content.filter(c=>c.type==='text').map(c=>c.text).join('').trim(),uses=j.content.filter(c=>c.type==='tool_use');
  if(txt)out+=(out?'\n':'')+txt;if(!uses.length)break;
  const res=uses.map(u=>{const r=runTool(u.name,u.input||{});acts.push(r.label);return{type:'tool_result',tool_use_id:u.id,content:r.msg,is_error:!r.ok};});
  msgs=msgs.concat([{role:'assistant',content:j.content},{role:'user',content:res}]);}
 return{text:out,acts};}
const withActs=r=>(r.text||(r.acts.length?'تم ✅':''))+(r.acts.length?'\n\n🛠 '+r.acts.join('\n🛠 '):'');
function photoAny(){const C=P('Camera');
 if(C)return C.getPhoto({quality:70,width:1400,resultType:'base64',source:'PROMPT',correctOrientation:true,promptLabelHeader:'اختر الصورة',promptLabelPhoto:'من المعرض',promptLabelPicture:'الكاميرا'}).then(r=>r.base64String);
 return new Promise((res,rej)=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files[0];if(!f)return rej(new Error('none'));const rd=new FileReader();rd.onload=()=>res(String(rd.result).split(',')[1]);rd.onerror=rej;rd.readAsDataURL(f);};i.click();});}
const imgBlock=b=>({type:'image',source:{type:'base64',media_type:'image/jpeg',data:b}});
function wakeAI(){if(!S.settings.key||!navigator.onLine)return;
 ai([{role:'user',content:'(تعليمات داخلية) اكتب رسالة صباحية قصيرة جداً (جملتين) تحفزني للاستيقاظ وتذكرني بأهم شي اليوم من جدولي أو امتحاناتي.'}],sysPrompt(),150).then(t=>{const e=document.querySelector('#ring .mq');if(e&&ring)e.textContent=t;}).catch(()=>{});}
/* ---- chat ---- */
const QP=['اعمل لي خطة لهذا الأسبوع','اسألني سؤال مراجعة سريع وصحح جوابي','اشرح لي درس أحدده لك بطريقة مبسطة','حمّسني الآن','أريد أضيف واجب جديد'],QL=['📅 خطة الأسبوع','🧠 اختبرني','📚 اشرح لي درس','💪 حمّسني','➕ واجب جديد'];
function quick(i){sendChat(QP[i]);}
async function chatPhoto(){if(!S.settings.key)return toast(errMsg(new Error('nokey')));let b;try{b=await photoAny();}catch(e){return;}sendChat(draft.trim()||'حل لي هذا السؤال واشرحه خطوة بخطوة',b);}
async function sendChat(text,b64){const t=String(text||draft).trim();if(!t||busy)return;draft='';
 S.chat.push({r:'user',t:b64?'📷 '+t:t,ts:Date.now()});save();busy=true;render();
 try{const msgs=cleanMsgs(),last=msgs[msgs.length-1];if(b64&&last)last.content=[imgBlock(b64),{type:'text',text:t}];
  const r=await agent(msgs,sysPrompt(),1000);S.chat.push({r:'assistant',t:withActs(r),ts:Date.now()});}
 catch(e){S.chat.push({r:'assistant',t:errMsg(e),ts:Date.now(),err:true});}
 busy=false;if(S.chat.length>200)S.chat=S.chat.slice(-200);save();render();}
function vChat(v){v.innerHTML=`<div class="card"><div class="chips">${QL.map((x,i)=>`<span class="dchip" onclick="quick(${i})">${x}</span>`).join('')}</div><div id="msgs">${S.chat.length?S.chat.map(m=>`<div class="m ${m.r}">${esc(m.t)}</div>`).join(''):'<p class="mut">اكتب سؤالك أو اطلب مني أضيف واجب/امتحان/منبه، أو صوّر سؤال 📷</p>'}${busy?'<div class="m assistant">⏳ ...</div>':''}</div>
 <textarea id="ci" class="in" rows="2" placeholder="اكتب رسالتك..." oninput="draft=this.value">${esc(draft)}</textarea>
 <button class="btn" onclick="sendChat()">إرسال</button> <button class="btn off" onclick="chatPhoto()">📷</button> <button class="btn sm off" onclick="clearChat()">مسح المحادثة</button></div>`;
 const c=$('#msgs');if(c)c.scrollTop=c.scrollHeight;}
/* ---- photo solver ---- */
let SV={busy:false,res:''};
async function solvePhoto(){if(!S.settings.key)return toast(errMsg(new Error('nokey')));const ex=($('#sq')||{}).value||'';let b;try{b=await photoAny();}catch(e){return;}
 SV={busy:true,res:''};render();
 try{SV.res=await ai([{role:'user',content:[imgBlock(b),{type:'text',text:'اقرأ السؤال الظاهر بالصورة وحله خطوة بخطوة بلغة عربية بسيطة، اذكر القانون أو الفكرة المستخدمة، ثم تحقق من الجواب في النهاية. '+ex}]}],sysPrompt(),1800);}
 catch(e){SV.res=errMsg(e);}SV.busy=false;render();}
function saveSolve(){S.notes.push({id:uid(),ts:Date.now(),t:'حل بالصورة',sub:'',x:SV.res});save();toast('تم الحفظ بالملاحظات ✅');}
function vSolve(v){v.innerHTML=`<div class="card"><h3>📸 حل بالصورة</h3><p class="mut">صوّر أي سؤال (مسألة، معادلة، سؤال علمي...) وأشرحه لك خطوة بخطوة.</p><input id="sq" class="in" placeholder="ملاحظة إضافية (اختياري)"><button class="btn lg" onclick="solvePhoto()">📷 صوّر / اختر صورة</button></div>${SV.busy?'<div class="card ctr">⏳ يحلل السؤال...</div>':''}${SV.res?`<div class="card"><div class="pre">${esc(SV.res)}</div><button class="btn sm" onclick="saveSolve()">💾 احفظ كملاحظة</button></div>`:''}`;}
/* ---- smart quiz ---- */
let Q=null;
function parseJSON(t){t=String(t).replace(/```json|```/g,'');const i=t.indexOf('['),j=t.lastIndexOf(']');return JSON.parse(t.slice(i,j+1));}
function quizReset(){Q=null;render();}
async function quizStart(){const topic=$('#qt').value.trim(),n=+$('#qn').value||5,lv=$('#ql').value,useN=$('#qu').checked;
 if(!S.settings.key)return toast(errMsg(new Error('nokey')));if(!topic)return toast('اكتب المادة أو الموضوع');
 Q={loading:true};render();
 try{const nt=useN?S.notes.filter(x=>(x.sub+x.t).includes(topic)||S.notes.length<4).map(x=>x.t+': '+x.x).join('\n').slice(0,4000):'';
  const t=await ai([{role:'user',content:`أنشئ ${n} أسئلة اختيار من متعدد (4 خيارات لكل سؤال) بالعربية عن: ${topic}. المستوى: ${lv}. ${nt?'اعتمد على هذه الملاحظات:\n'+nt+'\n':''}أرجع JSON فقط بالشكل [{"q":"..","options":["..","..","..",".."],"answer":0,"explain":".."}]`}],'You output only valid JSON arrays, no extra text.',2800);
  const qs=parseJSON(t).filter(x=>x&&x.q&&Array.isArray(x.options)&&x.options.length===4&&Number.isInteger(x.answer)&&x.answer>=0&&x.answer<4);
  if(!qs.length)throw new Error('تعذر توليد الأسئلة');Q={qs,i:0,sel:null,score:0,wrong:[],topic,fb:''};
 }catch(e){Q=null;toast(errMsg(e));}render();}
function quizPick(i){if(!Q||Q.sel!=null)return;const c=Q.qs[Q.i];Q.sel=i;if(i===c.answer)Q.score++;else Q.wrong.push(c.q);render();}
function quizNext(){Q.i++;Q.sel=null;
 if(Q.i>=Q.qs.length){S.quizzes.push({ts:Date.now(),topic:Q.topic,score:Q.score,total:Q.qs.length});save();
  if(!Q.wrong.length)Q.fb='علامة كاملة، ممتاز! 🌟';else ai([{role:'user',content:'أخطأت بهذه الأسئلة:\n'+Q.wrong.join('\n')+'\nأعطني 3 نصائح مركزة بالعراقي لتقوية نقاط ضعفي.'}],sysPrompt(),500).then(t=>{Q.fb=t;if(tab==='quiz')render();}).catch(()=>{Q.fb='ما كدرت أحلل الأخطاء الآن.';if(tab==='quiz')render();});}
 render();}
function vQuiz(v){
 if(Q&&Q.loading){v.innerHTML='<div class="card ctr"><h3>🧠 جاري تجهيز الأسئلة...</h3><p class="mut">لحظات</p></div>';return;}
 if(Q&&Q.i>=Q.qs.length){const p=Math.round(Q.score/Q.qs.length*100);
  v.innerHTML=`<div class="card ctr"><h3>النتيجة</h3><div class="huge">${Q.score}/${Q.qs.length}</div><p class="mq">${p>=80?'ممتاز! 🌟':p>=50?'جيد، كمّل 💪':'لا تيأس، راجع وأعد المحاولة 🔥'}</p></div><div class="card"><h3>🤖 نصائح</h3><div class="pre">${esc(Q.fb||'⏳ ...')}</div></div><button class="btn lg" onclick="quizReset()">اختبار جديد</button>`;return;}
 if(Q){const c=Q.qs[Q.i];v.innerHTML=`<div class="card"><small>سؤال ${Q.i+1} من ${Q.qs.length}</small><h3>${esc(c.q)}</h3>${c.options.map((o,i)=>`<button class="btn off opt ${Q.sel==null?'':i===c.answer?'ok':i===Q.sel?'bad':''}" onclick="quizPick(${i})">${esc(o)}</button>`).join('')}${Q.sel!=null?`<div class="ai">${esc(c.explain||'')}</div><button class="btn lg" onclick="quizNext()">${Q.i+1<Q.qs.length?'التالي ←':'النتيجة'}</button>`:''}</div>`;return;}
 v.innerHTML=`<div class="card"><h3>🧠 اختبار ذكي</h3><input id="qt" class="in" placeholder="المادة أو الموضوع (مثال: قانون أوم)"><select id="qn" class="in"><option>5</option><option>10</option><option>15</option></select><select id="ql" class="in"><option>سهل</option><option selected>متوسط</option><option>صعب</option></select><label class="chk"><input type="checkbox" id="qu"> اعتمد على ملاحظاتي</label><button class="btn lg" onclick="quizStart()">🚀 ابدأ الاختبار</button></div>`
 +(S.quizzes.length?`<div class="card"><h3>آخر النتائج</h3>${S.quizzes.slice(-5).reverse().map(x=>`<div class="row"><span>${esc(x.topic)}</span><b>${x.score}/${x.total}</b></div>`).join('')}</div>`:'');}
/* ---- plan & report ---- */
let PL={busy:false,rep:''};
async function makePlan(){if(!S.settings.key)return toast(errMsg(new Error('nokey')));const h=Math.min(12,Math.max(1,+$('#ph').value||3));PL.busy=true;render();
 try{const r=await agent([{role:'user',content:`ولّد لي خطة دراسة لـ7 أيام قادمة تبدأ من اليوم اعتماداً على امتحاناتي وواجباتي وجدولي ودرجاتي ونتائج اختباراتي، وأقدر أدرس ${h} ساعات يومياً. قدّم الأصعب والأقرب امتحاناً مع استراحات. اعرضها منظمة لكل يوم باختصار، ثم أضف أهم 5 مهام للأسبوع بأداة add_task.`}],sysPrompt(),1800);
  S.plan={ts:Date.now(),text:withActs(r)};save();}catch(e){toast(errMsg(e));}PL.busy=false;render();}
async function makeReport(){if(!S.settings.key)return toast(errMsg(new Error('nokey')));PL.busy=true;render();const s=stats();
 try{PL.rep=await ai([{role:'user',content:`إحصائياتي لآخر 7 أيام: دراسة ${s.min} دقيقة في ${s.days} أيام، إنجازات منجزة ${s.gd}، واجبات منجزة ${s.td} ومتبقية ${s.to}، معدل الاختبارات ${s.qa==null?'لا يوجد':s.qa+'%'}. حلل أدائي بصراحة ولطف: شنو الجيد وشنو يحتاج تحسين، مع 3 توصيات عملية.`}],sysPrompt(),800);}
 catch(e){toast(errMsg(e));}PL.busy=false;render();}
function vPlan(v){const p=S.plan;v.innerHTML=`<div class="card"><h3>🗓 خطة ذكية</h3><small>كم ساعة تقدر تدرس يومياً؟</small><input id="ph" type="number" class="in" value="3" min="1" max="12"><button class="btn lg" onclick="makePlan()">✨ ولّد خطتي الأسبوعية</button><button class="btn off lg" onclick="makeReport()">📈 حلل أدائي</button></div>${PL.busy?'<div class="card ctr">⏳ يفكر ويحلل بياناتك...</div>':''}${PL.rep?`<div class="card"><h3>📈 تقرير الأداء</h3><div class="pre">${esc(PL.rep)}</div></div>`:''}${p?`<div class="card"><small>خطة ${new Date(p.ts).toLocaleDateString('ar')}</small><div class="pre">${esc(p.text)}</div></div>`:''}`;}
Object.assign(window.EXTRA,{quiz:vQuiz,plan:vPlan,solve:vSolve});
