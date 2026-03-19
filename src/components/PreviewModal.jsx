import React from "react";
import { MAR, BASE } from "../constants";
import { starPoints, heartSVGPath, polyPoints } from "../utils";
import { IcoSVG } from "./ui";

function PreviewModal({orient,photos,texts,images,shapes=[],icons=[],layers=[],scale,cardBg="#fff",onClose,cardW,cardH}){
  const cs={w:cardW||CARD[orient].w, h:cardH||CARD[orient].h};
  // 재단선 기준 영역만 표시 (다운로드와 동일)
  const cutW=cs.w-MAR*2, cutH=cs.h-MAR*2;
  const maxW=Math.min(window.innerWidth*0.82,700);
  const maxH=window.innerHeight*0.80;
  const ppm=Math.min(maxW/cutW,maxH/cutH);
  const CW=cutW*ppm, CH=cutH*ppm;
  const P=mm=>(mm-MAR)*ppm;   // 재단선 기준 좌표 (다운로드와 동일)
  const PS=mm=>mm*ppm;         // 크기 전용
  const FSC=ppm/BASE;  // scale 미포함 — 캔버스 내보내기와 동일

  const renderLayer=(l)=>{
    if(!l.visible) return null;
    if(l.type==='image'){
      const im=images.find(x=>x.id===l.id); if(!im) return null;
      return(
        <div key={im.id} style={{position:"absolute",left:P(im.xMM),top:P(im.yMM),
          width:PS(im.wMM),height:PS(im.hMM),
          transform:`rotate(${im.rotate||0}deg) scaleX(${im.flipX?-1:1})`,transformOrigin:"center center",overflow:"hidden",
          opacity:im.opacity??1}}>
          <img src={im.src} alt="" draggable={false} style={{width:"100%",height:"100%",objectFit:"fill",display:"block"}}/>
        </div>
      );
    }
    if(l.type==='shape'){
      const sh=shapes.find(x=>x.id===l.id); if(!sh) return null;
      const sx=P(sh.xMM),sy=P(sh.yMM),sw=PS(sh.wMM),shh=PS(sh.hMM);
      const stk=sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none';
      const commonStyle={position:"absolute",left:sx,top:sy,width:sw,height:shh,display:"block",opacity:sh.opacity??1,overflow:"visible",transform:`rotate(${sh.rotate||0}deg) scaleX(${sh.flipX?-1:1})`,transformOrigin:"center center"};
      const sf=sh.fill, ss=stk?sh.stroke:"none", sw2=stk?sh.strokeW:0;
      if(sh.type==="circle") return <svg key={sh.id} style={commonStyle}><ellipse cx={sw/2} cy={shh/2} rx={sw/2} ry={shh/2} fill={sf} stroke={ss} strokeWidth={sw2}/></svg>;
      if(sh.type==="triangle") return <svg key={sh.id} style={commonStyle}><polygon points={`${sw/2},0 ${sw},${shh} 0,${shh}`} fill={sf} stroke={ss} strokeWidth={sw2}/></svg>;
      if(sh.type==="star"){
        const spts=starPoints(sw/2,shh/2);
        const pts=spts.map(p=>`${p.x+sw/2},${p.y+shh/2}`).join(' ');
        return <svg key={sh.id} style={commonStyle}><polygon points={pts} fill={sf} stroke={ss} strokeWidth={sw2} strokeLinejoin="round"/></svg>;
      }
      if(sh.type==="heart"){
        return <svg key={sh.id} style={commonStyle}><path d={heartSVGPath(sw/2,shh/2)} transform={`translate(${sw/2},${shh/2})`} fill={sf} stroke={ss} strokeWidth={sw2} strokeLinejoin="round"/></svg>;
      }
      if(sh.type==="pentagon"){
        const ppts=polyPoints(5,sw/2,shh/2);
        const pts=ppts.map(p=>`${p.x+sw/2},${p.y+shh/2}`).join(' ');
        return <svg key={sh.id} style={commonStyle}><polygon points={pts} fill={sf} stroke={ss} strokeWidth={sw2} strokeLinejoin="round"/></svg>;
      }
      if(sh.type==="hexagon"){
        const hpts=polyPoints(6,sw/2,shh/2,0);
        const pts=hpts.map(p=>`${p.x+sw/2},${p.y+shh/2}`).join(' ');
        return <svg key={sh.id} style={commonStyle}><polygon points={pts} fill={sf} stroke={ss} strokeWidth={sw2} strokeLinejoin="round"/></svg>;
      }
      return <svg key={sh.id} style={commonStyle}><rect x={0} y={0} width={sw} height={shh} rx={sh.radius||0} ry={sh.radius||0} fill={sf} stroke={ss} strokeWidth={sw2}/></svg>;
    }
    if(l.type==='photo'){
      const ph=photos.find(x=>x.id===l.id); if(!ph||!ph.src) return null;
      return(
        <div key={ph.id} style={{position:"absolute",left:P(ph.xMM),top:P(ph.yMM),
          width:PS(ph.wMM),height:PS(ph.hMM),overflow:"hidden",
          clipPath:ph.shape==="circle"?"ellipse(50% 50% at 50% 50%)":"none",
          borderRadius:ph.shape==="circle"?"0":`${ph.radius||0}px`,
          transform:`rotate(${ph.rotate||0}deg) scaleX(${ph.flipX?-1:1})`,transformOrigin:"center center"}}>
          <img src={ph.src} draggable={false} alt="" style={{width:"100%",height:"100%",objectFit:"fill",display:"block"}}/>
          {(ph.borderW||0)>0&&(
            <div style={{position:"absolute",inset:0,
              boxShadow:`inset 0 0 0 ${(ph.borderW||0)*FSC}px ${ph.borderColor||"#000"}`,
              borderRadius:ph.shape==="circle"?"50%":`${ph.radius||0}px`,pointerEvents:"none"}}/>
          )}
        </div>
      );
    }
    if(l.type==='text'){
      const t=texts.find(x=>x.id===l.id); if(!t) return null;
      const tdec=[t.strike?"line-through":"",t.underline?"underline":""].filter(Boolean).join(" ")||"none";
      const hasSt=t.strokeW&&t.strokeW>0;
      const commonTextStyle={position:"absolute",left:P(t.xMM),top:P(t.yMM),
        fontSize:t.fs*FSC,fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",
        textDecoration:tdec,fontFamily:t.font||"'Noto Sans KR',sans-serif",whiteSpace:"pre",lineHeight:1.4,pointerEvents:"none",
        transform:`rotate(${t.rotate||0}deg) scaleX(${t.flipX?-1:1})`,transformOrigin:"center center",opacity:t.opacity??1};
      return(
        <div key={t.id} style={{position:"absolute",left:0,top:0,width:0,height:0}}>
          {hasSt&&(
            <div style={{...commonTextStyle,color:"transparent",
              WebkitTextStroke:`${t.strokeW*2}px ${t.strokeColor||"#000"}`}}>
              {t.text}
            </div>
          )}
          <div style={{...commonTextStyle,color:t.color}}>
            {t.text}
          </div>
        </div>
      );
    }
    if(l.type==='icon'){
      const ic=icons.find(x=>x.id===l.id); if(!ic) return null;
      const isz=PS(ic.sizeMM);
      return(
        <div key={ic.id} style={{position:"absolute",left:P(ic.xMM),top:P(ic.yMM),
          width:isz,height:isz,display:"flex",alignItems:"center",justifyContent:"center",
          pointerEvents:"none",transform:`rotate(${ic.rotate||0}deg) scaleX(${ic.flipX?-1:1})`,transformOrigin:"center center",opacity:ic.opacity??1}}>
          <IcoSVG type={ic.type} color={ic.color} size={isz*0.8}/>
        </div>
      );
    }
    return null;
  };

  return(
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:1000,
        background:"repeating-conic-gradient(#555 0% 25%,#333 0% 50%) 0 0/20px 20px",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{color:"rgba(255,255,255,.6)",fontSize:12}}>클릭하여 닫기</div>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",width:CW,height:CH,background:cardBg,
          boxShadow:"0 8px 40px rgba(0,0,0,.5)",borderRadius:2,overflow:"hidden"}}>
        {layers.map(l=>renderLayer(l))}
      </div>
      <div style={{color:"rgba(255,255,255,.45)",fontSize:11}}>재단 영역 {cutW}{"×"}{cutH}mm</div>
    </div>
  );
}


/* ════ 레이어 패널 ════ */

export default PreviewModal;
