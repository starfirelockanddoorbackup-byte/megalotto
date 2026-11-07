/* ===========================================================================
   TIDE RUNNER — the Lower Market arcade cabinet. An 80s wireframe speedboat
   time trial through flooded future Miami: deco hotels, palms, and the fallen
   towers of megacorps you thread straight through. Hit ramps. Beat your ghost.
   =========================================================================== */
(function(){
const TR=window.TR={};
const SEG=200,RW=2000,CAMH=1000,DEPTH=1/Math.tan(50*Math.PI/180),DRAW=170,MAXS=SEG*46,PZ=CAMH*DEPTH;
let segs=[],trackLen=0,finishZ=0,pos=0,px=0,spd=0,root=null,keysT={l:0,r:0},state='count',cd=3.2,tRun=0,alt=0,vy=0,boostT=0,shake=0,
 rec=[],recT=0,ghost=null,spray=[],msg='',msgT=0,crash=0,skyOff=0,steer=0,lastSeg=-1,best=0;
const SPR={palm:{w:500,h:1700},hotel:{w:2800,h:2600},tower:{w:2000,h:8000},life:{w:700,h:1000},ferris:{w:4600,h:2400},buoy:{w:150,h:220},debris:{w:520,h:300,solid:1},ramp:{w:800,h:260,ramp:1},arch:{w:RW*2.6,h:2800}};
const CORPS=['OMNIDYNE','HELIXMART','VANTA BANK','NOVACORP','LOTTO-TRON','KESSLER ORBITAL'],HOTELS=['THE NEON TIDE','MARLIN','HOTEL FLAMINGO','SEAFOAM','THE BREAKERS II'];
const PAST=['#ff9ad8','#7af7ff','#ffd27a','#b9a2ff','#8affc1'];

/* ---------- track ---------- */
function seg(curve,fl){const n=segs.length,y=Math.sin(n/22)*90+Math.sin(n/7)*25;segs.push(Object.assign({i:n,curve,p1:{x:0,y:n?segs[n-1].p2.y:0,z:n*SEG},p2:{x:0,y,z:(n+1)*SEG},spr:[]},fl||{}))}
function road(len,curve,fl){const e=Math.min(30,len/4|0);for(let i=0;i<len;i++){const k=i<e?i/e:i>len-e?(len-i)/e:1;seg(curve*k,fl)}}
const put=(n,t,off,o)=>{if(segs[n])segs[n].spr.push(Object.assign({t,off},o||{}))};
function build(){segs=[];
 const S0=segs.length;road(90,0);road(170,2.2);road(120,0);road(140,-3);road(140,3);
 const T1=segs.length;road(130,0,{tun:'OMNIDYNE'});road(170,-4);road(140,0,{boost:1});road(200,2);
 const T2=segs.length;road(150,1.2,{tun:'NOVACORP'});road(130,-5.5);road(170,0);road(170,3);road(110,-2);
 const T3=segs.length;road(110,0,{tun:'LOTTO-TRON'});road(150,2.5);road(170,0);
 finishZ=(segs.length-30)*SEG;road(260,0);trackLen=segs.length*SEG;
 const N=segs.length,R=()=>Math.random(),side=()=>R()<.5?-1:1;
 put(8,'arch',0,{txt:'START'});put(segs.length-290,'arch',0,{txt:'FINISH'});
 for(let n=20;n<N-260;n+=3){if(segs[n].tun)continue;
  if(R()<.55)put(n,'palm',side()*(1.4+R()*1.2));if(n%9===0)put(n,'buoy',-1.08);if(n%9===4)put(n,'buoy',1.08);
  if(n%40===0)put(n,'hotel',side()*(2.6+R()*1.5),{c:PAST[n/40%5|0],txt:HOTELS[n/40%5|0]});
  if(n%55===27)put(n,'tower',side()*(3.4+R()*2),{c:'#ff2bd6',txt:CORPS[n%6],broke:R()<.7});
  if(n%70===35)put(n,'life',side()*(1.6+R()*.4))}
 put(T2+330,'ferris',-3.6);put(T1+520,'ferris',3.8);
 // ramps & debris on the channel
 for(const n of[200,420,560,690,980,1180,1650,1700,1750,2050,2250])put(n,'ramp',[-.5,0,.5][n%3]);
 for(const n of[330,470,760,800,1080,1400,1450,1500,1880,2120,2180,2300])if(segs[n]&&!segs[n].tun)put(n,'debris',[-.6,.1,.6,-.2][n%4]);
 for(let n=T1;n<T1+130;n++)segs[n].tunIdx=n-T1;for(let n=T2;n<T2+150;n++)segs[n].tunIdx=n-T2;for(let n=T3;n<T3+110;n++)segs[n].tunIdx=n-T3}

/* ---------- update ---------- */
const segAt=z=>segs[Math.max(0,Math.min(segs.length-1,Math.floor(z/SEG)))];
function upd(dt){const L=keysT.l||keys.ArrowLeft||keys.a,Rr=keysT.r||keys.ArrowRight||keys.d;
 if(state==='count'){cd-=dt;if(Math.ceil(cd)!==Math.ceil(cd+dt)){AU.sfx(cd<=0?'go':'beep');buzz(cd<=0?40:12)}if(cd<=0)state='run';return}
 if(state==='run')tRun+=dt;const ps=segAt(pos+PZ),sp=spd/MAXS;
 const off=Math.abs(px)>1.05;let top=MAXS*(boostT>0?1.3:1)*(off&&alt<=0?.5:1)*(crash>0?.35:1);
 if(state==='run'||state==='done'){spd+=(spd<top?MAXS*.55:-MAXS*1.4)*dt*(state==='done'?-.4:1);spd=Math.max(0,spd)}
 steer+=((Rr?1:0)-(L?1:0)-steer)*Math.min(1,dt*8);px+=steer*dt*2.4*Math.max(.25,sp);px-=dt*sp*sp*ps.curve*.26;px=Math.max(-2.2,Math.min(2.2,px));
 if(ps.tun&&Math.abs(px)>1.25){px=Math.sign(px)*1.25;if(crash<=0&&spd>MAXS*.5){spd*=.8;shake=.3;AU.sfx('hit');buzz(20);msg='SCRAPE!';msgT=.6}}
 pos+=spd*dt;boostT=Math.max(0,boostT-dt);crash=Math.max(0,crash-dt);shake=Math.max(0,shake-dt*2);msgT=Math.max(0,msgT-dt);
 if(alt>0||vy>0){vy-=3400*dt;alt+=vy*dt;if(alt<=0){alt=0;vy=0;shake=.4;AU.sfx('hit');buzz(30);for(let i=0;i<30;i++)spray.push({x:(Math.random()-.5)*120,y:0,vx:(Math.random()-.5)*300,vy:-Math.random()*320,l:.7})}}
 if(ps.boost&&!off&&boostT<.2&&alt<=0){boostT=1.4;AU.sfx('pad');buzz(15);msg='BOOST!';msgT=.8}
 if(ps.i!==lastSeg){for(let k=lastSeg+1;k<=ps.i;k++){const sg=segs[k];if(!sg)continue;for(const o of sg.spr){const d=SPR[o.t];if(!d.solid&&!d.ramp)continue;const w=d.w/RW*1.1;if(Math.abs(px-o.off)>w)continue;
   if(d.ramp&&alt<=0){vy=1500+sp*500;alt=1;boostT=Math.max(boostT,.8);AU.sfx('boost');buzz([20,20,40]);msg=pick(['AIR!','BIG AIR!','SEND IT!']);msgT=1}
   else if(d.solid&&alt<120&&crash<=0){crash=1.1;spd*=.4;shake=.8;AU.sfx('hit');buzz([60,30,60]);msg=pick(['BONK','DEBRIS!','WHO LEFT A FRIDGE HERE']);msgT=1}}}lastSeg=ps.i}
 if(state==='run'){recT-=dt;if(recT<=0){recT=.1;rec.push([+tRun.toFixed(2),Math.round(pos),+px.toFixed(3)])}}
 if(state==='run'&&pos>=finishZ){state='done';finish()}
 if(spd>MAXS*.4&&alt<=0&&Math.random()<dt*30)spray.push({x:(Math.random()-.5)*90,y:0,vx:(Math.random()-.5)*160-steer*80,vy:-Math.random()*160,l:.45});
 for(const s of spray){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=600*dt;s.l-=dt}spray=spray.filter(s=>s.l>0);skyOff+=ps.curve*sp*dt*.02}
function ghostAt(t){if(!ghost||!ghost.length)return null;let lo=0,hi=ghost.length-1;if(t>ghost[hi][0])return null;while(hi-lo>1){const m=(lo+hi)>>1;ghost[m][0]<t?lo=m:hi=m}const a=ghost[lo],b=ghost[hi],k=b[0]>a[0]?(t-a[0])/(b[0]-a[0]):0;return[a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]}

/* ---------- render ---------- */
let HZ=300;
function proj(p,cx,cy,cz){p.cz=p.z-cz;p.sc=DEPTH/p.cz;p.sx=W/2+p.sc*(p.x-cx)*W/2;p.sy=HZ-p.sc*(p.y-cy)*W/2;p.sw=p.sc*RW*W/2}
function quad(c,x1,y1,w1,x2,y2,w2,col){c.fillStyle=col;c.beginPath();c.moveTo(x1-w1,y1);c.lineTo(x2-w2,y2);c.lineTo(x2+w2,y2);c.lineTo(x1+w1,y1);c.closePath();c.fill()}
function neon(c,col,w){c.strokeStyle=col;c.lineWidth=w||1.5;c.shadowColor=col;c.shadowBlur=8;c.stroke();c.shadowBlur=0}
function drawSprite(c,o,x,y,k){const d=SPR[o.t],w=d.w*k,h=d.h*k;if(w<1.5||x+w<-200||x-w>W+200)return;c.save();
 switch(o.t){
  case'palm':{c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+w*.6,y-h*.5,x+w*.25,y-h);neon(c,'#ffb070',Math.max(1,w*.06));c.beginPath();for(let i=0;i<6;i++){const a=-Math.PI*.9+i*Math.PI*.36;c.moveTo(x+w*.25,y-h);c.quadraticCurveTo(x+w*.25+Math.cos(a)*w*.9,y-h+Math.sin(a)*w*.5-w*.2,x+w*.25+Math.cos(a)*w*1.4,y-h+w*.3)}neon(c,'#7dff6b',Math.max(1,w*.04));break}
  case'hotel':{const x0=x-w/2;c.fillStyle='rgba(10,4,24,.85)';c.fillRect(x0,y-h,w,h);c.beginPath();c.rect(x0,y-h*.8,w,h*.8);c.moveTo(x0+w*.2,y-h*.8);c.lineTo(x0+w*.2,y-h*.92);c.lineTo(x0+w*.8,y-h*.92);c.lineTo(x0+w*.8,y-h*.8);c.moveTo(x0+w*.4,y-h*.92);c.lineTo(x0+w*.4,y-h);c.lineTo(x0+w*.6,y-h);c.lineTo(x0+w*.6,y-h*.92);
   for(let i=1;i<5;i++){c.moveTo(x0,y-h*.8*i/5);c.lineTo(x0+w,y-h*.8*i/5)}neon(c,o.c,Math.max(1,w*.006));if(w>40){c.font=`900 ${Math.max(6,w*.07)|0}px Orbitron,sans-serif`;c.textAlign='center';c.fillStyle=o.c;c.shadowColor=o.c;c.shadowBlur=10;c.fillText(o.txt,x,y-h*.84)}break}
  case'tower':{const x0=x-w/2,top=y-h;c.fillStyle='rgba(8,3,20,.9)';c.beginPath();c.moveTo(x0,y);c.lineTo(x0,top+(o.broke?h*.12:0));if(o.broke){c.lineTo(x0+w*.25,top+h*.04);c.lineTo(x0+w*.4,top+h*.15);c.lineTo(x0+w*.65,top);c.lineTo(x0+w*.8,top+h*.1)}else c.lineTo(x0+w,top);c.lineTo(x0+w,top+(o.broke?h*.08:0));c.lineTo(x0+w,y);c.closePath();c.fill();neon(c,'#b06bff',Math.max(1,w*.006));
   if(w>30){c.beginPath();for(let i=1;i<4;i++){c.moveTo(x0+w*i/4,y);c.lineTo(x0+w*i/4,top+h*.2)}for(let j=1;j<12;j++){c.moveTo(x0,y-h*j/13);c.lineTo(x0+w,y-h*j/13)}neon(c,'rgba(176,107,255,.35)',1);c.font=`900 ${Math.max(6,w*.11)|0}px Orbitron,sans-serif`;c.textAlign='center';c.fillStyle=o.c;c.shadowColor=o.c;c.shadowBlur=12;c.fillText(o.txt,x,top+h*.3)}break}
  case'life':{c.beginPath();c.moveTo(x-w*.4,y);c.lineTo(x-w*.3,y-h*.55);c.moveTo(x+w*.4,y);c.lineTo(x+w*.3,y-h*.55);c.rect(x-w*.45,y-h*.95,w*.9,h*.4);c.moveTo(x-w*.55,y-h*.95);c.lineTo(x,y-h*1.1);c.lineTo(x+w*.55,y-h*.95);neon(c,'#ff7ac8',Math.max(1,w*.02));break}
  case'ferris':{const r=w/2,cy=y-h*.15;c.beginPath();c.arc(x,cy,r,Math.PI*1.04,Math.PI*1.96);for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/9;c.moveTo(x,cy);c.lineTo(x+Math.cos(a)*r,cy+Math.sin(a)*r)}neon(c,'#ffd23f',Math.max(1,w*.004));break}
  case'buoy':{c.fillStyle=Math.sin(tRun*6+o.off*9)>0?'#ff3355':'#fff';c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x,y-h);c.lineTo(x+w/2,y);c.fill();break}
  case'debris':{c.fillStyle='rgba(30,20,10,.9)';c.fillRect(x-w/2,y-h,w,h);c.beginPath();c.rect(x-w/2,y-h,w,h);c.moveTo(x-w/2,y-h);c.lineTo(x+w/2,y);c.moveTo(x+w/2,y-h);c.lineTo(x-w/2,y);neon(c,'#ff3355',Math.max(1,w*.03));break}
  case'ramp':{c.fillStyle='rgba(60,50,0,.6)';c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2*.8,y-h);c.lineTo(x+w/2*.8,y-h);c.lineTo(x+w/2,y);c.closePath();c.fill();neon(c,'#ffd23f',Math.max(1.5,w*.02));for(let i=1;i<4;i++){c.beginPath();c.moveTo(x-w*.3+i*w*.15-w*.075,y-h*.3);c.lineTo(x-w*.3+i*w*.15,y-h*.75);c.lineTo(x-w*.3+i*w*.15+w*.075,y-h*.3);neon(c,'#ffd23f',Math.max(1,w*.015))}break}
  case'arch':{c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h);c.lineTo(x+w/2,y-h);c.lineTo(x+w/2,y);c.rect(x-w*.3,y-h*1.02,w*.6,h*.2);neon(c,'#19f3ff',Math.max(1.5,w*.004));c.font=`900 ${Math.max(8,w*.06)|0}px Orbitron,sans-serif`;c.textAlign='center';c.fillStyle='#fff';c.shadowColor='#ff2bd6';c.shadowBlur=14;c.fillText(o.txt,x,y-h*.87);break}}
 c.restore()}
function boat(c,x,y,k,alpha,col){c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(steer*.12*(alpha<1?0:1));c.scale(k,k);
 c.fillStyle='rgba(6,2,16,.85)';c.beginPath();c.moveTo(-60,0);c.lineTo(-48,-30);c.lineTo(0,-46);c.lineTo(48,-30);c.lineTo(60,0);c.lineTo(36,14);c.lineTo(-36,14);c.closePath();c.fill();neon(c,col,2.5);
 c.beginPath();c.moveTo(-30,-30);c.lineTo(-20,-58);c.lineTo(20,-58);c.lineTo(30,-30);neon(c,'#19f3ff',2);c.beginPath();c.moveTo(-60,0);c.lineTo(60,0);neon(c,col,1.5);
 c.fillStyle='#ff3355';c.fillRect(-44,2,10,6);c.fillRect(34,2,10,6);c.restore()}
function draw(){const c=ctx,ctrl=root?root.querySelector('.tdc').getBoundingClientRect().top:H;HZ=Math.min(H*.42,ctrl*.48);
 c.save();if(shake>0)c.translate((Math.random()-.5)*shake*14,(Math.random()-.5)*shake*14);
 // sky + sun + skyline
 let g=c.createLinearGradient(0,0,0,HZ);g.addColorStop(0,'#070214');g.addColorStop(.6,'#3a0a4a');g.addColorStop(1,'#ff5a8a');c.fillStyle=g;c.fillRect(-20,-20,W+40,HZ+20);
 const sr=Math.min(W,H)*.2,sx=W/2-skyOff*400%W*.0+W*.0;c.save();c.beginPath();c.arc(W/2,HZ,sr,Math.PI,0);c.clip();g=c.createLinearGradient(0,HZ-sr,0,HZ);g.addColorStop(0,'#ffe27a');g.addColorStop(1,'#ff2b8a');c.fillStyle=g;c.fillRect(W/2-sr,HZ-sr,sr*2,sr);c.fillStyle='#3a0a4a';for(let i=0;i<6;i++){const yy=HZ-sr*.5+i*sr*.09;c.fillRect(W/2-sr,yy,sr*2,2+i*1.2)}c.restore();
 c.save();c.beginPath();const ofs=((skyOff*600)%400+400)%400;for(let i=-1;i<W/40+2;i++){const bx=i*40-ofs*.1,h=20+((i*73+11)%9)*9+((i*31)%5===0?40:0);c.rect(bx,HZ-h,30,h);if((i*31)%5===0){c.moveTo(bx,HZ-h);c.lineTo(bx+12,HZ-h-14);c.lineTo(bx+30,HZ-h-4)}}c.fillStyle='rgba(20,4,30,.9)';c.fill();neon(c,'rgba(255,90,200,.6)',1);c.restore();
 // water base
 g=c.createLinearGradient(0,HZ,0,H);g.addColorStop(0,'#1a0630');g.addColorStop(1,'#03010a');c.fillStyle=g;c.fillRect(-20,HZ,W+40,H-HZ+20);
 const base=segAt(pos),bp=(pos%SEG)/SEG,camY=CAMH+(base.p1.y+(base.p2.y-base.p1.y)*bp);let x=0,dx=-(base.curve*bp),maxy=H;const drawn=[];
 for(let n=0;n<DRAW;n++){const sg=segs[base.i+n];if(!sg)break;const camX=px*RW;proj(sg.p1,camX-x,camY,pos);proj(sg.p2,camX-x-dx,camY,pos);x+=dx;dx+=sg.curve;
  if(sg.p1.cz<=DEPTH||sg.p2.sy>=maxy||sg.p2.sy>=sg.p1.sy){drawn.push(null);continue}drawn.push(sg);sg.clip=maxy;
  const a=sg.p1,b=sg.p2,fog=Math.min(1,n/DRAW);
  quad(c,a.sx,a.sy,a.sw*6,b.sx,b.sy,b.sw*6,(sg.i>>1)%2?'#170530':'#12042a');
  quad(c,a.sx,a.sy,a.sw,b.sx,b.sy,b.sw,sg.boost?((sg.i>>1)%2?'#0a3a26':'#06281a'):((sg.i>>1)%2?'#0c0a3a':'#090730'));
  c.globalAlpha=1-fog*.8;c.strokeStyle=sg.i%4===0?'#ff2bd6':'rgba(255,43,214,.0)';if(sg.i%4===0){c.lineWidth=1;c.beginPath();c.moveTo(a.sx-a.sw*6,a.sy);c.lineTo(a.sx+a.sw*6,a.sy);c.stroke()}
  c.strokeStyle='rgba(25,243,255,.45)';c.lineWidth=1;c.beginPath();for(const l of[-.33,.33]){c.moveTo(a.sx+a.sw*l,a.sy);c.lineTo(b.sx+b.sw*l,b.sy)}c.stroke();
  c.strokeStyle=(sg.i>>2)%2?'#ff3355':'#ffffff';c.lineWidth=Math.max(1,a.sw*.03);c.beginPath();for(const l of[-1,1]){c.moveTo(a.sx+a.sw*l,a.sy);c.lineTo(b.sx+b.sw*l,b.sy)}c.stroke();
  if(sg.boost&&sg.i%3===0){c.strokeStyle='#7dff6b';c.lineWidth=Math.max(1,a.sw*.02);c.beginPath();c.moveTo(a.sx-a.sw*.3,a.sy);c.lineTo(a.sx,a.sy-a.sw*.06);c.lineTo(a.sx+a.sw*.3,a.sy);c.stroke()}
  c.globalAlpha=1;maxy=b.sy}
 // back-to-front: tunnels, sprites, ghost
 const gp=ghostAt(tRun);
 for(let n=drawn.length-1;n>0;n--){const sg=drawn[n];if(!sg)continue;const a=sg.p1,b=sg.p2;
  if(sg.tun){const hw=1.45,ht=1.5,ax=a.sw*hw,bx=b.sw*hw,ah=a.sw*ht,bh=b.sw*ht,shade=sg.i%2?'#0d0420':'#110628';
   c.fillStyle=shade;for(const sd of[-1,1]){c.beginPath();c.moveTo(a.sx+sd*ax,a.sy);c.lineTo(b.sx+sd*bx,b.sy);c.lineTo(b.sx+sd*bx,b.sy-bh);c.lineTo(a.sx+sd*ax,a.sy-ah);c.closePath();c.fill()}
   c.beginPath();c.moveTo(a.sx-ax,a.sy-ah);c.lineTo(b.sx-bx,b.sy-bh);c.lineTo(b.sx+bx,b.sy-bh);c.lineTo(a.sx+ax,a.sy-ah);c.closePath();c.fill();
   if(sg.i%3===0){c.beginPath();c.moveTo(a.sx-ax,a.sy);c.lineTo(a.sx-ax,a.sy-ah);c.lineTo(a.sx+ax,a.sy-ah);c.lineTo(a.sx+ax,a.sy);neon(c,sg.i%6?'rgba(176,107,255,.8)':'#ff2bd6',Math.max(1,a.sw*.012));
    if(sg.i%6===0&&a.sw>14){c.fillStyle='rgba(255,210,120,.5)';for(const sd of[-1,1])for(let r=1;r<4;r++)c.fillRect(a.sx+sd*ax*.97-(sd>0?a.sw*.06:0),a.sy-ah*r/4,a.sw*.06,a.sw*.05)}}
   if(sg.tunIdx===0){c.font=`900 ${Math.max(8,a.sw*.22)|0}px Orbitron,sans-serif`;c.textAlign='center';c.fillStyle='#ff2bd6';c.shadowColor='#ff2bd6';c.shadowBlur=14;c.fillText(sg.tun,a.sx,a.sy-ah-a.sw*.08);c.shadowBlur=0;
    c.fillStyle='rgba(10,4,24,.9)';c.beginPath();c.moveTo(a.sx-ax*1.6,a.sy);c.lineTo(a.sx-ax*1.6,a.sy-ah*1.9);c.lineTo(a.sx-ax*.4,a.sy-ah*2.3);c.lineTo(a.sx+ax*.7,a.sy-ah*1.8);c.lineTo(a.sx+ax*1.6,a.sy-ah*2.05);c.lineTo(a.sx+ax*1.6,a.sy);c.lineTo(a.sx+ax,a.sy);c.lineTo(a.sx+ax,a.sy-ah);c.lineTo(a.sx-ax,a.sy-ah);c.lineTo(a.sx-ax,a.sy);c.closePath();c.fill();neon(c,'#b06bff',Math.max(1,a.sw*.01))}}
  for(const o of sg.spr){const k=a.sc*W/2;drawSprite(c,o,a.sx+a.sc*o.off*RW*W/2,a.sy,k)}
  if(gp&&state!=='count'){const gs=segAt(gp[0]+PZ);if(gs===sg){boat(c,a.sx+a.sc*gp[1]*RW*W/2,a.sy,a.sc*W/2*5,.4,'#ffffff')}}}
 // player boat
 const by=ctrl-70-alt*.06,bx=W/2;c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(bx,ctrl-62,58*(1-Math.min(.5,alt/2000)),10,0,0,TAU);c.fill();
 boat(c,bx,by,Math.min(1.2,W/420),1,boostT>0?'#7dff6b':NEON[S.pilot.col]||'#19f3ff');
 c.fillStyle='rgba(220,240,255,.8)';for(const s of spray)c.fillRect(bx+s.x,ctrl-66+s.y,3,3);
 if(boostT>0){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(125,255,107,.25)';c.lineWidth=2;c.beginPath();for(let i=0;i<10;i++){const a2=Math.random()*TAU,r1=Math.max(W,H)*.4;c.moveTo(W/2+Math.cos(a2)*r1,HZ+Math.sin(a2)*r1*.6);c.lineTo(W/2+Math.cos(a2)*(r1+80),HZ+Math.sin(a2)*(r1+80)*.6)}c.stroke();c.restore()}
 c.restore();
 // HUD
 const fmt=s=>`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;c.font='900 22px Orbitron,sans-serif';c.textAlign='left';c.fillStyle='#fff';c.shadowColor='#ff2bd6';c.shadowBlur=10;c.fillText(fmt(tRun),14,SAT+44);c.shadowBlur=0;
 c.font='700 11px Orbitron,sans-serif';c.fillStyle='#ffd27a';c.fillText(best?'BEST '+fmt(best):'NO BEST YET',14,SAT+62);
 c.textAlign='right';c.font='700 18px Orbitron,sans-serif';c.fillStyle='#19f3ff';c.fillText(Math.round(spd/MAXS*140)+' KN',W-14,SAT+100);
 const pr=Math.min(1,pos/finishZ);c.fillStyle='rgba(255,255,255,.15)';c.fillRect(14,SAT+70,W-28,3);c.fillStyle='#ff2bd6';c.fillRect(14,SAT+70,(W-28)*pr,3);
 if(gp){const gpr=Math.min(1,gp[0]/finishZ);c.fillStyle='#fff';c.fillRect(14+(W-28)*gpr-1,SAT+66,2,11)}
 c.textAlign='center';if(state==='count'){c.font='900 64px Orbitron,sans-serif';c.fillStyle='#fff';c.shadowColor='#ff2bd6';c.shadowBlur=24;c.fillText(cd>0?Math.ceil(cd):'GO!',W/2,HZ*.75);c.shadowBlur=0}
 if(msgT>0){c.globalAlpha=Math.min(1,msgT*2);c.font='900 26px Orbitron,sans-serif';c.fillStyle='#ffd23f';c.shadowColor='#ff7a20';c.shadowBlur=14;c.fillText(msg,W/2,HZ+60);c.shadowBlur=0;c.globalAlpha=1}
 if(Math.abs(px)>1.05&&alt<=0&&state==='run'){c.font='700 13px Orbitron,sans-serif';c.fillStyle='#ff3355';c.fillText('SHALLOWS — SLOWING',W/2,HZ+90)}}

/* ---------- screens ---------- */
function controls(){if(root)root.remove();root=document.createElement('div');root.id='td';
 root.innerHTML=`<style>#td{position:fixed;inset:0;z-index:4;pointer-events:none}#td button{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;color:#fff;font:700 15px Rajdhani,system-ui,sans-serif;background:rgba(10,4,24,.85);border:2px solid #19f3ff88;border-radius:14px}
 #td .tdq{position:absolute;top:calc(var(--sat) + 10px);right:12px;min-height:40px;padding:0 14px;border-color:#ff2bd6aa;letter-spacing:.08em}
 #td .tdc{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;padding:0 12px calc(var(--sab) + 12px)}#td .tdc button{width:min(38vw,170px);height:92px;font-size:34px}#td .tdc button.dn{background:#19f3ff;color:#07040f}</style>
 <button class=tdq>✕ LEAVE</button><div class=tdc><button data-s=l>◀</button><button data-s=r>▶</button></div>`;
 document.body.appendChild(root);root.querySelector('.tdq').addEventListener('click',()=>TR.exit());
 root.querySelectorAll('[data-s]').forEach(b=>{const k=b.dataset.s,on=e=>{e.preventDefault();keysT[k]=1;b.classList.add('dn')},off=()=>{keysT[k]=0;b.classList.remove('dn')};b.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(n=>b.addEventListener(n,off))})}
function finish(){const T=+tRun.toFixed(2),D=S.tide=S.tide||{best:0,ghost:null,board:[]},pb=!D.best||T<D.best;let pay=300;
 if(pb){D.best=T;D.ghost=rec.slice();pay+=1000}const name=(S.pilot&&S.pilot.name)||'Pilot';D.board.push({n:name,t:T});D.board.sort((a,b)=>a.t-b.t);D.board=D.board.slice(0,5);const top=D.board[0]&&D.board[0].t===T&&D.board[0].n===name;
 S.cr+=pay;save();AU.sfx('win');buzz([40,40,40,120]);
 setTimeout(()=>{if(mode!=='tide')return;if(root)root.style.display='none';const fmt=s=>`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
  show(`<div class=kick style="color:#19f3ff">VECTOR ARCADE // TIDE RUNNER</div><h2>${pb?'NEW RECORD!':'Finished'}</h2><p class=lead style="font-size:20px"><b>${fmt(T)}</b></p>
  <div class=term>${D.board.map((r,i)=>`<div${r.t===T&&r.n===name?' class=gr':''}>&gt; ${i+1}. ${esc(r.n)} — ${fmt(r.t)}</div>`).join('')}<div class=gr>&gt; Payout: +${money(pay)}${pb?' (record bonus)':''}</div></div>${crPill()}
  <p class=mu2 style="text-align:center;font-size:13px">Your best run races you next time as a ghost boat.</p>
  <button class="btn wide" data-a=tdAgain>Race again</button><button class="btn ghost wide" data-a=tdExit>Back to the market</button>`)},1500)}
TR.menu=()=>{mode='hubshop';AU.play('lounge');const D=S.tide||{};const fmt=s=>`${Math.floor(s/60)}:${(s%60).toFixed(2).padStart(5,'0')}`;
 show(`<div class=kick style="color:#19f3ff">LOWER MARKET // VECTOR ARCADE</div><h2>Tide Runner</h2>${crPill()}
 <p class=lead style="font-size:16px">One cabinet, one coin slot, one speedboat. Race the flooded Miami channel through the fallen megacorp towers.</p>
 <div class=term><div>&gt; Hold ◀ ▶ to steer. The throttle is always on.</div><div>&gt; Gold ramps = big air. Green chevrons = boost.</div><div>&gt; Stay between the buoys. Shallows slow you down.</div><div>&gt; Finish: ¥300 · New record: +¥1,000</div></div>
 <div class=term>${(D.board&&D.board.length)?D.board.map((r,i)=>`<div>&gt; ${i+1}. ${esc(r.n)} — ${fmt(r.t)}</div>`).join(''):'<div>&gt; No times yet. Be the first.</div>'}</div>
 <button class="btn wide" data-a=tdGo>Insert coin ▶</button><button class="btn ghost wide" data-a=hub>Back to the market</button>`)};
TR.start=()=>{mode='tide';hideUI();setHud(false);build();pos=0;px=0;spd=0;state='count';cd=3.2;tRun=0;alt=0;vy=0;boostT=0;crash=0;shake=0;rec=[];recT=0;spray=[];msgT=0;lastSeg=-1;skyOff=0;steer=0;
 const D=S.tide||{};best=D.best||0;ghost=D.ghost||null;controls();AU.play('race')};
TR.exit=()=>{if(root){root.remove();root=null}keysT.l=keysT.r=0;AU.play('hub');scrHub()};
TR.frame=dt=>{upd(Math.min(dt,.05));draw()};
ACT.tdGo=()=>TR.start();ACT.tdAgain=()=>{hideUI();TR.start()};ACT.tdExit=()=>TR.exit();
TR._auto=()=>{const ps=segAt(pos+PZ+SEG*6);let tgt=0;for(const o of segAt(pos+PZ+SEG*8).spr)if(SPR[o.t].solid&&Math.abs(o.off-tgt)<.4)tgt=o.off>0?o.off-.6:o.off+.6;const want=tgt+ps.curve*.15;keysT.l=px>want+.08?1:0;keysT.r=px<want-.08?1:0};TR._dbg=()=>({pos,finishZ,spd,px,state,tRun,alt,segs:segs.length});TR._jump=z=>{pos=z};
})();
