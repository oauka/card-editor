import React, { useState, useRef, useEffect, useCallback } from "react";

function CropModal({img:initImg,photoId,initShape,initWMM,initHMM,defaultWMM,defaultHMM,initOrigSrc,initRadius=0,initVState=null,onApply,onCancel}){
  const canvasRef=useRef(null);
  const v=useRef(initVState?{...initVState}:{scale:1,rot:0,ox:0,oy:0});
  const drag=useRef(null);      // {mode:"move"|"rotate", sx,sy,ox,oy,startRot,startAngle}
  const [img,setImg]=useState(initImg);
  const origSrcRef=useRef(initOrigSrc||initImg);
  const [shape,setShape]=useState(initShape||"rect");
  const [radius,setRadius]=useState(initRadius||0);
  const [scaleSlider,setScaleSlider]=useState(initVState?Math.round(initVState.scale*100):100);
  const initW=initWMM||defaultWMM||35;
  const initH=initHMM||defaultHMM||45;
  const [customW,setCustomW]=useState(String(Math.round(initW/10)));
  const [customH,setCustomH]=useState(String(Math.round(initH/10)));
  const [wMM,setWMM]=useState(initW);
  const [hMM,setHMM]=useState(initH);
  const [bgColor,setBgColor]=useState("transparent"); // 투명 PNG 배경색
  const fileRef2=useRef(null);

  const PRESETS=[
    {label:"3×4cm",w:30,h:40},{label:"3.5×4.5cm",w:35,h:45},{label:"4×5cm",w:40,h:50},
  ];

  const SIZE=280;
  const getBWBH=()=>{
    const maxW=SIZE*0.82, maxH=SIZE*0.88;
    let bw=maxW, bh=bw*(hMM/wMM);
    if(bh>maxH){bh=maxH;bw=bh*(wMM/hMM);}
    return{bw,bh};
  };
  const getBWBHRef=useRef(getBWBH);
  getBWBHRef.current=getBWBH;

  const drawBase=useCallback((ctx,imgEl,withHandles,curRadius=0)=>{
    const maxW=SIZE*0.82, maxH=SIZE*0.88;
    let bw=maxW, bh=bw*(hMM/wMM);
    if(bh>maxH){bh=maxH;bw=bh*(wMM/hMM);}
    const bx=(SIZE-bw)/2, by=(SIZE-bh)/2;

    ctx.clearRect(0,0,SIZE,SIZE);

    // 1. 전체 배경 (체크패턴 or 배경색)
    if(bgColor&&bgColor!=="transparent"){
      ctx.fillStyle=bgColor;
      ctx.fillRect(0,0,SIZE,SIZE);
    } else {
      const pat=document.createElement("canvas"); pat.width=10; pat.height=10;
      const pc=pat.getContext("2d");
      pc.fillStyle="#888"; pc.fillRect(0,0,10,10);
      pc.fillStyle="#555"; pc.fillRect(0,0,5,5); pc.fillRect(5,5,5,5);
      const pattern=ctx.createPattern(pat,"repeat");
      if(pattern){ctx.fillStyle=pattern;ctx.fillRect(0,0,SIZE,SIZE);}
    }

    // 2. 사진 전체 그리기
    ctx.save();
    ctx.translate(SIZE/2,SIZE/2);
    ctx.rotate(v.current.rot*Math.PI/180);
    ctx.scale(v.current.scale,v.current.scale);
    ctx.drawImage(imgEl,-imgEl.width/2+v.current.ox,-imgEl.height/2+v.current.oy);
    ctx.restore();

    // 3. 크롭 영역 외부만 반투명 어둠으로 덮기
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,.5)";
    if(shape==="circle"){
      ctx.beginPath();
      ctx.rect(0,0,SIZE,SIZE);
      ctx.ellipse(SIZE/2,SIZE/2,bw/2,bh/2,0,0,Math.PI*2,true);
      ctx.fill("evenodd");
    } else {
      const r=curRadius>0?Math.min(curRadius,bw/2,bh/2):0;
      if(r>0){
        ctx.beginPath();
        ctx.rect(0,0,SIZE,SIZE);
        ctx.moveTo(bx+r,by);
        ctx.arcTo(bx,by,bx,by+r,r);
        ctx.lineTo(bx,by+bh-r);
        ctx.arcTo(bx,by+bh,bx+r,by+bh,r);
        ctx.lineTo(bx+bw-r,by+bh);
        ctx.arcTo(bx+bw,by+bh,bx+bw,by+bh-r,r);
        ctx.lineTo(bx+bw,by+r);
        ctx.arcTo(bx+bw,by,bx+bw-r,by,r);
        ctx.closePath();
        ctx.fill("evenodd");
      } else {
        // r=0: 4개 직사각형으로 크롭 영역 바깥만 덮기
        ctx.fillRect(0,   0,    SIZE,  by);          // 위
        ctx.fillRect(0,   by+bh,SIZE,  SIZE-by-bh);  // 아래
        ctx.fillRect(0,   by,   bx,    bh);           // 왼쪽
        ctx.fillRect(bx+bw, by, SIZE-bx-bw, bh);     // 오른쪽
      }
    }
    ctx.restore();

    // 4. 크롭 영역에 사진 다시 클립해서 그리기 (선명하게)
    ctx.save();
    if(shape==="circle"){
      ctx.beginPath();
      ctx.ellipse(SIZE/2,SIZE/2,bw/2,bh/2,0,0,Math.PI*2);
      ctx.clip();
    } else {
      const r=curRadius>0?Math.min(curRadius,bw/2,bh/2):0;
      if(r>0){
        ctx.beginPath();
        ctx.moveTo(bx+r,by); ctx.lineTo(bx+bw-r,by);
        ctx.arcTo(bx+bw,by,bx+bw,by+r,r);
        ctx.lineTo(bx+bw,by+bh-r);
        ctx.arcTo(bx+bw,by+bh,bx+bw-r,by+bh,r);
        ctx.lineTo(bx+r,by+bh);
        ctx.arcTo(bx,by+bh,bx,by+bh-r,r);
        ctx.lineTo(bx,by+r);
        ctx.arcTo(bx,by,bx+r,by,r);
        ctx.closePath(); ctx.clip();
      } else {
        ctx.rect(bx,by,bw,bh); ctx.clip();
      }
    }
    ctx.translate(SIZE/2,SIZE/2);
    ctx.rotate(v.current.rot*Math.PI/180);
    ctx.scale(v.current.scale,v.current.scale);
    ctx.drawImage(imgEl,-imgEl.width/2+v.current.ox,-imgEl.height/2+v.current.oy);
    ctx.restore();

    // 크롭 경계 표시
    ctx.strokeStyle="rgba(255,255,255,.9)"; ctx.lineWidth=2; ctx.setLineDash([6,3]);
    if(shape==="circle"){
      ctx.beginPath();
      ctx.ellipse(SIZE/2,SIZE/2,bw/2,bh/2,0,0,Math.PI*2);
      ctx.stroke();
    } else {
      const r=curRadius>0?Math.min(curRadius,bw/2,bh/2):0;
      if(r>0){
        ctx.beginPath();
        ctx.moveTo(bx+r,by); ctx.lineTo(bx+bw-r,by);
        ctx.arcTo(bx+bw,by,bx+bw,by+r,r);
        ctx.lineTo(bx+bw,by+bh-r);
        ctx.arcTo(bx+bw,by+bh,bx+bw-r,by+bh,r);
        ctx.lineTo(bx+r,by+bh);
        ctx.arcTo(bx,by+bh,bx,by+bh-r,r);
        ctx.lineTo(bx,by+r);
        ctx.arcTo(bx,by,bx+r,by,r);
        ctx.closePath(); ctx.stroke();
      } else { ctx.strokeRect(bx,by,bw,bh); }
    }
    ctx.setLineDash([]);

    if(withHandles){
      const CORNER=12;
      const hx=bx+bw, hy=by;
      ctx.beginPath(); ctx.arc(hx,hy,CORNER,0,Math.PI*2);
      ctx.fillStyle="rgba(52,152,219,.85)"; ctx.fill();
      ctx.strokeStyle="#fff"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(hx,hy,6.75,0,Math.PI*1.5); ctx.stroke();
      const ax=hx+6.75*Math.cos(Math.PI*1.5), ay=hy+6.75*Math.sin(Math.PI*1.5);
      ctx.beginPath(); ctx.moveTo(ax-4,ay-1.5); ctx.lineTo(ax,ay+4.5); ctx.lineTo(ax+4,ay-1.5); ctx.stroke();
    }
  },[img,shape,wMM,hMM,radius,bgColor]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const imgEl=new window.Image(); imgEl.src=img;
    imgEl.onload=()=>drawBase(ctx,imgEl,true,radius);
  },[img,drawBase,bgColor]);

  // 이미지 바뀔 때 크롭 박스에 맞게 초기 스케일 자동 설정 (initVState 없을 때만)
  const isFirstLoad=useRef(true);
  useEffect(()=>{
    if(isFirstLoad.current&&initVState){
      isFirstLoad.current=false;
      draw();
      return;
    }
    isFirstLoad.current=false;
    const imgEl=new window.Image();
    imgEl.src=img;
    imgEl.onload=()=>{
      const {bw,bh}=getBWBH();
      const sx=bw/imgEl.width, sy=bh/imgEl.height;
      const fit=Math.max(sx,sy);
      v.current={scale:fit,rot:0,ox:0,oy:0};
      setScaleSlider(Math.round(fit*100));
      draw();
    };
  },[img]);

  useEffect(()=>draw(),[draw]);

  // 모서리 근처인지 판정
  const CORNER_R=14;
  const isCorner=(x,y)=>{
    const {bw,bh}=getBWBH();
    const bx=(SIZE-bw)/2, by=(SIZE-bh)/2;
    // 우상단만
    return Math.hypot(x-(bx+bw),y-by)<CORNER_R*1.5;
  };

  const onCanvasMouseDown=e=>{
    const r=canvasRef.current.getBoundingClientRect();
    const lx=e.clientX-r.left, ly=e.clientY-r.top;
    if(isCorner(lx,ly)){
      const cx=r.left+SIZE/2, cy=r.top+SIZE/2;
      drag.current={mode:"rotate",startAngle:Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI,startRot:v.current.rot};
    } else {
      drag.current={mode:"move",sx:e.clientX,sy:e.clientY,ox:v.current.ox,oy:v.current.oy};
    }
  };

  // window-level so rotation works outside canvas
  useEffect(()=>{
    const onMove=e=>{
      if(!drag.current) return;
      if(drag.current.mode==="rotate"){
        const canvas=canvasRef.current; if(!canvas) return;
        const r=canvas.getBoundingClientRect();
        const cx=r.left+SIZE/2, cy=r.top+SIZE/2;
        const cur=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
        let d=cur-drag.current.startAngle;
        if(d>180)d-=360; if(d<-180)d+=360;
        v.current.rot=drag.current.startRot+d;
        draw();
      } else {
        v.current.ox=drag.current.ox+(e.clientX-drag.current.sx)/v.current.scale;
        v.current.oy=drag.current.oy+(e.clientY-drag.current.sy)/v.current.scale;
        draw();
      }
    };
    const onUp=()=>{drag.current=null;};
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    return()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
  },[draw]);

  const onWheel=e=>{
    e.preventDefault();
    const ns=Math.max(0.2,Math.min(5,v.current.scale*(e.deltaY>0?0.92:1.08)));
    v.current.scale=ns;
    setScaleSlider(Math.round(ns*100));
    draw();
  };

  const onSlider=val=>{
    setScaleSlider(val);
    v.current.scale=val/100;
    draw();
  };

  const applyCustomSize=()=>{
    const w=parseFloat(customW),h=parseFloat(customH);
    if(!isNaN(w)&&w>0) setWMM(w*10);
    if(!isNaN(h)&&h>0) setHMM(h*10);
  };

  const doApply=()=>{
    const {bw,bh}=getBWBH();
    // 고해상도: 원본 이미지를 직접 출력 캔버스에 다시 렌더링
    const SCALE=4; // 4배 해상도로 렌더
    const outW=Math.round(bw*SCALE), outH=Math.round(bh*SCALE);
    const imgEl=new window.Image(); imgEl.src=img;
    imgEl.onload=()=>{
      const out=document.createElement("canvas");
      out.width=outW; out.height=outH;
      const octx=out.getContext("2d");
      // 배경색 적용
      if(bgColor&&bgColor!=="transparent"){
        octx.fillStyle=bgColor;
        octx.fillRect(0,0,outW,outH);
      }
      // 이미지 그리기
      const dispScale=v.current.scale;
      const dispOx=v.current.ox, dispOy=v.current.oy;
      const dispRot=v.current.rot;
      octx.save();
      octx.translate(outW/2,outH/2);
      octx.rotate(dispRot*Math.PI/180);
      const renderScale=dispScale*(outW/bw);
      octx.scale(renderScale,renderScale);
      octx.drawImage(imgEl,-imgEl.width/2+dispOx,-imgEl.height/2+dispOy);
      octx.restore();
      // 원형: destination-in으로 경계 픽셀 없이 마스킹
      if(shape==="circle"){
        octx.globalCompositeOperation="destination-in";
        octx.beginPath();
        octx.ellipse(outW/2,outH/2,outW/2-0.5,outH/2-0.5,0,0,Math.PI*2);
        octx.fill();
        octx.globalCompositeOperation="source-over";
      }
      onApply(photoId,out.toDataURL("image/png",1),wMM,hMM,shape,origSrcRef.current,shape==="circle"?0:radius,{...v.current});
    };
  };

  const replaceImg=()=>fileRef2.current?.click();
  const onReplFile=e=>{
    const f=e.target.files[0]; if(!f) return; e.target.value="";
    const reader=new FileReader();
    reader.onload=ev=>{
      origSrcRef.current=ev.target.result;
      setImg(ev.target.result);
      v.current={scale:1,rot:0,ox:0,oy:0};
      setScaleSlider(100);
    };
    reader.readAsDataURL(f);
  };

  const btnBase={border:"1px solid rgba(255,255,255,.2)",color:"#fff",borderRadius:4,cursor:"pointer",fontSize:12};
  const selBtn={...btnBase,background:"#3498db"};
  const unselBtn={...btnBase,background:"rgba(255,255,255,.1)"};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:500,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#2c3e50",borderRadius:10,padding:20,
        display:"flex",flexDirection:"column",alignItems:"center",gap:10,
        boxShadow:"0 8px 40px rgba(0,0,0,.5)",width:320}}>

        {/* 1. 모양 */}
        <div style={{display:"flex",gap:8,width:"100%"}}>
          {[["rect","사각형"],["circle","원형"]].map(([s,label])=>(
            <button key={s} onClick={()=>setShape(s)}
              style={{...shape===s?selBtn:unselBtn,flex:1,padding:"6px 0",fontSize:13}}>
              {label}
            </button>
          ))}
        </div>

        {shape==="rect"&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",flexWrap:"wrap"}}>
            {[0,5,10,20,30].map(r=>(
              <button key={r} onClick={()=>setRadius(r)} lang="en"
                style={{padding:"3px 7px",fontSize:11,borderRadius:4,cursor:"pointer",
                  border:"1px solid rgba(255,255,255,.2)",flexShrink:0,
                  background:radius===r?"#3498db":"rgba(255,255,255,.1)",color:"#fff"}}>
                {r===0?"라운드 없음":`${r}px`}
              </button>
            ))}
          </div>
        )}

        {/* 2. 사이즈 프리셋 */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",width:"100%"}}>
          {PRESETS.map(p=>(
            <button key={p.label}
              onClick={()=>{setWMM(p.w);setHMM(p.h);setCustomW(String(p.w/10));setCustomH(String(p.h/10));}}
              style={{...wMM===p.w&&hMM===p.h?selBtn:unselBtn,padding:"4px 10px",fontSize:11}}>
              {p.label}
            </button>
          ))}
        </div>

        {/* 3. 직접 입력 */}
        <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)",whiteSpace:"nowrap"}}>가로</span>
          <input type="text" inputMode="numeric" value={customW} onChange={e=>setCustomW(e.target.value)}
            style={{width:52,padding:"3px 6px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:4,fontSize:12,outline:"none",textAlign:"center"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>cm</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>×</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)",whiteSpace:"nowrap"}}>세로</span>
          <input type="text" inputMode="numeric" value={customH} onChange={e=>setCustomH(e.target.value)}
            style={{width:52,padding:"3px 6px",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:4,fontSize:12,outline:"none",textAlign:"center"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>cm</span>
          <button onClick={applyCustomSize}
            style={{...unselBtn,padding:"3px 10px",whiteSpace:"nowrap"}}>적용</button>
        </div>

        {/* 배경색 */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)",whiteSpace:"nowrap"}}>배경색</span>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <div onClick={()=>setBgColor("transparent")}
              title="투명"
              style={{width:22,height:22,borderRadius:3,cursor:"pointer",flexShrink:0,
                background:"repeating-conic-gradient(#888 0% 25%,#555 0% 50%) 0 0/8px 8px",
                border:bgColor==="transparent"?"2px solid #3498db":"2px solid rgba(255,255,255,.2)"}}/>
            <div onClick={()=>setBgColor("#ffffff")}
              title="흰색"
              style={{width:22,height:22,borderRadius:3,cursor:"pointer",flexShrink:0,background:"#ffffff",
                border:bgColor==="#ffffff"?"2px solid #3498db":"2px solid rgba(255,255,255,.2)"}}/>
            <div onClick={()=>setBgColor("#000000")}
              title="검정"
              style={{width:22,height:22,borderRadius:3,cursor:"pointer",flexShrink:0,background:"#000000",
                border:bgColor==="#000000"?"2px solid #3498db":"2px solid rgba(255,255,255,.2)"}}/>
            <div style={{position:"relative",width:22,height:22,borderRadius:3,flexShrink:0,
              background:!["transparent","#ffffff","#000000"].includes(bgColor)
                ? bgColor
                : "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
              border:!["transparent","#ffffff","#000000"].includes(bgColor)?"2px solid #3498db":"2px solid rgba(255,255,255,.2)",
              cursor:"pointer",overflow:"hidden"}} title="커스텀 색상">
              <input type="color" value={!["transparent","#ffffff","#000000"].includes(bgColor)?bgColor:"#ff6600"}
                onChange={e=>setBgColor(e.target.value)}
                style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
            </div>
          </div>
        </div>

        {/* 4. 캔버스 */}
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{borderRadius:6,cursor:"move",width:SIZE,height:SIZE}}
          onMouseDown={onCanvasMouseDown}
          onWheel={onWheel}/>

        {/* 5. 90도 회전 버튼 */}
        <div style={{display:"flex",gap:8,width:"100%",justifyContent:"center"}}>
          {[[-90,"↺ 좌로 90°"],[90,"↻ 우로 90°"]].map(([deg,label])=>(
            <button key={deg} onClick={()=>{v.current.rot=(v.current.rot+deg+360)%360;draw();}}
              style={{flex:1,padding:"5px 0",background:"rgba(255,255,255,.1)",
                border:"1px solid rgba(255,255,255,.2)",color:"#fff",borderRadius:4,
                cursor:"pointer",fontSize:12}}>{label}</button>
          ))}
        </div>

        {/* 6. 줌 슬라이더 */}
        <div style={{display:"flex",alignItems:"center",gap:8,width:"100%"}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)",whiteSpace:"nowrap"}}>확대</span>
          <input type="range" min={20} max={500} value={scaleSlider}
            onChange={e=>onSlider(Number(e.target.value))}
            style={{flex:1,accentColor:"#3498db"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)",width:34,textAlign:"right"}}>{scaleSlider}%</span>
        </div>

        <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>드래그: 이동 · 모서리 드래그: 회전 · 스크롤: 확대/축소</div>

        {/* 7. 사진 교체 + 적용/취소 */}
        <div style={{display:"flex",gap:8,width:"100%",justifyContent:"space-between"}}>
          <button onClick={replaceImg}
            style={{...unselBtn,padding:"6px 14px"}}>사진 교체</button>
          <input ref={fileRef2} type="file" accept="image/*" style={{display:"none"}} onChange={onReplFile}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={doApply}
              style={{padding:"6px 22px",background:"#3498db",border:"none",
                color:"#fff",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:600}}>적용</button>
            <button onClick={onCancel}
              style={{...unselBtn,padding:"6px 16px"}}>취소</button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default CropModal;
