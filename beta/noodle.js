/* ===========================================================================
   SLURP HOUSE — a noodle-stand rhythm game in the Lower Market.
   Ingredients fall down 4 lanes to the beat of an original lo-fi funk track;
   tap them as they hit the ring above the bowl to build the perfect ramen.
   =========================================================================== */
(function(){
const ND=window.ND={};
const LANES=[{e:'🍜',n:'NOODLES',c:'#ffd23f',k:'d'},{e:'🥚',n:'EGG',c:'#ffb070',k:'f'},{e:'🌿',n:'SCALLION',c:'#7dff6b',k:'j'},{e:'🍥',n:'FISH CAKE',c:'#ff7ac8',k:'k'}];
const BPM=92,BAR=4*60/BPM,E8=BAR/8,LEN=24;
const PH=[null,
 [[0,72],[2,74],[3,76],[4,79],[6,76]],[[0,74],[2,72],[4,69],[5,71],[6,72]],[[0,76],[1,77],[2,76],[4,74],[6,72],[7,74]],[[0,72],[4,67],[6,69]],
 [[0,79],[2,81],[4,79],[6,77]],[[0,76],[2,74],[3,76],[4,72],[6,74],[7,76]],[[0,77],[1,79],[2,81],[4,84],[6,81]],[[0,79],[3,76],[4,74],[6,72]]];
const PLAN=[0,0,1,2,3,4,1,2,3,4,5,6,7,8,5,6,7,8,1,2,3,4,9,0];
const CH=[[65,69,72,76],[64,67,71,74],[62,65,69,72],[60,64,67,71]],BASS=[41,40,38,36];
const laneOf=p=>Math.max(0,Math.min(3,Math.floor((p-67)/4.5)));
let root=null,diff='mild',notes=[],evq=[],t0=0,sch=0,score=0,combo=0,maxc=0,hits={p:0,g:0,m:0},pops=[],bowl=[],flashL=[0,0,0,0],steam=[],done=false,fall=1.8,endAt=0;
let useA=false;const clk=()=>useA?AU.ctx.currentTime:performance.now()/1000,now=()=>clk()-t0;

/* ---------- song + chart ---------- */
function build(){notes=[];evq=[];
 PLAN.forEach((ph,bar)=>{const bt=bar*BAR;
  // drums, chords, bass every bar (intro + outro softer)
  for(let s=0;s<8;s++){const tt=bt+s*E8;if(s===0||s===5)evq.push([tt,'k']);if(s===2||s===6)evq.push([tt,'s']);evq.push([tt,'h',s%2]);}
  evq.push([bt,'c',bar%4]);evq.push([bt,'b',bar%4]);evq.push([bt+E8*3,'b2',bar%4]);
  if(ph===9){notes.push({t:bt,l:laneOf(72),p:72});evq.push([bt,'m',72,6]);return}
  if(!ph)return;
  for(const[pos,p]of PH[ph]){const tt=bt+pos*E8;evq.push([tt,'m',p,1]);if(diff==='mild'&&pos%2)continue;notes.push({t:tt,l:laneOf(p),p})}});
 evq.sort((a,b)=>a[0]-b[0]);endAt=LEN*BAR+.6}
function play(e,at){if(!AU.ctx)return;const v=S.set.mus?1:0;if(!v)return;
 switch(e[1]){case'k':AU.kick(at,.7);break;case's':AU.snare(at,.18);AU.clap(at,.08,.3);break;case'h':AU.hat(at,e[2]?.02:.03);break;
  case'c':AU.ep(CH[e[2]],at,BAR*.95,.035);break;case'b':AU.osc(mtof(BASS[e[2]]),at,E8*2.6,{type:'sine',v:.2});break;case'b2':AU.osc(mtof(BASS[e[2]]+7),at,E8*1.6,{type:'sine',v:.14});break;
  case'm':AU.osc(mtof(e[2]),at,E8*(e[3]||1)*.9,{type:'triangle',v:.075,a:.006,rv:.35});AU.osc(mtof(e[2]+12),at,E8*.4,{type:'sine',v:.025,a:.003});break}}

/* ---------- input ---------- */
function hit(l){if(done)return;flashL[l]=1;const n=now();let best=null,bd=.2;for(const q of notes)if(!q.h&&q.l===l){const d=Math.abs(q.t-n);if(d<bd){bd=d;best=q}}
 if(!best){combo=0;pops.push({t:'MISS',c:'#ff3355',l,life:1});return}
 best.h=1;const perfect=bd<=.065;combo++;maxc=Math.max(maxc,combo);const mult=1+Math.min(1,combo/50);score+=Math.round((perfect?300:120)*mult);perfect?hits.p++:hits.g++;
 pops.push({t:perfect?'PERFECT':'GOOD',c:perfect?'#ffd23f':'#19f3ff',l,life:1});bowl.push({l,x:(Math.random()-.5)*.7,y:(Math.random()-.5)*.35,r:Math.random()*6});if(bowl.length>60)bowl.shift();
 for(let i=0;i<3;i++)steam.push({x:(Math.random()-.5)*60,y:0,a:.5,r:8+Math.random()*8});buzz(perfect?12:6)}

/* ---------- frame ---------- */
ND.frame=dt=>{const c=ctx;if(!done&&useA){const horizon=AU.ctx.currentTime+.25;while(sch<evq.length&&t0+evq[sch][0]<horizon){play(evq[sch],t0+evq[sch][0]);sch++}}
 const n=now();for(const q of notes)if(!q.h&&!q.m&&n-q.t>.2){q.m=1;hits.m++;combo=0;pops.push({t:'MISS',c:'#ff3355',l:q.l,life:1})}
 if(!done&&n>endAt){done=true;setTimeout(results,700)}
 for(let i=0;i<4;i++)flashL[i]=Math.max(0,flashL[i]-dt*5);for(const p of pops)p.life-=dt*1.6;pops=pops.filter(p=>p.life>0);
 for(const s of steam){s.y+=dt*40;s.a-=dt*.35;s.r+=dt*10}steam=steam.filter(s=>s.a>0);if(Math.random()<dt*4)steam.push({x:(Math.random()-.5)*50,y:0,a:.25,r:10});
 draw(c,n)};
function geo(){const ctrl=root?root.querySelector('.ndc').getBoundingClientRect().top:H-120,lw=Math.min(W*.92,460),x0=(W-lw)/2,hitY=ctrl-118,top=SAT+120;return{lw,x0,hitY,top,ctrl}}
function draw(c,n){const g0=geo(),{lw,x0,hitY,top}=g0,t=n;
 // shop interior
 let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0610');g.addColorStop(.5,'#3a0e18');g.addColorStop(1,'#120408');c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='rgba(255,140,60,.05)';for(let x=0;x<W;x+=28)c.fillRect(x,0,14,H);
 for(let i=0;i<5;i++){const lx=(i+.5)*W/5,ly=SAT+70+Math.sin(t*1.5+i)*3,lg=c.createRadialGradient(lx,ly,0,lx,ly,40);lg.addColorStop(0,'rgba(255,90,60,.45)');lg.addColorStop(1,'rgba(255,90,60,0)');c.fillStyle=lg;c.fillRect(lx-40,ly-40,80,80);c.fillStyle='#ff4a3a';c.beginPath();c.ellipse(lx,ly,11,14,0,0,TAU);c.fill();c.fillStyle='#ffd0a0';c.fillRect(lx-9,ly-1,18,2)}
 c.save();c.font='900 22px Orbitron,sans-serif';c.textAlign='center';c.shadowColor='#ff7a20';c.shadowBlur=18;c.fillStyle='#ffe0c0';c.fillText('SLURP HOUSE',W/2,SAT+108);c.restore();
 // lanes
 const lw4=lw/4;for(let i=0;i<4;i++){const lx=x0+i*lw4,L=LANES[i];g=c.createLinearGradient(0,top,0,hitY);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,rgba(L.c,.12+flashL[i]*.25));c.fillStyle=g;c.fillRect(lx+3,top,lw4-6,hitY-top+30);
  c.strokeStyle=rgba(L.c,.25);c.lineWidth=1;c.strokeRect(lx+3.5,top,lw4-7,hitY-top+30)}
 // beat lines
 const beat=60/BPM;for(let b=Math.ceil(t/beat);b<(t+fall)/beat;b++){const y=hitY-(b*beat-t)/fall*(hitY-top);c.fillStyle=b%4?'rgba(255,255,255,.05)':'rgba(255,200,150,.14)';c.fillRect(x0,y,lw,b%4?1:2)}
 // hit ring row
 for(let i=0;i<4;i++){const cx=x0+(i+.5)*lw4,L=LANES[i],r=Math.min(30,lw4*.36);c.strokeStyle=L.c;c.lineWidth=3+flashL[i]*3;c.shadowColor=L.c;c.shadowBlur=10+flashL[i]*20;c.beginPath();c.arc(cx,hitY,r,0,TAU);c.stroke();c.shadowBlur=0}
 // notes
 c.textAlign='center';c.textBaseline='middle';for(const q of notes){if(q.h)continue;const dtq=q.t-t;if(dtq>fall||dtq<-.25)continue;const y=hitY-dtq/fall*(hitY-top),cx=x0+(q.l+.5)*lw4,L=LANES[q.l],r=Math.min(26,lw4*.31);
  c.globalAlpha=q.m?.3:1;const ng=c.createRadialGradient(cx,y,0,cx,y,r*1.6);ng.addColorStop(0,rgba(L.c,.55));ng.addColorStop(1,rgba(L.c,0));c.fillStyle=ng;c.fillRect(cx-r*1.6,y-r*1.6,r*3.2,r*3.2);
  c.fillStyle='#1a0810';c.beginPath();c.arc(cx,y,r,0,TAU);c.fill();c.strokeStyle=L.c;c.lineWidth=2.5;c.stroke();c.font=`${Math.round(r*1.15)}px serif`;c.fillText(L.e,cx,y+1);c.globalAlpha=1}
 c.textBaseline='alphabetic';
 // bowl
 const bx=W/2,by=hitY+76,bw=Math.min(150,lw*.36);c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(bx,by+44,bw*1.05,10,0,0,TAU);c.fill();
 g=c.createLinearGradient(0,by,0,by+44);g.addColorStop(0,'#e8e0f0');g.addColorStop(1,'#9a90b0');c.fillStyle=g;c.beginPath();c.moveTo(bx-bw,by);c.quadraticCurveTo(bx-bw*.9,by+44,bx,by+44);c.quadraticCurveTo(bx+bw*.9,by+44,bx+bw,by);c.closePath();c.fill();
 c.fillStyle='#ff3355';c.fillRect(bx-bw*.8,by+12,bw*1.6,4);c.fillStyle='#c8662a';c.beginPath();c.ellipse(bx,by,bw,16,0,0,TAU);c.fill();c.fillStyle='rgba(255,200,120,.35)';c.beginPath();c.ellipse(bx-bw*.2,by-3,bw*.5,5,0,0,TAU);c.fill();
 c.font='18px serif';c.textAlign='center';for(const b of bowl){c.save();c.translate(bx+b.x*bw,by+b.y*14);c.rotate(b.r);c.fillText(LANES[b.l].e,0,6);c.restore()}
 for(const s of steam){c.fillStyle=`rgba(255,240,230,${s.a*.5})`;c.beginPath();c.arc(bx+s.x+Math.sin(t*2+s.r)*6,by-10-s.y,s.r,0,TAU);c.fill()}
 // judgements
 for(const p of pops){const cx=x0+(p.l+.5)*lw4;c.globalAlpha=Math.min(1,p.life*1.5);c.font='900 14px Orbitron,sans-serif';c.fillStyle=p.c;c.shadowColor=p.c;c.shadowBlur=10;c.fillText(p.t,cx,hitY-40-(1-p.life)*30);c.shadowBlur=0}c.globalAlpha=1;
 // HUD
 c.textAlign='left';c.font='700 13px Orbitron,sans-serif';c.fillStyle='#ffe0c0';c.fillText('SCORE '+score.toLocaleString(),14,SAT+40);
 c.textAlign='center';if(combo>=5){c.font='900 26px Orbitron,sans-serif';c.fillStyle='#ffd23f';c.shadowColor='#ff7a20';c.shadowBlur=14;c.fillText(combo+' COMBO',W/2,top+40);c.shadowBlur=0}
 const cnt=Math.ceil((2*BAR-t)/(60/BPM));if(t<2*BAR&&t>0){c.font='900 46px Orbitron,sans-serif';c.fillStyle='#fff';c.shadowColor='#ff7a20';c.shadowBlur=20;c.fillText(cnt>4?'READY':String(cnt>0?cnt:'GO!'),W/2,top+(hitY-top)*.45);c.shadowBlur=0}
 const pr=Math.min(1,t/endAt);c.fillStyle='rgba(255,255,255,.12)';c.fillRect(14,SAT+50,W-28,4);c.fillStyle='#ff7a20';c.fillRect(14,SAT+50,(W-28)*pr,4)}

/* ---------- screens ---------- */
function controls(){if(root)root.remove();root=document.createElement('div');root.id='nd';
 root.innerHTML=`<style>#nd{position:fixed;inset:0;z-index:4;pointer-events:none}#nd button{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;color:#fff;font:700 14px Rajdhani,system-ui,sans-serif}
 #nd .ndq{position:absolute;top:calc(var(--sat) + 10px);right:12px;min-height:40px;padding:0 14px;background:rgba(30,8,14,.85);border:2px solid #ff7a20aa;border-radius:12px;letter-spacing:.08em}
 #nd .ndc{position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:min(92vw,460px);display:flex;gap:8px;padding:8px 0 calc(var(--sab) + 12px)}
 #nd .ndc button{flex:1;height:84px;border-radius:16px;background:rgba(26,8,16,.9);border:3px solid var(--lc);font-size:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 0 14px color-mix(in srgb,var(--lc) 40%,transparent)}
 #nd .ndc button span{font-size:10px;letter-spacing:.1em;color:var(--lc)}#nd .ndc button.dn{background:var(--lc);transform:scale(.96)}</style>
 <button class=ndq>✕ LEAVE</button><div class=ndc>${LANES.map((L,i)=>`<button data-l=${i} style="--lc:${L.c}">${L.e}<span>${L.n}</span></button>`).join('')}</div>`;
 document.body.appendChild(root);root.querySelector('.ndq').addEventListener('click',()=>ND.exit());
 root.querySelectorAll('[data-l]').forEach(b=>{const l=+b.dataset.l;b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('dn');hit(l)});['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,()=>b.classList.remove('dn')))})}
function results(){if(mode!=='noodle')return;const tot=notes.length,acc=tot?(hits.p+hits.g*.6)/tot:0,gr=acc>=.95?'S':acc>=.85?'A':acc>=.7?'B':acc>=.5?'C':'D',pay=Math.round(({S:2000,A:1200,B:700,C:300,D:100})[gr]*(diff==='mild'?.5:1));
 S.cr+=pay;const k='noodle_'+diff;S.nbest=S.nbest||{};const best=S.nbest[k]||0,nb=score>best;if(nb)S.nbest[k]=score;save();AU.sfx(gr<'C'?'win':'cash');
 if(root)root.style.display='none';const msg={S:'Perfect bowl. The chef cried a little.',A:'Great bowl. Customers are lining up.',B:'Solid ramen. Nobody complained out loud.',C:'It is… soup. Technically.',D:'You made a puddle. With noodles in it.'}[gr];
 show(`<div class=kick style="color:#ff7a20">SLURP HOUSE // ORDER UP</div><h2 style="font-size:56px;margin:4px 0">${gr}</h2><p class=lead style="font-size:16px">${msg}</p>
 <div class=term><div>&gt; Score: ${score.toLocaleString()}${nb?' <span class=gr>NEW BEST!</span>':''}</div><div>&gt; Perfect ${hits.p} · Good ${hits.g} · Miss ${hits.m}</div><div>&gt; Best combo: ${maxc}</div><div class=gr>&gt; Tip jar: +${money(pay)}</div></div>${crPill()}
 <button class="btn wide" data-a=ndAgain>Cook again</button><button class="btn ghost wide" data-a=ndExit>Back to the market</button>`)}
ND.menu=()=>{mode='hubshop';AU.play('lounge');const b=S.nbest||{};
 show(`<div class=kick style="color:#ff7a20">LOWER MARKET // SLURP HOUSE</div><h2>Slurp House</h2>${crPill()}
 <p class=lead style="font-size:16px">The chef needs a hand. Ingredients drop to the beat. Tap each one as it hits the ring above the bowl.</p>
 <div class=term><div>🍜 NOODLES · 🥚 EGG · 🌿 SCALLION · 🍥 FISH CAKE</div><div>&gt; Perfect timing = bigger tips. Keep the combo going.</div><div class=mu2>&gt; Keyboard: D F J K</div></div>
 <div class="card tap" data-a=ndGo data-v=mild><h3>Mild</h3><span class=tag>TIPS ×½</span><p>On the beat only. Best: ${(b.noodle_mild||0).toLocaleString()}</p></div>
 <div class="card tap" data-a=ndGo data-v=spicy><h3>Spicy 🌶</h3><span class=tag>FULL TIPS</span><p>Every note in the tune. Best: ${(b.noodle_spicy||0).toLocaleString()}</p></div>
 <button class="btn ghost wide" data-a=hub>Back to the market</button>`)};
ND.start=d=>{diff=d;fall=d==='mild'?2:1.65;mode='noodle';hideUI();setHud(false);AU.play('none');AU.resume&&AU.resume();build();score=0;combo=0;maxc=0;hits={p:0,g:0,m:0};pops=[];bowl=[];steam=[];done=false;sch=0;
 useA=!!(AU.ctx&&AU.ctx.state==='running');t0=clk()+.4;controls()};
ND.exit=()=>{done=true;if(root){root.remove();root=null}AU.play('hub');scrHub()};
ACT.ndGo=v=>ND.start(v);ACT.ndAgain=()=>{hideUI();ND.start(diff)};ACT.ndExit=()=>ND.exit();
addEventListener('keydown',e=>{if(mode!=='noodle'||e.repeat)return;const i=LANES.findIndex(L=>L.k===e.key.toLowerCase());if(i>=0){hit(i);const b=root&&root.querySelector(`[data-l="${i}"]`);if(b){b.classList.add('dn');setTimeout(()=>b.classList.remove('dn'),90)}}});
ND._dbg=()=>({notes:notes.length,score,hits,combo,t:now(),endAt});ND._auto=()=>{for(const q of notes)if(!q.h&&Math.abs(q.t-now())<.04)hit(q.l)};
})();
