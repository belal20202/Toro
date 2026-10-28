/* Toro — startup */
function applyTheme(){document.documentElement.setAttribute('data-theme',S.theme==='light'?'light':'dark');}
function tick(){ticks++;cdTick();tmrTick();fTick();checkRing();
 const ev=S.settings.aiEvery;if(ev>0&&ticks%20===0&&!document.hidden&&Date.now()-S.lastPro>=ev*60000)proactive();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){cdTick();checkRing();}});
applyTheme();render();cdTick();setInterval(tick,1000);initNative();checkRing();
