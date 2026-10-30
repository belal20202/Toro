/* خالد — PDF library & professional reader (pdf.js, pages rendered on demand, saved inside the app) */
const PDFJS=()=>window.pdfjsLib||window['pdfjs-dist/build/pdf']||null;
function pdfReady(){const p=PDFJS();if(!p)return null;p.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js';return p;}
const BK=()=>Array.isArray(S.books)?S.books:(S.books=[]);
const mbs=n=>(n/1048576).toFixed(1);
/* storage of the PDF files (IndexedDB) */
let _db=null;
function idb(){return _db||(_db=new Promise((res,rej)=>{try{const r=indexedDB.open('khaled_files',1);
 r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>{_db=null;rej(r.error);};}catch(e){_db=null;rej(e);}}));}
async function idbOp(mode,fn){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('f',mode),rq=fn(t.objectStore('f'));
 t.oncomplete=()=>res(rq.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
const fPut=(k,v)=>idbOp('readwrite',s=>s.put(v,k)),fGet=k=>idbOp('readonly',s=>s.get(k)),fDel=k=>idbOp('readwrite',s=>s.delete(k));
/* library */
async function importPdf(inp){const files=[...inp.files];inp.value='';const pj=pdfReady();
 if(!pj)return toast('محرك PDF غير متوفر، أعد بناء التطبيق من GitHub');
 for(const f of files){
  if(!/\.pdf$/i.test(f.name||'')&&!/pdf/i.test(f.type||'')){toast('ليس ملف PDF: '+f.name);continue;}
  toast('⏳ جاري إضافة '+f.name);
  try{const buf=await f.arrayBuffer(),blob=new Blob([buf],{type:'application/pdf'});
   const doc=await pj.getDocument({data:new Uint8Array(buf)}).promise,pg=await doc.getPage(1),v0=pg.getViewport({scale:1}),v2=pg.getViewport({scale:160/v0.width});
   const cv=document.createElement('canvas');cv.width=Math.floor(v2.width);cv.height=Math.floor(v2.height);
   await pg.render({canvasContext:cv.getContext('2d'),viewport:v2}).promise;
   const id=uid();await fPut(id,blob);
   BK().push({id,name:String(f.name).replace(/\.pdf$/i,''),pages:doc.numPages,size:f.size||blob.size,added:Date.now(),last:1,bm:[],thumb:cv.toDataURL('image/jpeg',.6)});
   save();try{doc.destroy&&doc.destroy();}catch(e){}toast('✅ تمت إضافة الكتاب');
  }catch(e){toast('تعذر فتح الملف: '+(e.message||e));}}
 render();}
async function delBook(id){if(!confirm('حذف هذا الكتاب من المكتبة؟'))return;
 try{await fDel(id);}catch(e){}S.books=BK().filter(b=>b.id!==id);S.notes=S.notes.filter(n=>n.book!==id);save();render();}
function vLib(v){const L=BK();
 v.innerHTML=`<div class="card"><h3>📚 مكتبتي</h3><p class="mut">أضف كتبك وملازمك بصيغة PDF لتقرأها بشكل مريح، وتكمل من آخر صفحة وصلت لها.</p><label class="btn lg ctr" style="display:block">➕ إضافة ملف PDF<input type="file" accept="application/pdf,.pdf" multiple hidden onchange="importPdf(this)"></label></div>`
 +(L.length?L.slice().sort((a,b)=>(b.opened||b.added)-(a.opened||a.added)).map(b=>{const pct=Math.round((b.last||1)/b.pages*100);
  return `<div class="card book"><img src="${esc(b.thumb)}" alt=""><div style="flex:1"><b>${esc(b.name)}</b><br><small>${b.pages} صفحة • ${mbs(b.size)} MB</small><div class="pbar"><i style="width:${pct}%"></i></div><small>وصلت للصفحة ${b.last||1} (${pct}%)</small><div class="acts"><button class="btn sm" onclick="openBook(${b.id})">📖 اقرأ</button><button class="btn sm red" onclick="delBook(${b.id})">🗑</button></div></div></div>`;}).join(''):'<div class="card ctr mut">ما أضفت أي كتاب بعد</div>');}
/* reader */
const R={doc:null,b:null,n:0,zoom:1,cur:0,vis:new Set(),els:[],obs:null,ratio:1.414,t0:0,t:null,tr:null};
const RM=['sepia','day','night'],RML={sepia:'📜',day:'☀️',night:'🌙'};
const pageEl=n=>R.els[n-1];
const pgW=()=>Math.max(200,$('#rsc').clientWidth-12)*R.zoom;
function applyRMode(){const m=RM.includes(S.settings.pdfMode)?S.settings.pdfMode:'sepia',cl=$('#reader').classList;
 RM.forEach(x=>cl.remove('mode-'+x));cl.add('mode-'+m);$('#rmode').textContent=RML[m];}
function cycleRMode(){const m=RM.includes(S.settings.pdfMode)?S.settings.pdfMode:'sepia';S.settings.pdfMode=RM[(RM.indexOf(m)+1)%RM.length];save();applyRMode();}
function toggleBars(){$('#reader').classList.toggle('hidebars');}
async function openBook(id,page){const b=BK().find(x=>x.id===id);if(!b)return;const pj=pdfReady();
 if(!pj)return toast('محرك PDF غير متوفر، أعد بناء التطبيق من GitHub');
 toast('⏳ جاري فتح الكتاب...');
 try{const blob=await fGet(id);if(!blob)throw new Error('الملف غير موجود، احذفه وأضفه من جديد');
  const buf=await blob.arrayBuffer();if(R.doc)closeBook(true);
  R.doc=await pj.getDocument({data:new Uint8Array(buf)}).promise;
 }catch(e){return toast('تعذر فتح الكتاب: '+(e.message||e));}
 R.b=b;R.n=R.doc.numPages;R.zoom=b.zoom||1;R.cur=0;R.t0=Date.now();b.opened=Date.now();
 try{const p1=await R.doc.getPage(1),v=p1.getViewport({scale:1});R.ratio=v.height/v.width;}catch(e){}
 $('#reader').style.display='block';$('#reader').classList.remove('hidebars');$('#rtitle').textContent=b.name;
 const sl=$('#rsl');sl.max=R.n;applyRMode();buildPages();
 $('#rsc').onscroll=()=>{if(R.tr)return;R.tr=setTimeout(()=>{R.tr=null;trackPage();},120);};
 setTimeout(()=>goPage(page||b.last||1),60);}
function buildPages(){const box=$('#pg');box.innerHTML='';R.vis.clear();R.els=[];if(R.obs)R.obs.disconnect();
 R.obs=new IntersectionObserver(es=>{for(const e of es){const n=+e.target.dataset.n;
  if(e.isIntersecting){R.vis.add(n);drawPage(n);}else{R.vis.delete(n);freePage(n);}}},{root:$('#rsc'),rootMargin:'1400px 0px'});
 const w=pgW(),h=w*R.ratio;
 for(let i=1;i<=R.n;i++){const d=document.createElement('div');d.className='pp';d.dataset.n=i;d.style.width=w+'px';d.style.height=h+'px';d.textContent=i;box.appendChild(d);R.els.push(d);R.obs.observe(d);}}
async function drawPage(n){const d=pageEl(n),doc=R.doc;if(!d||d.dataset.r)return;d.dataset.r='1';
 try{const pg=await doc.getPage(n);if(doc!==R.doc||!d.dataset.r)return;
  const v0=pg.getViewport({scale:1}),w=pgW(),dpr=Math.min(window.devicePixelRatio||1,2),vp=pg.getViewport({scale:w/v0.width*dpr});
  const cv=document.createElement('canvas');cv.width=Math.floor(vp.width);cv.height=Math.floor(vp.height);
  cv.style.width=w+'px';cv.style.height=(vp.height/dpr)+'px';
  await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
  if(doc!==R.doc||!d.dataset.r)return;d.textContent='';d.style.height=(vp.height/dpr)+'px';d.appendChild(cv);
  try{pg.cleanup&&pg.cleanup();}catch(e){}
 }catch(e){delete d.dataset.r;}}
function freePage(n){const d=pageEl(n);if(d&&d.dataset.r){delete d.dataset.r;d.textContent=n;}}
function uiPage(){$('#rpg').textContent=R.cur+' / '+R.n;$('#rsl').value=R.cur;$('#rprog').style.width=(R.cur/R.n*100)+'%';
 $('#rbm').classList.toggle('on',(R.b.bm||[]).includes(R.cur));}
function saveSoon(){clearTimeout(R.t);R.t=setTimeout(save,800);}
function trackPage(){if(!R.doc)return;const sc=$('#rsc'),mid=sc.scrollTop+sc.clientHeight/3;let cur=0;
 for(const n of R.vis){const d=pageEl(n);if(d&&d.offsetTop<=mid&&d.offsetTop+d.offsetHeight>mid){cur=n;break;}}
 if(!cur||cur===R.cur)return;R.cur=cur;R.b.last=cur;uiPage();saveSoon();}
function goPage(n){if(!R.doc)return;n=Math.min(R.n,Math.max(1,Math.round(+n)||1));const d=pageEl(n);if(!d)return;
 R.cur=n;R.b.last=n;uiPage();$('#rsc').scrollTop=Math.max(0,d.offsetTop-70);saveSoon();}
function zoomBy(f){if(!R.doc)return;const keep=R.cur||1;R.zoom=f===1?1:Math.min(3,Math.max(.6,+(R.zoom*f).toFixed(2)));R.b.zoom=R.zoom;saveSoon();
 buildPages();setTimeout(()=>goPage(keep),40);}
function toggleBm(){if(!R.doc)return;const a=R.b.bm||(R.b.bm=[]),i=a.indexOf(R.cur);
 if(i>=0)a.splice(i,1);else a.push(R.cur);a.sort((x,y)=>x-y);save();uiPage();toast(i>=0?'أُزيلت العلامة':'⭐ علامة بالصفحة '+R.cur);}
function openSheet(){if(!R.doc)return;const b=R.b,ns=S.notes.filter(n=>n.book===b.id).sort((x,y)=>x.page-y.page),sh=$('#sheet');sh.style.display='flex';
 sh.innerHTML=`<div class="sh"><div class="row"><h3>⭐ العلامات والملاحظات</h3><button class="btn sm off" onclick="closeSheet()">✕</button></div><small>ملاحظة على الصفحة ${R.cur}</small><textarea id="rnote" class="in" rows="3" placeholder="اكتب ملاحظتك..."></textarea><button class="btn" onclick="saveRNote()">💾 حفظ الملاحظة</button>
 <h4>العلامات</h4><div class="chips">${(b.bm||[]).length?b.bm.map(p=>`<span class="dchip" onclick="goPage(${p});closeSheet()">ص ${p}</span>`).join(''):'<small>لا توجد علامات</small>'}</div>
 <h4>ملاحظاتي بهذا الكتاب</h4>${ns.length?ns.map(n=>`<div class="card"><small>ص ${n.page}</small><div class="pre">${esc(n.x)}</div><div class="acts"><button class="btn sm" onclick="goPage(${n.page});closeSheet()">اذهب</button><button class="btn sm red" onclick="delRNote(${n.id})">🗑</button></div></div>`).join(''):'<small>لا توجد ملاحظات</small>'}</div>`;}
function closeSheet(){$('#sheet').style.display='none';}
function saveRNote(){const x=$('#rnote').value.trim();if(!x)return toast('اكتب الملاحظة أولاً');
 S.notes.push({id:uid(),ts:Date.now(),t:'ص '+R.cur+' — '+R.b.name,sub:R.b.name,x,book:R.b.id,page:R.cur});save();toast('تم حفظ الملاحظة ✅');openSheet();}
function delRNote(id){S.notes=S.notes.filter(n=>n.id!==id);save();openSheet();}
function closeBook(silent){if(!R.doc&&!silent)return;
 if(R.b){const m=Math.min(180,Math.round((Date.now()-R.t0)/60000));
  if(m>=1){S.minutes[dk()]=(S.minutes[dk()]||0)+m;if(!silent)toast('📖 سُجّلت '+m+' دقيقة قراءة');}save();}
 if(R.obs)R.obs.disconnect();R.vis.clear();R.els=[];$('#pg').innerHTML='';closeSheet();
 try{R.doc&&R.doc.destroy&&R.doc.destroy();}catch(e){}R.doc=null;R.b=null;
 if(!silent){$('#reader').style.display='none';render();}}
/* hooks: library tile + resume card on home */
const _he=window.homeExtra;
window.homeExtra=function(){const b=BK().filter(x=>x.opened).sort((a,c)=>c.opened-a.opened)[0];
 return (b?`<div class="card row"><div><small>📖 تابع القراءة</small><br><b>${esc(b.name)}</b> <small>ص ${b.last||1}/${b.pages}</small></div><button class="btn sm" onclick="openBook(${b.id})">متابعة</button></div>`:'')+_he();};
window.EXTRA.lib=vLib;
window.EXTRA.more=function(v){v.innerHTML='<div class="grid">'+[['lib','📚','مكتبتي'],['notes','📝','ملاحظات'],['goals','✅','إنجازات'],['sched','📅','الجدول'],['exams','🎯','امتحاناتي'],['tasks','📚','الواجبات'],['gpa','📊','المعدل'],['quiz','🧠','اختبار ذكي'],['plan','🗓','خطة ذكية'],['solve','📸','حل بالصورة'],['set','⚙️','الإعدادات']].map(x=>`<button class="tile" onclick="go('${x[0]}')"><span>${x[1]}</span>${x[2]}</button>`).join('')+'</div>';};
