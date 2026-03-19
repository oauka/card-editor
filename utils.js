// ── 삼각형 라운드 코너 SVG path 생성 ──
export const roundedTrianglePath=(w,h,inset,r)=>{
  const pts=[
    {x:w/2, y:inset},
    {x:w-inset, y:h-inset},
    {x:inset,   y:h-inset},
  ];
  const n=pts.length;
  let d='';
  for(let i=0;i<n;i++){
    const prev=pts[(i+n-1)%n];
    const cur=pts[i];
    const next=pts[(i+1)%n];
    const d1x=prev.x-cur.x, d1y=prev.y-cur.y, len1=Math.hypot(d1x,d1y);
    const d2x=next.x-cur.x, d2y=next.y-cur.y, len2=Math.hypot(d2x,d2y);
    const rr=Math.min(r,len1/2,len2/2);
    const p1x=cur.x+d1x/len1*rr, p1y=cur.y+d1y/len1*rr;
    const p2x=cur.x+d2x/len2*rr, p2y=cur.y+d2y/len2*rr;
    if(i===0) d+=`M${p1x},${p1y}`;
    else d+=`L${p1x},${p1y}`;
    d+=`Q${cur.x},${cur.y} ${p2x},${p2y}`;
  }
  return d+'Z';
};

// ── N각형 꼭짓점 생성 (중심 0,0) ──
export const polyPoints=(n,rx,ry,offset=-Math.PI/2)=>
  Array.from({length:n},(_,i)=>{const a=offset+2*Math.PI*i/n;return{x:rx*Math.cos(a),y:ry*Math.sin(a)};});

// ── 5각별 꼭짓점 생성 (중심 0,0) ──
export const starPoints=(rx,ry,ir=0.4)=>{
  const pts=[];
  for(let i=0;i<10;i++){
    const a=(i*Math.PI/5)-Math.PI/2;
    const r=i%2===0;
    pts.push({x:(r?rx:rx*ir)*Math.cos(a),y:(r?ry:ry*ir)*Math.sin(a)});
  }
  return pts;
};

// ── 하트 SVG path 문자열 (중심 0,0) ──
export const heartSVGPath=(hw,hh)=>{
  const sx=hw/50,sy=hh/42;
  const t=(x,y)=>`${(x-50)*sx},${(y-42)*sy}`;
  return `M${t(50,82)}C${t(8,62)} ${t(0,38)} ${t(0,24)}C${t(0,8)} ${t(12,0)} ${t(27,0)}C${t(38,0)} ${t(46,7)} ${t(50,14)}C${t(54,7)} ${t(62,0)} ${t(73,0)}C${t(88,0)} ${t(100,8)} ${t(100,24)}C${t(100,38)} ${t(92,62)} ${t(50,82)}Z`;
};

// ── 점 배열 → SVG polygon points 문자열 ──
export const ptsToSVGPoly=(pts)=>pts.map(p=>`${p.x},${p.y}`).join(' ');

// ── Canvas: 점 배열로 path 그리기 ──
export const ctxPoly=(ctx,pts)=>{ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();};

// ── Canvas: 하트 path 그리기 (중심 cx,cy) ──
export const ctxHeart=(ctx,cx,cy,hw,hh)=>{
  const sx=hw/50,sy=hh/42;
  const t=(x,y)=>[(x-50)*sx+cx,(y-42)*sy+cy];
  const p=(x,y)=>t(x,y);
  ctx.moveTo(...p(50,82));
  ctx.bezierCurveTo(...p(8,62),...p(0,38),...p(0,24));
  ctx.bezierCurveTo(...p(0,8),...p(12,0),...p(27,0));
  ctx.bezierCurveTo(...p(38,0),...p(46,7),...p(50,14));
  ctx.bezierCurveTo(...p(54,7),...p(62,0),...p(73,0));
  ctx.bezierCurveTo(...p(88,0),...p(100,8),...p(100,24));
  ctx.bezierCurveTo(...p(100,38),...p(92,62),...p(50,82));
  ctx.closePath();
};

// ── CRC32 for PNG pHYs chunk ──
export const crc32=(buf)=>{
  let c=0xffffffff;
  const t=new Uint32Array(256);
  for(let i=0;i<256;i++){let k=i;for(let j=0;j<8;j++)k=k&1?(0xedb88320^(k>>>1)):k>>>1;t[i]=k;}
  for(let i=0;i<buf.length;i++)c=t[(c^buf[i])&0xff]^(c>>>8);
  return (c^0xffffffff)|0;
};
