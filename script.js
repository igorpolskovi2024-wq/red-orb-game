const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const toast = document.getElementById("toast");

const W = canvas.width, H = canvas.height;
const keys = { left:false, right:false, jump:false };
let state = "menu", score = 0, level = 0, camera = 0, last = 0, soundOn = true;
let platforms = [], spikes = [], stars = [], particles = [], goal = 0;
const player = { x:70, y:390, vx:0, vy:0, r:19, grounded:false, alive:true, spawnX:70, spawnY:390 };

const maps = [
  { length:1800, platforms:[[0,470,430,70],[500,420,190,28],[760,365,190,28],[1030,430,230,28],[1340,370,180,28],[1580,470,260,70]], spikes:[[350,450,55,20],[680,400,45,20],[950,345,50,20],[1255,410,50,20],[1510,350,45,20]], stars:[[250,400],[580,360],[835,305],[1110,370],[1410,310],[1660,420]] },
  { length:2050, platforms:[[0,470,300,70],[390,425,190,28],[660,365,170,28],[920,420,180,28],[1190,350,190,28],[1480,410,180,28],[1750,470,300,70]], spikes:[[260,450,70,20],[580,405,55,20],[830,345,60,20],[1100,400,60,20],[1390,330,60,20],[1650,390,65,20]], stars:[[170,410],[460,365],[725,305],[990,360],[1270,290],[1550,350],[1850,420]] },
  { length:2250, platforms:[[0,470,280,70],[370,410,170,28],[620,345,170,28],[880,405,170,28],[1140,335,170,28],[1400,395,170,28],[1660,330,180,28],[1950,470,300,70]], spikes:[[240,450,75,20],[530,390,55,20],[790,325,60,20],[1050,385,60,20],[1310,315,60,20],[1570,375,60,20],[1840,450,65,20]], stars:[[150,410],[450,350],[700,285],[960,345],[1220,275],[1480,335],[1740,270],[2070,420]] }
];

function loadLevel(n) {
  const m = maps[n];
  platforms = m.platforms.map(a=>({x:a[0],y:a[1],w:a[2],h:a[3]}));
  spikes = m.spikes.map(a=>({x:a[0],y:a[1],w:a[2],h:a[3]}));
  stars = m.stars.map(a=>({x:a[0],y:a[1],taken:false}));
  goal = m.length - 100; camera = 0;
  player.x=70; player.y=390; player.vx=0; player.vy=0; player.alive=true;
  player.spawnX=70; player.spawnY=390;
  levelEl.textContent = n+1;
}
function showToast(t) { toast.textContent=t; toast.classList.add("show"); setTimeout(()=>toast.classList.remove("show"),1100); }
function startGame() { score=0; scoreEl.textContent=score; level=0; loadLevel(level); state="play"; overlay.classList.add("hidden"); }
startBtn.addEventListener("click", ()=> {
  if (state==="menu" || state==="over" || state==="dead" || state==="win") startGame();
  else nextLevel();
});

function nextLevel() {
  if (level < maps.length-1) { level++; loadLevel(level); state="play"; overlay.classList.add("hidden"); showToast("Уровень "+(level+1)+" — вперёд!"); }
  else { state="win"; overlayTitle.textContent="ТЫ СПРАВИЛСЯ!"; overlayText.textContent="Все уровни пройдены. Звёзд собрано: "+score; startBtn.textContent="Играть снова →"; overlay.classList.remove("hidden"); }
}
function fail() { if (!player.alive) return; player.alive=false; state="dead"; overlayTitle.textContent="ОЙ!"; overlayText.textContent="Шипы — опасные штуки. Попробуем ещё раз?"; startBtn.textContent="Повторить →"; overlay.classList.remove("hidden"); }

function keySet(e, down) {
  const k=e.key.toLowerCase();
  if (["arrowleft","arrowright","arrowup"," ","a","d","w"].includes(k)) e.preventDefault();
  if (k==="arrowleft"||k==="a") keys.left=down;
  if (k==="arrowright"||k==="d") keys.right=down;
  if (k==="arrowup"||k==="w"||k===" ") keys.jump=down;
}
window.addEventListener("keydown",e=>keySet(e,true));
window.addEventListener("keyup",e=>keySet(e,false));
function bindHold(id,key) {
  const el=document.getElementById(id);
  const on=e=>{e.preventDefault();keys[key]=true;};
  const off=e=>{e.preventDefault();keys[key]=false;};
  el.addEventListener("pointerdown",e=>{ el.classList.add("active"); on(e); });
  const release=e=>{ el.classList.remove("active"); off(e); };
  el.addEventListener("pointerup",release);
  el.addEventListener("pointerleave",release);
  el.addEventListener("pointercancel",release);
  el.addEventListener("contextmenu",e=>e.preventDefault());
}
bindHold("leftBtn","left"); bindHold("rightBtn","right"); bindHold("jumpBtn","jump");
document.getElementById("soundBtn").addEventListener("click",e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?"♫":"♪";showToast(soundOn?"Звук включён":"Звук выключен");});

function update(dt) {
  if(state!=="play") return;
  const accel=0.58, max=5.4;
  if(keys.left) player.vx-=accel*dt*60;
  if(keys.right) player.vx+=accel*dt*60;
  if(!keys.left&&!keys.right) player.vx*=Math.pow(.82,dt*60);
  player.vx=Math.max(-max,Math.min(max,player.vx));
  if(keys.jump && player.grounded) { player.vy=-11.8; player.grounded=false; }
  player.vy+=0.52*dt*60;
  player.x+=player.vx*dt*60;
  player.y+=player.vy*dt*60;
  player.grounded=false;
  for(const p of platforms) {
    if(player.vy>=0 && player.x+player.r>p.x && player.x-player.r<p.x+p.w &&
       player.y+player.r>=p.y && player.y+player.r-player.vy*dt*60<=p.y+8) {
      player.y=p.y-player.r; player.vy=0; player.grounded=true;
    }
  }
  if(player.x<player.r) {player.x=player.r;player.vx=0;}
  if(player.y>H+100) fail();
  for(const s of spikes) {
    if(player.x+player.r-5>s.x && player.x-player.r+5<s.x+s.w &&
       player.y+player.r-5>s.y && player.y-player.r+5<s.y+s.h) fail();
  }
  for(const st of stars) if(!st.taken && Math.hypot(player.x-st.x,player.y-st.y)<31) {
    st.taken=true; score+=10; scoreEl.textContent=score; burst(st.x,st.y,"#ffe27a");
  }
  if(player.x>=goal) {state="leveldone";overlayTitle.textContent="УРОВЕНЬ ПРОЙДЕН!";overlayText.textContent="Отлично! Готов к следующему испытанию?";startBtn.textContent=level===maps.length-1?"Завершить игру →":"Следующий уровень →";overlay.classList.remove("hidden");}
  camera=Math.max(0,Math.min(goal-W+120,player.x- W*.36));
  particles=particles.filter(p=>p.life>0);
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.life--;});
}
function burst(x,y,color) { for(let i=0;i<9;i++) particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:25,color}); }

function drawBackground() {
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#8bd8d0");g.addColorStop(1,"#d5efcf");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // distant hills
  for(let i=0;i<6;i++){let x=((i*230-camera*.22)%1500)-100;ctx.fillStyle=i%2?"#80c9b4":"#72bca8";ctx.beginPath();ctx.ellipse(x,480,190,120,0,Math.PI,Math.PI*2);ctx.fill();}
  // clouds
  for(let i=0;i<7;i++){let x=((i*210-camera*.12)%1300)-50;ctx.fillStyle="#ffffff75";ctx.beginPath();ctx.arc(x,90+(i%3)*35,24,0,7);ctx.arc(x+25,85+(i%3)*35,31,0,7);ctx.arc(x+55,96+(i%3)*35,22,0,7);ctx.fill();}
}
function roundRect(x,y,w,h,r,color) {ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function draw() {
  drawBackground();ctx.save();ctx.translate(-camera,0);
  // platforms
  for(const p of platforms){roundRect(p.x,p.y,p.w,p.h,9,"#397d68");roundRect(p.x,p.y,p.w,10,6,"#76c98e");}
  // spikes
  for(const s of spikes){ctx.fillStyle="#e95b61";ctx.beginPath();let count=Math.max(2,Math.floor(s.w/18));for(let i=0;i<count;i++){let x=s.x+i*s.w/count;ctx.moveTo(x,s.y+s.h);ctx.lineTo(x+s.w/count/2,s.y);ctx.lineTo(x+s.w/count,s.y+s.h);}ctx.fill();}
  // stars
  for(const st of stars) if(!st.taken){ctx.save();ctx.translate(st.x,st.y);ctx.rotate(performance.now()/900);ctx.fillStyle="#ffca55";ctx.strokeStyle="#fff2b4";ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,r=i%2?7:15;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  // finish flag
  ctx.fillStyle="#426b66";ctx.fillRect(goal,385,6,85);ctx.fillStyle="#ff625d";ctx.beginPath();ctx.moveTo(goal+6,387);ctx.lineTo(goal+52,402);ctx.lineTo(goal+6,418);ctx.fill();
  // player shadow and orb
  ctx.fillStyle="#24594c55";ctx.beginPath();ctx.ellipse(player.x,player.y+player.r+5,player.r*1.1,6,0,0,7);ctx.fill();
  const orb=ctx.createRadialGradient(player.x-8,player.y-10,2,player.x,player.y,player.r+4);orb.addColorStop(0,"#ffb0a2");orb.addColorStop(.35,"#ff625b");orb.addColorStop(1,"#cf303e");
  ctx.fillStyle=orb;ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();
  ctx.fillStyle="#ffffffaa";ctx.beginPath();ctx.ellipse(player.x-7,player.y-9,5,3,-.5,0,7);ctx.fill();
  ctx.fillStyle="#7b2733";ctx.beginPath();ctx.arc(player.x+6,player.y-2,2.3,0,7);ctx.fill();
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/25);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fill();ctx.globalAlpha=1;}
  ctx.restore();
  // progress line
  roundRect(22,18,W-44,5,3,"#ffffff66");roundRect(22,18,(W-44)*Math.min(1,player.x/goal),5,3,"#ff665f");
}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop);}
loadLevel(0); requestAnimationFrame(loop);
