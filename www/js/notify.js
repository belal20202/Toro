/* خالد — notifications (alarms + continuous daily motivation), test button, Android back button */
const PERDAY=()=>[2,4,6,8].includes(+S.settings.perDay)?+S.settings.perDay:4;
const TITLES=['💪','📚','🔥','🌟','🎯','✨','🚀','🧠'];
async function scheduleAll(){const LN=P('LocalNotifications');if(!LN)return;
 try{const pend=await LN.getPending(),old=(pend.notifications||[]).filter(n=>n.id!==7000001&&n.id!==7000002);
  if(old.length)await LN.cancel({notifications:old.map(n=>({id:n.id}))});
  const now=Date.now(),list=[],nm=(S.settings.name||'').trim();
  S.alarms.filter(a=>a.on).forEach(a=>{const [h,m]=a.time.split(':').map(Number);
   for(let d=0;d<4;d++){const base=new Date();base.setDate(base.getDate()+d);
    if(!dayOn(a,base.getDay())||(d===0&&S.dismissed[a.id+'_'+dk(base)]))continue;base.setHours(h,m,0,0);
    for(let k=0;k<8;k++){const at=base.getTime()+k*60000;
     if(at>now+1500)list.push({id:a.id*1000+d*20+k,title:'⏰ '+a.label,body:a.photo===false?motivAt(daySeed(base)+k):'قم وصوّر المغسلة لإيقاف المنبه 🚰',channelId:'alarm',schedule:{at:new Date(at),allowWhileIdle:true},extra:{alarm:a.id}});}}});
  if(S.settings.notifs!==false){const per=PERDAY(),seg=840/per;
   for(let d=0;d<21;d++)for(let i=0;i<per;i++){const t=new Date();t.setDate(t.getDate()+d);
    const mins=Math.round((480+(i+.5)*seg)/5)*5;t.setHours(Math.floor(mins/60),mins%60,0,0);
    if(t.getTime()>now+1500)list.push({id:5000000+d*100+i,title:nm?'يا '+nm+' '+TITLES[(d+i)%8]:'خالد '+TITLES[(d+i)%8],body:motivAt(daySeed(t)+i+1),channelId:'buddy',schedule:{at:t,allowWhileIdle:true}});}}
  if(list.length)await LN.schedule({notifications:list});
 }catch(e){console.log('schedule',e);}}
async function initNative(){const LN=P('LocalNotifications');if(!LN)return;
 try{await LN.requestPermissions();}catch(e){}
 try{if(LN.checkExactNotificationSetting){const s=await LN.checkExactNotificationSetting();if(s&&s.exact_alarm!=='granted'&&LN.changeExactNotificationSetting)await LN.changeExactNotificationSetting();}}catch(e){}
 try{await LN.createChannel({id:'alarm',name:'المنبه',description:'منبه الاستيقاظ',importance:5,visibility:1,vibration:true});
  await LN.createChannel({id:'buddy',name:'تحفيز خالد',description:'رسائل تحفيزية يومية',importance:4,vibration:true});}catch(e){}
 try{LN.addListener('localNotificationReceived',()=>checkRing());LN.addListener('localNotificationActionPerformed',()=>checkRing());}catch(e){}
 scheduleAll();}
async function testNotif(){const LN=P('LocalNotifications');if(!LN)return toast('الإشعارات تعمل داخل التطبيق المثبّت فقط');
 try{const p=await LN.requestPermissions();if(p&&p.display&&p.display!=='granted')return toast('فعّل إذن الإشعارات من إعدادات الهاتف');
  await LN.schedule({notifications:[{id:7000002,title:'خالد 🌟',body:motivRandom(),channelId:'buddy',schedule:{at:new Date(Date.now()+4000),allowWhileIdle:true}}]});
  toast('🔔 راح يوصلك إشعار بعد ثواني');}catch(e){toast('تعذر: '+e.message);}}
function initBack(){const A=P('App');if(!A||!A.addListener)return;
 try{A.addListener('backButton',()=>{
  if($('#sheet').style.display==='flex')return closeSheet();
  if($('#reader').style.display==='flex')return closeBook();
  if(ring||$('#login').style.display==='flex')return;
  if(tab!=='home')return go('home');
  A.minimizeApp&&A.minimizeApp();});}catch(e){}}
