/* خالد — startup */
function applyTheme(){document.documentElement.setAttribute('data-theme',S.theme==='light'?'light':'dark');}
function tick(){ticks++;cdTick();tmrTick();fTick();checkRing();
 const ev=S.settings.aiEvery;if(ev>0&&ticks%20===0&&!document.hidden&&Date.now()-S.lastPro>=ev*60000)proactive();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){cdTick();checkRing();}});
(async()=>{
 await restoreNative();
 if(!S.user&&S.settings.name){S.user={name:S.settings.name,branch:S.settings.branch||'',since:Date.now()};save();}
 applyTheme();applyUser();render();cdTick();setInterval(tick,1000);initBack();
 try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist();}catch(e){}
 if(S.user)initNative();else showLogin();
 checkRing();
})();
