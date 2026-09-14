const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const S={city:null,guide:null,i:0,done:new Set(),opt:true,gps:false,map:null,layer:null,simT:null,geoW:null,routes:{}};

function go(id){$$('.scr').forEach(s=>s.classList.toggle('on',s.id===id));window.scrollTo(0,0)}
function snack(t,ms=2600){const e=$('#snack');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),ms)}
function openSheet(id){$('#veil').classList.add('on');$('#'+id).classList.add('on')}
function closeSheets(){$('#veil').classList.remove('on');$$('.sheet').forEach(s=>s.classList.remove('on'))}
$('#veil').onclick=closeSheets;

/* ---- HOME: tour picker ---- */
$('#cityList').innerHTML=Object.entries(TOURS).map(([k,t])=>t.soon
 ?`<div class="city soon"><span class="city-badge">${t.name[0]}</span><span><h3>${t.name}</h3></span><span class="lock">Coming soon</span></div>`
 :`<button class="city" data-c="${k}" aria-selected="false"><span class="city-badge">${t.name[0]}</span><span><h3>${t.name}</h3><p>${t.stops.length} stops · ${t.dur}</p></span><span class="check"></span></button>`).join('');
$$('.city[data-c]').forEach(b=>b.onclick=()=>{S.city=b.dataset.c;$$('.city[data-c]').forEach(x=>x.setAttribute('aria-selected',x===b));$('#startBtn').disabled=false});
$('#startBtn').onclick=()=>{const t=TOURS[S.city];$('#gCity').textContent=t.name;
 $('#guideList').innerHTML=t.guides.map(g=>g.soon
  ?`<div class="gcard soon"><span class="gportrait">${g.init}</span><span><h3>${g.name}</h3><p class="role">${g.role}</p><p>${g.bio}</p></span><span class="lock">Soon</span></div>`
  :`<button class="gcard" data-g="${g.id}" aria-selected="false"><span class="gportrait">${g.init}</span><span><h3>${g.name}</h3><p class="role">${g.role}</p><p>${g.bio}</p></span></button>`).join('');
 const pick=$$('.gcard[data-g]');
 pick.forEach(b=>b.onclick=()=>{S.guide=b.dataset.g;pick.forEach(x=>x.setAttribute('aria-selected',x===b));$('#guideGo').disabled=false;startTour()});
 if(pick.length===1){S.guide=pick[0].dataset.g;pick[0].setAttribute('aria-selected','true');$('#guideGo').disabled=false}else{$('#guideGo').disabled=true;S.guide=null}
 go('guides')};
$('#guideGo').onclick=()=>startTour();

/* ---- STOPS ---- */
function stops(){return TOURS[S.city].stops.map((s,n)=>({...s,num:String(n+1)}))}
function guide(){return TOURS[S.city].guides.find(g=>g.id===S.guide)||TOURS[S.city].guides[0]}
function slug(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function file(s){const v=(VIDEOS[S.city]||[])[Number(s.num)-1];
 return (v||`Ldn-${String(s.num).padStart(2,'0')}-${slug(s.t)}`)+'.mp4'}

function startTour(){S.i=0;S.done=new Set();go('tour');initMap();render();
 setTimeout(()=>snack('You will be notified when you reach the next point of interest.',3600),500)}

/* ---- MAP ---- */
function initMap(){
 if(S.map){S.map.remove();S.map=null}
 S.map=L.map('map',{zoomControl:false,attributionControl:true}).setView(TOURS[S.city].center,15);
 L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri, HERE, Garmin, © OpenStreetMap contributors'}).addTo(S.map);
 L.control.zoom({position:'bottomright'}).addTo(S.map);
 S.layer=L.layerGroup().addTo(S.map);
}
/* ---- WALKING ROUTE (OSRM foot, straight-line fallback) ---- */
const FOOT='https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
function routeKey(){return S.city}
async function loadRoute(){const key=routeKey();if(S.routes[key])return S.routes[key];
 S.routes[key]='loading';const l=stops();
 const legs=await Promise.all(l.slice(1).map(async(s,i)=>{const a=l[i].c,b=s.c;
  try{const r=await fetch(`${FOOT}${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`);
   const j=await r.json();if(j.routes&&j.routes[0])return j.routes[0].geometry.coordinates.map(c=>[c[1],c[0]])}catch(e){}
  return [a,b]}));
 S.routes[key]=legs;return legs}

function drawMap(){
 if(!S.map)return;S.layer.clearLayers();const l=stops();
 const key=routeKey(),r=S.routes[key];const legs=Array.isArray(r)?r:l.slice(1).map((s,i)=>[l[i].c,s.c]);
 if(!Array.isArray(r)&&r!=='loading')loadRoute().then(()=>{if(routeKey()===key)drawMap()});
 legs.forEach((g,i)=>{L.polyline(g,{color:'#C9C2B8',weight:3,dashArray:'2 7',opacity:.9}).addTo(S.layer);
  if(i<S.i)L.polyline(g,{color:'#2C5F8A',weight:4,opacity:.95}).addTo(S.layer)});
 l.forEach((s,n)=>{const cur=n===S.i,cls=`mk${cur?' cur':''}${S.done.has(n)&&!cur?' done':''}`;
  const html=`<div class="${cls}"><b>${s.num}</b>${cur?`<span class="mklabel">${s.t}</span>`:''}</div>`;
  L.marker(s.c,{icon:L.divIcon({html,className:'',iconSize:[cur?38:26,cur?38:26],iconAnchor:[cur?19:13,cur?19:13]}),zIndexOffset:cur?1000:0})
   .addTo(S.layer).on('click',()=>{S.i=n;render()})});
 S.map.setView(l[S.i].c,S.i===0?15:16,{animate:true});
 setTimeout(()=>S.map&&S.map.invalidateSize(),120);
}

/* ---- RENDER ---- */
function render(){
 const t=TOURS[S.city],l=stops(),s=l[S.i],g=guide();
 $('#hCity').textContent=t.city;$('#hStop').textContent=s.t;
 $('#sN').textContent=`Stop ${s.num} · ${t.city}`;$('#sTitle').textContent=s.t;$('#sPlace').textContent=s.p;$('#sDesc').textContent=s.d;
 $('#progA').textContent=`Stop ${S.i+1} of ${l.length}`;$('#progB').textContent=`Guide: ${g.name}`;
 $('#prog').innerHTML=l.map((_,n)=>`<i class="${n===S.i?'cur':S.done.has(n)?'done':''}"></i>`).join('');
 $('#prevBtn').disabled=S.i===0;$('#nextBtn').disabled=S.i===l.length-1;
 $('#noticeTxt').textContent=S.gps?'GPS on. When you reach the point of interest you will be notified and your guide will begin.':'When you reach the next point of interest you will be notified, and you will meet your guide.';
 $('#chatTitle').textContent=g.name;$('#pGuide').textContent=g.name;$('#pStop').textContent=s.t;
 drawMap();if(S.gps)armSim();
}
$('#prevBtn').onclick=()=>{if(S.i>0){S.i--;render()}};
$('#nextBtn').onclick=()=>next();
function next(){const l=stops();if(S.i<l.length-1){S.done.add(S.i);S.i++;render()}
 else{S.done.add(S.i);render();snack('Bespoke tour completed. Thank you.',3800)}}

/* ---- GPS ---- */
$('#gpsBtn').onclick=()=>{S.gps=!S.gps;const b=$('#gpsBtn');b.classList.toggle('on',S.gps);$('#gpsLbl').textContent=S.gps?'GPS on':'Enable GPS';
 if(S.gps){snack('GPS on — demo simulation mode');armSim();watchGeo()}else{clearTimeout(S.simT);if(S.geoW!=null)navigator.geolocation.clearWatch(S.geoW),S.geoW=null}
 render()};
function armSim(){clearTimeout(S.simT);S.simT=setTimeout(()=>{if(S.gps&&!$('#player').classList.contains('on'))arrive()},7000)}
function watchGeo(){if(!navigator.geolocation)return;
 try{S.geoW=navigator.geolocation.watchPosition(p=>{const l=stops(),s=l[S.i];
  if(dist(p.coords.latitude,p.coords.longitude,s.c[0],s.c[1])<60)arrive()},()=>{},{enableHighAccuracy:true,maximumAge:5000})}catch(e){}}
function dist(a,b,c,d){const R=6371e3,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,m=Math.cos(a*Math.PI/180);return R*Math.sqrt(x*x+(y*m)*(y*m))}
function arrive(){const s=stops()[S.i];$('#tH').textContent=s.t;$('#tP').textContent=`${guide().name} is waiting for you.`;
 const e=$('#toast');e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),9000)}
$('#tGo').onclick=()=>{$('#toast').classList.remove('on');openPlayer()};

/* ---- PLAYER ---- */
const VIDEO_DIR='video/';
const vid=$('#vid');
const ICO_PLAY='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5z"/></svg>';
const ICO_PAUSE='<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/></svg>';
function mmss(s){s=Math.max(0,Math.floor(s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function showCtls(){$('#vctls').classList.add('on');clearTimeout(S.ctlT);S.ctlT=setTimeout(()=>$('#vctls').classList.remove('on'),2200)}
function openPlayer(){const s=stops()[S.i],l=stops();$('#pStop').textContent=s.t;$('#pFile').textContent=file(s);
 $('#pPrevNm').textContent=S.i>0?l[S.i-1].t:'—';
 const last=S.i===l.length-1;
 $('#pNextLbl').textContent=last?'End of tour':'Next stop ›';
 $('#pNextNm').textContent=last?'Back to map':l[S.i+1].t;
 $('#pPrev').disabled=S.i===0;$('#pNext').disabled=false;
 $('#frame').classList.remove('has');$('#vend').classList.remove('on');$('#vctls').classList.remove('on');
 $('#player').classList.add('on');clearTimeout(S.simT);
 vid.onerror=()=>{$('#frame').classList.remove('has');vid.removeAttribute('src')};
 vid.oncanplay=()=>$('#frame').classList.add('has');
 vid.src=VIDEO_DIR+file(s);const p=vid.play();if(p&&p.catch)p.catch(()=>{})}
$('#playBtn').onclick=openPlayer;
$('#pClose').onclick=()=>closePlayer();
$('#pPrev').onclick=()=>{if(S.i>0){S.i--;render();openPlayer()}};
function advance(){const l=stops();if(S.i>=l.length-1){closePlayer();S.done.add(S.i);render();snack('Tour completed. Thank you.',3600)}else{next();openPlayer()}}
function closePlayer(){vid.pause();$('#player').classList.remove('on');if(S.gps)armSim()}
$('#pNext').onclick=advance;
vid.onplay=()=>{$('#vplay').innerHTML=ICO_PAUSE;$('#vplay').setAttribute('aria-label','Pause')};
vid.onpause=()=>{$('#vplay').innerHTML=ICO_PLAY;$('#vplay').setAttribute('aria-label','Play')};
vid.ontimeupdate=()=>{if(seeking)return;const d=vid.duration||0;$('#vfill').style.width=d?(vid.currentTime/d*100)+'%':'0';$('#vt1').textContent=mmss(vid.currentTime);$('#vt2').textContent=mmss(d)};
vid.onended=()=>{S.done.add(S.i);const l=stops(),last=S.i===l.length-1;
 $('#vendStop').textContent=l[S.i].t;$('#vendNext').textContent=last?'End of tour · Back to map':'Next stop ›';
 $('#vend').classList.add('on');$('#vctls').classList.remove('on');render()};
$('#vplay').onclick=e=>{e.stopPropagation();vid.paused?vid.play():vid.pause();showCtls()};
let seeking=false;
function seekTo(clientX){const r=$('#vtrack').getBoundingClientRect(),f=Math.min(1,Math.max(0,(clientX-r.left)/r.width));
 $('#vfill').style.width=f*100+'%';if(vid.duration){vid.currentTime=f*vid.duration;$('#vt1').textContent=mmss(vid.currentTime)}}
$('#vtrack').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();seeking=true;clearTimeout(S.ctlT);$('#vctls').classList.add('on');$('#vtrack').setPointerCapture(e.pointerId);seekTo(e.clientX)});
$('#vtrack').addEventListener('pointermove',e=>{if(seeking){e.preventDefault();seekTo(e.clientX)}});
$('#vtrack').addEventListener('pointerup',()=>{seeking=false;showCtls()});
$('#vtrack').addEventListener('pointercancel',()=>{seeking=false;showCtls()});
$('#vendAgain').onclick=()=>{$('#vend').classList.remove('on');vid.currentTime=0;vid.play()};
$('#vendNext').onclick=advance;
const fr=$('#frame');
fr.addEventListener('click',e=>{if(e.target.closest('.vplay,.vprog,.vend'))return;showCtls()});
['dragenter','dragover'].forEach(ev=>fr.addEventListener(ev,e=>{e.preventDefault();fr.classList.add('drag')}));
['dragleave','drop'].forEach(ev=>fr.addEventListener(ev,e=>{e.preventDefault();fr.classList.remove('drag')}));
fr.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(!f||!f.type.startsWith('video'))return snack('Drop a video file');
 $('#vend').classList.remove('on');vid.src=URL.createObjectURL(f);fr.classList.add('has');vid.play()});

/* ---- ITINERARY ---- */
function backHome(){vid.pause();$('#player').classList.remove('on');closeSheets();
 S.gps=false;$('#gpsBtn').classList.remove('on');$('#gpsLbl').textContent='Enable GPS';
 clearTimeout(S.simT);if(S.geoW!=null){navigator.geolocation.clearWatch(S.geoW);S.geoW=null}
 if(S.map){S.map.remove();S.map=null}go('home')}
$('#tBack').onclick=backHome;$('#cityBtn').onclick=backHome;
$('#itinBtn').onclick=()=>{buildItin();$('#itinTitle').textContent=TOURS[S.city].name;openSheet('shItin')};
function buildItin(){const l=stops();
 $('#itinList').innerHTML=l.map((s,n)=>`<button class="istop ${n===S.i?'cur':''} ${S.done.has(n)?'done':''}" data-n="${n}"><span class="num">${s.num}</span><span><span class="t">${s.t}</span><span class="s">${s.p}</span></span></button>`).join('');
 $$('#itinList .istop').forEach(b=>b.onclick=()=>{S.i=+b.dataset.n;closeSheets();render()})}

/* ---- CHAT ---- */
$('#chatBtn').onclick=()=>{const g=guide(),s=stops()[S.i];
 $('#chatBody').innerHTML=`<div class="msg g">${CHAT[g.id][0]}</div><div class="msg g">We are standing at <b>${s.t}</b>. What would you like to know?</div>`;
 $('#chatChips').innerHTML=CHIPS[g.id].map(c=>`<button>${c}</button>`).join('');
 $$('#chatChips button').forEach(b=>b.onclick=()=>say(b.textContent));
 openSheet('shChat')};
function say(txt){const g=guide(),b=$('#chatBody');
 b.insertAdjacentHTML('beforeend',`<div class="msg u">${txt}</div>`);
 setTimeout(()=>{const r=REPLY[g.id][Math.floor(Math.random()*REPLY[g.id].length)];
  b.insertAdjacentHTML('beforeend',`<div class="msg g">${r}</div>`);b.parentElement.scrollTop=b.parentElement.scrollHeight},600);
 b.parentElement.scrollTop=b.parentElement.scrollHeight}
$('#chatSend').onclick=()=>{const i=$('#chatIn');if(i.value.trim()){say(i.value.trim());i.value=''}};
$('#chatIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('#chatSend').click()});

/* ---- FLAG ---- */
$('#flagBtn').onclick=()=>{const l=stops();
 $('#flagStop').innerHTML=l.map((s,n)=>`<option value="${n}"${n===S.i?' selected':''}>${s.num} · ${s.t}</option>`).join('');
 $('#flagTxt').value='';openSheet('shFlag')};
$('#flagSend').onclick=()=>{closeSheets();snack('Report sent. Thank you.',3200)};
