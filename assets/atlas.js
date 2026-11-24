// A small orthographic renderer. Each island is a raised polygon in world space;
// the same projected faces are used for drawing and touch selection.
const mapCanvas=el('atlas');
const mapContext=mapCanvas.getContext('2d');
let mapAngle=-0.28, picked=0, pointer=null, hitFaces=[];
let mapCounts=[];
const terrain=['#a5ba78','#84b39c','#a9bf87','#ccb27d','#97b893','#9fc5a0'];
const islands=juzStarts.map((_,j)=>{
  const row=Math.floor(j/6), col=row%2===0?j%6:5-j%6;
  return {j,x:(col-2.5)*1.65,z:(row-2)*1.8,h:0.22+(j*7%5)*0.065};
});
const outline=[[-.66,-.42],[-.22,-.69],[.45,-.6],[.70,-.25],[.65,.39],[.24,.68],[-.44,.54],[-.74,.14]];
function project(x,y,z){
  const right=x*Math.cos(mapAngle)-z*Math.sin(mapAngle);
  const depth=x*Math.sin(mapAngle)+z*Math.cos(mapAngle);
  return [340+right*49,274+(depth*.66-y*.78)*49,depth];
}
function polygon(points, fill, stroke){
  const c=mapContext;
  c.beginPath();points.forEach((point,i)=>i?c.lineTo(point[0],point[1]):c.moveTo(point[0],point[1]));
  c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=3;c.stroke();}
}
function drawAtlas(){
  if(!mapContext)return;
  const c=mapContext;
  const sea=c.createLinearGradient(0,0,680,530);
  sea.addColorStop(0,'#e3eee2');sea.addColorStop(1,'#97c9c5');
  c.fillStyle=sea;c.fillRect(0,0,680,530);
  for(let i=0;i<95;i++){
    const x=(i*173)%675,y=(i*67)%530;
    c.fillStyle='#d4e9dd';c.fillRect(x,y,6+(i%7),1.5);
  }
  c.strokeStyle='#fff4cb';c.lineWidth=3;c.setLineDash([5,7]);c.beginPath();
  islands.forEach((tile,i)=>{const [x,y]=project(tile.x,0,tile.z);i?c.lineTo(x,y):c.moveTo(x,y);});
  c.stroke();c.setLineDash([]);hitFaces=[];
  const sorted=islands.slice().sort((a,b)=>project(a.x,0,a.z)[2]-project(b.x,0,b.z)[2]);
  for(const tile of sorted){
    const {j,x,z,h}=tile;
    const world=outline.map(([dx,dz])=>[x+dx,z+dz]);
    const top=world.map(([px,pz])=>project(px,h,pz));
    const base=world.map(([px,pz])=>project(px,-.15,pz));
    polygon(base.map(([px,py])=>[px+2,py+5]),'#8eb4a8');
    for(let k=0;k<top.length;k++){
      const n=(k+1)%top.length;
      if(top[n][0]>=top[k][0])continue;
      polygon([top[k],top[n],base[n],base[k]],k%2?'#9b855d':'#b7a376');
    }
    const done=mapCounts[j]===((juzStarts[j+1]||verses.length)-juzStarts[j]);
    polygon(top,done?'#679b70':terrain[Math.floor(j/5)],j===picked?'#1a5447':null);
    const [tx,ty]=project(x+.25,h,z-.24);
    c.fillStyle='#7a6344';c.fillRect(tx-1,ty-7,3,8);
    polygon([[tx,ty-19],[tx-6,ty-4],[tx+6,ty-4]],done?'#397449':'#63895a');
    const [lx,ly]=project(x-.10,h,z+.03);
    c.fillStyle=j===picked?'#194938':'#fffae9';c.beginPath();c.arc(lx,ly,12,0,Math.PI*2);c.fill();
    c.fillStyle=j===picked?'white':'#304838';c.textAlign='center';c.textBaseline='middle';
    c.font='bold 15px sans-serif';c.fillText(String(j+1),lx,ly);
    hitFaces.push({j,points:top});
  }
}
function containsPoint(points,x,y){
  let inside=false;
  for(let i=0,k=points.length-1;i<points.length;k=i++){
    const [a,b]=points[i],[c,d]=points[k];
    if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
function selectIsland(j){
  picked=j;el('atlasRegion').value=j;
  localStorage.setItem('atlasRegion',j);
  const start=juzStarts[j],end=juzStarts[j+1] || verses.length;
  el('atlasInfo').textContent=verses[start].ref+' – '+verses[end-1].ref+' · '+mapCounts[j]+' / '+(end-start)+' ayahs matched';
  el('atlasPractice').textContent='Recite Juz '+(j+1);
  drawAtlas();
}
function updateAtlas(){
  mapCounts=juzStarts.map((_,j)=>regionVerses(j).filter(v=>checked.has(v.ref)).length);
  const saved=Number(localStorage.getItem('atlasRegion') ?? juzFor(Math.min(cursor,verses.length-1)));
  selectIsland(Number.isInteger(saved) && saved>=0 && saved<30?saved:0);
}
regions.forEach((name,j)=>el('atlasRegion').add(new Option('Juz '+(j+1)+' · '+name,j)));
el('atlasRegion').onchange=e=>selectIsland(Number(e.target.value));
el('atlasPractice').onclick=()=>{
  const start=juzStarts[picked], stop=juzStarts[picked+1] || verses.length;
  const saved=Number(localStorage.getItem('atlasCursor.'+picked));
  const index=saved>=start && saved<stop?saved:start;
  section(true);openPage(pageFor(index),false,index);
  quest={atlas:picked,end:stop};drawPage();el('recite').onclick();
};
mapCanvas.onpointerdown=e=>{
  if(pointer)return;
  mapCanvas.setPointerCapture(e.pointerId);
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,angle:mapAngle,moved:false};
};
mapCanvas.onpointermove=e=>{
  if(pointer?.id!==e.pointerId)return;
  const dx=e.clientX-pointer.x;
  if(Math.abs(dx)>5)pointer.moved=true;
  if(pointer.moved){mapAngle=pointer.angle+dx*.011;drawAtlas();}
};
mapCanvas.onpointerup=e=>{
  if(pointer?.id!==e.pointerId)return;
  if(!pointer.moved){
    const box=mapCanvas.getBoundingClientRect();
    const x=(e.clientX-box.left)*680/box.width,y=(e.clientY-box.top)*530/box.height;
    const hit=hitFaces.slice().reverse().find(face=>containsPoint(face.points,x,y));
    if(hit)selectIsland(hit.j);
  }
  pointer=null;
};
mapCanvas.onpointercancel=()=>{pointer=null;};
