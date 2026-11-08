/* ===========================================================================
   NINJA ALLEY — a sandbox brawler off the Spaceport Bravo street.
   Built on Maximus's Dummy Arena: same physics, same weapon set, plus a
   broom and pudding packets. Survive 3 waves for ¥8,000, or leave any time.
   =========================================================================== */
(function(){
const NJ=window.NJ={};
const WPN={fist:['✊','Fists'],bat:['🏏','Bat'],sword:['⚔️','Katana'],hammer:['🔨','Hammer'],broom:['🧹','Broom'],pudding:['🍮','Pudding packets'],
 pistol:['🔫','Pistol'],shotgun:['💥','Shotgun'],rocket:['🚀','Rocket launcher'],flame:['🔥','Flamethrower (hold)'],ice:['❄️','Freeze ray'],
 bolt:['⚡','Chain lightning'],hole:['🌀','Black hole'],grab:['✋','Telekinesis (drag a ninja)']};
const CDN={fist:14,bat:22,sword:20,hammer:42,broom:24,pudding:16,pistol:11,shotgun:42,rocket:55,ice:25,bolt:35,hole:70};
const WAVES=[{blade:4,star:0,boss:0},{blade:4,star:2,boss:0},{blade:5,star:3,boss:1}];
const R2=()=>Math.random()<.5,Rn=Math.random,clp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU2=Math.PI*2;
let s=1,VW=420,VH=600,GY=440,P,ds=[],ps=[],fx=[],bl=[],hs=[],goo=[],rain=[],wp='fist',kills=0,wave=0,shake=0,t=0,acc=0,grab=null,
 ptr={x:0,y:0,down:false},keysN={l:0,r:0,j:0},state='intro',st=0,spawnQ=[],nextFlash=6,flash=0,bolt=null,bg=null,bgKey='',root=null,paid=false;

/* ---------- music: original 70s kung-fu funk (slap bass, wah, horn stabs) ---------- */
TRACKS.kungfu={bpm:104,swing:.14,
 bass:[[0,40],[3,40],[4,52],[6,40],[8,43],[10,45],[11,40],[14,50],[15,52]],
 lead:[[0,76,3],[3,79,2],[6,76,2],[8,74,4],[12,71,2],[14,74,2],[16,76,6],[24,79,2],[26,81,2],[28,79,4]],
 step(a,i,tt,sp){const st=i%16,bar=(i>>4)%4,sec=(i>>6)%2,tr=bar===2?5:bar===3?3:0;
  if(st===0||st===7||st===10)a.kick(tt,.8);if(st===4||st===12)a.snare(tt,.28);if(st===15&&bar===3)a.snare(tt,.18);
  a.hat(tt,st%2?.02:.035,st===14);
  for(const[k,n]of this.bass)if(k===st){a.osc(mtof(n+tr),tt,sp*(n>=50?.6:1.3),{type:'square',v:.11,cut:1400,cutTo:260,cs:.35,q:3});a.osc(mtof(n+tr-12),tt,sp*1.2,{type:'sine',v:.16})}
  if(st%2===1){const ch=[64,67,71,74].map(n=>n+tr),cut=500+1700*(.5+.5*Math.sin(i*.55));ch.forEach(n=>a.osc(mtof(n),tt,sp*.55,{type:'sawtooth',v:.018,cut,q:7,a:.002}))}
  if((bar===1||bar===3)&&(st===6||st===7)){[71,74,76].forEach(n=>a.osc(mtof(n+tr),tt,sp*(st===7?2.2:.5),{type:'sawtooth',v:.03,cut:2200,a:.015,rv:.3}))}
  if(sec===1){const k=(i%32);for(const[q,n,d]of this.lead)if(q===k)a.osc(mtof(n+(bar>=2?tr:0)),tt,sp*d,{type:'square',v:.035,cut:2600,a:.01,vib:18,vr:6,rv:.4})}}};

/* ---------- sound bits ---------- */
const A=()=>AU.ctx&&AU.ctx.state==='running'&&S.set.sfx;
function swish(){if(!A())return;AU.noise(AU.ctx.currentTime,.12,{ft:'bandpass',f:1800,fTo:500,v:.12,out:AU.fx})}
function thunder(){if(!A())return;const c=AU.ctx.currentTime;AU.noise(c,.08,{ft:'highpass',f:2000,v:.35,out:AU.fx});AU.noise(c+.05,2.2,{ft:'lowpass',f:500,fTo:50,v:.55,out:AU.fx});AU.osc(55,c+.05,1.6,{type:'sine',v:.25,to:30,out:AU.fx})}
function splat(){if(!A())return;AU.noise(AU.ctx.currentTime,.18,{ft:'lowpass',f:700,v:.25,out:AU.fx})}
function pew(f){if(!A())return;AU.osc(f||900,AU.ctx.currentTime,.09,{type:'square',v:.05,to:(f||900)/3,out:AU.fx})}

/* ---------- layout ---------- */
function layout(){s=Math.min(W/340,H/420);VW=W/s;VH=H/s;const c=root&&root.querySelector('.njc');const top=c?c.getBoundingClientRect().top:H-150;GY=Math.max(200,top/s-16)}

/* ---------- background: rainy alley at night ---------- */
function buildBG(){const key=W+'x'+H+'x'+Math.round(GY);if(bg&&bgKey===key)return;bgKey=key;bg=document.createElement('canvas');bg.width=Math.ceil(VW);bg.height=Math.ceil(VH);const b=bg.getContext('2d');
 let g=b.createLinearGradient(0,0,0,GY);g.addColorStop(0,'#05030f');g.addColorStop(.6,'#140a2a');g.addColorStop(1,'#2a0f30');b.fillStyle=g;b.fillRect(0,0,VW,VH);
 // far skyline
 b.fillStyle='#0b0718';for(let x=-20;x<VW;x+=rnd(30,70)){const h=rnd(60,200);b.fillRect(x,GY-h-120,rnd(28,60),h+120)}
 // back wall bricks
 const wt=GY-Math.min(GY*.8,360);g=b.createLinearGradient(0,wt,0,GY);g.addColorStop(0,'#1a1026');g.addColorStop(1,'#2c1a2e');b.fillStyle=g;b.fillRect(0,wt,VW,GY-wt);
 for(let y=wt;y<GY;y+=12)for(let x=-((y/12)%2)*14;x<VW;x+=28){b.fillStyle=`rgba(255,180,200,${.02+Math.random()*.035})`;b.fillRect(x+1,y+1,26,10)}
 // doors, windows, fire escape
 for(let x=30;x<VW-40;x+=rnd(120,180)){const wy=wt+30;b.fillStyle='#ffd27a';b.globalAlpha=.75;b.fillRect(x,wy,34,44);b.globalAlpha=1;b.strokeStyle='#0a0612';b.lineWidth=4;b.strokeRect(x,wy,34,44);b.beginPath();b.moveTo(x+17,wy);b.lineTo(x+17,wy+44);b.stroke();
  b.strokeStyle='#3a2a44';b.lineWidth=3;b.strokeRect(x-12,wy+50,58,4);for(let k=0;k<5;k++){b.beginPath();b.moveTo(x-12+k*14,wy+50);b.lineTo(x-12+k*14,wy+62);b.stroke()}}
 // neon signs
 const signs=[['RAMEN','#ff2bd6'],['DOJO','#19f3ff'],['OPEN 25H','#ffd23f'],['NO NINJAS','#ff3355']];
 signs.forEach(([txt,c],i)=>{const x=(i+.5)*VW/signs.length,y=wt+130+(i%2)*40;b.save();b.font='900 18px Orbitron,sans-serif';b.textAlign='center';b.shadowColor=c;b.shadowBlur=18;b.fillStyle=c;b.fillText(txt,x,y);b.shadowBlur=0;b.strokeStyle=c;b.globalAlpha=.6;b.lineWidth=2;const w=b.measureText(txt).width+18;b.strokeRect(x-w/2,y-20,w,28);b.restore()});
 // dumpster + cans
 b.fillStyle='#1f3a2a';b.fillRect(VW*.72,GY-46,90,46);b.fillStyle='#163024';b.fillRect(VW*.72-4,GY-52,98,8);b.fillStyle='#2a2a34';b.fillRect(VW*.12,GY-34,26,34);b.fillRect(VW*.12+30,GY-28,22,28);
 // wet asphalt
 g=b.createLinearGradient(0,GY,0,VH);g.addColorStop(0,'#251a30');g.addColorStop(1,'#07050c');b.fillStyle=g;b.fillRect(0,GY,VW,VH-GY);
 b.globalAlpha=.25;signs.forEach(([,c],i)=>{const x=(i+.5)*VW/signs.length;const rg=b.createLinearGradient(0,GY,0,GY+60);rg.addColorStop(0,c);rg.addColorStop(1,'rgba(0,0,0,0)');b.fillStyle=rg;b.fillRect(x-30,GY,60,60)});b.globalAlpha=1;
 b.fillStyle='#0a0612';b.fillRect(0,GY-3,VW,5)}
const rnd=(a,b)=>a+Math.random()*(b-a);

/* ---------- entities (ported from Dummy Arena) ---------- */
function reset(){P={x:-30,y:GY,vx:0,vy:0,hp:100,face:1,sw:0,cd:0,inv:0,ph:0,ang:0,av:0,ground:true,dead:false};ds=[];ps=[];fx=[];bl=[];hs=[];goo=[];kills=0;wave=0;grab=null;spawnQ=[];state='intro';st=0;paid=false}
function spawnNinja(kind){const boss=kind==='boss',x=rnd(40,VW-40);ds.push({kind,x,y:-40-Rn()*80,vx:0,vy:4,hp:boss?320:kind==='star'?60:80,mx:boss?320:kind==='star'?60:80,sc:boss?1.2:.82,dmg:boss?16:8,
 ang:0,av:0,stun:0,frozen:0,burn:0,flash:0,cd:60+Rn()*40,pt:0,face:1,ground:false,dead:false,throwT:90+Rn()*60,ph:Rn()*6});part(x,40,10,'#9aa',6)}
function startWave(){wave++;const W_=WAVES[wave-1];spawnQ=[];for(let i=0;i<W_.blade;i++)spawnQ.push('blade');for(let i=0;i<W_.star;i++)spawnQ.push('star');spawnQ.sort(()=>Rn()-.5);if(W_.boss)spawnQ.push('boss');
 st=0;pop(VW/2,GY*.35,wave===3?'FINAL WAVE':'WAVE '+wave,'#ff2bd6',60);AU.sfx('warn');buzz([20,30,20])}
function part(x,y,n,col,sp,add,life){for(let i=0;i<n;i++){const l=(life||30)+Rn()*20;ps.push({x,y,vx:(Rn()-.5)*sp,vy:(Rn()-(add?.5:.8))*sp,life:l,max:l,col,s:2+Rn()*4,add})}}
function pop(x,y,txt,col,life){fx.push({t:'txt',x,y,txt,col:col||'#ffe066',life:life||35,big:!!life})}
function hurt(d,dmg,kx,ky){if(d.dead)return;if(d.frozen>0){dmg*=2;d.frozen=0;part(d.x,d.y-50,18,'#bfefff',8)}
 d.hp-=dmg;d.vx+=kx;d.vy+=ky;d.av+=kx*.02;d.flash=5;part(d.x,d.y-50*d.sc,Math.ceil(dmg/4)+2,R2()?'#b06bff':'#e0c0ff',6,1,16);if(dmg>=2)pop(d.x,d.y-112*d.sc,Math.round(dmg));if(d.hp<=0)kill(d)}
function kill(d){d.dead=true;kills++;shake=Math.max(shake,6);part(d.x,d.y-50,24,'#3a2a4a',10);part(d.x,d.y-50,22,'#b06bff',12,1,22);part(d.x,d.y-50,10,'#ffd23f',9,1,18);fx.push({t:'smoke',x:d.x,y:d.y-40,life:24});AU.sfx('hit');if(d.kind==='boss'){shake=16;pop(d.x,d.y-140,'SENSEI DOWN!','#ffd23f',50)}}
function hurtP(dmg,kx,ky){if(P.inv>0||P.dead||state!=='fight')return;P.hp-=dmg;P.vx+=kx;P.vy+=ky;P.inv=25;shake=9;part(P.x,P.y-50,12,'#19f3ff',7,1,14);pop(P.x,P.y-120,'-'+Math.round(dmg),'#ff6b6b');buzz([30,20,30]);
 if(P.hp<=0){P.hp=0;P.dead=true;defeat()}}
const imp=(e,sp)=>e===P?hurtP(sp*.8,0,0):hurt(e,sp*1.3,0,0);
function phys(e){if(e!==grab)e.vy+=.5;e.x+=e.vx;e.y+=e.vy;e.ground=false;
 if(e.y>=GY){const sp=Math.abs(e.vy);if(sp>11&&e!==grab&&e.y>0)imp(e,sp);e.y=GY;e.vy=sp>1.5?-e.vy*.3:0;e.vx*=.85;e.ground=true;e.ang*=.8;e.av*=.8}
 if(e.x<18||e.x>VW-18){const sp=Math.abs(e.vx);if(sp>10&&e!==grab)imp(e,sp);e.x=clp(e.x,18,VW-18);e.vx*=-.5}
 e.ang+=e.av;e.av*=.97}
function expl(x,y,r,dmg){fx.push({t:'ring',x,y,r:10,max:r,col:'#ffb020',life:14});fx.push({t:'ring',x,y,r:5,max:r*.6,col:'#fff',life:10});part(x,y,36,'#ff7a1a',14,1,20);part(x,y,14,'#555',9);shake=15;AU.sfx('boom');buzz(40);
 for(const d of ds){const dx=d.x-x,dy=d.y-45-y,dist=Math.hypot(dx,dy);if(dist<r+20){const k=1-dist/(r+20);hurt(d,dmg*k+10,dx/(dist||1)*18*k,dy/(dist||1)*18*k-6*k)}}
 const dx=P.x-x,dy=P.y-50-y,dist=Math.hypot(dx,dy);if(dist<r){const k=1-dist/r;hurtP(dmg*k*.35,dx/(dist||1)*12*k,dy/(dist||1)*12*k-4*k)}}
function melee(ax,r,dmg,kx,ky,stun,col){const sg=ax<P.x?-1:1;P.sw=10;P.face=sg;fx.push({t:'arc',s:sg,r,life:8,col});swish();let h=0;
 for(const d of ds){const dx=d.x-P.x;if(dx*sg>-14&&Math.abs(dx)<r+16*d.sc&&Math.abs(d.y-P.y)<80*d.sc){h=1;if(stun)d.stun=stun;hurt(d,dmg*(.85+Rn()*.3),sg*kx,ky)}}
 if(h){shake=Math.max(shake,dmg/4);AU.sfx('hit')}}
function fire(ax,ay){if(P.dead||P.cd>0||!CDN[wp]||state!=='fight')return;const hx=P.x,hy=P.y-62,a=Math.atan2(ay-hy,ax-hx),c=Math.cos(a),sn=Math.sin(a);P.face=ax<P.x?-1:1;P.cd=CDN[wp];
 switch(wp){
  case'fist':melee(ax,42,8,5,-4,0,'#fff');break;
  case'bat':melee(ax,60,15,15,-9,0,'#ffe066');break;
  case'sword':melee(ax,76,28,6,-5,0,'#cfe8ff');break;
  case'hammer':melee(ax,54,40,4,-12,50,'#ffb020');part(P.x+P.face*40,GY,14,'#999',7);shake=9;break;
  case'broom':melee(ax,72,6,24,-7,22,'#d9b26a');part(P.x+P.face*50,GY-6,10,'#b89a6a',6);break;
  case'pudding':bl.push({k:'pd',x:hx+c*18,y:hy+sn*18,vx:c*10,vy:sn*10-3,life:120,rot:0});swish();break;
  case'pistol':bl.push({k:'b',x:hx+c*18,y:hy+sn*18,vx:c*17,vy:sn*17,life:60});P.vx-=c*1.2;part(hx+c*20,hy+sn*20,4,'#ffd',4,1,6);pew(1100);break;
  case'shotgun':for(let i=0;i<7;i++){const q=a+(Rn()-.5)*.5,v=13+Rn()*3;bl.push({k:'p',x:hx+c*18,y:hy+sn*18,vx:Math.cos(q)*v,vy:Math.sin(q)*v,life:16})}P.vx-=c*5;part(hx+c*22,hy+sn*22,8,'#ffd',6,1,8);shake=5;pew(300);break;
  case'rocket':bl.push({k:'r',x:hx+c*18,y:hy+sn*18,vx:c*7,vy:sn*7,life:140});P.vx-=c*2;pew(200);break;
  case'ice':bl.push({k:'i',x:hx+c*18,y:hy+sn*18,vx:c*11,vy:sn*11,life:80});pew(1600);break;
  case'hole':hs.push({x:ax,y:ay,life:200});break;
  case'bolt':{const pool=ds.filter(d=>!d.dead),pts=[{x:hx,y:hy}];let from={x:ax,y:ay},lim=150;
   for(let i=0;i<4;i++){let best=null,bd=lim;for(const d of pool){const dd=Math.hypot(d.x-from.x,d.y-45-from.y);if(dd<bd){bd=dd;best=d}}
    if(!best)break;pool.splice(pool.indexOf(best),1);const q={x:best.x,y:best.y-50*best.sc};pts.push(q);from=q;lim=110;best.stun=40;hurt(best,24,(Rn()-.5)*8,-5)}
   if(pts.length==1)pts.push({x:ax,y:ay});fx.push({t:'bolt',pts,life:10});part(pts[pts.length-1].x,pts[pts.length-1].y,8,'#9cf',8,1,10);thunderSmall();break}}}
function thunderSmall(){if(!A())return;AU.noise(AU.ctx.currentTime,.25,{ft:'highpass',f:1500,v:.2,out:AU.fx})}
function flame(){const hx=P.x,hy=P.y-62,a=Math.atan2(ptr.y-hy,ptr.x-hx);P.face=ptr.x<P.x?-1:1;
 for(let i=0;i<3;i++){const q=a+(Rn()-.5)*.45,v=6+Rn()*4;ps.push({x:hx+Math.cos(a)*20,y:hy+Math.sin(a)*20,vx:Math.cos(q)*v,vy:Math.sin(q)*v,life:16,max:16,col:Rn()<.5?'#ff8a1a':'#ffd040',s:5+Rn()*5,add:1})}
 for(const d of ds){const dx=d.x-hx,dy=d.y-45*d.sc-hy,dist=Math.hypot(dx,dy);if(dist<120&&(dx*Math.cos(a)+dy*Math.sin(a))/(dist||1)>.78){d.burn=100;d.hp-=.7;d.flash=2;if(d.hp<=0)kill(d)}}}

/* ---------- step (fixed 60 Hz, like the original) ---------- */
function step(){t++;shake*=.85;st++;
 if(state==='intro'){P.x+=2.2;P.ph+=.28;P.face=1;if(st===50){flash=1;bolt=mkBolt();thunder();buzz([60,40,120])}if(st===80)pop(VW/2,GY*.3,'NINJA ALLEY','#ff3355',90);if(P.x>VW*.28||st>140){state='fight';st=0;startWave()}}
 if(state==='fight'||state==='clear'){
  if(spawnQ.length&&st%38===0)spawnNinja(spawnQ.shift());
  if(!P.dead){const m=(keysN.r||keys.ArrowRight||keys.d?1:0)-(keysN.l||keys.ArrowLeft||keys.a?1:0);if(m){P.x+=m*(P.ground?2.9:2.4);P.face=m}
   if((keysN.j||keys.ArrowUp||keys.w||keys[' '])&&P.ground)P.vy=-11;P.ph+=m?.28:0;phys(P);if(P.cd>0)P.cd--;if(P.inv>0)P.inv--;if(P.sw>0)P.sw--;if(ptr.down&&wp==='flame'&&state==='fight')flame()}}
 for(const d of ds){if(d.dead)continue;
  if(d===grab){d.vx=clp((ptr.x-d.x)*.3,-25,25);d.vy=clp((ptr.y+45-d.y)*.3,-25,25)}
  phys(d);
  for(const g of goo)if(d.ground&&!d.stun&&Math.abs(d.x-g.x)<g.w/2){d.stun=50;d.vx+=(Rn()<.5?-1:1)*5;d.av+=.3;pop(d.x,d.y-110,'SLIP!','#ffe0a0')}
  if(d!==grab&&!(d.stun>0||d.frozen>0)&&!P.dead&&state==='fight'){const dx=P.x-d.x,dir=dx>0?1:-1;d.face=dir;d.cd--;
   if(d.kind==='star'){const want=150;if(d.ground&&Math.abs(dx)<want-20)d.x-=dir*1.2;else if(d.ground&&Math.abs(dx)>want+40)d.x+=dir*1.1;
    d.throwT--;if(d.throwT<=0){d.throwT=100+Rn()*70;d.pt=10;const hx=d.x,hy=d.y-60,a=Math.atan2(P.y-55-hy,P.x-hx);bl.push({k:'s',x:hx,y:hy,vx:Math.cos(a)*7,vy:Math.sin(a)*7,life:120,rot:0,enemy:1});swish()}}
   else{const spd=d.kind==='boss'?1.25:Math.min(1+wave*.12,1.7);if(d.ground&&Math.abs(dx)>30*d.sc)d.x+=dir*spd;
    if(d.kind==='boss'&&d.ground&&Math.abs(dx)>140&&Rn()<.008){d.vx=dir*13;d.vy=-5;pop(d.x,d.y-160,'HYAAA!','#ffd23f')}
    if(d.pt>0){d.pt--;if(d.pt===7&&Math.abs(P.x-d.x)<52*d.sc&&Math.abs(P.y-d.y)<70){hurtP(d.dmg,dir*8,-6);swish()}}
    else if(d.cd<=0&&Math.abs(dx)<42*d.sc&&Math.abs(P.y-d.y)<60){d.pt=14;d.cd=55+Rn()*45}}
   if(d.kind==='star'&&d.pt>0)d.pt--;
   if(d.ground&&P.y<d.y-70&&Rn()<.025)d.vy=-10.5}
  if(d.stun>0)d.stun--;if(d.flash>0)d.flash--;if(d.frozen>0)d.frozen--;
  if(d.burn>0){d.burn--;d.hp-=.15;if(t%2==0)part(d.x+(Rn()-.5)*20,d.y-30-Rn()*40,1,'#ff8a1a',2,1,14);if(d.hp<=0)kill(d)}}
 ds=ds.filter(d=>!d.dead);
 for(const b of bl){b.x+=b.vx;b.y+=b.vy;b.life--;if(b.k==='pd'){b.vy+=.35;b.rot+=.3}if(b.k==='s')b.rot+=.5;
  if(b.k==='r')part(b.x,b.y,1,'#ffa040',2,1,10);if(b.k==='i')part(b.x,b.y,1,'#9ef',2,1,10);
  if(b.enemy){if(Math.abs(b.x-P.x)<16&&b.y>P.y-105&&b.y<P.y){b.dead=1;hurtP(6,b.vx*.4,-2)}else if(b.y>GY||b.x<0||b.x>VW||b.life<=0)b.dead=1;continue}
  let hit=null;for(const d of ds)if(Math.abs(b.x-d.x)<18*d.sc&&b.y>d.y-100*d.sc&&b.y<d.y){hit=d;break}
  if(hit||b.y>GY||b.x<0||b.x>VW||b.life<=0){b.dead=1;
   if(b.k==='r')expl(b.x,Math.min(b.y,GY),95,70);
   else if(b.k==='pd'){splat();part(b.x,Math.min(b.y,GY),16,'#c8954a',7);part(b.x,Math.min(b.y,GY),8,'#fff0c8',6);if(hit){hurt(hit,6,b.vx*.3,-2);hit.stun=70;pop(hit.x,hit.y-120,'PUDDING\'D','#ffe0a0')}else if(b.y>=GY)goo.push({x:b.x,w:46,life:420})}
   else if(hit){if(b.k==='i'){hurt(hit,4,0,0);hit.frozen=150;hit.vx=0;hit.pt=0}else hurt(hit,b.k==='b'?15:9,b.vx*.5,-2.5)}}}
 bl=bl.filter(b=>!b.dead);
 for(const h of hs){h.life--;for(const d of ds){const dx=h.x-d.x,dy=h.y-(d.y-45),dist=Math.hypot(dx,dy);if(dist<170){d.vx+=dx/(dist||1)*.9;d.vy+=dy/(dist||1)*.9-.4;d.av+=.01;if(dist<32){d.hp-=1.2;d.stun=3;if(d.hp<=0)kill(d)}}}}
 hs=hs.filter(h=>h.life>0);goo.forEach(g=>g.life--);goo=goo.filter(g=>g.life>0);
 for(const p of ps){p.vy+=p.add?-.15:.4;p.x+=p.vx;p.y+=p.vy;if(!p.add&&p.y>GY){p.y=GY;p.vy*=-.4;p.vx*=.8}p.life--}ps=ps.filter(p=>p.life>0);
 for(const f of fx){f.life--;if(f.t==='ring')f.r+=(f.max-f.r)*.35;if(f.t==='txt'&&!f.big)f.y-=1}fx=fx.filter(f=>f.life>0);
 // rain + lightning
 for(let i=0;i<3;i++)rain.push({x:Rn()*VW*1.2,y:-10,v:9+Rn()*4});for(const r of rain){r.y+=r.v;r.x-=r.v*.18}rain=rain.filter(r=>r.y<GY);
 nextFlash-=1/60;if(nextFlash<=0&&state!=='intro'){nextFlash=rnd(9,16);flash=.8;bolt=mkBolt();thunder()}flash*=.9;
 // waves
 if(state==='fight'&&!P.dead&&!spawnQ.length&&!ds.length&&st>60){if(wave>=3){state='won';st=0;victory()}else{state='clear';st=0;P.hp=Math.min(100,P.hp+25);pop(VW/2,GY*.35,'WAVE CLEAR +25 HP','#7dff6b',60);AU.sfx('gate')}}
 if(state==='clear'&&st>100){state='fight';startWave()}}
function mkBolt(){const pts=[];let x=rnd(VW*.2,VW*.8),y=0;while(y<GY*.55){pts.push([x,y]);x+=rnd(-30,30);y+=rnd(18,40)}return pts}

/* ---------- drawing ---------- */
function drawNinja(c,d){const sc=d.sc,f=d.flash>0,boss=d.kind==='boss';
 c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(d.x,GY+3,20*sc,5*sc,0,0,7);c.fill();
 const jx=d.stun>0&&!d.frozen?(Rn()-.5)*4:0;c.save();c.translate(d.x+jx,d.y);c.rotate(d.ang);c.scale(sc*d.face,sc);
 const gi=f?'#fff':boss?'#2a0a12':'#12101c',gi2=f?'#fff':boss?'#4a1020':'#22203a',band=boss?'#ffd23f':d.kind==='star'?'#19f3ff':'#ff3355';
 const wk=d.ground&&!d.stun?Math.sin(t*.25+d.ph)*7:3;c.lineCap='round';
 const rim=f?'#fff':boss?'#ff8a6a':'#8a7ac8';c.strokeStyle=rim;c.lineWidth=12;c.beginPath();c.moveTo(-4,-50);c.lineTo(-4+wk,-4);c.moveTo(4,-50);c.lineTo(4-wk,-4);c.stroke();
 c.strokeStyle=gi;c.lineWidth=9;c.beginPath();c.moveTo(-4,-50);c.lineTo(-4+wk,-4);c.moveTo(4,-50);c.lineTo(4-wk,-4);c.stroke();
 c.fillStyle=gi2;c.strokeStyle=rim;c.lineWidth=2;c.beginPath();c.roundRect(-13,-92,26,46,8);c.fill();c.stroke();c.fillStyle=band;c.fillRect(-13,-58,26,4);
 const atk=d.pt>0?(14-d.pt)/14:0;c.strokeStyle=gi;c.lineWidth=7;c.beginPath();c.moveTo(6,-84);c.lineTo(20+atk*14,-70+atk*8);c.stroke();
 if(d.kind!=='star'){c.save();c.translate(20+atk*14,-70+atk*8);c.rotate(-1.1+atk*2.2);c.fillStyle='#d8e4f0';c.fillRect(0,-2,boss?52:40,4);c.fillStyle='#3a2a1a';c.fillRect(-10,-3,10,6);c.restore()}
 else{c.save();c.translate(22,-68);c.rotate(t*.3);c.fillStyle='#cfd8e8';for(let k=0;k<4;k++){c.rotate(TAU2/4);c.fillRect(-1.5,0,3,8)}c.restore()}
 c.fillStyle=gi2;c.strokeStyle=rim;c.lineWidth=2;c.beginPath();c.arc(0,-106,14,0,7);c.fill();c.stroke();c.fillStyle=f?'#fff':'#f2c9a0';c.fillRect(-2,-111,15,7);
 c.fillStyle=d.stun>0||d.frozen>0?'#888':'#fff';c.shadowColor=band;c.shadowBlur=8;c.fillRect(4,-110,5,3);c.fillRect(-1,-110,3,3);c.shadowBlur=0;c.fillStyle=band;c.fillRect(-14,-118,28,4);
 c.strokeStyle=band;c.lineWidth=2.5;c.beginPath();c.moveTo(-14,-116);c.quadraticCurveTo(-26,-118+Math.sin(t*.3+d.ph)*4,-34,-106+Math.sin(t*.25+d.ph)*5);c.stroke();
 if(d.frozen>0){c.fillStyle='rgba(140,220,255,.55)';c.fillRect(-26,-126,52,126);c.strokeStyle='#e8fbff';c.lineWidth=2;c.strokeRect(-26,-126,52,126)}
 if(d.stun>0&&!d.frozen){c.fillStyle='#ffd23f';for(let k=0;k<3;k++){const a=t*.15+k*2.1;c.fillText('★',Math.cos(a)*14-4,-130+Math.sin(a)*4)}}
 c.restore();c.fillStyle='#0008';c.fillRect(d.x-20,d.y-138*sc,40,5);c.fillStyle=d.hp>d.mx*.4?'#4ade80':'#ef4444';c.fillRect(d.x-20,d.y-138*sc,Math.max(0,d.hp/d.mx)*40,5)}
function drawPlayer(c){const k=.85;if(P.inv>0&&(t>>2)%2&&!P.dead)c.globalAlpha=.45;
 c.save();if(P.dead){c.translate(P.x,P.y);c.rotate(P.face*1.4);c.translate(-P.x,-P.y)}
 drawWalker(c,P.x,P.y,S.pilot,t/60,P.ph,P.face,k);c.restore();
 if(!P.dead&&state!=='intro'){const hx=P.x,hy=P.y-62;let a=Math.atan2(ptr.y-hy,ptr.x-hx);if(P.sw>0)a+=P.face*(P.sw-5)*.13;
  c.save();c.translate(hx,hy);c.rotate(a);if(Math.cos(a)<0)c.scale(1,-1);c.strokeStyle=SKIN[S.pilot.skin]||SKIN[0];c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(16,0);c.stroke();
  c.font='24px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(WPN[wp][0],28,0);c.restore()}
 c.globalAlpha=1}
function draw(){const c=ctx;layout();buildBG();c.save();c.scale(s,s);
 c.save();c.translate((Rn()-.5)*shake,(Rn()-.5)*shake);c.drawImage(bg,0,0);
 if(flash>.05){c.fillStyle=`rgba(200,210,255,${flash*.55})`;c.fillRect(0,0,VW,GY);if(bolt&&flash>.3){c.strokeStyle='#fff';c.shadowColor='#9ab0ff';c.shadowBlur=18;c.lineWidth=3;c.beginPath();bolt.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.shadowBlur=0}}
 for(const g of goo){c.globalAlpha=Math.min(1,g.life/60);c.fillStyle='#b8823e';c.beginPath();c.ellipse(g.x,GY+2,g.w/2,5,0,0,7);c.fill();c.fillStyle='#fff0c8';c.beginPath();c.ellipse(g.x-6,GY,6,2,0,0,7);c.fill()}c.globalAlpha=1;
 for(const h of hs){for(let i=0;i<4;i++){c.strokeStyle=`rgba(170,100,255,${.2+i*.15})`;c.lineWidth=3;c.beginPath();c.arc(h.x,h.y,12+i*14+Math.sin(t*.2+i)*3,t*.15*(i+1),t*.15*(i+1)+4);c.stroke()}c.fillStyle='#000';c.beginPath();c.arc(h.x,h.y,12,0,7);c.fill()}
 c.font='bold 14px sans-serif';ds.forEach(d=>drawNinja(c,d));drawPlayer(c);
 for(const b of bl){if(b.k==='r'){c.fillStyle='#ddd';c.fillRect(b.x-6,b.y-3,12,6)}else if(b.k==='pd'){c.save();c.translate(b.x,b.y);c.rotate(b.rot);c.fillStyle='#fff0c8';c.fillRect(-7,-5,14,10);c.fillStyle='#c8954a';c.fillRect(-7,-5,14,4);c.restore()}
  else if(b.k==='s'){c.save();c.translate(b.x,b.y);c.rotate(b.rot);c.fillStyle='#e0e8f8';for(let k=0;k<4;k++){c.rotate(TAU2/4);c.beginPath();c.moveTo(0,0);c.lineTo(3,-3);c.lineTo(0,-10);c.lineTo(-3,-3);c.fill()}c.restore()}
  else{c.fillStyle=b.k==='i'?'#8ef':'#ffd';c.beginPath();c.arc(b.x,b.y,b.k==='p'?2:3.5,0,7);c.fill()}}
 for(const p of ps)if(!p.add){c.globalAlpha=Math.min(1,p.life/p.max*1.5);c.fillStyle=p.col;c.fillRect(p.x,p.y,p.s,p.s)}
 c.globalCompositeOperation='lighter';for(const p of ps)if(p.add){c.globalAlpha=p.life/p.max;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.s,0,7);c.fill()}c.globalCompositeOperation='source-over';c.globalAlpha=1;
 for(const f of fx){c.globalAlpha=Math.min(1,f.life/8);
  if(f.t==='ring'){c.strokeStyle=f.col;c.lineWidth=5;c.beginPath();c.arc(f.x,f.y,f.r,0,7);c.stroke()}
  else if(f.t==='smoke'){c.fillStyle=`rgba(180,180,200,${f.life/40})`;for(let k=0;k<5;k++){c.beginPath();c.arc(f.x+Math.cos(k*1.3)*(30-f.life),f.y+Math.sin(k*1.3)*(20-f.life*.6),10+(24-f.life)*.8,0,7);c.fill()}}
  else if(f.t==='arc'){c.strokeStyle=f.col;c.lineWidth=6;c.lineCap='round';c.beginPath();c.arc(P.x,P.y-62,f.r*.8,f.s>0?-1:Math.PI-1,f.s>0?1:Math.PI+1);c.stroke()}
  else if(f.t==='bolt'){c.strokeStyle='#fff';c.shadowColor='#6af';c.shadowBlur=12;c.lineWidth=3;c.beginPath();f.pts.forEach((q,i)=>{if(i){const o=f.pts[i-1],n=5;for(let k=1;k<=n;k++)c.lineTo(o.x+(q.x-o.x)*k/n+(k<n?(Rn()-.5)*18:0),o.y+(q.y-o.y)*k/n+(k<n?(Rn()-.5)*18:0))}else c.moveTo(q.x,q.y)});c.stroke();c.shadowBlur=0}
  else if(f.big){c.globalAlpha=Math.min(1,f.life/20);c.save();c.translate(f.x,f.y);const k=1+Math.max(0,f.life-80)*.05;c.scale(k,k);c.font=`900 ${f.txt.length>10?30:40}px Orbitron,sans-serif`;c.textAlign='center';c.shadowColor=f.col;c.shadowBlur=20;c.fillStyle=f.col;c.fillText(f.txt,0,0);c.shadowBlur=0;c.restore()}
  else{c.globalAlpha=Math.min(1,f.life/20);c.fillStyle=f.col;c.font='bold 16px system-ui';c.textAlign='center';c.fillText(f.txt,f.x,f.y)}}
 c.globalAlpha=1;c.strokeStyle='rgba(170,190,255,.35)';c.lineWidth=1;c.beginPath();for(const r of rain){c.moveTo(r.x,r.y);c.lineTo(r.x+2.2,r.y-12)}c.stroke();c.restore();
 // HUD
 const ty=(SAT+58)/s;c.fillStyle='#0009';c.fillRect(10,ty,124,16);c.fillStyle=P.hp>35?'#4ade80':'#ef4444';c.fillRect(12,ty+2,P.hp*1.2,12);c.fillStyle='#fff';c.font='700 11px Orbitron,sans-serif';c.textAlign='left';c.fillText('HP',14,ty+28);
 c.textAlign='right';c.fillText(`WAVE ${Math.max(1,wave)}/3  ·  KO ${kills}`,VW-10,ty+12);c.font='600 11px system-ui';c.fillStyle='#cdd';c.fillText(WPN[wp][1],VW-10,ty+28);
 c.restore()}

/* ---------- screens ---------- */
function controls(){if(root)root.remove();root=document.createElement('div');root.id='nj';
 root.innerHTML=`<style>#nj{position:fixed;inset:0;z-index:4;pointer-events:none;font-family:Rajdhani,system-ui,sans-serif}#nj button{pointer-events:auto;font:700 16px Rajdhani,system-ui,sans-serif;color:#fff;background:rgba(20,10,36,.85);border:2px solid #ff2bd666;border-radius:12px;min-height:46px;touch-action:none;-webkit-user-select:none;user-select:none}
 #nj .njq{position:absolute;top:calc(var(--sat) + 10px);right:12px;padding:0 14px;border-color:#ff3355aa;font-size:14px;letter-spacing:.08em}
 #nj .njc{position:absolute;left:0;right:0;bottom:0;padding:8px 10px calc(var(--sab) + 10px);background:linear-gradient(transparent,rgba(5,3,12,.9) 30%)}
 #nj .njw{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:none}#nj .njw button{flex:0 0 46px;font-size:22px;padding:0}#nj .njw button.on{background:#ff2bd6;border-color:#ff2bd6}
 #nj .njp{display:flex;gap:8px}#nj .njp button{flex:1;font-size:20px;min-height:54px}</style>
 <button class=njq data-nj=quit>✕ LEAVE</button>
 <div class=njc><div class=njw>${Object.keys(WPN).map(k=>`<button data-w=${k} class="${k===wp?'on':''}" aria-label="${WPN[k][1]}">${WPN[k][0]}</button>`).join('')}</div>
 <div class=njp><button data-k=l>◀</button><button data-k=j>JUMP</button><button data-k=r>▶</button></div></div>`;
 document.body.appendChild(root);
 root.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();keysN[k]=1},off=()=>keysN[k]=0;b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,off))});
 root.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click',()=>{wp=b.dataset.w;grab=null;root.querySelectorAll('[data-w]').forEach(o=>o.classList.toggle('on',o===b));AU.sfx('ui');buzz(6)}));
 root.querySelector('[data-nj=quit]').addEventListener('click',()=>NJ.exit())}
function victory(){if(paid)return;paid=true;S.cr+=8000;save();AU.sfx('win');buzz([40,40,40,40,160]);
 setTimeout(()=>{if(mode!=='ninja')return;root&&(root.style.display='none');show(`<div class=kick style="color:#ffd23f">NINJA ALLEY // CLEARED</div><h2 style="font-size:44px">VICTORY</h2>
  <p class=lead style="font-size:16px">Three waves. One alley. Zero ninjas left standing. The Sensei has asked for your autograph.</p>
  <div class=term><div>&gt; Ninjas defeated: ${kills}</div><div>&gt; HP left: ${Math.round(P.hp)}</div><div class=gr>&gt; Reward: +${money(8000)}</div></div>${crPill()}
  <button class="btn wide" data-a=njAgain>Go again</button><button class="btn ghost wide" data-a=njExit>Back to the street</button>`)},1400)}
function defeat(){AU.sfx('die');buzz([200,80,300]);setTimeout(()=>{if(mode!=='ninja')return;root&&(root.style.display='none');
 show(`<div class=kick style="color:#ff3355">NINJA ALLEY</div><h2>You got ninja’d.</h2><p class=lead style="font-size:16px">Made it to wave ${wave} with ${kills} KOs. A street sweeper finds you and puts you back on the sidewalk. No charge.</p>
  <button class="btn wide" data-a=njAgain>Try again</button><button class="btn ghost wide" data-a=njExit>Back to the street</button>`)},1300)}

/* ---------- public ---------- */
NJ.enter=()=>{mode='ninja';hideUI();setHud(false);layout();reset();P.y=GY;bg=null;controls();AU.play('kungfu');acc=0;nextFlash=rnd(9,14)};
NJ.exit=()=>{if(root){root.remove();root=null}keysN.l=keysN.r=keysN.j=0;ptr.down=false;grab=null;AU.play('hub');scrHub()};
NJ.frame=dt=>{layout();acc+=Math.min(dt,.1);while(acc>=1/60){step();acc-=1/60}draw()};
ACT.njAgain=()=>{hideUI();NJ.enter()};ACT.njExit=()=>NJ.exit();
const pos=e=>({x:e.clientX/s,y:e.clientY/s});
cv.addEventListener('pointerdown',e=>{if(mode!=='ninja')return;const q=pos(e);ptr={x:q.x,y:q.y,down:true};
 if(wp==='grab'){grab=ds.filter(d=>Math.abs(q.x-d.x)<30*d.sc&&q.y>d.y-130*d.sc&&q.y<d.y+5)[0]||null;return}fire(q.x,q.y)});
cv.addEventListener('pointermove',e=>{if(mode!=='ninja')return;const q=pos(e);ptr.x=q.x;ptr.y=q.y});
['pointerup','pointercancel','pointerleave'].forEach(n=>cv.addEventListener(n,()=>{if(mode!=='ninja')return;ptr.down=false;grab=null}));
NJ._dbg=()=>({P,ds,state,wave,kills,GY,VW,VH});NJ._win=()=>{ds=[];spawnQ=[];wave=3;state='fight';st=99};
})();
