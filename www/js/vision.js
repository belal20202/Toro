/* خالد — chat with images (replaces the chat functions of ai.js): attach up to 3 photos, check solutions, explain, summarize, read text */
let PEND=[];const IMGS={};
const PRESETS=[
 ['✅ تحقق من حلي','هذه صورة لسؤال مع حلّي. اقرأ السؤال وحلّي وتحقق منه خطوة بخطوة: ابدأ بسطر واضح "✅ الحل صحيح" أو "❌ الحل فيه خطأ" أو "⚠️ صحيح جزئياً"، ثم حدد مكان الخطأ بالضبط واشرح التصحيح، ثم اكتب الحل الصحيح باختصار.'],
 ['📖 اشرح السؤال','اقرأ السؤال الظاهر بالصورة واشرح طريقة حله خطوة بخطوة بشكل مبسط، وأعطني الجواب النهائي مع القانون المستخدم.'],
 ['📝 لخّص الصفحة','لخّص محتوى هذه الصفحة بنقاط واضحة مع أهم التعاريف والقوانين.'],
 ['🔤 اقرأ النص','استخرج النص المكتوب في الصورة بدقة، ثم اشرح فكرته الرئيسية باختصار.']];
const toBlocks=c=>typeof c==='string'?[{type:'text',text:c}]:c;
function chatMsgs(){const rec=S.chat.slice(-20).filter(m=>!m.err),out=[];
 const withImg=rec.filter(m=>m.r==='user'&&IMGS[m.ts]).slice(-2).map(m=>m.ts);
 for(const m of rec){if(!out.length&&m.r!=='user')continue;
  const c=(m.r==='user'&&withImg.includes(m.ts))?IMGS[m.ts].map(imgBlock).concat([{type:'text',text:m.t}]):m.t,p=out[out.length-1];
  if(p&&p.role===m.r){if(typeof p.content==='string'&&typeof c==='string')p.content+='\n'+c;else p.content=toBlocks(p.content).concat(toBlocks(c));}
  else out.push({role:m.r,content:c});}
 return out;}
async function addImg(){if(PEND.length>=3)return toast('الحد الأقصى 3 صور');let b;
 try{b=await photoAny();}catch(e){return;}
 if(b){PEND.push(b);render();}}
function rmImg(i){PEND.splice(i,1);render();}
async function preset(i){if(!S.settings.key)return toast(errMsg(new Error('nokey')));
 if(!PEND.length)await addImg();if(!PEND.length)return;
 const d=draft.trim();return sendChat(PRESETS[i][1]+(d?'\nملاحظتي: '+d:''),PRESETS[i][0]);}
async function sendChat(text,label){const imgs=PEND.slice();
 const t=String(text||draft||'').trim()||(imgs.length?'اقرأ الصورة وساعدني بالدراسة: إذا فيها حل تحقق منه، وإذا كانت سؤالاً اشرحه.':'');
 if(!t||busy)return;const ts=Date.now();draft='';PEND=[];
 const shown=(imgs.length?'📷'+(imgs.length>1?'×'+imgs.length:'')+' ':'')+(label||t);
 S.chat.push({r:'user',t,d:shown,ts});if(imgs.length)IMGS[ts]=imgs;save();busy=true;render();
 try{const r=await agent(chatMsgs(),sysPrompt(),1500);S.chat.push({r:'assistant',t:withActs(r),ts:Date.now()});}
 catch(e){S.chat.push({r:'assistant',t:errMsg(e),ts:Date.now(),err:true});}
 busy=false;if(S.chat.length>200)S.chat=S.chat.slice(-200);save();render();}
function vChat(v){
 const msgs=S.chat.length?S.chat.map(m=>`<div class="m ${m.r}">${(IMGS[m.ts]||[]).map(b=>`<img class="cimg" src="data:image/jpeg;base64,${b}">`).join('')}${esc(m.d||m.t)}</div>`).join(''):'<p class="mut">صوّر سؤالك أو حلّك وأتحقق منه، أو اكتب سؤالك، أو اطلب مني أضيف واجب/امتحان/منبه 📷</p>';
 v.innerHTML=`<div class="card"><small>📷 أدوات الصور (صوّر أو اختر صورة)</small><div class="chips">${PRESETS.map((x,i)=>`<span class="dchip" onclick="preset(${i})">${x[0]}</span>`).join('')}</div><div class="chips">${QL.map((x,i)=>`<span class="dchip" onclick="quick(${i})">${x}</span>`).join('')}</div>
 <div id="msgs">${msgs}${busy?'<div class="m assistant">⏳ ...</div>':''}</div>
 ${PEND.length?`<div class="thumbs">${PEND.map((b,i)=>`<span class="th"><img src="data:image/jpeg;base64,${b}"><b onclick="rmImg(${i})">✕</b></span>`).join('')}</div>`:''}
 <textarea id="ci" class="in" rows="2" placeholder="اكتب رسالتك أو سؤالك عن الصورة..." oninput="draft=this.value">${esc(draft)}</textarea>
 <button class="btn" onclick="sendChat()">إرسال</button> <button class="btn off" onclick="addImg()">📷 ${PEND.length||''}</button> <button class="btn sm off" onclick="clearChat()">مسح المحادثة</button></div>`;
 const c=$('#msgs');if(c)c.scrollTop=c.scrollHeight;}
