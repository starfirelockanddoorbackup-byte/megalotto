/* ===========================================================================
   STAR-CRUSH // MEGALOTTO — R3D: the WebGL race renderer (Three.js r170)
   Matthews Operations Lab // Interactive Division
 ----------------------------------------------------------------------------
   The game logic is unchanged: everything still lives in "track space"
   (x ∈ [-1,1] lateral, y ∈ [-.75,.75] vertical, z = distance ahead).
   This module turns that track into a real 3D roller-coaster:

     trk(d) curvature  →  integrated yaw / pitch / roll frames every metre
     track-space point →  world point on that rolling frame
     camera            →  rides the frame, so the world banks, climbs,
                          dives and barrel-rolls around you

   R3D.project() is installed as the game's P() so every 2D overlay
   (reticles, lasers, particles, labels) lands on the right 3D spot.
   =========================================================================== */
import * as THREE from 'three';
import {EffectComposer} from './lib/postprocessing/EffectComposer.js';
import {RenderPass} from './lib/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './lib/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from './lib/postprocessing/ShaderPass.js';
import {OutputPass} from './lib/postprocessing/OutputPass.js';

const SX=3.2,SY=2.4,SZ=2;                // track-space → metres
const V3=THREE.Vector3,QT=THREE.Quaternion,COL=THREE.Color;
let renderer,scene,camera,composer,bloom,fxPass,glc,route=null,shipObj=null,entRoot,skyMat,skyMesh,hemi,sun,earthG,marsM,phobosM,clouds=[];
const F={n:0,pos:null,q:[]};           // precomputed track frames
const MAP=new Map();                     // entity → Object3D
const TMP={p:new V3(),q:new QT(),q2:new QT(),r:new V3(),u:new V3(),f:new V3(),v:new V3(),w:new V3()};
const MOOD=[];let shipLocal={eng:[],tips:[]};let d0=10;

/* ---------- small helpers ---------- */
const C=h=>new COL(h);
function canvasTex(w,h,draw,repeat){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}t.anisotropy=4;return t}
const glowTex=canvasTex(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)});
const cloudTex=canvasTex(256,128,(x)=>{for(let i=0;i<3;i++)cloudBlob(x,128+rr(-30,30),76+rr(-6,6),rr(150,200),rr(30,40),'#ffffff','#7a7a92')});
const chevTex=canvasTex(128,64,(x,w,h)=>{x.fillStyle='rgba(12,6,24,.62)';x.fillRect(0,0,w,h);x.strokeStyle='#ffffff';x.lineWidth=7;x.lineJoin='miter';for(const o of[16,72]){x.beginPath();x.moveTo(o,10);x.lineTo(o+28,32);x.lineTo(o,54);x.stroke()}x.fillStyle='rgba(255,255,255,.9)';x.fillRect(0,0,w,3)},true);
const winTex=canvasTex(64,128,(x,w,h)=>{x.fillStyle='#120826';x.fillRect(0,0,w,h);for(let yy=4;yy<h;yy+=8)for(let xx=4;xx<w;xx+=8)if(Math.random()<.42){x.fillStyle=Math.random()<.7?'#ffd6a0':pick(['#ff5ab4','#3af0ff','#b07aff']);x.fillRect(xx,yy,4,4)}},true);
const marsTex=canvasTex(512,256,(x,w,h)=>{x.fillStyle='#b0502a';x.fillRect(0,0,w,h);for(let i=0;i<260;i++){x.fillStyle=`rgba(${rr(60,180)|0},${rr(20,60)|0},${rr(10,30)|0},${rr(.1,.35)})`;x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,rr(6,60),rr(4,24),Math.random()*3,0,TAU);x.fill()}x.fillStyle='rgba(255,240,230,.85)';x.fillRect(0,0,w,10);x.fillRect(0,h-8,w,8)});
const gradMap=(()=>{const d=new Uint8Array([70,150,255]);const t=new THREE.DataTexture(d,3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t})();
function textTex(txt,col){return canvasTex(256,64,(x,w,h)=>{x.fillStyle='rgba(40,0,40,.55)';x.fillRect(0,0,w,h);x.strokeStyle=col;x.lineWidth=3;x.strokeRect(2,2,w-4,h-4);x.font='900 22px Orbitron,sans-serif';x.textAlign='center';x.fillStyle='#ffd0f6';x.fillText(String(txt).slice(0,22),w/2,40)})}
const TXT=new Map();function textCached(t){if(!TXT.has(t))TXT.set(t,textTex(t,'#ff2bd6'));return TXT.get(t)}

/* ---------- leg moods → colours (blended on leg change) ---------- */
function buildMoods(){LEGS.forEach((L,i)=>{const M=L.mood,s=M.sun;MOOD[i]={top:C(M.sky[0]),mid:C(M.sky[1]),hor:C(M.sky[2]),b0:C(M.below[0]),b1:C(M.below[1]),haze:C(M.haze),
  sunC:s?C(s.c):C('#000000'),sunDir:new V3(s?s.x*1.3:.3,s?s.y*1.5+.03:.2,-1).normalize(),sunSize:s?s.r*.0011:0,stars:M.stars?1:0,stripes:s&&s.stripes?1:0,
  grid:C(L.pal.grid),grid2:C(L.pal.grid2),rim:C(M.rim),fogFar:L.under?330:L.tunnel?800:(M.stars?1100:760),fogNear:L.under?25:L.tunnel?140:110}})}
const cur={};function moodNow(){const a=MOOD[RC.prevLeg]||MOOD[0],b=MOOD[RC.leg]||MOOD[0],k=RC.legBlend;
 for(const key of['top','mid','hor','b0','b1','haze','sunC','grid','grid2','rim']){cur[key]=(cur[key]||new COL()).copy(a[key]).lerp(b[key],k)}
 cur.sunDir=(cur.sunDir||new V3()).copy(a.sunDir).lerp(b.sunDir,k).normalize();
 for(const key of['sunSize','stars','stripes','fogFar','fogNear'])cur[key]=a[key]+(b[key]-a[key])*k;return cur}

/* ---------- track frames ---------- */
function buildFrames(){const tot=RC.total+320,n=Math.ceil(tot)+2;F.n=n;F.pos=new Float32Array(n*3);F.q=new Array(n);
 const p=new V3(),e=new THREE.Euler(0,0,0,'YXZ'),fw=new V3();let yaw=0;
 for(let i=0;i<n;i++){const T=trk(Math.min(i,RC.total-1));yaw+=T.cx*.0105;const pitch=cl(-T.cy*.38,-.62,.62);e.set(pitch,yaw,T.roll);const q=new QT().setFromEuler(e);F.q[i]=q;
  F.pos[i*3]=p.x;F.pos[i*3+1]=p.y;F.pos[i*3+2]=p.z;fw.set(0,0,-1).applyQuaternion(q);p.addScaledVector(fw,SZ)}}
function frameAt(d,outP,outQ){if(d<0){outQ.copy(F.q[0]);outP.set(F.pos[0],F.pos[1],F.pos[2]);TMP.f.set(0,0,-1).applyQuaternion(outQ);outP.addScaledVector(TMP.f,d*SZ);return}
 const f=Math.min(d,F.n-1.001),i=Math.floor(f),k=f-i;outP.set(F.pos[i*3]+(F.pos[i*3+3]-F.pos[i*3])*k,F.pos[i*3+1]+(F.pos[i*3+4]-F.pos[i*3+1])*k,F.pos[i*3+2]+(F.pos[i*3+5]-F.pos[i*3+2])*k);outQ.slerpQuaternions(F.q[i],F.q[i+1],k)}
function abs(d,x,y,out,qOut){const q=qOut||TMP.q2;frameAt(d,out,q);TMP.r.set(1,0,0).applyQuaternion(q);TMP.u.set(0,1,0).applyQuaternion(q);return out.addScaledVector(TMP.r,x*SX).addScaledVector(TMP.u,-y*SY)}
function t2w(x,y,z,out,qOut){return abs(RC.dist+z,x,y,out||new V3(),qOut)}

/* ---------- materials & shared geometry ---------- */
const GEO={},MAT={};
function shared(){
 const ico=new THREE.IcosahedronGeometry(1,1);const pa=ico.attributes.position;for(let i=0;i<pa.count;i++){const v=new V3().fromBufferAttribute(pa,i);v.multiplyScalar(.78+Math.random()*.38);pa.setXYZ(i,v.x,v.y,v.z)}ico.computeVertexNormals();GEO.rock=ico;
 GEO.oct=new THREE.OctahedronGeometry(1,0);GEO.sq=new THREE.TorusGeometry(1,.07,6,4);GEO.ring=new THREE.TorusGeometry(1,.05,6,40);GEO.box=new THREE.BoxGeometry(1,1,1);GEO.cyl=new THREE.CylinderGeometry(1,1,1,10,1,true);GEO.sph=new THREE.SphereGeometry(1,32,16);
 GEO.disk=new THREE.RingGeometry(1.25,2.4,64,1);GEO.plane=new THREE.PlaneGeometry(1,1);
 const tower=new THREE.BoxGeometry(1,1,1);tower.translate(0,.5,0);GEO.tower=tower;const mesa=new THREE.CylinderGeometry(.42,.55,1,7);mesa.translate(0,.5,0);GEO.mesa=mesa;
 MAT.rock=new THREE.MeshStandardMaterial({color:'#4a3060',roughness:.85,flatShading:true,emissive:'#14061e'});
 MAT.fire=new THREE.MeshStandardMaterial({color:'#5a2010',roughness:.6,flatShading:true,emissive:'#ff5a10',emissiveIntensity:.9});
 MAT.rockOb=new THREE.MeshStandardMaterial({color:'#9a6cc4',roughness:.6,flatShading:true,emissive:'#6a1f8f',emissiveIntensity:1.1});
 MAT.edgeHaz=new THREE.MeshBasicMaterial({color:new COL('#ff4fd8').multiplyScalar(1.8),side:THREE.BackSide,toneMapped:false});
 MAT.edgeRed=new THREE.MeshBasicMaterial({color:new COL('#ff3355').multiplyScalar(1.8),side:THREE.BackSide,toneMapped:false});
 MAT.drone=new THREE.MeshStandardMaterial({color:'#1c4a5e',roughness:.3,metalness:.5,flatShading:true,emissive:'#30c8ff',emissiveIntensity:1.6});
 MAT.gate=new THREE.MeshBasicMaterial({color:new COL('#ffd23f').multiplyScalar(2.2),toneMapped:false});
 MAT.gateUsed=new THREE.MeshBasicMaterial({color:'#5a4a18',toneMapped:false});
 MAT.red=new THREE.MeshBasicMaterial({color:new COL('#ff3355').multiplyScalar(2.5),toneMapped:false});
 MAT.green=new THREE.MeshBasicMaterial({color:new COL('#7dff6b').multiplyScalar(2),toneMapped:false});
 MAT.cyan=new THREE.MeshBasicMaterial({color:new COL('#19f3ff').multiplyScalar(2),toneMapped:false});
 MAT.gold=new THREE.MeshStandardMaterial({color:'#ffd23f',metalness:.9,roughness:.25,emissive:'#ffb000',emissiveIntensity:.7});
 MAT.metal=new THREE.MeshStandardMaterial({color:'#2a2e3c',metalness:.7,roughness:.4});
 MAT.panel=new THREE.MeshStandardMaterial({color:'#2a3a8a',metalness:.4,roughness:.3,emissive:'#0a1440'});
 MAT.black=new THREE.MeshBasicMaterial({color:'#000000'});
 MAT.mesa=new THREE.MeshStandardMaterial({color:'#9a4232',roughness:.95,flatShading:true});
 MAT.megaRock=new THREE.MeshStandardMaterial({color:'#b0503a',roughness:.9,flatShading:true,emissive:'#3a0c06',emissiveIntensity:1});
 MAT.hullD=new THREE.MeshStandardMaterial({color:'#5a6488',metalness:.5,roughness:.4,flatShading:true,emissive:'#2a3466',emissiveIntensity:1.3});
 MAT.reef=new THREE.MeshStandardMaterial({color:'#2a6a6a',roughness:.85,flatShading:true,emissive:'#06303a',emissiveIntensity:1});
 MAT.orange=new THREE.MeshBasicMaterial({color:new COL('#ff7a20').multiplyScalar(2.4),toneMapped:false});
 MAT.pink=new THREE.MeshBasicMaterial({color:new COL('#ff4fd8').multiplyScalar(2.4),toneMapped:false});
 MAT.tower=new THREE.MeshStandardMaterial({color:'#1a1030',roughness:.6,metalness:.2,emissiveMap:winTex,emissive:'#ffffff',emissiveIntensity:1.4,map:winTex});
 MAT.disk=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uT:{value:0}},
  vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uT;varying vec2 vP;void main(){float r=length(vP);float a=atan(vP.y,vP.x);float s=.5+.5*sin(a*6.-uT*4.+r*6.);float k=smoothstep(2.4,1.3,r)*smoothstep(1.2,1.4,r);vec3 c=mix(vec3(1.,.45,.15),vec3(1.,.95,.8),smoothstep(2.2,1.3,r));gl_FragColor=vec4(c*(.6+.6*s)*k*1.6,k);}'});
}
function glow(col,size){const m=new THREE.SpriteMaterial({map:glowTex,color:col,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,toneMapped:false});const s=new THREE.Sprite(m);s.scale.setScalar(size);return s}

/* ---------- ship mesh from the game's own 3D mesh builder ---------- */
function meshFromShip(cf,tint){const M=shipMesh(cf),pos=[],col=[],c=new COL();
 const tv=v=>[v[0]*1.45,-v[1]*1.45,-v[2]*1.45];
 for(const fc of M.F){const vs=fc.v.map(i=>tv(M.V[i]));c.set(tint||fc.c);if(fc.glass)c.multiplyScalar(1.4);
  for(let k=1;k<vs.length-1;k++)for(const v of[vs[0],vs[k],vs[k+1]]){pos.push(...v);col.push(c.r,c.g,c.b)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
 const grp=new THREE.Group();
 const body=new THREE.Mesh(g,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:gradMap,side:THREE.DoubleSide}));grp.add(body);
 const ol=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:'#07040f',side:THREE.BackSide}));ol.scale.setScalar(1.06);grp.add(ol);
 for(const[a,b]of M.G){const A=new V3(...tv(M.V[a])),B=new V3(...tv(M.V[b])),len=A.distanceTo(B),m=new THREE.Mesh(GEO.cyl,MAT.metal);m.scale.set(.035,len,.035);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),B.clone().sub(A).normalize());grp.add(m)}
 const eng=M.E.map(i=>new V3(...tv(M.V[i]))),tips=M.tips.map(i=>new V3(...tv(M.V[i])));
 return{grp,eng,tips}}
function buildShip(){if(shipObj){scene.remove(shipObj.grp)}const cf=RC.ship,s=meshFromShip(cf);s.flames=s.eng.map(p=>{const g=glow(new COL(cf.t.col).multiplyScalar(1.6),.6);g.position.copy(p);s.grp.add(g);const c=glow(new COL('#ffffff').multiplyScalar(1.6),.24);c.position.copy(p);s.grp.add(c);return[g,c]});
 s.light=new THREE.PointLight(cf.t.col,2,6,2);s.light.position.set(0,0,1.4);s.grp.add(s.light);shipObj=s;scene.add(s.grp);shipLocal={eng:s.eng,tips:s.tips}}
const RIVAL_GEO={};function racerMesh(colHex,gold){const key=colHex+(gold?'g':'');if(!RIVAL_GEO[key]){const cf={h:PARTS.hull[gold?4:0],t:{id:'r'+key,col:colHex},p:{id:'r'+key,col:gold?'#ffd23f':'#2a2440'},c:{id:'none'},g:{id:'twin'},d:{id:'r'+key,col:colHex}};RIVAL_GEO[key]=cf}
 const r=meshFromShip(RIVAL_GEO[key],gold?null:null);r.eng.forEach(p=>{const g=glow(new COL(colHex).multiplyScalar(2.4),1.1);g.position.copy(p);r.grp.add(g)});if(gold)r.grp.scale.setScalar(1.5);return r.grp}

/* ---------- entities ---------- */
function makeEnt(e){const g=new THREE.Group();let m;
 switch(e.t){
  case'rock':m=new THREE.Mesh(GEO.rock,e.fire?MAT.fire:MAT.rockOb);g.add(m);{const ed=new THREE.Mesh(GEO.rock,e.fire?MAT.edgeRed:MAT.edgeHaz);ed.scale.setScalar(1.13);g.add(ed)}if(!e.fire)g.add(glow(new COL('#ff4fd8').multiplyScalar(1.1),2.6));if(e.fire)g.add(glow(new COL('#ff7a20').multiplyScalar(1.6),3.2));if(e.moss){const c=new THREE.Mesh(GEO.box,MAT.green);c.scale.set(1.1,.08,1.1);c.position.y=.82;g.add(c)}g.userData.spin=new V3(Math.random(),Math.random(),Math.random()).normalize();break;
  case'drone':m=new THREE.Mesh(GEO.oct,MAT.drone);m.scale.set(1.5,.6,1);g.add(m);{const ed=new THREE.Mesh(GEO.oct,MAT.edgeRed);ed.scale.set(1.7,.72,1.15);g.add(ed)}{const eye=new THREE.Mesh(GEO.sph,MAT.red);eye.scale.setScalar(.32);eye.position.z=.6;g.add(eye);g.add(glow(new COL('#ff3355').multiplyScalar(2.6),2.6));const tg=glow(new COL('#ffffff').multiplyScalar(2),.01);g.add(tg);g.userData.tell=tg}break;
  case'gate':m=new THREE.Mesh(GEO.sq,MAT.gate);m.rotation.z=Math.PI/4;m.scale.setScalar(1.41);g.add(m);g.userData.m=m;break;
  case'pad':g.add(new THREE.Mesh(GEO.ring,MAT.cyan));for(let k=0;k<3;k++)for(const s of[-1,1]){const b=new THREE.Mesh(GEO.box,MAT.green);b.scale.set(.75,.08,.05);b.position.set(s*.32,-.4+k*.42,0);b.rotation.z=-s*.6;g.add(b)}break;
  case'coin':m=new THREE.Mesh(GEO.oct,MAT.gold);m.scale.set(.7,1,.7);g.add(m);g.add(glow(new COL('#ffd23f').multiplyScalar(1.6),2.2));break;
  case'repair':g.add(new THREE.Mesh(GEO.ring,MAT.green));{const a=new THREE.Mesh(GEO.box,MAT.green);a.scale.set(.25,1,.1);g.add(a);const b=a.clone();b.scale.set(1,.25,.1);g.add(b)}break;
  case'laser':{const beam=new THREE.Mesh(GEO.cyl,new THREE.MeshBasicMaterial({color:new COL('#ff3355').multiplyScalar(3),toneMapped:false,transparent:true}));g.add(beam);g.userData.beam=beam;
   for(const s of[-1,1]){const py=new THREE.Mesh(GEO.box,MAT.metal);py.scale.setScalar(.6);g.add(py);(g.userData.py||(g.userData.py=[])).push(py)}}break;
  case'beam':{const col=new COL(e.c).multiplyScalar(3.2);const b=new THREE.Mesh(GEO.cyl,new THREE.MeshBasicMaterial({color:col,toneMapped:false,transparent:true}));g.add(b);g.userData.beam=b;
   const core=new THREE.Mesh(GEO.cyl,new THREE.MeshBasicMaterial({color:new COL('#ffffff').multiplyScalar(3),toneMapped:false,transparent:true}));g.add(core);g.userData.core=core}break;
  case'well':{const core=new THREE.Mesh(GEO.sph,MAT.black);core.scale.setScalar(.3);g.add(core);const d=new THREE.Mesh(GEO.disk,MAT.disk);d.scale.setScalar(.42);d.rotation.x=1.25;g.add(d);g.userData.disk=d;
   const lens=new THREE.Mesh(GEO.ring,new THREE.MeshBasicMaterial({color:new COL('#9ad8ff').multiplyScalar(1.4),toneMapped:false,transparent:true,opacity:.6}));g.add(lens);g.add(glow(new COL('#ffb070').multiplyScalar(1.2),3))}break;
  case'adsat':{const b=new THREE.Mesh(GEO.box,MAT.metal);b.scale.setScalar(.6);g.add(b);g.add(glow(new COL('#ffd23f').multiplyScalar(1.4),3));{const ed=new THREE.Mesh(GEO.box,MAT.edgeHaz);ed.scale.setScalar(.7);g.add(ed)}for(const s of[-1,1]){const p=new THREE.Mesh(GEO.box,MAT.panel);p.scale.set(1,.35,.05);p.position.x=s*.95;g.add(p)}
   const t=new THREE.Mesh(GEO.plane,new THREE.MeshBasicMaterial({map:textCached(e.txt),transparent:true,toneMapped:false,side:THREE.DoubleSide}));t.scale.set(3.2,.8,1);t.position.y=1.1;g.add(t)}break;
  case'tower':if(e.style==='mesa'){m=new THREE.Mesh(GEO.mesa,MAT.mesa);g.add(m)}else{m=new THREE.Mesh(GEO.tower,MAT.tower);g.add(m);const cap=new THREE.Mesh(GEO.box,new THREE.MeshBasicMaterial({color:new COL(e.col).multiplyScalar(2.2),toneMapped:false}));cap.scale.set(1.02,.03,1.02);cap.position.y=1;g.add(cap)}g.userData.m=m;break;
  case'mega':megaMesh(e,g);break;
  case'rival':g.add(racerMesh(RC.rivals[e.ri].c,false));break;
  case'bully':g.add(racerMesh(e.c,false));break;
  case'target':g.add(racerMesh('#ffd23f',true));break;
  default:return null}
 return g}
function megaMesh(e,g){const W=(e.x1-e.x0)*SX,H=(e.y1-e.y0)*SY,cx=(e.x0+e.x1)/2*SX,cy=-(e.y0+e.y1)/2*SY,D=(e.k==='destroyer'?7:5)*SZ,box=(mat,w,h,d,x,y,z)=>{const m=new THREE.Mesh(GEO.box,mat);m.scale.set(w,h,d);m.position.set(x,y,z);g.add(m);return m};
 const ex=(e.s>0?e.x1:e.x0)*SX,ey=-(e.s<0?e.y0:e.y1)*SY;g.userData.muz=[];
 if(e.k==='mesa'||e.k==='reef'){const RM=e.k==='reef'?MAT.reef:MAT.megaRock,EC=e.k==='reef'?'#5af0ff':'#ff7a20';const geo=new THREE.BoxGeometry(1,1,1,7,9,3),pa=geo.attributes.position;for(let i=0;i<pa.count;i++){const y=pa.getY(i),k=.5-y;pa.setX(i,pa.getX(i)*(1-k*.08)+(Math.random()-.5)*.05);pa.setZ(i,pa.getZ(i)+(Math.random()-.5)*.08)}geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,RM);m.scale.set(W,H,D);m.position.set(cx,cy,-D/2);g.add(m);
  for(let i=0;i<4;i++){const r=new THREE.Mesh(GEO.rock,RM);const sc=W*(.16+Math.random()*.14);r.scale.set(sc,sc*1.6,sc);r.position.set(cx+(i-1.5)*W*.22,cy+H/2+sc*.6,-D*(.3+Math.random()*.4));g.add(r)}
  box(e.k==='reef'?MAT.cyan:MAT.orange,.22,H,.22,ex-e.s*.12,cy,.05);for(let k=0;k<6;k++){const s=glow(new COL(EC).multiplyScalar(1.6),3);s.position.set(ex,cy-H/2+H*(k+.5)/6,.3);g.add(s)}}
 else if(e.k==='tower'){const tex=winTex.clone();tex.needsUpdate=true;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(3,6);const mat=MAT.tower.clone();mat.map=tex;mat.emissiveMap=tex;
  box(mat,W,H,D,cx,cy,-D/2);box(MAT.pink,W*1.02,.3,D*1.02,cx,cy+H/2,-D/2);box(MAT.pink,.24,H,.24,ex-e.s*.12,cy,.05);box(MAT.cyan,W*1.01,.12,.12,cx,cy+H*.25,.04);
  const an=box(MAT.metal,.15,6,.15,cx,cy+H/2+3,-D/2);const b=glow(new COL('#ff3355').multiplyScalar(2),2.4);b.position.set(cx,cy+H/2+6,-D/2);g.add(b)}
 else{box(MAT.hullD,W,H,D,cx,cy,-D/2);box(MAT.hullD,W*.92,H*.7,D*.6,cx,cy,-D*1.2);
  for(let k=1;k<5;k++)box(MAT.panel,W,.08,.1,cx,cy-H/2+H*k/5,.03);for(let k=-6;k<=6;k++)box(MAT.metal,.12,H,.12,cx+k*W/14,cy,.04);
  box(MAT.red,W,.18,.2,cx,ey,.06);const tz=-D*.3;
  for(let i=0;i<5;i++){const tx=(i-2)*.4*e.XL*.95*SX,dir=e.s<0?1:-1,base=box(MAT.metal,1.3,.7,1.3,tx,ey+dir*.35,tz);base.material=MAT.hullD;
   const bar=new THREE.Mesh(GEO.cyl,MAT.metal);bar.scale.set(.14,2.4,.14);bar.rotation.x=Math.PI/2;bar.position.set(tx,ey+dir*.5,tz+1.4);g.add(bar);
   const mz=glow(new COL('#ff7a20').multiplyScalar(2.2),.01);mz.position.set(tx,ey+dir*.5,tz+2.7);g.add(mz);g.userData.muz.push(mz)}
  for(let k=0;k<10;k++){const s=glow(new COL('#ff3355').multiplyScalar(1.5),1.6);s.position.set(cx-W*.45+W*.9*k/9,ey,.3);g.add(s)}
  {const oy=-(e.s<0?e.y1:e.y0)*SY,od=e.s<0?-1:1;box(MAT.hullD,W*.5,2.2,D*.8,cx-W*.08,oy+od*1.1,-D*.55);box(MAT.hullD,W*.16,3.4,D*.5,cx+W*.06,oy+od*3.2,-D*.5);
   box(MAT.cyan,W*.15,.16,.1,cx+W*.06,oy+od*3.6,-D*.25+.02);box(MAT.cyan,W*.48,.12,.1,cx-W*.08,oy+od*1.2,-D*.15+.02);box(MAT.metal,.12,3,.12,cx+W*.1,oy+od*6.2,-D*.5);
   for(let k=0;k<14;k++)box(MAT.cyan,.35,.18,.08,cx-W*.42+W*.84*k/13,cy+(e.s<0?1:-1)*H*.3,.05)}
  for(const sx of[-1,1]){const s=glow(new COL('#19f3ff').multiplyScalar(1.8),9);s.position.set(cx+sx*W*.47,cy,-D*.6);g.add(s)}}}
function placeEnt(e,o,t){const q=TMP.q;
 if(e.t==='laser'||e.t==='beam'){t2w(0,0,Math.max(e.z,-2),o.position,q);o.quaternion.copy(q)}
 else if(e.t==='tower'){t2w(e.x,1.5,e.z,o.position,q);o.quaternion.copy(q);o.userData.m.scale.set(e.w*SX,e.h*SY,e.w*SX);if(o.children[1]){o.children[1].scale.set(e.w*SX*1.02,.25,e.w*SX*1.02);o.children[1].position.y=e.h*SY}return}
 else if(e.t==='mega'){t2w(0,0,e.z,o.position,q);o.quaternion.copy(q)}
 else{t2w(e.x,e.y,e.z,o.position,q);o.quaternion.copy(q)}
 const fade=cl((96-e.z)/26,0,1);o.visible=fade>.02;
 switch(e.t){
  case'rock':o.scale.setScalar(e.r*SX*.95);o.rotateOnAxis(o.userData.spin,e.rot);break;
  case'drone':o.scale.setScalar(.2*SX*1.5);o.rotateY(Math.sin(t*2+e.ph)*.5);if(o.userData.tell){const on=e.f<.4&&e.z<55&&e.z>8;o.userData.tell.scale.setScalar(on?3.2+Math.sin(t*40):.01)}break;
  case'gate':o.scale.setScalar(e.r*SX);o.userData.m.material=e.hit?MAT.gateUsed:MAT.gate;break;
  case'pad':o.scale.setScalar(e.r*SX);break;
  case'coin':o.scale.setScalar(.09*SX*1.5);o.rotateY(t*6+e.z);break;
  case'repair':o.scale.setScalar(.13*SX*1.3);o.rotateZ(t*2);break;
  case'laser':{const on=Math.sin(t*TAU/e.per+e.ph)>-.15,b=o.userData.beam;b.material.opacity=on?1:.18;const th=on?.11:.03;
   if(e.vert){b.position.set(e.p*SX,0,0);b.rotation.set(0,0,0);b.scale.set(th,2.7*SY,th);o.userData.py[0].position.set(e.p*SX,1.35*SY,0);o.userData.py[1].position.set(e.p*SX,-1.35*SY,0)}
   else{b.position.set(0,-e.p*SY,0);b.rotation.set(0,0,Math.PI/2);b.scale.set(th,2.5*SX,th);o.userData.py[0].position.set(-1.25*SX,-e.p*SY,0);o.userData.py[1].position.set(1.25*SX,-e.p*SY,0)}}break;
  case'beam':{const ux=Math.cos(e.ang),uy=Math.sin(e.ang),cx=-uy*e.off*SX,cy=-(ux*e.off)*SY,live=e.z<30,b=o.userData.beam,c=o.userData.core,ang=Math.atan2(-uy*SY,ux*SX);
   for(const m of[b,c]){m.position.set(cx,cy,0);m.rotation.set(0,0,ang-Math.PI/2)}const th=live?.16:.025;b.scale.set(th,9*SX,th);c.scale.set(th*.35,9*SX,th*.35);b.material.opacity=live?1:(.4+.4*Math.sin(t*20));c.material.opacity=live?1:0}break;
  case'well':o.scale.setScalar(e.r*SX);o.userData.disk.rotation.z=t*1.5;MAT.disk.uniforms.uT.value=t;break;
  case'mega':o.visible=true;o.userData.muz.forEach((m,i)=>m.scale.setScalar(e.mf>0&&e.mi===i?4.5:.01));break;
  case'adsat':o.scale.setScalar(.22*SX*1.4);o.rotateZ(Math.sin(t+e.z)*.2);break;
  case'rival':o.rotateZ(Math.sin(t*1.4+e.ph)*.3);break;
  case'bully':o.rotateZ(e.bank||0);break;
  case'target':o.rotateZ(Math.sin(t)*.25);break}}
function syncEntities(t){const seen=new Set(),list=RC.E.slice();if(RC.target&&RC.target.state===1)list.push(RC.target);
 for(const e of list){let o=MAP.get(e);if(!o){o=makeEnt(e);if(!o)continue;MAP.set(e,o);entRoot.add(o)}seen.add(e);placeEnt(e,o,t)}
 for(const[e,o]of MAP)if(!seen.has(e)){entRoot.remove(o);MAP.delete(e)}}

/* ---------- route: rails, floor, barrier walls, ground, wormhole, scenery ---------- */
function legRange(i){const a=(i?LEG_END[i-1]:0)*RC.total,b=LEG_END[i]*RC.total;return[a,b]}
function legColorAt(d,key){const pr=cl(d/RC.total,0,.9999),i=legAt(pr),[a]=legRange(i),k=i?sstep((d-a)/140):1;return new COL(LEGS[Math.max(0,i-1)].pal[key]).lerp(new COL(LEGS[i].pal[key]),k)}
function rail(x,y,key,radius,mult){const pts=[],cols=[],step=3,P=new V3();for(let d=-8;d<=RC.total+300;d+=step){pts.push(abs(d,x,y,P).clone());cols.push(legColorAt(Math.max(0,d),key).multiplyScalar(mult))}
 const curve=new THREE.CatmullRomCurve3(pts),segs=pts.length*2,rad=5,g=new THREE.TubeGeometry(curve,segs,radius,rad,false),ca=new Float32Array(g.attributes.position.count*3);
 for(let i=0;i<=segs;i++){const c=cols[Math.min(cols.length-1,Math.round(i/segs*(cols.length-1)))];for(let j=0;j<=rad;j++){const k=(i*(rad+1)+j)*3;ca[k]=c.r;ca[k+1]=c.g;ca[k+2]=c.b}}
 g.setAttribute('color',new THREE.BufferAttribute(ca,3));return new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}))}
function ribbon(d0,d1,xs,y,step,mat,colKey,uScale){const P=new V3(),pos=[],uv=[],col=[],idx=[];let row=0;
 for(let d=d0;d<=d1;d+=step){const c=colKey?legColorAt(Math.max(0,d),colKey):null;xs.forEach((x,j)=>{const yy=Array.isArray(y)?y[j]:y;abs(d,x,yy,P);pos.push(P.x,P.y,P.z);uv.push(j/(xs.length-1),d*(uScale||1));if(c)col.push(c.r,c.g,c.b);else col.push(1,1,1)});
  if(row>0){const n=xs.length,b=(row-1)*n;for(let j=0;j<n-1;j++){idx.push(b+j,b+n+j,b+j+1,b+j+1,b+n+j,b+n+j+1)}}row++}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();return new THREE.Mesh(g,mat)}
const FOGU={uFogCol:{value:new COL()},uFogNear:{value:60},uFogFar:{value:520},uT:{value:0}};
const fogV='varying float vD;varying vec2 vUv;varying vec3 vCol;void main(){vUv=uv;vCol=color;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}';
const floorMat=()=>new THREE.ShaderMaterial({uniforms:FOGU,vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:fogV,
 fragmentShader:`uniform vec3 uFogCol;uniform float uFogNear,uFogFar;varying float vD;varying vec2 vUv;varying vec3 vCol;
 void main(){float a=vUv.y;float fr=fract(a/3.);float rung=smoothstep(.07,0.,min(fr,1.-fr));float ac=vUv.x*6.;float fl=fract(ac);float lane=smoothstep(.06,0.,min(fl,1.-fl))*.6;
 float ax=abs(vUv.x-.5)*2.;float cv=fract(a/12.);float chev=smoothstep(.035,0.,abs(cv-(.1+ax*.12)))*step(ax,.36);
 float l=max(rung,max(lane,chev*1.3));float f=smoothstep(uFogNear,uFogFar,vD);vec3 c=vCol*l*1.35+vec3(.015,.008,.03);gl_FragColor=vec4(mix(c,uFogCol,f*.85),(.1+l*.6)*(1.-f*.75));}`});
const waterMat=()=>new THREE.ShaderMaterial({uniforms:Object.assign({uSky:{value:new COL()},uSun:{value:new COL()}},FOGU),vertexColors:true,vertexShader:fogV,
 fragmentShader:`uniform vec3 uFogCol,uSky,uSun;uniform float uFogNear,uFogFar,uT;varying float vD;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 p=vec2(vUv.x*60.,vUv.y*.6);float w=sin(p.x*1.3+uT*1.5)*sin(p.y*2.1-uT*2.)*.5+.5;float sp=step(.985,h(floor(p*vec2(3.,6.))+floor(uT*6.)))*smoothstep(.2,.8,w);
 float cent=smoothstep(.25,0.,abs(vUv.x-.5));vec3 c=mix(vec3(.02,.12,.2),uSky*.55,.35+w*.25);c+=uSun*cent*(.25+w*.5);c+=vec3(1.,.8,.9)*sp*1.5;
 float f=smoothstep(uFogNear,uFogFar*1.3,vD);gl_FragColor=vec4(mix(c,uFogCol,f),1.);}`});
const dustMat=()=>new THREE.ShaderMaterial({uniforms:FOGU,vertexColors:true,vertexShader:fogV,
 fragmentShader:`uniform vec3 uFogCol;uniform float uFogNear,uFogFar;varying float vD;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 p=vec2(vUv.x*80.,vUv.y*.5);float n=h(floor(p))*.5+h(floor(p*.25))*.5;vec3 c=mix(vec3(.32,.12,.08),vec3(.62,.3,.2),n);float f=smoothstep(uFogNear,uFogFar,vD);gl_FragColor=vec4(mix(c,uFogCol,f),1.);}`});
const tunnelMat=()=>new THREE.ShaderMaterial({uniforms:FOGU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
 vertexShader:'varying vec2 vUv;varying float vD;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}',
 fragmentShader:`uniform float uT;varying vec2 vUv;varying float vD;vec3 hsv(float h){return clamp(abs(fract(h+vec3(0.,.666,.333))*6.-3.)-1.,0.,1.);}
 void main(){float a=vUv.x*400.;float st=smoothstep(.42,.5,abs(fract(vUv.y*12.+a*.01+uT*.25)-.5));float rg=smoothstep(.85,1.,fract(a*.18-uT*1.5));vec3 c=hsv(fract(vUv.y+a*.004-uT*.1));
 float k=(st*.45+rg*.7)*smoothstep(500.,40.,vD)*smoothstep(4.,16.,vD);gl_FragColor=vec4(c*k*.85,1.);}`});
function buildRoute(){if(route){scene.remove(route);route.traverse(n=>{if(n.geometry&&!Object.values(GEO).includes(n.geometry))n.geometry.dispose();if(n.material&&n.material.dispose&&!Object.values(MAT).includes(n.material))n.material.dispose()})}
 route=new THREE.Group();scene.add(route);const end=RC.total+300;
 for(const s of[-1.3,1.3])route.add(rail(s,1.5,'grid',.08,1.7));
 for(const s of[-1.8,1.8])route.add(rail(s,1.02,'grid2',.05,1.6));
 route.add(ribbon(-8,end,[-1.8,-1.2,-.6,0,.6,1.2,1.8],1.5,2,floorMat(),'grid'));
 const wm=new THREE.MeshBasicMaterial({map:chevTex,vertexColors:true,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
 for(const s of[-1.8,1.8]){const w=ribbon(-8,end,[s,s],[1.5,1.02],2,wm,'grid2',.33);const uv=w.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getY(i),i%2);route.add(w)}
 // per-leg grounds & scenery
 if(RC.run){const P=new V3(),Q=new QT(),pg=new THREE.Group();abs(RC.total+4,0,0,P,Q);pg.position.copy(P);pg.quaternion.copy(Q);
  const ring=new THREE.Mesh(GEO.ring,MAT.cyan);ring.scale.setScalar(2.6*SX);pg.add(ring);const r2=new THREE.Mesh(GEO.ring,MAT.pink);r2.scale.setScalar(2.2*SX);pg.add(r2);
  const d=new THREE.Mesh(GEO.sph,new THREE.MeshBasicMaterial({color:new COL('#bff8ff').multiplyScalar(1.6),toneMapped:false,transparent:true,opacity:.55,depthWrite:false}));d.scale.set(2.3*SX,2.3*SX,.5);pg.add(d);
  pg.add(glow(new COL('#5af0ff').multiplyScalar(2),9*SX));route.add(pg);route.userData.portal=pg}
 LEGS.forEach((L,i)=>{const[a,b]=legRange(i);
  if(L.under){const sand=dustMat();sand.fragmentShader=sand.fragmentShader.replace('vec3(.32,.12,.08),vec3(.62,.3,.2)','vec3(.04,.16,.18),vec3(.16,.34,.3)');route.add(ribbon(a-30,b+20,[-90,-30,-8,-2.2,2.2,8,30,90],2.1,4,sand,null,.05));
   const sm=waterMat();sm.side=THREE.DoubleSide;route.add(ribbon(a-30,b+40,[-90,-30,-8,-2.2,2.2,8,30,90],-3.6,4,sm,null,.05));
   const im=new THREE.InstancedMesh(GEO.tower,MAT.tower,140),M4=new THREE.Matrix4(),P=new V3(),Q=new QT(),Sc=new V3();for(let k=0;k<140;k++){const d=a-20+Math.random()*(b-a+40),side=Math.random()<.5?-1:1;abs(d,side*rr(5,50),2.1,P,Q);Q.multiply(new QT().setFromAxisAngle(new V3(0,0,1),rr(-.25,.25)));Sc.set(rr(6,16),rr(14,30),rr(6,16));M4.compose(P,Q,Sc);im.setMatrixAt(k,M4)}im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();route.add(im);
   const rm=new THREE.MeshBasicMaterial({color:new COL('#9af8ff'),transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});for(let k=0;k<36;k++){const m=new THREE.Mesh(GEO.cyl,rm);abs(a+Math.random()*(b-a),rr(-6,6),-1,m.position,m.quaternion);m.rotateZ(rr(-.35,.35));m.scale.set(rr(.6,2.2),14,rr(.6,2.2));route.add(m)}}
  if(L.scen==='canyon'){route.add(ribbon(a-20,b+30,[-70,-20,-6,-2.2,2.2,6,20,70],[1.9,1.9,1.9,1.7,1.7,1.9,1.9,1.9],4,dustMat(),null,.05));
   const im=new THREE.InstancedMesh(GEO.mesa,MAT.mesa,140),M4=new THREE.Matrix4(),P=new V3(),Q=new QT(),Sc=new V3();for(let k=0;k<140;k++){const d=a+Math.random()*(b-a),side=Math.random()<.5?-1:1;abs(d,side*rr(5,30),1.9,P,Q);Sc.set(rr(6,22),rr(10,60),rr(6,22));M4.compose(P,Q,Sc);im.setMatrixAt(k,M4)}im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();route.add(im)}
  if(L.scen==='belt'){const im=new THREE.InstancedMesh(GEO.rock,MAT.rock,300),M4=new THREE.Matrix4(),P=new V3(),Q=new QT(),Sc=new V3();for(let k=0;k<300;k++){const d=a-40+Math.random()*(b-a+80),side=Math.random()<.5?-1:1;abs(d,side*rr(4,40),rr(-14,9),P,Q);Q.random();Sc.setScalar(rr(1.5,9));M4.compose(P,Q,Sc);im.setMatrixAt(k,M4)}im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();route.add(im)}
  if(L.tunnel){const pts=[],P=new V3();for(let d=a-10;d<=b+10;d+=4)pts.push(abs(d,0,0,P).clone());const tg=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*3,2.4*SX,24,false);route.add(new THREE.Mesh(tg,tunnelMat()))}
  if(L.scen==='fleet'){const mid=(a+b)/2;for(const s of[-1,1]){const ship=capitalShip(s<0?'#ff4a5a':'#5ab0ff');abs(mid+s*30,s*48,-14,ship.position,ship.quaternion);ship.rotateY(s*.3);ship.scale.setScalar(1.6);route.add(ship);(route.userData.caps||(route.userData.caps=[])).push(ship)}
   const bm=[];for(let k=0;k<6;k++){const m=new THREE.Mesh(GEO.cyl,new THREE.MeshBasicMaterial({color:new COL(k%2?'#5ab0ff':'#ff4a5a').multiplyScalar(3),toneMapped:false,transparent:true}));route.add(m);bm.push(m)}route.userData.beams={bm,a,b}}
  if(L.scen==='entry'){const g=new THREE.PlaneGeometry(6000,6000);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:cloudTex,color:'#ffc8a0',transparent:true,opacity:.85,depthWrite:false}));m.material.map=m.material.map.clone();m.material.map.wrapS=m.material.map.wrapT=THREE.RepeatWrapping;m.material.map.repeat.set(30,30);m.material.map.needsUpdate=true;
   const P=new V3(),Q=new QT();let lo=1e9;for(let d=a;d<=b+300;d+=10){abs(d,0,0,P,Q);lo=Math.min(lo,P.y)}abs((a+b)/2,0,0,P,Q);m.position.set(P.x,lo-90,P.z);route.userData.sea=m;m.rotation.x=-Math.PI/2;route.add(m)}
  if(L.water){const ext=i===LEGS.length-1?300:20;route.add(ribbon(a-30,b+ext,[-90,-30,-8,-2.2,2.2,8,30,90],1.7,3,waterMat(),null,.05));
   const im=new THREE.InstancedMesh(GEO.tower,MAT.tower,180),M4=new THREE.Matrix4(),P=new V3(),Q=new QT(),Sc=new V3();for(let k=0;k<180;k++){const d=a-20+Math.random()*(b-a+ext),side=Math.random()<.5?-1:1;abs(d,side*rr(9,70),1.7,P,Q);Sc.set(rr(8,20),rr(30,140),rr(8,20));M4.compose(P,Q,Sc);im.setMatrixAt(k,M4)}im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();route.add(im)}
  if(L.mood.clouds&&!L.tunnel){for(let k=0;k<26;k++){const d=a+Math.random()*(b-a),side=Math.random()<.5?-1:1,sp=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,color:new COL(L.mood.clouds.top).multiplyScalar(.85),transparent:true,depthWrite:false,opacity:.72}));abs(d,side*rr(38,130),rr(-40,-8),sp.position);sp.scale.set(rr(45,100),rr(20,40),1);route.add(sp)}}});}
function capitalShip(lit){const g=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:'#1a141e',metalness:.6,roughness:.5,emissive:'#05030a'});
 const add=(sx,sy,sz,x,y,z)=>{const m=new THREE.Mesh(GEO.box,hull);m.scale.set(sx,sy,sz);m.position.set(x,y,z);g.add(m)};
 add(14,10,120,0,0,0);add(22,6,60,0,-3,10);add(8,14,20,0,9,24);add(10,4,30,0,-8,-30);add(30,2,14,0,0,-50);
 const lm=new THREE.MeshBasicMaterial({color:new COL(lit).multiplyScalar(3),toneMapped:false});for(let k=0;k<14;k++){const m=new THREE.Mesh(GEO.box,lm);m.scale.set(.8,.8,.8);m.position.set((k%2?1:-1)*7.2,1,-54+k*8);g.add(m)}
 for(const s of[-1,1]){const e=glow(new COL(lit).multiplyScalar(2.5),18);e.position.set(s*4,0,62);g.add(e)}return g}

/* ---------- sky dome, planets ---------- */
function buildSky(){skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{cTop:{value:new COL()},cMid:{value:new COL()},cHor:{value:new COL()},cB0:{value:new COL()},cB1:{value:new COL()},haze:{value:new COL()},sunC:{value:new COL()},sunDir:{value:new V3(0,.2,-1)},sunSize:{value:.05},stars:{value:0},stripes:{value:0},t:{value:0}},
 vertexShader:'varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
 fragmentShader:`uniform vec3 cTop,cMid,cHor,cB0,cB1,haze,sunC,sunDir;uniform float sunSize,stars,stripes,t;varying vec3 vDir;
 float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
 void main(){vec3 d=normalize(vDir);float y=d.y;vec3 c;
  if(y>0.){c=mix(cHor,cMid,smoothstep(0.,.28,y));c=mix(c,cTop,smoothstep(.28,.9,y));}else{c=mix(cB0,cB1,smoothstep(0.,-.55,y));}
  c=mix(c,haze,exp(-abs(y)*14.)*.42);
  if(stars>0.){vec3 g=floor(d*260.);float s=h(g);c+=vec3(step(.9972,s)*(.6+.4*sin(t*3.+s*60.)))*stars;}
  vec3 sd0=normalize(sunDir);float sd=dot(d,sd0);float disc=smoothstep(cos(sunSize),cos(sunSize*.94),sd);
  if(stripes>0.){float yy=(d.y-sd0.y)/max(sunSize,.001);float band=step(.45,fract(yy*5.));disc*=mix(1.,band,step(yy,.15)*smoothstep(.15,-.9,yy));}
  c=mix(c,sunC*1.5,disc*step(.0001,sunSize));c+=sunC*(pow(max(sd,0.),60.)*.6+pow(max(sd,0.),5.)*.22);
  gl_FragColor=vec4(c,1.);}`});
 skyMesh=new THREE.Mesh(new THREE.SphereGeometry(3000,48,24),skyMat);skyMesh.renderOrder=-10;skyMesh.frustumCulled=false;scene.add(skyMesh);
 // Earth (NASA-derived Blue Marble day map, clouds and city lights from the three.js examples)
 const tl=new THREE.TextureLoader(),em=tl.load('./assets/earth_atmos_2048.jpg'),cm=tl.load('./assets/earth_clouds_1024.png'),lm=tl.load('./assets/earth_lights_2048.png');em.colorSpace=lm.colorSpace=THREE.SRGBColorSpace;
 earthG=new THREE.Group();const e=new THREE.Mesh(GEO.sph,new THREE.MeshStandardMaterial({map:em,emissiveMap:lm,emissive:'#ffcc88',emissiveIntensity:.9,roughness:.85,fog:false}));earthG.add(e);
 const cl=new THREE.Mesh(GEO.sph,new THREE.MeshStandardMaterial({map:cm,transparent:true,opacity:.85,depthWrite:false,fog:false}));cl.scale.setScalar(1.012);earthG.add(cl);earthG.userData.clouds=cl;
 const at=new THREE.Mesh(GEO.sph,new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
  vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vN;void main(){float k=pow(.72-dot(vN,vec3(0,0,1.)),3.);gl_FragColor=vec4(vec3(.35,.7,1.)*k*2.2,1.);}'}));at.scale.setScalar(1.18);earthG.add(at);scene.add(earthG);
 marsM=new THREE.Mesh(GEO.sph,new THREE.MeshStandardMaterial({map:marsTex,roughness:1,fog:false}));scene.add(marsM);
 const pg=new THREE.IcosahedronGeometry(1,3),pa=pg.attributes.position;for(let i=0;i<pa.count;i++){const v=new V3().fromBufferAttribute(pa,i);v.multiplyScalar(1+Math.sin(v.x*5)*.06+Math.sin(v.y*7+1)*.05);v.x*=1.35;pa.setXYZ(i,v.x,v.y,v.z)}pg.computeVertexNormals();
 phobosM=new THREE.Mesh(pg,new THREE.MeshStandardMaterial({color:'#8a7a70',roughness:1,flatShading:true,fog:false}));scene.add(phobosM)}

/* ---------- post-processing: bloom + chromatic aberration + grade/vignette/grain ---------- */
const FXShader={uniforms:{tDiffuse:{value:null},uCA:{value:0},uT:{value:0},uHeat:{value:0},uVig:{value:.55},uDark:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uCA,uT,uHeat,uVig,uDark;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 c=vUv-.5;float r2=dot(c,c);vec2 off=c*uCA*.045*(.25+r2*2.5);
  vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
  col=pow(col,vec3(.96));col*=vec3(1.03,.99,1.05);
  col+=uHeat*vec3(.28,.07,0.)*smoothstep(.05,.45,r2);
  col*=1.-uVig*smoothstep(.12,.7,r2);col*=1.-uDark*smoothstep(.02,.35,r2);
  col+=(h(vUv*vec2(1789.,997.)+fract(uT))-.5)*.05;gl_FragColor=vec4(col,1.);}`};

/* ---------- lifecycle ---------- */
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;if(w<4||h<4)return;const pr=Math.min(devicePixelRatio||1,(typeof FXQ!=='undefined'&&FXQ<1)?1:1.5);renderer.setPixelRatio(pr);renderer.setSize(w,h,false);composer.setPixelRatio(pr);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
function init(){try{glc=document.createElement('canvas');glc.id='gl';glc.style.cssText='position:fixed;inset:0;width:100%;height:100%;display:none;z-index:0';document.body.insertBefore(glc,document.body.firstChild);cv.style.zIndex=1;cv.style.position='fixed';
 renderer=new THREE.WebGLRenderer({canvas:glc,antialias:false,powerPreference:'high-performance'});renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
 scene=new THREE.Scene();scene.fog=new THREE.Fog('#000000',60,520);camera=new THREE.PerspectiveCamera(66,1,.1,6000);
 hemi=new THREE.HemisphereLight('#ffffff','#202030',.9);scene.add(hemi);sun=new THREE.DirectionalLight('#ffffff',2.2);scene.add(sun);scene.add(sun.target);
 entRoot=new THREE.Group();scene.add(entRoot);shared();buildMoods();buildSky();
 composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.6,.42,.86);composer.addPass(bloom);composer.addPass(new OutputPass());fxPass=new ShaderPass(FXShader);composer.addPass(fxPass);
 resize();addEventListener('resize',resize);R3D.ok=true}catch(err){console.warn('3D engine unavailable, falling back to 2D',err);R3D.ok=false}}
function start(){buildMoods();for(const[e,o]of MAP)entRoot.remove(o);MAP.clear();buildFrames();buildRoute();buildShip();glc.style.display='block';resize()}
function stop(){if(glc)glc.style.display='none'}

/* ---------- per-frame ---------- */
const camP=new V3(),camT=new V3(),camQ=new QT(),up=new V3();
function frame(dt){const t=RC.t,M=moodNow(),pr=cl(RC.dist/RC.total,0,1);
 // sky + fog + lights from the blended leg mood
 const u=skyMat.uniforms;u.cTop.value.copy(M.top);u.cMid.value.copy(M.mid);u.cHor.value.copy(M.hor);u.cB0.value.copy(M.b0);u.cB1.value.copy(M.b1);u.haze.value.copy(M.haze);u.sunC.value.copy(M.sunC);u.sunDir.value.copy(M.sunDir);u.sunSize.value=M.sunSize;u.stars.value=M.stars;u.stripes.value=M.stripes;u.t.value=t;
 scene.fog.color.copy(M.haze).lerp(M.hor,.4);scene.fog.near=M.fogNear;scene.fog.far=RC.mod.dark?M.fogFar*.45:M.fogFar;
 FOGU.uFogCol.value.copy(scene.fog.color);FOGU.uFogNear.value=scene.fog.near;FOGU.uFogFar.value=scene.fog.far;FOGU.uT.value=t;
 route&&route.traverse(n=>{if(n.material&&n.material.uniforms&&n.material.uniforms.uSky){n.material.uniforms.uSky.value.copy(M.hor);n.material.uniforms.uSun.value.copy(M.sunC)}});
 hemi.color.copy(M.mid).lerp(new COL('#ffffff'),.2);hemi.groundColor.copy(M.b0).multiplyScalar(.6);sun.color.copy(M.sunC.r+M.sunC.g+M.sunC.b>.1?M.sunC:M.rim);
 // camera rides the rolling track frame
 const lx=.74,ly=.72;t2w(RC.px*lx,RC.py*ly-1.05,-3.6,camP,camQ);t2w(RC.px*.5,RC.py*.48-.25,16,camT);up.set(0,1,0).applyQuaternion(camQ);
 if(RC.over&&RC.win){t2w(RC.px*.4,RC.py*.4-1.2,-4.5-RC.endT*2,camP)}
 camera.position.copy(camP);camera.up.copy(up);
 const sh=(RC.shake||0)*.8;camera.position.x+=(Math.random()-.5)*sh;camera.position.y+=(Math.random()-.5)*sh;
 camera.lookAt(camT);camera.rotateZ((RC.kk?RC.kk[2]:0));if(RC.kk){camera.translateX(RC.kk[0]*.012);camera.translateY(-RC.kk[1]*.012)}
 camera.fov=64*(RC.fov||1);camera.updateProjectionMatrix();
 skyMesh.position.copy(camera.position);if(route&&route.userData.sea)route.userData.sea.visible=RC.leg>=4;
 sun.position.copy(camera.position).addScaledVector(M.sunDir,100);sun.target.position.copy(camera.position);
 // planets ride with the camera (infinitely far); Earth grows dead ahead as you close in
 const fwd=TMP.w;{const q=new QT(),p=new V3();frameAt(RC.dist+300,p,q);fwd.set(0,0,-1).applyQuaternion(q);const upv=new V3(0,1,0).applyQuaternion(q),rt=new V3(1,0,0).applyQuaternion(q);
  const showE=RC.leg<=4||(RC.prevLeg<=4&&RC.legBlend<1);earthG.visible=showE;if(showE){const R=60+pr*pr*900;earthG.position.copy(camera.position).addScaledVector(fwd,2400).addScaledVector(upv,R*.25+40);earthG.scale.setScalar(R);earthG.rotation.y=t*.01;earthG.userData.clouds.rotation.y=t*.004}
  marsM.visible=RC.leg<=2;if(marsM.visible){const R=Math.max(10,260*(1-pr*2.4));marsM.position.copy(camera.position).add(fwd.clone().multiplyScalar(.55).addScaledVector(rt,-.62).addScaledVector(upv,.5).normalize().multiplyScalar(2400));marsM.scale.setScalar(R);marsM.rotation.y=t*.02}
  phobosM.visible=RC.leg===1||(RC.leg===2&&RC.legBlend<1);
  if(RC.run){phobosM.visible=false;earthG.visible=RC.leg===2;if(earthG.visible){const R=900;earthG.position.copy(camera.position).addScaledVector(fwd,1500).addScaledVector(upv,-R-260);earthG.scale.setScalar(R);earthG.rotation.y=t*.01}
   marsM.visible=RC.leg>=2;if(marsM.visible){const R=18+pr*110;marsM.position.copy(camera.position).add(fwd.clone().addScaledVector(upv,.18).normalize().multiplyScalar(2400));marsM.scale.setScalar(R);marsM.rotation.y=t*.02}}if(phobosM.visible){phobosM.position.copy(camera.position).add(fwd.clone().multiplyScalar(.7).addScaledVector(rt,.55).addScaledVector(upv,.3).normalize().multiplyScalar(1600));phobosM.scale.setScalar(70);phobosM.rotation.set(t*.05,t*.03,0)}}
 // capital fleet crossfire
 const bd=route&&route.userData.beams;if(bd){const caps=route.userData.caps;bd.bm.forEach((m,k)=>{const on=Math.sin(t*1.9+k*1.7)>.35;m.visible=on&&caps&&RC.dist>bd.a-200&&RC.dist<bd.b+200;if(!m.visible)return;const A=caps[k%2].position.clone().add(new V3(rr(-30,30),rr(-6,10),rr(-60,60))),B=caps[1-k%2].position.clone().add(new V3(rr(-30,30),rr(-6,10),rr(-60,60)));
  m.position.copy(A).add(B).multiplyScalar(.5);m.scale.set(.6+k*.15,A.distanceTo(B),.6+k*.15);m.quaternion.setFromUnitVectors(new V3(0,1,0),B.sub(A).normalize())})}
 // the ship
 if(shipObj){const g=shipObj.grp;g.visible=!RC.dead;const q=TMP.q;t2w(RC.px,RC.py,0,g.position,q);g.quaternion.copy(q);
  g.rotateY(-cl(RC.vx*.12,-.4,.4));g.rotateX(cl(-RC.vy*.28,-.5,.5));g.rotateZ(-cl(RC.vx*.36+RC.T0.cx*.22,-1.1,1.1));if(RC.brA)g.rotateZ(-RC.brA);
  const f=(RC.boost?1.45:1)*(.85+.15*Math.sin(t*55));shipObj.flames.forEach(([a,b])=>{a.scale.setScalar(.6*f);b.scale.setScalar(.24*f)});shipObj.light.intensity=RC.boost?5:2;
  d0=camera.position.distanceTo(g.position)}
 syncEntities(t);
 // post FX
 const heat=LEGS[RC.leg].burn&&RC.ship.c.id!=='shroud'?.7+.3*Math.sin(t*9):(LEGS[RC.leg].burn?.25:0);
 fxPass.uniforms.uCA.value=Math.min(1.2,cl((RC.spd-34)/28,0,1)*.5+(RC.caHit||0)+(RC.over&&RC.win?RC.endT*.3:0))*((typeof S!=='undefined'&&S.set.fx&&FXQ>0)?1:0);
 fxPass.uniforms.uT.value=t;fxPass.uniforms.uHeat.value=heat;fxPass.uniforms.uDark.value=RC.mod.dark?.85:0;
 bloom.enabled=FXQ>0;bloom.strength=RC.boost?.8:.6;
 composer.render(dt)}

/* ---------- projection for the 2D overlay (installed as P()) ---------- */
const PV=new V3();
function project(x,y,z){t2w(x,y,z,PV);const dist=camera.position.distanceTo(PV);PV.project(camera);if(PV.z>1||PV.z<-1)return[-9999,-9999,.0001];return[(PV.x+1)/2*W,(1-PV.y)/2*H,cl(d0/Math.max(dist,.5),0,3)]}
function shipScreen(){if(!shipObj)return{eng:[[W/2,H/2],[W/2,H/2]],tips:[[W/2,H/2],[W/2,H/2]]};const g=shipObj.grp;g.updateMatrixWorld();const sp=v=>{const w=v.clone().applyMatrix4(g.matrixWorld).project(camera);return[(w.x+1)/2*W,(1-w.y)/2*H]};return{eng:shipObj.eng.map(sp),tips:shipObj.tips.map(sp)}}

const R3D={ok:false,init,start,stop,frame,project,shipScreen};
window.R3D=R3D;init();
