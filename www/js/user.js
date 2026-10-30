/* خالد — user profile & login (saved permanently), native backup, notes with search, settings */
let _bt;
function backupNative(){const Pf=P('Preferences');if(!Pf)return;clearTimeout(_bt);
 _bt=setTimeout(()=>{try{Pf.set({key:'khaled_state',value:JSON.stringify(S)});}catch(e){}},1200);}
async function restoreNative(){const Pf=P('Preferences');if(!Pf)return;
 try{if(localStorage.getItem(KEY))return;const r=await Pf.get({key:'khaled_state'});
  if(r&&r.value){S=merge(JSON.parse(r.value));localStorage.setItem(KEY,JSON.stringify(S));}}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}backupNative();}
function applyUser(){const w=$('#who');if(w)w.textContent=S.user?'👤 '+S.user.name:'';}
function showLogin(){const el=$('#login');el.style.display='flex';
 el.innerHTML=`<div class="lg"><div class="lgo">خ</div><h1>أهلاً بك في خالد</h1><p class="mut">رفيقك الذكي للدراسة والتفوق</p>
 <input id="lun" class="in" placeholder="اسم المستخدم" maxlength="30" autocomplete="off" onkeydown="if(event.key==='Enter')doLogin()">
 <input id="lbr" class="in" placeholder="فرعك الدراسي (اختياري)" maxlength="40" autocomplete="off">
 <div id="lerr" class="late"></div><button class="btn lg" onclick="doLogin()">ابدأ رحلتك 🚀</button>
 <small>اسمك يُحفظ على جهازك ولن تحتاج لإدخاله مرة ثانية</small></div>`;}
function doLogin(){const n=$('#lun').value.trim().replace(/\s+/g,' ');
 if(n.length<2){$('#lerr').textContent='اكتب اسماً من حرفين على الأقل';return;}
 S.user={name:n,branch:$('#lbr').value.trim(),since:Date.now()};S.settings.name=n;if(S.user.branch)S.settings.branch=S.user.branch;
 save();$('#login').style.display='none';applyUser();render();initNative();toast('أهلاً '+n+' 👋');}
/* notes with search */
let NQ='';
function noteCards(){const q=NQ.trim().toLowerCase();
 const L=S.notes.slice().reverse().filter(n=>!q||(n.t+' '+n.sub+' '+n.x).toLowerCase().includes(q));
 return L.length?L.map(n=>`<div class="card"><b>${esc(n.t)}</b> <small>${esc(n.sub)}</small><div class="pre">${esc(n.x)}</div>${n.ai?`<div class="ai">🤖 ${esc(n.ai)}</div>`:''}<div class="acts"><button class="btn sm" onclick="aiNote(${n.id},'sum')">🤖 لخّص</button><button class="btn sm" onclick="aiNote(${n.id},'quiz')">❓ اسألني</button>${n.book&&BK().some(b=>b.id===n.book)?`<button class="btn sm" onclick="openBook(${n.book},${n.page})">📖 ص${n.page}</button>`:''}<button class="btn sm off" onclick="editN(${n.id})">✏️</button><button class="btn sm red" onclick="delN(${n.id})">🗑</button></div></div>`).join(''):'<p class="mut ctr">لا توجد ملاحظات</p>';}
function vNotes(v){const e=S.notes.find(n=>n.id===editId)||{t:'',sub:'',x:''};
 v.innerHTML=`<div class="card"><h3>${editId?'تعديل ملاحظة':'ملاحظة جديدة'}</h3><input id="nt" class="in" placeholder="العنوان" value="${esc(e.t)}"><input id="ns" class="in" placeholder="المادة" value="${esc(e.sub)}"><textarea id="nx" class="in" rows="5" placeholder="اكتب ملاحظتك...">${esc(e.x)}</textarea><button class="btn" onclick="saveNote()">💾 حفظ</button>${editId?' <button class="btn off" onclick="cancelEdit()">إلغاء</button>':''}</div>
 <input id="nsr" class="in" placeholder="🔍 ابحث في ملاحظاتي" value="${esc(NQ)}" oninput="NQ=this.value;$('#nl').innerHTML=noteCards()"><div id="nl">${noteCards()}</div>`;}
/* settings */
function vSet(v){const s=S.settings,pd=PERDAY();
 v.innerHTML=`<div class="card"><h3>👤 الملف الشخصي</h3><small>اسم المستخدم</small><input id="sn" class="in" value="${esc(s.name)}" maxlength="30"><small>الفرع الدراسي</small><input id="sb" class="in" value="${esc(s.branch)}" placeholder="مثال: كهرباء، حاسبات..."><small>موعد الامتحانات</small><input id="sd" type="date" class="in" value="${esc(s.examDate)}"></div>
 <div class="card"><h3>🤖 الذكاء الاصطناعي</h3><small>مفتاح Anthropic API</small><input id="sk" type="password" class="in" value="${esc(s.key)}" placeholder="sk-ant-..."><small>النموذج</small><select id="sm" class="in">${[['claude-haiku-5-5','Haiku — سريع'],['claude-sonnet-5-5','Sonnet — متوازن (موصى به)'],['claude-opus-5-5','Opus — الأقوى والأذكى']].map(x=>`<option value="${x[0]}" ${s.model===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select><small>رسالة من المساعد داخل التطبيق كل (دقيقة، 0 = إيقاف)</small><input id="se" type="number" class="in" min="0" value="${esc(s.aiEvery)}"></div>
 <div class="card"><h3>🔔 التحفيز اليومي</h3><label class="chk"><input type="checkbox" id="sf" ${s.notifs!==false?'checked':''}> تفعيل إشعارات التحفيز</label><small>عدد الإشعارات يومياً</small><select id="spd" class="in">${[2,4,6,8].map(n=>`<option ${n===pd?'selected':''}>${n}</option>`).join('')}</select><button class="btn off" onclick="testNotif()">🔔 جرّب إشعار الآن</button></div>
 <div class="card"><h3>🎨 المظهر</h3><select id="sth" class="in"><option value="dark" ${S.theme!=='light'?'selected':''}>داكن مريح</option><option value="light" ${S.theme==='light'?'selected':''}>فاتح</option></select></div>
 <button class="btn lg" onclick="saveSet()">💾 حفظ الإعدادات</button>
 <div class="card"><h3>نسخة احتياطية</h3><small>تشمل الملاحظات والإعدادات (ملفات PDF لا تدخل فيها)</small><textarea id="bk" class="in" rows="3"></textarea><button class="btn sm" onclick="expB()">تصدير</button> <button class="btn sm off" onclick="impB()">استيراد</button></div>`;}
function saveSet(){const s=S.settings,n=$('#sn').value.trim();
 if(n.length>=2){s.name=n;if(S.user)S.user.name=n;}
 s.branch=$('#sb').value.trim();if(S.user)S.user.branch=s.branch;
 const d=$('#sd').value;if(/^\d{4}-\d\d-\d\d$/.test(d))s.examDate=d;
 s.key=$('#sk').value.trim();s.model=$('#sm').value;s.aiEvery=Math.max(0,parseInt($('#se').value,10)||0);
 s.notifs=$('#sf').checked;s.perDay=+$('#spd').value||4;S.theme=$('#sth').value==='light'?'light':'dark';
 applyTheme();applyUser();save();scheduleAll();cdTick();toast('تم الحفظ ✅');}
