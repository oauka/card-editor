import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BASE, toP, CARD, MAR, GRID, PW, PH, uid,
  _IC, _IC_FILLED, ICON_LIST, FONT_LIST,
  INIT_TEXTS, INIT_TEXTS_BIZ, INIT_LAYERS_BIZ, INIT_LAYERS_CARD
} from "../../constants";
import { roundedTrianglePath, polyPoints, starPoints, heartSVGPath, ptsToSVGPoly, ctxPoly, ctxHeart, crc32 } from "../../utils";
import { Sep, Btn, Chk, IcoSVG } from "../ui";
import PreviewModal from "../PreviewModal";
import LayerPanel from "../LayerPanel";
import CropModal from "../CropModal";

function CardEditor({onReset}){
  const [orient,  setOrient]  = useState("landscape");
  const [cardW, setCardW] = useState(90);
  const [cardH, setCardH] = useState(58);
  const [customW, setCustomW] = useState("90");
  const [customH, setCustomH] = useState("58");
  const [cardBg,   setCardBg]   = useState("#ffffff");
  const [grid,    setGrid]    = useState(true);
  const [sel,     setSel]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [zoom,    setZoom]    = useState(1.0);
  const [zInput,  setZInput]  = useState("100");
  const [scale,   setScale]   = useState(1.0);
  const [calVal,  setCalVal]  = useState("");
  const [sizeW,   setSizeW]   = useState("35");
  const [sizeH,   setSizeH]   = useState("45");
  const historyRef = useRef([]);   // 스냅샷 배열
  // 프리셋 슬롯 (localStorage 저장, 5개)
  const PRESET_KEY = 'card_presets_v1';
  const loadPresets = ()=>{ try{ return JSON.parse(localStorage.getItem(PRESET_KEY)||'{}'); }catch(e){ return {}; } };
  const [presets, setPresets] = useState(()=>loadPresets());
  const [confirmSlot, setConfirmSlot] = useState(null); // 덮어쓰기 확인 슬롯
  const histIdxRef = useRef(-1);   // 현재 위치
  const skipHistory = useRef(false); // 복원 중 스냅샷 방지
  const [texts,   setTexts]   = useState(INIT_TEXTS);
  const [photos,  setPhotos]  = useState(()=>[{
    id:"ph1", xMM:CARD.landscape.w-MAR-PW, yMM:MAR,
    wMM:PW, hMM:PH, src:null, imgX:0, imgY:0, imgScale:1, shape:"rect", radius:0, borderW:0, borderColor:"#000000",
  }]);
  const [images,      setImages]      = useState([]);
  const [shapes,      setShapes]      = useState([]);
  const [icons,       setIcons]       = useState([]);
  const [groups,      setGroups]      = useState([]); // [{id,name,memberIds,collapsed}]
  const rGroups = useRef([]); rGroups.current = groups;
  const [multiSel,    setMultiSel]    = useState([]); // 레이어 패널 체크박스 선택
  const rMultiSel = useRef([]); rMultiSel.current = multiSel;
  const [selGroups,   setSelGroups]   = useState(new Set()); // 선택된 그룹 id Set
  const rSelGroups = useRef(new Set()); rSelGroups.current = selGroups;
  const [showIconPicker, setShowIconPicker] = useState(false);
  const toolbarRef = useRef(null);
  const [toolbarH, setToolbarH] = useState(46);
  const copyrightRef = useRef(null);
  const [copyrightH, setCopyrightH] = useState(32);
  const [pickerColor, setPickerColor] = useState("#1a2744");
  const [pickerSize,  setPickerSize]  = useState("10");
  // layers: [{id, type, visible, locked}]  index 0 = 맨 아래, last = 맨 위
  const [layers, setLayers] = useState(()=>[
    ...INIT_TEXTS.map(t=>({id:t.id,type:"text",visible:true,locked:false})),
    {id:"ph1",type:"photo",visible:true,locked:false},
  ]);
  const layerDrag = useRef(null); // {id, startY, startIdx}
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const addLayer=(id,type)=>setLayers(p=>[...p,{id,type,visible:true,locked:false}]);
  const removeLayer=(id)=>setLayers(p=>p.filter(l=>l.id!==id));

  // ── 현재 상태 ref (항상 최신값 유지, closure 문제 해결)
  const stateRef = useRef({});
  stateRef.current = {texts,photos,images,shapes,icons,layers,groups};

  const pushHistory = useCallback(()=>{
    if(skipHistory.current) return;
    const s = stateRef.current;
    const snap = {
      texts:  JSON.parse(JSON.stringify(s.texts)),
      photos: JSON.parse(JSON.stringify(s.photos)),
      images: JSON.parse(JSON.stringify(s.images)),
      shapes: JSON.parse(JSON.stringify(s.shapes)),
      icons:  JSON.parse(JSON.stringify(s.icons)),
      layers: JSON.parse(JSON.stringify(s.layers)),
      groups: JSON.parse(JSON.stringify(s.groups||[])),
    };
    // 직전 스냅샷과 동일하면 중복 저장 안 함
    const last = historyRef.current[histIdxRef.current];
    if(last && JSON.stringify(last)===JSON.stringify(snap)) return;
    const arr = historyRef.current.slice(0, histIdxRef.current+1);
    arr.push(snap);
    if(arr.length>30) arr.shift();
    historyRef.current = arr;
    histIdxRef.current = arr.length-1;
  },[]);

  const undo = useCallback(()=>{
    if(histIdxRef.current<=0) return;
    histIdxRef.current--;
    const snap = historyRef.current[histIdxRef.current];
    skipHistory.current = true;
    setTexts(snap.texts); setPhotos(snap.photos); setImages(snap.images);
    setShapes(snap.shapes); setIcons(snap.icons); setLayers(snap.layers);
    setGroups(snap.groups||[]);
    setSel(null);
    setTimeout(()=>{ skipHistory.current=false; },50);
  },[]);

  const redo = useCallback(()=>{
    if(histIdxRef.current>=historyRef.current.length-1) return;
    histIdxRef.current++;
    const snap = historyRef.current[histIdxRef.current];
    skipHistory.current = true;
    setTexts(snap.texts); setPhotos(snap.photos); setImages(snap.images);
    setShapes(snap.shapes); setIcons(snap.icons); setLayers(snap.layers);
    setGroups(snap.groups||[]);
    setSel(null);
    setTimeout(()=>{ skipHistory.current=false; },50);
  },[]);

  const savePreset = (slot)=>{
    const s = stateRef.current;
    const snap = {
      label: `슬롯${slot}`,
      texts:  JSON.parse(JSON.stringify(s.texts)),
      photos: s.photos.map(ph=>({...ph, src:null, imgX:0, imgY:0, imgScale:1, vState:null})), // 이미지만 제외, 스타일(radius/shape 등) 유지
      images: [], // 이미지 파일 제외
      shapes: JSON.parse(JSON.stringify(s.shapes)),
      icons:  JSON.parse(JSON.stringify(s.icons)),
      layers: JSON.parse(JSON.stringify(s.layers)).filter(l=>l.type!=='image'), // 이미지 레이어 제외
      groups: JSON.parse(JSON.stringify(s.groups||[])),
      cardW, cardH, cardBg, orient,
    };
    const updated = {...loadPresets(), [slot]: snap};
    try{ localStorage.setItem(PRESET_KEY, JSON.stringify(updated)); }catch(e){}
    setPresets(updated);
  };
  const applyPresetSlot = (slot)=>{
    const snap = presets[slot];
    if(!snap) return;
    // 프리셋 적용 전 현재 상태를 강제로 히스토리에 저장 (debounce 대기 중인 변경도 포함)
    clearTimeout(debounceTimer.current);
    pushHistory();
    skipHistory.current = true;
    // ID 재매핑: 프리셋의 기존 ID와 새로 생성되는 uid()가 충돌하지 않도록
    // 모든 요소의 ID를 새 UID로 교체한다
    const idMap = {};
    const remap = (oldId)=>{ if(!idMap[oldId]) idMap[oldId]=uid(); return idMap[oldId]; };
    const remTexts  = snap.texts.map(t=>({...t, id:remap(t.id)}));
    const remPhotos = snap.photos.map(ph=>({...ph, id:remap(ph.id)}));
    const remShapes = snap.shapes.map(sh=>({...sh, id:remap(sh.id)}));
    const remIcons  = snap.icons.map(ic=>({...ic, id:remap(ic.id)}));
    const remLayers = (snap.layers||[]).filter(l=>l.type!=='image').map(l=>({...l, id:remap(l.id)}));
    const remGroups = (snap.groups||[]).map(g=>({...g, id:remap(g.id), memberIds:g.memberIds.map(remap)}));
    setTexts(remTexts); setPhotos(remPhotos); setImages([]);
    setShapes(remShapes); setIcons(remIcons);
    setLayers(remLayers);
    setGroups(remGroups);
    setCardW(snap.cardW); setCardH(snap.cardH); setCardBg(snap.cardBg); setOrient(snap.orient);
    setCustomW(String(snap.cardW)); setCustomH(String(snap.cardH));
    setSel(null);
    setTimeout(()=>{ skipHistory.current=false; }, 50);
  };
  const clearPreset = (slot)=>{
    const updated = {...presets};
    delete updated[slot];
    try{ localStorage.setItem(PRESET_KEY, JSON.stringify(updated)); }catch(e){}
    setPresets(updated);
  };

  // 상태 변화 감지 → debounce 300ms 후 스냅샷
  const debounceTimer = useRef(null);
  useEffect(()=>{
    if(skipHistory.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(()=>{ pushHistory(); }, 300);
    return ()=>clearTimeout(debounceTimer.current);
  },[texts,photos,images,shapes,icons,layers,groups]);

  const isVisible=(id)=>{const l=layers.find(l=>l.id===id);return l?l.visible!==false:true;};
  const isLocked=(id)=>{const l=layers.find(l=>l.id===id);return l?l.locked===true:false;};
  const zIdx=(id)=>{const i=layers.findIndex(l=>l.id===id);return i>=0?i+1:1;};
  const [showPreview, setShowPreview] = useState(false);
  const [cropModal,   setCropModal]   = useState(null);

  // 가이드라인
  const [guides,      setGuides]      = useState([]);
  const [selGuide,    setSelGuide]    = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showCutLine, setShowCutLine] = useState(true);
  const SNAP_DIST = 3;

  const cs  = {w:cardW, h:cardH};
  const P   = useCallback((mm)=>toP(mm,scale,zoom),[scale,zoom]);
  const CW  = P(cs.w), CH=P(cs.h), MG=P(MAR);
  const FSC = scale*zoom;

  const rMar         = useRef(MAR);
  const rP           = useRef(P);           rP.current=P;
  const rOrient      = useRef(orient);      rOrient.current=orient;
  const rCardW       = useRef(cardW);       rCardW.current=cardW;
  const rCardH       = useRef(cardH);       rCardH.current=cardH;
  const rScale       = useRef(scale);       rScale.current=scale;
  const rZoom        = useRef(zoom);        rZoom.current=zoom;
  const rGuides      = useRef(guides);      rGuides.current=guides;
  const rSnapEnabled = useRef(snapEnabled); rSnapEnabled.current=snapEnabled;

  // 통합 드래그 상태 ref — mode 필드로 분기
  // mode: 'elemDrag'|'photoResize'|'imageResize'|'imageEdgeResize'|'shapeResize'
  //       |'imageRotate'|'textRotate'|'textResize'|'photoRotate'|'shapeRotate'
  //       |'iconRotate'|'iconResize'|'guideDrag'
  const drag = useRef(null);
  const fileRef    = useRef(null);
  const imgFileRef = useRef(null);
  const cardRef    = useRef(null);
  const scrollContainerRef = useRef(null);
  // 텍스트 편집 중 스크롤 컨테이너 위치 잠금 (브라우저 자동 스크롤 방지)
  useEffect(()=>{
    const el=scrollContainerRef.current; if(!el) return;
    if(!editing) return;
    const sl=el.scrollLeft, st=el.scrollTop;
    const lock=()=>{ el.scrollLeft=sl; el.scrollTop=st; };
    el.addEventListener('scroll',lock,{passive:false});
    return ()=>el.removeEventListener('scroll',lock);
  },[editing]);
  /* FA load */
  useEffect(()=>{
    if(!document.getElementById("fa-cdn")){
      const link=document.createElement("link");
      link.id="fa-cdn";link.rel="stylesheet";link.crossOrigin="anonymous";
      link.href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
      document.head.appendChild(link);
    }
  },[]);

  /* 툴바 높이 감지 */
  useEffect(()=>{
    if(!toolbarRef.current) return;
    const ro=new ResizeObserver(()=>{
      setToolbarH(Math.round(toolbarRef.current.getBoundingClientRect().height));
    });
    ro.observe(toolbarRef.current);
    return ()=>ro.disconnect();
  },[]);

  /* copyright 바 높이 감지 */
  useEffect(()=>{
    const measure=()=>{
      if(copyrightRef.current)
        setCopyrightH(Math.round(copyrightRef.current.getBoundingClientRect().height));
    };
    measure();
    const ro=new ResizeObserver(measure);
    if(copyrightRef.current) ro.observe(copyrightRef.current);
    window.addEventListener('resize', measure);
    return ()=>{ ro.disconnect(); window.removeEventListener('resize', measure); };
  },[]);

  /* 구글 폰트 로드 */
  useEffect(()=>{
    FONT_LIST.forEach(f=>{
      if(!f.url) return;
      const id="gf-"+f.label.replace(/\s/g,"");
      if(document.getElementById(id)) return;
      const link=document.createElement("link");
      link.id=id; link.rel="stylesheet"; link.href=f.url;
      document.head.appendChild(link);
    });
  },[]);


  /* ── 포인터 이벤트 ── */
  useEffect(()=>{
    const gc = e=>e.touches?e.touches[0]:e;
    // 회전 공통: 현재 각도 − 시작 각도
    const calcRotDelta=(cl,d)=>{
      const cur=Math.atan2(cl.clientY-d.cy,cl.clientX-d.cx)*180/Math.PI;
      let delta=cur-d.startAngle; if(delta>180)delta-=360; if(delta<-180)delta+=360;
      return delta;
    };
    const onMove = e=>{
      const d=drag.current; if(!d) return;
      const cl=gc(e);
      const csMM={w:rCardW.current, h:rCardH.current};
      const ppm=BASE*rScale.current*rZoom.current;

      switch(d.mode){
        case 'imageRotate': {
          const delta=calcRotDelta(cl,d);
          setImages(p=>p.map(im=>im.id!==d.id?im:{...im,rotate:d.startRotate+delta}));
          if(d.groupSnaps) applyGroupRotate(d.groupSnaps,delta);
          return;
        }
        case 'textRotate': {
          const delta=calcRotDelta(cl,d);
          setTexts(p=>p.map(t=>t.id!==d.id?t:{...t,rotate:d.startRotate+delta}));
          if(d.groupSnaps) applyGroupRotate(d.groupSnaps,delta);
          return;
        }
        case 'photoRotate': {
          const delta=calcRotDelta(cl,d);
          setPhotos(p=>p.map(ph=>ph.id!==d.id?ph:{...ph,rotate:(d.startRotate||0)+delta}));
          if(d.groupSnaps) applyGroupRotate(d.groupSnaps,delta);
          return;
        }
        case 'shapeRotate': {
          const delta=calcRotDelta(cl,d);
          setShapes(p=>p.map(sh=>sh.id!==d.id?sh:{...sh,rotate:(d.startRotate||0)+delta}));
          if(d.groupSnaps) applyGroupRotate(d.groupSnaps,delta);
          return;
        }
        case 'iconRotate': {
          const delta=calcRotDelta(cl,d);
          setIcons(p=>p.map(ic=>ic.id!==d.id?ic:{...ic,rotate:(d.startRotate||0)+delta}));
          if(d.groupSnaps) applyGroupRotate(d.groupSnaps,delta);
          return;
        }
        case 'textResize': {
          const mv=(cl.clientX-d.startCX+cl.clientY-d.startCY)/2;
          const newFs=Math.max(4,Math.round(d.startFs+mv/2));
          setTexts(p=>p.map(t=>t.id!==d.id?t:{...t,fs:newFs}));
          if(d.groupSnaps&&d.startFs>0) applyGroupResize(d.groupSnaps,newFs/d.startFs,newFs/d.startFs);
          return;
        }
        case 'guideDrag': {
          let newMM;
          if(d.type==="h") newMM=d.startPosMM+(cl.clientY-d.startClient)/ppm;
          else              newMM=d.startPosMM+(cl.clientX-d.startClient)/ppm;
          newMM=Math.max(0,Math.min(newMM,d.type==="h"?csMM.h:csMM.w));
          setGuides(g=>g.map(gd=>gd.id!==d.id?gd:{...gd,posMM:newMM}));
          return;
        }
        case 'photoResize': {
          const aspect=d.startW/d.startH;
          const dxMM=(cl.clientX-d.startCX)/ppm, dyMM=(cl.clientY-d.startCY)/ppm;
          const delta=(Math.abs(dxMM)>Math.abs(dyMM)?dxMM:dyMM);
          const newW=Math.max(8,d.startW+delta);
          const newH=newW/aspect;
          setPhotos(p=>p.map(ph=>ph.id!==d.id?ph:{...ph,wMM:newW,hMM:newH}));
          if(d.groupSnaps) applyGroupResize(d.groupSnaps,newW/d.startW,newH/d.startH);
          return;
        }
        case 'imageResize': {
          const dxMM=(cl.clientX-d.startCX)/ppm;
          const newW=Math.max(5,d.startW+dxMM);
          const newH=newW/d.aspect;
          setImages(p=>p.map(im=>im.id!==d.id?im:{...im,wMM:newW,hMM:newH}));
          if(d.groupSnaps) applyGroupResize(d.groupSnaps,newW/d.startW,newH/d.startH);
          return;
        }
        case 'imageEdgeResize': {
          const dxMM=(cl.clientX-d.startX)/ppm;
          const dyMM=(cl.clientY-d.startY)/ppm;
          setImages(p=>p.map(im=>{
            if(im.id!==d.id) return im;
            let {wMM,hMM,xMM,yMM}={wMM:d.startW,hMM:d.startH,xMM:d.startXMM,yMM:d.startYMM};
            if(d.edge==='right')  { wMM=Math.max(3,d.startW+dxMM); }
            if(d.edge==='left')   { const nw=Math.max(3,d.startW-dxMM); xMM=d.startXMM+d.startW-nw; wMM=nw; }
            if(d.edge==='bottom') { hMM=Math.max(3,d.startH+dyMM); }
            if(d.edge==='top')    { const nh=Math.max(3,d.startH-dyMM); yMM=d.startYMM+d.startH-nh; hMM=nh; }
            return {...im,wMM,hMM,xMM,yMM};
          }));
          return;
        }
        case 'iconResize': {
          const mv=(cl.clientX-d.startCX+cl.clientY-d.startCY)/2;
          const newSz=Math.max(3,d.startSz+mv/BASE);
          setIcons(p=>p.map(ic=>ic.id!==d.id?ic:{...ic,sizeMM:newSz}));
          if(d.groupSnaps) applyGroupResize(d.groupSnaps,newSz/d.startSz,newSz/d.startSz);
          return;
        }
        case 'shapeResize': {
          const dxMM=(cl.clientX-d.startCX)/ppm, dyMM=(cl.clientY-d.startCY)/ppm;
          const newW=Math.max(2,d.startW+dxMM), newH=Math.max(2,d.startH+dyMM);
          setShapes(p=>p.map(sh=>sh.id!==d.id?sh:{...sh,wMM:newW,hMM:newH}));
          if(d.groupSnaps) applyGroupResize(d.groupSnaps,newW/d.startW,newH/d.startH);
          return;
        }
        case 'elemDrag': {
          const dxPx=cl.clientX-d.startCX, dyPx=cl.clientY-d.startCY;
          // 이미 선택된 요소 재클릭 시(더블클릭 의도) 임계값을 높여 오인식 방지
          const threshold = d.resel ? 15 : 4;
          if(!d.moved){
            if(Math.abs(dxPx)<threshold&&Math.abs(dyPx)<threshold) return;
            d.moved=true;
            e.preventDefault?.();
          }
          const xMM=d.startXMM+dxPx/ppm;
          const yMM=d.startYMM+dyPx/ppm;
          // 스냅 — 좌/우 엣지, 상/하 엣지만 체크 (센터 제외)
          let sx=xMM, sy=yMM;
          const {wMM:ew=0,hMM:eh=0}=d;
          if(rSnapEnabled.current){
            let bestDx=SNAP_DIST, bestDy=SNAP_DIST;
            for(const g of rGuides.current.filter(gd=>gd.visible)){
              if(g.type==="v"){
                const dl=Math.abs(xMM-g.posMM);
                const dr=Math.abs(xMM+ew-g.posMM);
                if(dl<bestDx){ bestDx=dl; sx=g.posMM; }
                if(dr<bestDx){ bestDx=dr; sx=g.posMM-ew; }
              }
              if(g.type==="h"){
                const dt=Math.abs(yMM-g.posMM);
                const db=Math.abs(yMM+eh-g.posMM);
                if(dt<bestDy){ bestDy=dt; sy=g.posMM; }
                if(db<bestDy){ bestDy=db; sy=g.posMM-eh; }
              }
            }
          }
          if(d.type==="text") setTexts(p=>p.map(t=>t.id!==d.id?t:{...t,xMM:sx,yMM:sy}));
          else if(d.type==="photo") setPhotos(p=>p.map(ph=>ph.id!==d.id?ph:{...ph,xMM:sx,yMM:sy}));
          else if(d.type==="image") setImages(p=>p.map(im=>im.id!==d.id?im:{...im,xMM:sx,yMM:sy}));
          else if(d.type==="shape") setShapes(p=>p.map(sh=>sh.id!==d.id?sh:{...sh,xMM:sx,yMM:sy}));
          else if(d.type==="icon") setIcons(p=>p.map(ic=>ic.id!==d.id?ic:{...ic,xMM:sx,yMM:sy}));
          // 그룹 멤버 함께 이동
          if(d.groupOffsets&&d.groupOffsets.length>0){
            const mIds={text:new Set(),photo:new Set(),image:new Set(),shape:new Set(),icon:new Set()};
            const mPos={};
            d.groupOffsets.forEach(m=>{mIds[m.type]?.add(m.id);mPos[m.id]={x:sx+m.dxMM,y:sy+m.dyMM};});
            if(mIds.text.size)   setTexts(p=>p.map(t=>mIds.text.has(t.id)?{...t,xMM:mPos[t.id].x,yMM:mPos[t.id].y}:t));
            if(mIds.photo.size)  setPhotos(p=>p.map(t=>mIds.photo.has(t.id)?{...t,xMM:mPos[t.id].x,yMM:mPos[t.id].y}:t));
            if(mIds.image.size)  setImages(p=>p.map(t=>mIds.image.has(t.id)?{...t,xMM:mPos[t.id].x,yMM:mPos[t.id].y}:t));
            if(mIds.shape.size)  setShapes(p=>p.map(t=>mIds.shape.has(t.id)?{...t,xMM:mPos[t.id].x,yMM:mPos[t.id].y}:t));
            if(mIds.icon.size)   setIcons(p=>p.map(t=>mIds.icon.has(t.id)?{...t,xMM:mPos[t.id].x,yMM:mPos[t.id].y}:t));
          }
          return;
        }
      }
    };
    const onUp=()=>{ drag.current=null; };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
    window.addEventListener("touchmove",onMove,{passive:false});
    window.addEventListener("touchend",onUp);
    return()=>{
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
      window.removeEventListener("touchmove",onMove);
      window.removeEventListener("touchend",onUp);
    };
  },[]);

  /* ── 키보드 Delete / Ctrl+Z / Ctrl+Y ── */
  useEffect(()=>{
    const k=e=>{
      const tag=e.target?.tagName?.toLowerCase();
      if(tag==="input"||tag==="textarea") return;
      // Ctrl+Z: 되돌리기
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"&&!e.shiftKey){
        e.preventDefault(); undo(); return;
      }
      // Ctrl+Y 또는 Ctrl+Shift+Z: 되살리기
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||e.key==="Y"||(e.key.toLowerCase()==="z"&&e.shiftKey))){
        e.preventDefault(); redo(); return;
      }
      if(editing) return;
      if((e.key==="Delete"||e.key==="Backspace")&&sel){
        setTexts(p=>p.filter(t=>t.id!==sel));
        setPhotos(p=>p.filter(ph=>ph.id!==sel));
        setImages(p=>p.filter(im=>im.id!==sel));
        setShapes(p=>p.filter(sh=>sh.id!==sel));
        setIcons(p=>p.filter(ic=>ic.id!==sel));
        removeLayer(sel);
        setSel(null);
      }
    };
    window.addEventListener("keydown",k);
    return()=>window.removeEventListener("keydown",k);
  },[sel,editing,undo,redo]);

  useEffect(()=>{ setZInput(String(Math.round(zoom*100))); },[zoom]);

  const startElem=(e,id,type)=>{
    if(e.button!==undefined&&e.button!==0) return;
    if(isLocked(id)) return;
    e.stopPropagation();
    const cl=e.touches?e.touches[0]:e;
    let elem=null;
    if(type==="text")  elem=texts.find(t=>t.id===id);
    if(type==="photo") elem=photos.find(p=>p.id===id);
    if(type==="image") elem=images.find(im=>im.id===id);
    if(type==="shape") elem=shapes.find(sh=>sh.id===id);
    if(type==="icon")  elem=icons.find(ic=>ic.id===id);
    if(!elem) return;
    const ppm=BASE*rScale.current*rZoom.current;
    let wMM=0, hMM=0;
    if(type==="text"){
      // offsetWidth/Height: 회전 전 실제 크기 측정
      const domEl=document.querySelector(`[data-elem-id="${id}"]`);
      if(domEl){ wMM=domEl.offsetWidth/ppm; hMM=domEl.offsetHeight/ppm; }
      else { wMM=elem.text.length*elem.fs/BASE; hMM=elem.fs*1.4/BASE; }
    } else if(type==="shape"||type==="photo"||type==="image"){ wMM=elem.wMM; hMM=elem.hMM;
    } else if(type==="icon"){ wMM=elem.sizeMM; hMM=elem.sizeMM; }
    setSel(id);
    // selGroups에 있는 그룹 중 이 요소가 속하지 않은 그룹은 유지 — 캔버스 직접 클릭 시 selGroups 유지
    // (selGroups 해제는 레이어패널 클릭 또는 빈 영역 클릭에서만)
    // selGroups에서 이 요소가 속한 그룹 찾기 — 없으면 단독
    const grpForSel = [...(rSelGroups.current||[])].map(gid=>rGroups.current.find(g=>g.id===gid)).find(g=>g&&g.memberIds.includes(id));
    let groupOffsets = null;
    if(grpForSel){
      // selGroups에 있는 모든 그룹의 멤버를 함께 이동
      const allMemberIds = new Set(
        [...(rSelGroups.current||[])].flatMap(gid=>{
          const g=rGroups.current.find(g=>g.id===gid);
          return g?g.memberIds:[];
        })
      );
      allMemberIds.delete(id);
      const allElems = [
        ...stateRef.current.texts.map(t=>({id:t.id,type:'text',xMM:t.xMM,yMM:t.yMM})),
        ...stateRef.current.photos.map(t=>({id:t.id,type:'photo',xMM:t.xMM,yMM:t.yMM})),
        ...stateRef.current.images.map(t=>({id:t.id,type:'image',xMM:t.xMM,yMM:t.yMM})),
        ...stateRef.current.shapes.map(t=>({id:t.id,type:'shape',xMM:t.xMM,yMM:t.yMM})),
        ...stateRef.current.icons.map(t=>({id:t.id,type:'icon',xMM:t.xMM,yMM:t.yMM})),
      ];
      groupOffsets = [...allMemberIds].map(mid=>{
        const el=allElems.find(e=>e.id===mid); if(!el) return null;
        return {id:mid,type:el.type,dxMM:el.xMM-elem.xMM,dyMM:el.yMM-elem.yMM};
      }).filter(Boolean);
    }
    drag.current={mode:'elemDrag',id,type,startXMM:elem.xMM,startYMM:elem.yMM,startCX:cl.clientX,startCY:cl.clientY,wMM,hMM,groupOffsets,resel:sel===id};
  };

  // 그룹 리사이즈용: 멤버들의 시작 크기 스냅샷
  const buildGroupSnaps=(primaryId)=>{
    const grp=[...(rSelGroups.current||[])].map(gid=>rGroups.current.find(g=>g.id===gid)).find(g=>g&&g.memberIds.includes(primaryId));
    if(!grp) return null;
    // selGroups의 모든 그룹 멤버 포함
    const allMemberIds=new Set([...(rSelGroups.current||[])].flatMap(gid=>{const g=rGroups.current.find(g=>g.id===gid);return g?g.memberIds:[];}));
    allMemberIds.delete(primaryId);
    if(allMemberIds.size===0) return null;
    const s=stateRef.current;
    return [...allMemberIds].map(mid=>{
      const t=s.texts.find(x=>x.id===mid);   if(t)  return {id:mid,type:'text', startFs:t.fs};
      const ph=s.photos.find(x=>x.id===mid); if(ph) return {id:mid,type:'photo',startW:ph.wMM,startH:ph.hMM};
      const im=s.images.find(x=>x.id===mid); if(im) return {id:mid,type:'image',startW:im.wMM,startH:im.hMM};
      const sh=s.shapes.find(x=>x.id===mid); if(sh) return {id:mid,type:'shape',startW:sh.wMM,startH:sh.hMM};
      const ic=s.icons.find(x=>x.id===mid);  if(ic) return {id:mid,type:'icon', startSz:ic.sizeMM};
      return null;
    }).filter(Boolean);
  };

  // 스케일 비율로 멤버 크기 변경
  const applyGroupResize=(snaps, scaleX, scaleY)=>{
    if(!snaps||snaps.length===0) return;
    snaps.forEach(m=>{
      if(m.type==='text')  setTexts(p=>p.map(t=>t.id!==m.id?t:{...t,fs:Math.max(4,Math.round(m.startFs*scaleX))}));
      if(m.type==='photo') setPhotos(p=>p.map(t=>t.id!==m.id?t:{...t,wMM:Math.max(8,m.startW*scaleX),hMM:Math.max(8,m.startH*scaleY)}));
      if(m.type==='image') setImages(p=>p.map(t=>t.id!==m.id?t:{...t,wMM:Math.max(5,m.startW*scaleX),hMM:Math.max(5,m.startH*scaleY)}));
      if(m.type==='shape') setShapes(p=>p.map(t=>t.id!==m.id?t:{...t,wMM:Math.max(2,m.startW*scaleX),hMM:Math.max(2,m.startH*scaleY)}));
      if(m.type==='icon')  setIcons(p=>p.map(t=>t.id!==m.id?t:{...t,sizeMM:Math.max(3,m.startSz*scaleX)}));
    });
  };

  // 그룹 회전용: 멤버들의 시작 회전값 스냅샷
  const buildGroupRotateSnaps=(primaryId)=>{
    const grp=[...(rSelGroups.current||[])].map(gid=>rGroups.current.find(g=>g.id===gid)).find(g=>g&&g.memberIds.includes(primaryId));
    if(!grp) return null;
    const allMemberIds=new Set([...(rSelGroups.current||[])].flatMap(gid=>{const g=rGroups.current.find(g=>g.id===gid);return g?g.memberIds:[];}));
    allMemberIds.delete(primaryId);
    if(allMemberIds.size===0) return null;
    const s=stateRef.current;
    return [...allMemberIds].map(mid=>{
      const t=s.texts.find(x=>x.id===mid);   if(t)  return {id:mid,type:'text', startRotate:t.rotate||0};
      const ph=s.photos.find(x=>x.id===mid); if(ph) return {id:mid,type:'photo',startRotate:ph.rotate||0};
      const im=s.images.find(x=>x.id===mid); if(im) return {id:mid,type:'image',startRotate:im.rotate||0};
      const sh=s.shapes.find(x=>x.id===mid); if(sh) return {id:mid,type:'shape',startRotate:sh.rotate||0};
      const ic=s.icons.find(x=>x.id===mid);  if(ic) return {id:mid,type:'icon', startRotate:ic.rotate||0};
      return null;
    }).filter(Boolean);
  };

  // delta 각도만큼 멤버들 회전
  const applyGroupRotate=(snaps, delta)=>{
    if(!snaps||snaps.length===0) return;
    snaps.forEach(m=>{
      const r=m.startRotate+delta;
      if(m.type==='text')  setTexts(p=>p.map(t=>t.id!==m.id?t:{...t,rotate:r}));
      if(m.type==='photo') setPhotos(p=>p.map(t=>t.id!==m.id?t:{...t,rotate:r}));
      if(m.type==='image') setImages(p=>p.map(t=>t.id!==m.id?t:{...t,rotate:r}));
      if(m.type==='shape') setShapes(p=>p.map(t=>t.id!==m.id?t:{...t,rotate:r}));
      if(m.type==='icon')  setIcons(p=>p.map(t=>t.id!==m.id?t:{...t,rotate:r}));
    });
  };

  const upd=(id,k,v)=>setTexts(p=>p.map(t=>t.id!==id?t:{...t,[k]:v}));

  const ZMIN=.1, ZMAX=4, ZSTP=.1;
  const applyZoom=z=>setZoom(Math.max(ZMIN,Math.min(ZMAX,Math.round(z*100)/100)));
  const zIn=()=>applyZoom(zoom+ZSTP);
  const zOut=()=>applyZoom(zoom-ZSTP);
  const onZCommit=()=>{
    const v=parseFloat(zInput)/100;
    if(!isNaN(v)) applyZoom(v);
    else setZInput(String(Math.round(zoom*100)));
  };


  /* ── 카드 이미지 다운로드 ── */
  const downloadCard = async () => {

    /* t.font 는 "'Noto Sans KR',sans-serif" 같은 CSS family 전체 문자열.
       Canvas / FontFace API 는 따옴표 없는 순수 이름만 필요 → 첫 토큰만 추출 */
    const extractFamily = (fontProp) => {
      const raw = (fontProp || "'Noto Sans KR',sans-serif").split(',')[0];
      return raw.replace(/['"]/g, '').trim();  // → "Noto Sans KR"
    };

    /* ── 1. 사용 폰트별 실제 문자 수집 ── */
    const fontTextMap = {};
    texts.forEach(t => {
      const fam = extractFamily(t.font);
      fontTextMap[fam] = (fontTextMap[fam] || '') + t.text;
    });

    /* ── 2. Google Fonts에서 해당 문자 서브셋 fetch → FontFace 주입 ── */
    await Promise.all(Object.entries(fontTextMap).map(async ([family, chars]) => {
      const info = FONT_LIST.find(f => f.family && f.family.includes(family));
      if(!info?.url) return;

      const uniqueChars = [...new Set(chars.split(''))].join('');
      // &text= 로 해당 문자만 포함한 서브셋 CSS 요청
      const cssUrl = info.url + '&text=' + encodeURIComponent(uniqueChars);

      let css = '';
      try {
        const resp = await fetch(cssUrl);
        css = await resp.text();
      } catch(e) { return; }

      // @font-face 블록 파싱
      const re = /@font-face\s*\{([^}]+)\}/g;
      let m;
      const loads = [];
      while((m = re.exec(css)) !== null) {
        const block = m[1];
        const urlM  = block.match(/url\((https?:\/\/[^)]+)\)/);
        const wgtM  = block.match(/font-weight:\s*(\S+)/);
        const styM  = block.match(/font-style:\s*(\S+)/);
        const ranM  = block.match(/unicode-range:\s*([^\n;]+)/);
        if(!urlM) continue;
        const woff2url = urlM[1];
        const weight   = (wgtM?.[1] || '400').trim();
        const style    = (styM?.[1] || 'normal').trim();
        const range    = ranM?.[1]?.trim();
        loads.push((async () => {
          try {
            const buf  = await (await fetch(woff2url)).arrayBuffer();
            const opts = { weight, style, ...(range ? { unicodeRange: range } : {}) };
            const ff   = new FontFace(family, buf, opts);
            await ff.load();
            document.fonts.add(ff);
          } catch(e) {}
        })());
      }
      await Promise.all(loads);
    }));

    /* ── 3. Canvas 세팅 ── */
    const DPI  = 300;
    const ppm  = DPI / 25.4;
    // 전체 카드 크기로 렌더 후 재단선 기준으로 크롭
    const fullW = Math.round(cardW * ppm);
    const fullH = Math.round(cardH * ppm);
    const cutX  = Math.round(MAR * ppm);
    const cutY  = Math.round(MAR * ppm);
    // CW/CH는 fullW/H에서 cutX/Y를 뺀 값으로 — rounding 오차로 인한 1px 갭 방지
    const CW    = fullW - cutX * 2;
    const CH    = fullH - cutY * 2;
    const P     = mm => mm * ppm;              // 전체 카드 기준 좌표
    const PS    = mm => mm * ppm;              // 크기 전용
    const FSC   = ppm / BASE;                  // 폰트 크기 스케일

    const canvas = document.createElement('canvas');
    canvas.width = fullW; canvas.height = fullH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = cardBg || '#fff';
    ctx.fillRect(0, 0, fullW, fullH);

    const loadImg = src => new Promise(res => {
      if(!src){ res(null); return; }
      const img = new Image();
      if(src.startsWith('http')) img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });

    /* ── 4. 레이어 순서대로 렌더링 ── */
    for(const layer of [...layers]){

      if(layer.type==='image'){
        const im = images.find(i=>i.id===layer.id);
        if(!im?.src) continue;
        const img = await loadImg(im.src);
        if(!img) continue;
        ctx.save();
        ctx.globalAlpha = im.opacity??1;
        ctx.translate(P(im.xMM)+PS(im.wMM)/2, P(im.yMM)+PS(im.hMM)/2);
        ctx.rotate((im.rotate||0)*Math.PI/180);
        if(im.flipX) ctx.scale(-1,1);
        ctx.drawImage(img,-PS(im.wMM)/2,-PS(im.hMM)/2,PS(im.wMM),PS(im.hMM));
        ctx.restore();
      }

      else if(layer.type==='shape'){
        const sh = shapes.find(s=>s.id===layer.id);
        if(!sh) continue;
        const hw=PS(sh.wMM)/2, hh=PS(sh.hMM)/2;
        ctx.save();
        ctx.globalAlpha = sh.opacity??1;
        ctx.translate(P(sh.xMM)+hw, P(sh.yMM)+hh);
        if(sh.flipX) ctx.scale(-1,1);
        ctx.rotate((sh.rotate||0)*Math.PI/180);
        ctx.fillStyle = sh.fill||'#ccc';
        const stkPx = (sh.strokeW||0)*(DPI/96);
        const half2 = stkPx/2;
        if(sh.type==='circle'){
          ctx.beginPath(); ctx.ellipse(0,0,Math.max(0,hw-half2),Math.max(0,hh-half2),0,0,Math.PI*2);
          ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.stroke();
          }
        } else if(sh.type==='triangle'){
          const th=hh-half2, tw=hw-half2;
          const rr=sh.radius||0;
          ctx.beginPath();
          if(rr>0){
            const pts=[{x:0,y:-(th-half2)},{x:tw,y:th},{x:-tw,y:th}];
            const n3=pts.length;
            for(let i=0;i<n3;i++){
              const prev=pts[(i+n3-1)%n3],cur=pts[i],next=pts[(i+1)%n3];
              const d1x=prev.x-cur.x,d1y=prev.y-cur.y,l1=Math.hypot(d1x,d1y);
              const d2x=next.x-cur.x,d2y=next.y-cur.y,l2=Math.hypot(d2x,d2y);
              const rrr=Math.min(rr*(DPI/96),l1/2,l2/2);
              const p1x=cur.x+d1x/l1*rrr,p1y=cur.y+d1y/l1*rrr;
              const p2x=cur.x+d2x/l2*rrr,p2y=cur.y+d2y/l2*rrr;
              if(i===0)ctx.moveTo(p1x,p1y); else ctx.lineTo(p1x,p1y);
              ctx.quadraticCurveTo(cur.x,cur.y,p2x,p2y);
            }
          } else {
            ctx.moveTo(0,-(th-half2)); ctx.lineTo(tw,th); ctx.lineTo(-tw,th);
          }
          ctx.closePath(); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.lineJoin='miter'; ctx.stroke();
          }
        } else if(sh.type==='star'){
          const spts=starPoints(hw-half2,hh-half2);
          ctx.beginPath(); ctxPoly(ctx,spts); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.lineJoin='round'; ctx.stroke();
          }
        } else if(sh.type==='heart'){
          ctx.beginPath(); ctxHeart(ctx,0,0,hw-half2,hh-half2); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.lineJoin='round'; ctx.stroke();
          }
        } else if(sh.type==='pentagon'){
          const ppts=polyPoints(5,hw-half2,hh-half2);
          ctx.beginPath(); ctxPoly(ctx,ppts); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.lineJoin='round'; ctx.stroke();
          }
        } else if(sh.type==='hexagon'){
          const hxpts=polyPoints(6,hw-half2,hh-half2,0);
          ctx.beginPath(); ctxPoly(ctx,hxpts); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.lineJoin='round'; ctx.stroke();
          }
        } else {
          const r=Math.min(sh.radius||0,hw-half2,hh-half2);
          const ihw=hw-half2, ihh=hh-half2;
          ctx.beginPath();
          ctx.moveTo(-ihw+r,-ihh); ctx.lineTo(ihw-r,-ihh); ctx.arcTo(ihw,-ihh,ihw,-ihh+r,r);
          ctx.lineTo(ihw,ihh-r);  ctx.arcTo(ihw,ihh,ihw-r,ihh,r);
          ctx.lineTo(-ihw+r,ihh); ctx.arcTo(-ihw,ihh,-ihw,ihh-r,r);
          ctx.lineTo(-ihw,-ihh+r);ctx.arcTo(-ihw,-ihh,-ihw+r,-ihh,r);
          ctx.closePath(); ctx.fill();
          if(sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none'){
            ctx.strokeStyle=sh.stroke; ctx.lineWidth=stkPx; ctx.stroke();
          }
        }
        ctx.restore();
      }

      else if(layer.type==='photo'){
        const ph = photos.find(p=>p.id===layer.id);
        if(!ph?.src) continue;
        const img = await loadImg(ph.src);
        if(!img) continue;
        const hw=PS(ph.wMM)/2, hh=PS(ph.hMM)/2;
        ctx.save();
        ctx.translate(P(ph.xMM)+hw, P(ph.yMM)+hh);
        ctx.rotate((ph.rotate||0)*Math.PI/180);
        if(ph.flipX) ctx.scale(-1,1);
        ctx.beginPath();
        if(ph.shape==='circle'){
          ctx.ellipse(0,0,hw,hh,0,0,Math.PI*2);
        } else {
          const r=Math.min(ph.radius||0,hw,hh);
          ctx.moveTo(-hw+r,-hh); ctx.lineTo(hw-r,-hh); ctx.arcTo(hw,-hh,hw,-hh+r,r);
          ctx.lineTo(hw,hh-r);  ctx.arcTo(hw,hh,hw-r,hh,r);
          ctx.lineTo(-hw+r,hh); ctx.arcTo(-hw,hh,-hw,hh-r,r);
          ctx.lineTo(-hw,-hh+r);ctx.arcTo(-hw,-hh,-hw+r,-hh,r);
          ctx.closePath();
        }
        ctx.clip();
        ctx.drawImage(img,-hw,-hh,PS(ph.wMM),PS(ph.hMM));
        if(ph.borderW&&ph.borderW>0){
          ctx.restore();
          ctx.save();
          ctx.translate(P(ph.xMM)+hw, P(ph.yMM)+hh);
          ctx.rotate((ph.rotate||0)*Math.PI/180);
          if(ph.flipX) ctx.scale(-1,1);
          ctx.beginPath();
          if(ph.shape==='circle'){
            ctx.ellipse(0,0,hw,hh,0,0,Math.PI*2);
          } else {
            const r2=Math.min(ph.radius||0,hw,hh);
            ctx.moveTo(-hw+r2,-hh); ctx.lineTo(hw-r2,-hh); ctx.arcTo(hw,-hh,hw,-hh+r2,r2);
            ctx.lineTo(hw,hh-r2);  ctx.arcTo(hw,hh,hw-r2,hh,r2);
            ctx.lineTo(-hw+r2,hh); ctx.arcTo(-hw,hh,-hw,hh-r2,r2);
            ctx.lineTo(-hw,-hh+r2);ctx.arcTo(-hw,-hh,-hw+r2,-hh,r2);
            ctx.closePath();
          }
          ctx.strokeStyle=ph.borderColor||'#000';
          ctx.lineWidth=ph.borderW*(DPI/96);
          ctx.stroke();
        }
        ctx.restore();
      }

      else if(layer.type==='text'){
        const t = texts.find(t=>t.id===layer.id);
        if(!t) continue;
        const fam  = extractFamily(t.font);   // ← 핵심 수정: 순수 폰트명
        const fs   = t.fs * FSC;
        const wgt  = t.bold   ? '700'    : '400';
        const sty  = t.italic ? 'italic' : 'normal';
        ctx.save();
        ctx.globalAlpha = t.opacity??1;
        ctx.translate(P(t.xMM), P(t.yMM));
        ctx.rotate((t.rotate||0)*Math.PI/180);
        ctx.font         = `${sty} ${wgt} ${fs}px "${fam}",sans-serif`;
        ctx.fillStyle    = t.color || '#000';
        ctx.textBaseline = 'top';
        // DOM lineHeight:1.4 의 half-leading 보정 — (1.4-1)/2 * fs
        const halfLead = 0.2 * fs;
        if(t.flipX){
          // 텍스트 너비 측정 후 중심 기준으로 반전 (왼쪽 상단 기준 scale(-1,1)하면 위치 어긋남)
          const tw = ctx.measureText(t.text).width;
          ctx.translate(tw/2, 0);
          ctx.scale(-1,1);
          ctx.translate(-tw/2, 0);
        }
        if(t.strokeW && t.strokeW>0){
          ctx.lineWidth   = t.strokeW * 2;
          ctx.strokeStyle = t.strokeColor || '#000';
          ctx.lineJoin    = 'round';
          ctx.strokeText(t.text, 0, halfLead);
        }
        ctx.fillText(t.text, 0, halfLead);
        if(t.underline || t.strike){
          const w = ctx.measureText(t.text).width;
          ctx.fillRect(0, halfLead+(t.underline ? fs*1.1 : fs*0.55), w, Math.max(1, fs*0.07));
        }
        ctx.restore();
      }

      else if(layer.type==='icon'){
        const ic = icons.find(i=>i.id===layer.id);
        if(!ic) continue;
        const isz = PS(ic.sizeMM);
        const sc2 = isz * 0.8 / 24;
        const pathData = _IC[ic.type]||'M12 2a10 10 0 100 20A10 10 0 0012 2z';
        ctx.save();
        ctx.translate(P(ic.xMM)+isz/2, P(ic.yMM)+isz/2);
        ctx.rotate((ic.rotate||0)*Math.PI/180);
        if(ic.flipX) ctx.scale(-1,1);
        ctx.translate(-isz*0.4, -isz*0.4);
        ctx.scale(sc2, sc2);
        ctx.strokeStyle = ic.color||'#000';
        ctx.fillStyle   = ic.color||'#000';
        ctx.lineWidth   = 2/sc2;
        ctx.lineCap='round'; ctx.lineJoin='round';
        try{
          const p2d = new Path2D(pathData);
          if(_IC_FILLED.has(ic.type)){ ctx.fill(p2d); }
          else { ctx.stroke(p2d); }
        }catch(e){}
        ctx.restore();
      }
    }

    // 재단선 기준으로 크롭
    const cropped = document.createElement('canvas');
    cropped.width = CW; cropped.height = CH;
    cropped.getContext('2d').drawImage(canvas, cutX, cutY, CW, CH, 0, 0, CW, CH);

    cropped.toBlob(blob => {
      if(!blob) return;
      // PNG에 300dpi pHYs 청크 삽입
      const reader = new FileReader();
      reader.onload = ev => {
        const buf = new Uint8Array(ev.target.result);
        // pHYs 청크: 300dpi = 11811 pixels/meter (300/25.4*1000)
        const ppm300 = Math.round(300 / 25.4 * 1000); // 11811
        const phys = new Uint8Array(21);
        // chunk length (9 bytes data)
        phys[0]=0;phys[1]=0;phys[2]=0;phys[3]=9;
        // chunk type "pHYs"
        phys[4]=0x70;phys[5]=0x48;phys[6]=0x59;phys[7]=0x73;
        // X pixels per unit (big-endian)
        phys[8]=(ppm300>>24)&0xff;phys[9]=(ppm300>>16)&0xff;phys[10]=(ppm300>>8)&0xff;phys[11]=ppm300&0xff;
        // Y pixels per unit
        phys[12]=(ppm300>>24)&0xff;phys[13]=(ppm300>>16)&0xff;phys[14]=(ppm300>>8)&0xff;phys[15]=ppm300&0xff;
        // unit: 1 = metre
        phys[16]=1;
        // CRC32 of type+data
        const crcData=new Uint8Array(13);
        crcData.set(phys.slice(4,17));
        const crc=crc32(crcData);
        phys[17]=(crc>>24)&0xff;phys[18]=(crc>>16)&0xff;phys[19]=(crc>>8)&0xff;phys[20]=crc&0xff;
        // PNG 파일에서 IHDR 청크 다음 위치(33바이트)에 pHYs 삽입
        const out = new Uint8Array(buf.length + 21);
        out.set(buf.slice(0,33));
        out.set(phys, 33);
        out.set(buf.slice(33), 54);
        const blob2 = new Blob([out], {type:'image/png'});
        const url = URL.createObjectURL(blob2);
        const a = document.createElement('a');
        a.href=url; a.download='card.png';
        document.body.appendChild(a); a.click();
        setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); },1000);
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  };

  const applyCal=()=>{
    const m=parseFloat(calVal);
    if(!m||m<=0) return;
    setScale(cs.w/m);
    setCalVal("");
  };

  const applyPreset=(w,h,o,template)=>{
    const newO=o||(w>h?"landscape":"portrait");
    setOrient(newO);
    setCardW(w); setCardH(h);
    setCustomW(String(w)); setCustomH(String(h));
    if(template==="card"){
      setTexts(INIT_TEXTS);
      setPhotos([{id:"ph1", xMM:w-MAR-PW, yMM:MAR, wMM:PW, hMM:PH, src:null, imgX:0, imgY:0, imgScale:1, shape:"rect", radius:0, borderW:0, borderColor:"#000000"}]);
      setImages([]); setShapes([]); setIcons([]);
      setLayers(INIT_LAYERS_CARD());
    } else if(template==="biz"){
      setTexts(INIT_TEXTS_BIZ);
      setPhotos([]);
      setImages([]); setShapes([]); setIcons([]);
      setLayers(INIT_LAYERS_BIZ());
    } else {
      // 사이즈만 바꿀 때: 사진을 오른쪽 재단선에 맞춰 이동
      setPhotos(p=>p.map(ph=>({...ph,
        xMM: w - MAR - ph.wMM,
        yMM: Math.min(ph.yMM, h - MAR - ph.hMM)
      })));
    }
    setSel(null); setEditing(null);
  };

  const changeOrient=o=>{
    const ns=CARD[o];
    setPhotos(p=>p.map(ph=>({...ph,
      xMM:Math.max(MAR,Math.min(ph.xMM,ns.w-MAR-ph.wMM)),
      yMM:Math.max(MAR,Math.min(ph.yMM,ns.h-MAR-ph.hMM))})));
    setTexts(t=>t.map(tx=>({...tx,
      xMM:Math.max(MAR,Math.min(tx.xMM,ns.w-MAR)),
      yMM:Math.max(MAR,Math.min(tx.yMM,ns.h-MAR))})));
    setImages(p=>p.map(im=>({...im,
      xMM:Math.max(MAR,Math.min(im.xMM,ns.w-MAR-im.wMM)),
      yMM:Math.max(MAR,Math.min(im.yMM,ns.h-MAR-im.hMM))})));
    setShapes(p=>p.map(sh=>({...sh,
      xMM:Math.max(MAR,Math.min(sh.xMM,ns.w-MAR-sh.wMM)),
      yMM:Math.max(MAR,Math.min(sh.yMM,ns.h-MAR-sh.hMM))})));
    setIcons(p=>p.map(ic=>({...ic,
      xMM:Math.max(MAR,Math.min(ic.xMM,ns.w-MAR-ic.sizeMM)),
      yMM:Math.max(MAR,Math.min(ic.yMM,ns.h-MAR-ic.sizeMM))})));
    const isLand=o==="landscape";
    const newW=isLand?Math.max(cardW,cardH):Math.min(cardW,cardH);
    const newH=isLand?Math.min(cardW,cardH):Math.max(cardW,cardH);
    setCardW(newW); setCardH(newH);
    setCustomW(String(newW)); setCustomH(String(newH));
    setOrient(o);
  };

  const addText=()=>{
    const id=uid();
    setSel(id);
    setTexts(p=>[...p,{id,xMM:MAR+5,yMM:MAR+5,text:"새 텍스트",fs:10,color:"#1a2744",bold:false,italic:false,rotate:0}]);
    addLayer(id,"text");
  };

  const addPhoto=()=>{
    const id=uid();
    setSel(id);
    setPhotos(p=>[...p,{id,xMM:MAR,yMM:MAR,wMM:PW,hMM:PH,src:null,imgX:0,imgY:0,imgScale:1,shape:"rect",radius:0,borderW:0,borderColor:"#000000"}]);
    addLayer(id,"photo");
  };

  const addImage=()=>imgFileRef.current?.click();
  const addShape=(type)=>{
    const id=uid();
    setSel(id);
    const SHAPE_FILL={rect:"#eb6100",circle:"#097c25",triangle:"#3498db",star:"#f1c40f",heart:"#e91e8c",pentagon:"#9b59b6",hexagon:"#16a085"};
    const fill=SHAPE_FILL[type]||"#3498db";
    setShapes(p=>[...p,{id,type,xMM:cs.w/2-5,yMM:cs.h/2-5,wMM:10,hMM:10,fill,stroke:"none",strokeW:0,opacity:1}]);
    addLayer(id,"shape");
  };
  const addIcon=(type)=>{
    const id=uid();
    setSel(id);
    setShowIconPicker(false);
    const sz=parseFloat(pickerSize)||10;
    setIcons(p=>[...p,{id,type,xMM:cs.w/2-5,yMM:cs.h/2-5,sizeMM:sz,color:pickerColor,rotate:0}]);
    addLayer(id,"icon");
  };
  // ── 복사 ──
  const copyElem = useCallback(()=>{
    if(!sel) return;
    const OFF=5;
    const t=texts.find(x=>x.id===sel);
    if(t){const id=uid();setTexts(p=>[...p,{...t,id,xMM:t.xMM+OFF,yMM:t.yMM+OFF}]);addLayer(id,"text");setSel(id);return;}
    const ph=photos.find(x=>x.id===sel);
    if(ph){const id=uid();setPhotos(p=>[...p,{...ph,id,xMM:ph.xMM+OFF,yMM:ph.yMM+OFF}]);addLayer(id,"photo");setSel(id);return;}
    const im=images.find(x=>x.id===sel);
    if(im){const id=uid();setImages(p=>[...p,{...im,id,xMM:im.xMM+OFF,yMM:im.yMM+OFF}]);addLayer(id,"image");setSel(id);return;}
    const sh=shapes.find(x=>x.id===sel);
    if(sh){const id=uid();setShapes(p=>[...p,{...sh,id,xMM:sh.xMM+OFF,yMM:sh.yMM+OFF}]);addLayer(id,"shape");setSel(id);return;}
    const ic=icons.find(x=>x.id===sel);
    if(ic){const id=uid();setIcons(p=>[...p,{...ic,id,xMM:ic.xMM+OFF,yMM:ic.yMM+OFF}]);addLayer(id,"icon");setSel(id);return;}
  },[sel,texts,photos,images,shapes,icons]);

  // ── 정렬 (재단선 기준) ──
  const alignElem = useCallback((halign, valign) => {
    if(!sel) return;
    const cutL=MAR, cutR=cardW-MAR, cutT=MAR, cutB=cardH-MAR;
    const cutCX=(cutL+cutR)/2, cutCY=(cutT+cutB)/2;
    const ppm=BASE*rScale.current*rZoom.current;
    const getElemSize=(id)=>{
      const el=document.querySelector(`[data-elem-id="${id}"]`);
      if(el&&ppm>0){const r=el.getBoundingClientRect();return{w:r.width/ppm,h:r.height/ppm};}
      return{w:0,h:0};
    };
    const ax=(w)=>{const ww=w||0;return halign==='left'?cutL:halign==='center'?cutCX-ww/2:cutR-ww;};
    const ay=(h)=>{const hh=h||0;return valign==='top'?cutT:valign==='middle'?cutCY-hh/2:cutB-hh;};

    // 그룹 선택 상태: 그룹 전체를 하나의 단위로 정렬
    const sg=rSelGroups.current;
    if(sg&&sg.size>0){
      const allGrpIds=[...sg];
      const allMemberIds=allGrpIds.flatMap(gid=>{const g=rGroups.current.find(g=>g.id===gid);return g?g.memberIds:[];});
      if(allMemberIds.length===0) return;
      // 전체 바운딩박스 계산
      const allS=stateRef.current;
      const getBox=(id)=>{
        const t=allS.texts.find(x=>x.id===id); if(t){const {w,h}=getElemSize(id);return{xMM:t.xMM,yMM:t.yMM,wMM:w,hMM:h};}
        const ph=allS.photos.find(x=>x.id===id); if(ph) return{xMM:ph.xMM,yMM:ph.yMM,wMM:ph.wMM,hMM:ph.hMM};
        const im=allS.images.find(x=>x.id===id); if(im) return{xMM:im.xMM,yMM:im.yMM,wMM:im.wMM,hMM:im.hMM};
        const sh=allS.shapes.find(x=>x.id===id); if(sh) return{xMM:sh.xMM,yMM:sh.yMM,wMM:sh.wMM,hMM:sh.hMM};
        const ic=allS.icons.find(x=>x.id===id);  if(ic) return{xMM:ic.xMM,yMM:ic.yMM,wMM:ic.sizeMM||0,hMM:ic.sizeMM||0};
        return null;
      };
      const boxes=allMemberIds.map(getBox).filter(Boolean);
      if(boxes.length===0) return;
      const gMinX=Math.min(...boxes.map(b=>b.xMM));
      const gMinY=Math.min(...boxes.map(b=>b.yMM));
      const gMaxX=Math.max(...boxes.map(b=>b.xMM+b.wMM));
      const gMaxY=Math.max(...boxes.map(b=>b.yMM+b.hMM));
      const gW=gMaxX-gMinX, gH=gMaxY-gMinY;
      const newX=ax(gW), newY=ay(gH);
      const dxMM=newX-gMinX, dyMM=newY-gMinY;
      // 모든 멤버 이동
      setTexts(p=>p.map(t=>allMemberIds.includes(t.id)?{...t,xMM:t.xMM+dxMM,yMM:t.yMM+dyMM}:t));
      setPhotos(p=>p.map(t=>allMemberIds.includes(t.id)?{...t,xMM:t.xMM+dxMM,yMM:t.yMM+dyMM}:t));
      setImages(p=>p.map(t=>allMemberIds.includes(t.id)?{...t,xMM:t.xMM+dxMM,yMM:t.yMM+dyMM}:t));
      setShapes(p=>p.map(t=>allMemberIds.includes(t.id)?{...t,xMM:t.xMM+dxMM,yMM:t.yMM+dyMM}:t));
      setIcons(p=>p.map(t=>allMemberIds.includes(t.id)?{...t,xMM:t.xMM+dxMM,yMM:t.yMM+dyMM}:t));
      return;
    }

    // 개별 정렬
    const sh=shapes.find(x=>x&&x.id===sel);
    if(sh&&sh.wMM!==undefined){setShapes(p=>p.map(s=>!s||s.id!==sel?s:{...s,xMM:ax(s.wMM),yMM:ay(s.hMM)}));return;}
    const ph=photos.find(x=>x&&x.id===sel);
    if(ph&&ph.wMM!==undefined){setPhotos(p=>p.map(s=>!s||s.id!==sel?s:{...s,xMM:ax(s.wMM),yMM:ay(s.hMM)}));return;}
    const im=images.find(x=>x&&x.id===sel);
    if(im&&im.wMM!==undefined){setImages(p=>p.map(s=>!s||s.id!==sel?s:{...s,xMM:ax(s.wMM),yMM:ay(s.hMM)}));return;}
    const ic=icons.find(x=>x&&x.id===sel);
    if(ic){setIcons(p=>p.map(s=>!s||s.id!==sel?s:{...s,xMM:ax(s.sizeMM||0),yMM:ay(s.sizeMM||0)}));return;}
    const tx=texts.find(x=>x&&x.id===sel);
    if(tx){const {w,h}=getElemSize(tx.id);setTexts(p=>p.map(s=>!s||s.id!==sel?s:{...s,xMM:ax(w),yMM:ay(h)}));return;}
  },[sel,selGroups,cardW,cardH,shapes,photos,images,icons,texts]);

  // ── 빈 템플릿 ──
  const applyBlankTemplate=()=>{
    setTexts([]);setPhotos([]);setImages([]);setShapes([]);setIcons([]);
    setLayers([]);setGroups([]);setSel(null);setEditing(null);
  };

  const sIcon = icons.find(ic=>ic.id===sel);
  useEffect(()=>{ if(sel&&!icons.find(ic=>ic.id===sel)) setShowIconPicker(false); },[sel,icons]);

  const _AP=[['left','top'],['center','top'],['right','top'],['left','middle'],['center','middle'],['right','middle'],['left','bottom'],['center','bottom'],['right','bottom']];
  const _AL={'left,top':'좌상','center,top':'위','right,top':'우상','left,middle':'좌','center,middle':'중앙','right,middle':'우','left,bottom':'좌하','center,bottom':'아래','right,bottom':'우하'};
  const AlignBtns=()=>(
    <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
      <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",margin:"0 4px",flexShrink:0}}/>
      <span style={{fontSize:11,color:"rgba(255,255,255,.7)",marginRight:2,flexShrink:0}}>정렬</span>
      {_AP.map(([h,v],i)=>{
        const col=i%3,row=Math.floor(i/3);
        return(
          <button key={i} onMouseDown={e=>e.stopPropagation()} onClick={()=>alignElem(h,v)} title={_AL[h+','+v]}
            style={{width:22,height:22,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
              borderRadius:3,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              {Array.from({length:9},function(_,n){var r=Math.floor(n/3),c=n%3;return(
                <circle key={n} cx={2+c*4} cy={2+r*4} r={1.3} fill={r===row&&c===col?"#fff":"rgba(255,255,255,.3)"}/>
              );})}
            </svg>
          </button>
        );
      })}
    </div>
  );
  const onImageFile=e=>{
    const f=e.target.files[0]; if(!f) return;
    e.target.value="";
    const reader=new FileReader();
    reader.onload=ev=>{
      const url=ev.target.result;
      const img=new Image();
      img.onload=()=>{
        const asp=img.width/img.height;
        const wMM=cs.w*0.3, hMM=wMM/asp;
        const id=uid();
        setImages(p=>[...p,{id,src:url,xMM:(cs.w-wMM)/2,yMM:(cs.h-hMM)/2,wMM,hMM,aspect:asp,rotate:0,origWMM:wMM,origHMM:hMM}]);
        addLayer(id,"image");
        setSel(id);
      };
      img.src=url;
    };
    reader.readAsDataURL(f);
  };

  const openCropModal=(ph)=>{
    const origSrc=ph.origSrc||ph.src;
    setCropModal({photoId:ph.id,img:origSrc,src:origSrc,shape:ph.shape,wMM:ph.wMM,hMM:ph.hMM,radius:ph.radius||0,vState:ph.vState||null});
  };
  const applyCrop=(photoId,dataUrl,wMM,hMM,shape,origSrc,radius=0,vState=null)=>{
    setPhotos(p=>p.map(ph=>{
      if(ph.id!==photoId) return ph;
      return {...ph,src:dataUrl,wMM,hMM,shape,radius,origSrc:origSrc||ph.origSrc||ph.src,imgX:0,imgY:0,imgScale:1,vState};
    }));
    setCropModal(null);
  };
  const onFile=(e,phId)=>{
    const f=e.target.files[0]; if(!f) return;
    e.target.value="";
    const reader=new FileReader();
    reader.onload=ev=>{
      const url=ev.target.result;
      const ph=photos.find(p=>p.id===phId);
      if(!ph) return;
      if(cropModal&&cropModal.photoId===phId){
        setCropModal(prev=>({...prev,img:url,src:url}));
      } else {
        setCropModal({photoId:phId,img:url,src:url,shape:ph.shape,wMM:ph.wMM,hMM:ph.hMM,radius:ph.radius||0,vState:null});
      }
    };
    reader.readAsDataURL(f);
  };

  const sT = texts.find(t=>t.id===sel);
  const sSh = shapes.find(sh=>sh.id===sel);
  const sP = photos.find(p=>p.id===sel);
  const sIm = images.find(im=>im.id===sel);
  useEffect(()=>{
    if(sP){ setSizeW((sP.wMM/10).toFixed(1)); setSizeH((sP.hMM/10).toFixed(1)); }
  },[sP?.wMM,sP?.hMM,sel]);

  /* ── 격자 ── */
  const gLines=[];
  if(grid){
    for(let x=0;x<=cs.w;x+=GRID) gLines.push(<line key={"v"+x} x1={P(x)} y1={0} x2={P(x)} y2={CH} stroke="#ccc" strokeWidth={.6}/>);
    for(let y=0;y<=cs.h;y+=GRID) gLines.push(<line key={"h"+y} x1={0} y1={P(y)} x2={CW} y2={P(y)} stroke="#ccc" strokeWidth={.6}/>);
  }

  /* ── 자 눈금 ── */
  const RULER_SZ=18;
  const rulerH=[], rulerV=[];
  for(let mm=0;mm<=cs.w;mm+=5){
    const x=P(mm), major=mm%10===0;
    rulerH.push(<g key={"rh"+mm}>
      <line x1={RULER_SZ+x} y1={major?0:RULER_SZ/2} x2={RULER_SZ+x} y2={RULER_SZ} stroke="#999" strokeWidth={0.6}/>
      {major&&<text x={RULER_SZ+x+1} y={RULER_SZ-3} fontSize={6} fill="#888">{mm}</text>}
    </g>);
  }
  for(let mm=0;mm<=cs.h;mm+=5){
    const y=P(mm), major=mm%10===0;
    rulerV.push(<g key={"rv"+mm}>
      <line x1={major?0:RULER_SZ/2} y1={RULER_SZ+y} x2={RULER_SZ} y2={RULER_SZ+y} stroke="#999" strokeWidth={0.6}/>
      {major&&<text x={1} y={RULER_SZ+y-2} fontSize={6} fill="#888">{mm}</text>}
    </g>);
  }

  return(
    <div style={{fontFamily:"'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif",
      minHeight:"100vh",background:"#ecf0f1",
      display:"flex",flexDirection:"column",userSelect:"none",overflowX:"hidden",paddingTop:copyrightH}}>

      {/* ══ STICKY HEADER ══ */}
      <div ref={copyrightRef} style={{position:"fixed",top:0,left:0,right:0,zIndex:300,
        background:"#ffffff",borderBottom:"1px solid #e0e0e0",padding:"6px 16px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:4,
        fontSize:10,color:"#888",lineHeight:1.5}}>
        <span>Copyright 2026. MUJIMUJI Options Editor &nbsp;|&nbsp; 본 서비스(에디터)의 무단 복제, 확장 및 배포를 금지합니다. &nbsp;|&nbsp; <a href="https://oauka.github.io/newluvbit_public/privacy_policy.html" target="_blank" rel="noopener noreferrer" style={{color:"#555",textDecoration:"none",fontWeight:"bold"}}>개인 정보 처리 방침</a></span>
        <span>문의 및 버그 제보 Mail : <a href="mailto:mujimuji.purity012@aleeas.com" style={{color:"#708090",textDecoration:"none"}}>mujimuji.purity012@aleeas.com</a></span>
      </div>
      <div style={{position:"fixed",top:copyrightH,left:0,right:220,zIndex:200,background:"#708090"}}>
      {/* ══ TOOLBAR ══ */}
      <div ref={toolbarRef} style={{background:"#708090",borderBottom:"1px solid rgba(0,0,0,.25)",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"center",
        gap:9,flexWrap:"wrap",minHeight:46,boxShadow:"0 2px 6px rgba(0,0,0,.15)"}}>
        <div style={{display:"flex",background:"rgba(0,0,0,.18)",borderRadius:5,overflow:"hidden",border:"1px solid rgba(0,0,0,.2)"}}>
          {["landscape","portrait"].map(o=>(
            <button key={o} onClick={()=>changeOrient(o)} style={{
              padding:"4px 12px",background:orient===o?"rgba(0,0,0,.35)":"transparent",
              border:"none",color:orient===o?"#fff":"rgba(255,255,255,.7)",
              cursor:"pointer",fontSize:12,fontWeight:orient===o?600:400}}>
              {o==="landscape"?"가로":"세로"}
            </button>
          ))}
        </div>
        <Sep/>
        {/* 줌 컨트롤 — 툴바 고정 */}
        <button onClick={zOut} disabled={zoom<=ZMIN}
          style={{width:26,height:26,background:"rgba(0,0,0,.18)",border:"1px solid rgba(0,0,0,.2)",
            color:zoom<=ZMIN?"rgba(255,255,255,.3)":"rgba(255,255,255,.9)",borderRadius:4,
            cursor:zoom<=ZMIN?"not-allowed":"pointer",fontSize:16,display:"flex",alignItems:"center",
            justifyContent:"center",fontWeight:300,flexShrink:0}}>−</button>
        <div style={{display:"flex",alignItems:"center",background:"rgba(0,0,0,.18)",border:"1px solid rgba(0,0,0,.2)",
          borderRadius:4,overflow:"hidden",flexShrink:0}}>
          <input value={zInput} onChange={e=>setZInput(e.target.value)}
            onBlur={onZCommit}
            onMouseDown={e=>e.stopPropagation()}
            onKeyDown={e=>{if(e.key==="Enter")onZCommit();if(e.key==="Escape")setZInput(String(Math.round(zoom*100)));}}
            style={{width:38,height:26,border:"none",outline:"none",textAlign:"right",
              fontSize:12,fontWeight:600,color:"#fff",padding:"0 2px 0 4px",background:"transparent"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.6)",paddingRight:5,paddingLeft:1}}>%</span>
        </div>
        <button onClick={zIn} disabled={zoom>=ZMAX}
          style={{width:26,height:26,background:"rgba(0,0,0,.18)",border:"1px solid rgba(0,0,0,.2)",
            color:zoom>=ZMAX?"rgba(255,255,255,.3)":"rgba(255,255,255,.9)",borderRadius:4,
            cursor:zoom>=ZMAX?"not-allowed":"pointer",fontSize:16,display:"flex",alignItems:"center",
            justifyContent:"center",fontWeight:300,flexShrink:0}}>＋</button>
        <button onClick={()=>applyZoom(1)}
          style={{padding:"3px 8px",background:"rgba(0,0,0,.18)",border:"1px solid rgba(0,0,0,.2)",
            color:"rgba(255,255,255,.85)",borderRadius:4,cursor:"pointer",fontSize:11,flexShrink:0}}>100%</button>
        {/* 바탕색 */}
        <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",flexShrink:0}} title="레이아웃 바탕색">
          <div style={{position:"relative",width:26,height:26,borderRadius:4,
            border:"2px solid rgba(255,255,255,.45)",overflow:"hidden",
            background:cardBg,boxShadow:"inset 0 0 0 1px rgba(0,0,0,.15)",cursor:"pointer"}}>
            <input type="color" value={cardBg} onChange={e=>setCardBg(e.target.value)}
              style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
          </div>
        </label>
        <Sep/>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <button onClick={undo} title="되돌리기 (Ctrl+Z)"
            style={{width:30,height:28,background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:4,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </button>
          <button onClick={redo} title="되살리기 (Ctrl+Y)"
            style={{width:30,height:28,background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:4,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.95"/>
            </svg>
          </button>
        </div>
        <Sep/>
        <Btn onClick={addText}>＋ 텍스트</Btn>
        <Btn onClick={addPhoto}>＋ 사진</Btn>
        <Btn onClick={addImage}>이미지 불러오기</Btn>
        <input ref={imgFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={onImageFile}/>
        <Btn onClick={()=>addShape("rect")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><rect x="1" y="1" width="12" height="12" rx="1" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("circle")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><ellipse cx="7" cy="7" rx="6" ry="6" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("triangle")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><polygon points="7,1 13,13 1,13" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("star")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><polygon points="7,1 8.5,5.5 13,5.5 9.3,8.5 10.5,13 7,10 3.5,13 4.7,8.5 1,5.5 5.5,5.5" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("heart")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><path d="M7,12 C1,8 1,3 3.5,2 C5,1.3 6.3,2.2 7,3.5 C7.7,2.2 9,1.3 10.5,2 C13,3 13,8 7,12Z" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("pentagon")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><polygon points="7,1 13,5.5 10.8,12.5 3.2,12.5 1,5.5" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("hexagon")}><svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><polygon points="10.5,2 13,7 10.5,12 3.5,12 1,7 3.5,2" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>{setSel(null);setShowIconPicker(v=>!v);}}>＋ 아이콘</Btn>
        <Btn onClick={copyElem} disabled={!sel}>복사</Btn>
        <Btn onClick={()=>setShowPreview(true)}>미리보기</Btn>
        <Btn onClick={downloadCard}>내려받기</Btn>
      </div>

      {/* ══ 아이콘 편집바 (선택됐을 때) ══ */}
      <div onMouseDown={e=>e.preventDefault()}
        style={{position:"fixed",top:copyrightH+toolbarH,left:0,right:220,zIndex:190,
          display:sIcon?"flex":"none",background:"#708090",borderBottom:"1px solid rgba(0,0,0,.18)",
          padding:"5px 10px",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",
          pointerEvents:sIcon?"all":"none"}}>
        {sIcon&&<>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>크기</span>
          <input type="text" inputMode="numeric" value={Math.round(sIcon.sizeMM)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setIcons(p=>p.map(ic=>ic.id!==sIcon.id?ic:{...ic,sizeMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>mm</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>각도</span>
          <input type="text" inputMode="numeric" value={Math.round(sIcon.rotate||0)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setIcons(p=>p.map(ic=>ic.id!==sIcon.id?ic:{...ic,rotate:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>°</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>색상</span>
          <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sIcon.color,cursor:"pointer",flexShrink:0,overflow:"hidden"}}>
            <input type="color" value={sIcon.color}
              onChange={e=>setIcons(p=>p.map(ic=>ic.id!==sIcon.id?ic:{...ic,color:e.target.value}))}
              style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>setIcons(p=>p.map(ic=>ic.id!==sIcon.id?ic:{...ic,flipX:!ic.flipX}))}
            style={{padding:"3px 8px",background:sIcon.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <AlignBtns/>
        </>}
      </div>
      <div onMouseDown={e=>e.preventDefault()}
        style={{display:showIconPicker?"block":"none",background:"#708090",borderBottom:"1px solid rgba(0,0,0,.18)",
          padding:"8px 14px"}}>
        {showIconPicker&&<>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap",justifyContent:"center"}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>색상</span>
            <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:pickerColor,cursor:"pointer",flexShrink:0,overflow:"hidden"}}
>
              <input type="color" value={pickerColor}
                onChange={e=>setPickerColor(e.target.value)}
                style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
            </div>
            <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>크기</span>
            <input type="text" inputMode="numeric" value={pickerSize}
              onChange={e=>setPickerSize(e.target.value)}
              onMouseDown={e=>e.stopPropagation()}
              style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>mm</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
            {ICON_LIST.map(ic=>(
              <button key={ic.type} onMouseDown={e=>e.stopPropagation()} onClick={()=>addIcon(ic.type)}
                title={ic.label}
                style={{width:44,height:44,display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",gap:2,background:"rgba(255,255,255,.1)",
                  border:"1px solid rgba(255,255,255,.15)",borderRadius:6,cursor:"pointer",flexShrink:0}}>
                <IcoSVG type={ic.type} color="#fff" size={18}/>
                <span style={{fontSize:8,color:"rgba(255,255,255,.6)",lineHeight:1}}>{ic.label}</span>
              </button>
            ))}
          </div>
        </>}
      </div>

      {/* ══ 텍스트 편집바 ══ */}
      <div
        onMouseDown={e=>e.preventDefault()}
        style={{position:"fixed",top:copyrightH+toolbarH,left:0,right:220,zIndex:190,
          background:"#5a6a7a",borderBottom:"1px solid rgba(0,0,0,.2)",
          padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",
          visibility:sT?"visible":"hidden",pointerEvents:sT?"all":"none"}}>
        {sT&&<>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>크기</span>
            <button onClick={()=>upd(sT.id,"fs",Math.max(4,sT.fs-1))}
              style={{width:22,height:22,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,cursor:"pointer",fontSize:13}}>−</button>
            <input type="text" inputMode="numeric" value={sT.fs}
              onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)upd(sT.id,"fs",v);}}
              onMouseDown={e=>e.stopPropagation()}
              style={{width:40,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
            <button onClick={()=>upd(sT.id,"fs",sT.fs+1)}
              style={{width:22,height:22,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,cursor:"pointer",fontSize:13}}>＋</button>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>각도</span>
            <input type="text" inputMode="numeric" value={Math.round(sT.rotate||0)}
              onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))upd(sT.id,"rotate",v);}}
              onMouseDown={e=>e.stopPropagation()}
              style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>°</span>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>upd(sT.id,"flipX",!sT.flipX)}
            style={{padding:"3px 8px",background:sT.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          {[
            {k:"bold",   label:"B", style:{fontWeight:700}},
            {k:"italic", label:"I", style:{fontStyle:"italic"}},
            {k:"strike", label:"S", style:{textDecoration:"line-through"}},
            {k:"underline",label:"U",style:{textDecoration:"underline"}},
          ].map(({k,label,style})=>(
            <button key={k} onClick={()=>upd(sT.id,k,!sT[k])}
              style={{width:26,height:26,
                background:sT[k]?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",
                border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:3,cursor:"pointer",
                fontSize:13,...style}}>{label}</button>
          ))}
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>색상</span>
            <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sT.color,cursor:"pointer",flexShrink:0,overflow:"hidden"}}
>
              <input type="color" value={sT.color} onChange={e=>upd(sT.id,"color",e.target.value)}
                style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
            </div>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>내용</span>
            <input value={sT.text} onChange={e=>upd(sT.id,"text",e.target.value)}
              onMouseDown={e=>e.stopPropagation()}
              onPaste={e=>e.stopPropagation()}
              style={{padding:"3px 7px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,outline:"none",minWidth:120}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>폰트</span>
            <select value={sT.font||(FONT_LIST.find(f=>!f.divider)||{}).family||""} onChange={e=>upd(sT.id,"font",e.target.value)}
              onMouseDown={e=>e.stopPropagation()}
              style={{padding:"2px 4px",background:"rgba(0,0,0,.35)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:11,outline:"none",maxWidth:110,cursor:"pointer"}}>
              {FONT_LIST.map(f=>{
                if(f.divider) return <option key={f.label} disabled value="" style={{background:"#1a252f",color:"rgba(255,255,255,.4)",fontSize:10,letterSpacing:1}}>{f.label}</option>;
                const big=["나눔펜글씨","Gamja Flower","Dongle","Do Hyeon","Single Day","Song Myung","Cute Font","Sour Gummy","Kiwi Maru","LINE Seed JP","Dela Gothic One","Hachi Maru Pop","Italianno","Ma Shan Zheng","WDXL 루브리폰트","Chiron GoRound TC"].includes(f.label);
                return <option key={f.label} value={f.family} style={{background:"#2c3e50",fontFamily:f.family,fontSize:big?"15px":undefined}}>{f.label}</option>;
              })}
            </select>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>테두리</span>
            <input type="text" inputMode="numeric" value={sT.strokeW||0}
              onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0)upd(sT.id,"strokeW",v);}}
              onMouseDown={e=>e.stopPropagation()}
              style={{width:36,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              <div onClick={()=>upd(sT.id,"strokeW",(sT.strokeW||0)+1)}
                style={{width:16,height:11,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"2px 2px 0 0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,7 5,3 8,7"/></svg>
              </div>
              <div onClick={()=>upd(sT.id,"strokeW",Math.max(0,(sT.strokeW||0)-1))}
                style={{width:16,height:11,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"0 0 2px 2px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,3 5,7 8,3"/></svg>
              </div>
            </div>
            <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>px</span>
            <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sT.strokeColor||"#000000",cursor:"pointer",flexShrink:0,overflow:"hidden"}}>
              <input type="color" value={sT.strokeColor||"#000000"}
                onChange={e=>upd(sT.id,"strokeColor",e.target.value)}
                style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
            </div>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>upd(sT.id,"flipX",!sT.flipX)}
            style={{padding:"3px 8px",background:sT.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>불투명도</span>
          <input type="range" min={0} max={100} value={Math.round((sT.opacity??1)*100)}
            onChange={e=>upd(sT.id,"opacity",Number(e.target.value)/100)}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:70,accentColor:"#fff",cursor:"pointer"}}/>
          <input type="text" inputMode="numeric" value={Math.round((sT.opacity??1)*100)}
            onChange={e=>{const v=Math.min(100,Math.max(0,parseInt(e.target.value)||0));upd(sT.id,"opacity",v/100);}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:36,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>%</span>
          <AlignBtns/>
        </>}
      </div>
      <div
        onMouseDown={e=>e.preventDefault()}
        style={{position:"fixed",top:copyrightH+toolbarH,left:0,right:220,zIndex:190,
          background:"#708090",borderBottom:"1px solid rgba(0,0,0,.18)",
          padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexWrap:"wrap",
          visibility:sSh?"visible":"hidden",pointerEvents:sSh?"all":"none"}}>
        {sSh&&<>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>가로</span>
          <input type="text" inputMode="numeric" value={Math.round(sSh.wMM)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,wMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>×</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>세로</span>
          <input type="text" inputMode="numeric" value={Math.round(sSh.hMM)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,hMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>mm</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>각도</span>
          <input type="text" inputMode="numeric" value={Math.round(sSh.rotate||0)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,rotate:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>°</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>색상</span>
          <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sSh.fill,cursor:"pointer",flexShrink:0,overflow:"hidden"}}>
            <input type="color" value={sSh.fill}
              onChange={e=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,fill:e.target.value}))}
              style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
          </div>
          {(sSh.type==="rect"||sSh.type==="triangle")&&<>
            <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>라운드</span>
            {[0,5,10,20].map(r=>(
              <button key={r} lang="en" onClick={()=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,radius:r}))}
                onMouseDown={e=>e.stopPropagation()}
                style={{padding:"2px 7px",fontSize:11,borderRadius:3,cursor:"pointer",flexShrink:0,
                  border:"1px solid rgba(255,255,255,.2)",
                  background:(sSh.radius||0)===r?"#3498db":"rgba(255,255,255,.1)",color:"#fff"}}>
                {r===0?"없음":r+"px"}
              </button>
            ))}
            <input type="text" inputMode="numeric" value={sSh.radius||0}
              onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0)setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,radius:v}));}}
              onMouseDown={e=>e.stopPropagation()}
              style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
                color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>px</span>
          </>}
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,flipX:!s.flipX}))}
            style={{padding:"3px 8px",background:sSh.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>테두리</span>
          <input type="text" inputMode="numeric" value={sSh.strokeW||0}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0)setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,strokeW:v,stroke:(!s.stroke||s.stroke==='none')&&v>0?'#000000':s.stroke}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:40,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <div onMouseDown={e=>e.stopPropagation()} style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
            <div onClick={()=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,strokeW:(s.strokeW||0)+1,stroke:(!s.stroke||s.stroke==='none')?'#000000':s.stroke}))}
              style={{width:16,height:12,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.15)",borderRadius:"2px 2px 0 0",cursor:"pointer"}}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,7 5,3 8,7"/></svg>
            </div>
            <div onClick={()=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,strokeW:Math.max(0,(s.strokeW||0)-1)}))}
              style={{width:16,height:12,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.15)",borderRadius:"0 0 2px 2px",cursor:"pointer"}}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,3 5,7 8,3"/></svg>
            </div>
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>px</span>
          <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sSh.stroke&&sSh.stroke!=="none"?sSh.stroke:"#000000",cursor:"pointer",flexShrink:0,overflow:"hidden"}}>
            <input type="color" value={sSh.stroke&&sSh.stroke!=="none"?sSh.stroke:"#000000"}
              onChange={e=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,stroke:e.target.value}))}
              style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>불투명도</span>
          <input type="range" min={0} max={100} value={Math.round((sSh.opacity??1)*100)}
            onChange={e=>setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,opacity:Number(e.target.value)/100}))}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:70,accentColor:"#fff",cursor:"pointer"}}/>
          <input type="text" inputMode="numeric" value={Math.round((sSh.opacity??1)*100)}
            onChange={e=>{const v=Math.min(100,Math.max(0,parseInt(e.target.value)||0));setShapes(p=>p.map(s=>s.id!==sSh.id?s:{...s,opacity:v/100}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:36,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>%</span>
          <AlignBtns/>
        </>}
      </div>

      {sP&&(
        <div style={{position:"fixed",top:copyrightH+toolbarH,left:0,right:220,zIndex:190,background:"#5a6a7a",borderBottom:"1px solid rgba(0,0,0,.25)",
          padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap",minHeight:36}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>가로</span>
          <input type="text" inputMode="numeric" value={parseFloat(sP.wMM.toFixed(1))}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,wMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>×</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>세로</span>
          <input type="text" inputMode="numeric" value={parseFloat(sP.hMM.toFixed(1))}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,hMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>mm</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>각도</span>
          <input type="text" inputMode="numeric" value={Math.round(sP.rotate||0)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,rotate:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>°</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>테두리</span>
          <input type="text" inputMode="numeric" value={sP.borderW||0}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>=0)setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,borderW:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:40,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            <div onClick={()=>setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,borderW:(ph.borderW||0)+1}))}
              style={{width:16,height:11,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"2px 2px 0 0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,7 5,3 8,7"/></svg>
            </div>
            <div onClick={()=>setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,borderW:Math.max(0,(ph.borderW||0)-1)}))}
              style={{width:16,height:11,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"0 0 2px 2px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="2,3 5,7 8,3"/></svg>
            </div>
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>px</span>
          <div onMouseDown={e=>e.stopPropagation()} style={{position:"relative",width:28,height:24,borderRadius:3,background:sP.borderColor||"#000",cursor:"pointer",flexShrink:0,overflow:"hidden"}}>
            <input type="color" value={sP.borderColor||"#000000"}
              onChange={e=>setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,borderColor:e.target.value}))}
              style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer",padding:0,border:"none"}}/>
          </div>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>setPhotos(p=>p.map(ph=>ph.id!==sP.id?ph:{...ph,flipX:!ph.flipX}))}
            style={{padding:"3px 8px",background:sP.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <AlignBtns/>
        </div>
      )}
      {sIm&&(
        <div style={{position:"fixed",top:copyrightH+toolbarH,left:0,right:220,zIndex:190,background:"#5a6a7a",borderBottom:"1px solid rgba(0,0,0,.25)",
          padding:"5px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,flexWrap:"wrap",minHeight:36}}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>가로</span>
          <input type="text" inputMode="numeric" value={parseFloat(sIm.wMM.toFixed(1))}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,wMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>×</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>세로</span>
          <input type="text" inputMode="numeric" value={parseFloat(sIm.hMM.toFixed(1))}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,hMM:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:52,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>mm</span>
          {sIm.origWMM&&<button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,wMM:im.origWMM,hMM:im.origHMM}))}
            title="원본 크기로 복원"
            style={{padding:"3px 8px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↺ 원본크기</button>}
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>각도</span>
          <input type="text" inputMode="numeric" value={Math.round(sIm.rotate||0)}
            onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v))setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,rotate:v}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:44,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>°</span>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <button onMouseDown={e=>e.stopPropagation()}
            onClick={()=>setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,flipX:!im.flipX}))}
            style={{padding:"3px 8px",background:sIm.flipX?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",
              color:"#fff",borderRadius:3,cursor:"pointer",fontSize:12,flexShrink:0}}>↔ 반전</button>
          <div style={{width:1,height:20,background:"rgba(255,255,255,.2)",flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>불투명도</span>
          <input type="range" min={0} max={100} value={Math.round((sIm.opacity??1)*100)}
            onChange={e=>setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,opacity:Number(e.target.value)/100}))}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:70,accentColor:"#fff",cursor:"pointer"}}/>
          <input type="text" inputMode="numeric" value={Math.round((sIm.opacity??1)*100)}
            onChange={e=>{const v=Math.min(100,Math.max(0,parseInt(e.target.value)||0));setImages(p=>p.map(im=>im.id!==sIm.id?im:{...im,opacity:v/100}));}}
            onMouseDown={e=>e.stopPropagation()}
            style={{width:36,padding:"2px 4px",background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",
              color:"#fff",borderRadius:3,fontSize:12,textAlign:"center",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>%</span>
          <AlignBtns/>
        </div>
      )}
      </div>{/* sticky 끝 */}
      <div style={{flex:1,display:"flex",flexDirection:"row",overflow:"hidden",background:"#ecf0f1",marginRight:220,paddingTop:toolbarH}}>

        {/* 자 + 카드 영역 */}
        <div ref={scrollContainerRef} onMouseDown={e=>{if(e.target===e.currentTarget){setSel(null);setEditing(null);setSelGuide(null);setShowIconPicker(false);}}} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          padding:"60px",overflow:"auto",background:"#ecf0f1",position:"relative"}}>

          {/* 파일 인풋들 */}
          {photos.map(ph=>(
            <input key={"fi-"+ph.id} type="file" accept="image/*" id={"file-"+ph.id}
              style={{display:"none"}} onChange={e=>onFile(e,ph.id)}/>
          ))}

          {/* 카드 정보 */}
          <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#7f8c8d",fontWeight:500}}>작업 {cs.w}×{cs.h}mm</span>
            <span style={{fontSize:11,color:"#e74c3c",fontWeight:500}}>재단 {cs.w-4}×{cs.h-4}mm</span>
            {zoom!==1&&<span style={{fontSize:11,color:"#95a5a6"}}>{Math.round(zoom*100)}%</span>}
            {scale!==1&&<span style={{fontSize:11,color:"#95a5a6"}}>{"보정 ×"}{scale.toFixed(3)}</span>}
          </div>

          {/* 자 + 카드 컨테이너 */}
          <div style={{position:"relative",width:RULER_SZ+CW,height:RULER_SZ+CH,flexShrink:0,contain:"layout"}}>
            {/* 가이드 전체 보이기/숨기기 — 가로 자 왼쪽 */}
            {guides.length>0&&(
              <div
                onClick={()=>{const a=guides.every(g=>g.visible);setGuides(gs=>gs.map(g=>({...g,visible:!a})));}}
                title={guides.every(g=>g.visible)?"가이드 숨기기":"가이드 보이기"}
                style={{position:"absolute",left:-28,top:0,
                  width:24,height:RULER_SZ,
                  background:guides.every(g=>g.visible)?"#708090":"rgba(100,100,100,.45)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",userSelect:"none",zIndex:15,
                  borderRadius:3,transition:"background .15s"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {guides.every(g=>g.visible)
                    ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  }
                </svg>
              </div>
            )}

            {/* 좌상단 모서리 사각형 */}
            <div style={{position:"absolute",left:0,top:0,width:RULER_SZ,height:RULER_SZ,
              background:"#c8cdd2",zIndex:10}}/>

            {/* 상단 가로 자 — 드래그하면 수평 가이드 생성 */}
            <svg style={{position:"absolute",left:0,top:0,zIndex:9,cursor:"s-resize",userSelect:"none"}}
              width={RULER_SZ+CW} height={RULER_SZ}
              onMouseDown={e=>{
                e.preventDefault();
                const id="g"+Date.now();
                const rect=cardRef.current.getBoundingClientRect();
                const posMM=Math.max(0,Math.min((e.clientY-rect.top)/(BASE*rScale.current*rZoom.current),cs.h));
                setGuides(g=>[...g,{id,type:"h",posMM,visible:true}]);
                setSelGuide(id);
                drag.current={mode:'guideDrag',id,type:"h",startPosMM:posMM,startClient:e.clientY};
              }}>
              <rect x={RULER_SZ} y={0} width={CW} height={RULER_SZ} fill="#d5d8dc"/>
              {rulerH}
            </svg>

            {/* 좌측 세로 자 — 드래그하면 수직 가이드 생성 */}
            <svg style={{position:"absolute",left:0,top:0,zIndex:9,cursor:"e-resize",userSelect:"none"}}
              width={RULER_SZ} height={RULER_SZ+CH}
              onMouseDown={e=>{
                e.preventDefault();
                const id="g"+Date.now();
                const rect=cardRef.current.getBoundingClientRect();
                const posMM=Math.max(0,Math.min((e.clientX-rect.left)/(BASE*rScale.current*rZoom.current),cs.w));
                setGuides(g=>[...g,{id,type:"v",posMM,visible:true}]);
                setSelGuide(id);
                drag.current={mode:'guideDrag',id,type:"v",startPosMM:posMM,startClient:e.clientX};
              }}>
              <rect x={0} y={RULER_SZ} width={RULER_SZ} height={CH} fill="#d5d8dc"/>
              {rulerV}
            </svg>

            {/* 카드 본체 */}
            <div ref={cardRef}
              onClick={e=>{if(e.target===e.currentTarget){setSel(null);setEditing(null);setSelGuide(null);}}}
              style={{position:"relative",
                marginLeft:RULER_SZ,marginTop:RULER_SZ,
                width:CW,height:CH,background:cardBg,
                boxShadow:"0 4px 20px rgba(0,0,0,.18),0 1px 4px rgba(0,0,0,.1)",
                overflow:"clip",cursor:"default",flexShrink:0,
                isolation:"isolate"}}>

              {grid&&(
                <svg data-no-capture="1" style={{position:"absolute",inset:0,pointerEvents:"none",width:CW,height:CH}}>
                  {gLines}
                </svg>
              )}
              {/* 가이드라인 */}
              {guides.filter(g=>g.visible).map(g=>(
                <div data-no-capture="1" key={g.id}
                  onMouseDown={e=>{
                    e.stopPropagation(); e.preventDefault();
                    setSelGuide(g.id);
                    drag.current={mode:'guideDrag',id:g.id,type:g.type,startPosMM:g.posMM,
                      startClient:g.type==="h"?e.clientY:e.clientX};
                  }}
                  onClick={e=>e.stopPropagation()}
                  style={{position:"absolute",
                    ...(g.type==="h"
                      ? {left:0,top:P(g.posMM)-1,width:"100%",height:2,cursor:"ns-resize"}
                      : {top:0,left:P(g.posMM)-1,height:"100%",width:2,cursor:"ew-resize"}),
                    background:selGuide===g.id?"rgba(231,76,60,.8)"
                      :(g.type==="h"?"rgba(52,152,219,.6)":"rgba(46,204,113,.6)"),
                    zIndex:25}}>
                  {selGuide===g.id&&(
                    <div style={{position:"absolute",
                      ...(g.type==="h"?{top:-15,left:4}:{left:4,top:4}),
                      background:"rgba(0,0,0,.7)",color:"#fff",
                      fontSize:9,padding:"1px 4px",borderRadius:2,whiteSpace:"nowrap",pointerEvents:"none"}}>
                      {g.type==="h"?"Y":"X"}: {g.posMM.toFixed(1)}mm
                    </div>
                  )}
                </div>
              ))}

              {/* 도형 */}
              {shapes.filter(sh=>isVisible(sh.id)).map(sh=>{
                const sx=P(sh.xMM),sy=P(sh.yMM),sw=P(sh.wMM),shh=P(sh.hMM);
                const isSel=sel===sh.id;
                const stk=sh.strokeW&&sh.strokeW>0&&sh.stroke&&sh.stroke!=='none';
                const half=stk?(sh.strokeW||0)/2:0;
                const shapeEl=()=>{
                  if(sh.type==="circle") return(
                    <svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <ellipse cx={sw/2} cy={shh/2} rx={Math.max(0,sw/2-half)} ry={Math.max(0,shh/2-half)} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0}/>
                    </svg>
                  );
                  if(sh.type==="triangle") return(
                    <svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      {(sh.radius||0)>0
                        ? <path d={roundedTrianglePath(sw,shh,half,sh.radius||0)} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="miter"/>
                        : <polygon points={`${sw/2},${half} ${sw-half},${shh-half} ${half},${shh-half}`} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="miter"/>
                      }
                    </svg>
                  );
                  if(sh.type==="star"){
                    const spts=starPoints(sw/2-half,shh/2-half);
                    return(<svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <polygon points={ptsToSVGPoly(spts.map(p=>({x:p.x+sw/2,y:p.y+shh/2})))} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="round"/>
                    </svg>);
                  }
                  if(sh.type==="heart"){
                    return(<svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <path d={heartSVGPath(sw/2-half,shh/2-half)} transform={`translate(${sw/2},${shh/2})`} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="round"/>
                    </svg>);
                  }
                  if(sh.type==="pentagon"){
                    const ppts=polyPoints(5,sw/2-half,shh/2-half);
                    return(<svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <polygon points={ptsToSVGPoly(ppts.map(p=>({x:p.x+sw/2,y:p.y+shh/2})))} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="round"/>
                    </svg>);
                  }
                  if(sh.type==="hexagon"){
                    const hpts=polyPoints(6,sw/2-half,shh/2-half,0);
                    return(<svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <polygon points={ptsToSVGPoly(hpts.map(p=>({x:p.x+sw/2,y:p.y+shh/2})))} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0} strokeLinejoin="round"/>
                    </svg>);
                  }
                  return(
                    <svg width={sw} height={shh} overflow="visible" style={{display:"block",pointerEvents:"none"}}>
                      <rect x={half} y={half} width={Math.max(0,sw-sh.strokeW)} height={Math.max(0,shh-sh.strokeW)} rx={sh.radius||0} ry={sh.radius||0} fill={sh.fill} stroke={stk?sh.stroke:"none"} strokeWidth={stk?sh.strokeW:0}/>
                    </svg>
                  );
                };
                return(
                  <React.Fragment key={sh.id}>
                    <div
                      onMouseDown={e=>{if(isLocked(sh.id))return;startElem(e,sh.id,"shape");}}
                      onClick={e=>{if(isLocked(sh.id))return;setSel(sh.id);e.stopPropagation();}}
                      style={{position:"absolute",left:sx,top:sy,width:sw,height:shh,
                        outline:isSel&&!isLocked(sh.id)?"2px solid #9b59b6":"none",
                        cursor:isLocked(sh.id)?"default":"move",zIndex:zIdx(sh.id),boxSizing:"border-box",pointerEvents:isVisible(sh.id)?"auto":"none",
                        opacity:sh.opacity??1,
                        transform:`scaleX(${sh.flipX?-1:1}) rotate(${sh.rotate||0}deg)`,transformOrigin:"center center"}}>
                      {shapeEl()}
                    </div>

                  </React.Fragment>
                );
              })}

              {/* 레이아웃 이미지 */}
              {images.filter(im=>isVisible(im.id)).map(im=>{
                const ix=P(im.xMM),iy=P(im.yMM),iw=P(im.wMM),ih=P(im.hMM);
                const isSel=sel===im.id;
                return(
                  <React.Fragment key={im.id}>
                    <div
                      onMouseDown={e=>{if(isLocked(im.id))return;startElem(e,im.id,"image");}}
                      onClick={e=>{if(isLocked(im.id))return;setSel(im.id);e.stopPropagation();}}
                      style={{position:"absolute",left:ix,top:iy,width:iw,height:ih,
                        outline:isSel?"2px solid #e67e22":"none",
                        cursor:isLocked(im.id)?"default":"move",zIndex:zIdx(im.id),boxSizing:"border-box",pointerEvents:isVisible(im.id)?"auto":"none",
                        opacity:im.opacity??1,
                        transform:`rotate(${im.rotate||0}deg) scaleX(${im.flipX?-1:1})`,transformOrigin:"center center"}}>
                      <img src={im.src} draggable={false} alt=""
                        style={{width:"100%",height:"100%",objectFit:"fill",display:"block",pointerEvents:"none"}}/>
                    </div>

                  </React.Fragment>
                );
              })}

              {/* 사진 */}
              {photos.filter(ph=>isVisible(ph.id)).map(ph=>{
                const inputId="file-"+ph.id;
                const isSel=sel===ph.id;
                return(
                  <div key={ph.id}
                    onMouseDown={e=>{if(isLocked(ph.id))return;startElem(e,ph.id,"photo");}}
                    onClick={e=>{if(isLocked(ph.id))return;setSel(ph.id);e.stopPropagation();}}
                    onDoubleClick={e=>{if(isLocked(ph.id))return;e.stopPropagation();if(ph.src)openCropModal(ph);else document.getElementById(inputId)?.click();}}
                    style={{position:"absolute",left:P(ph.xMM),top:P(ph.yMM),
                      width:P(ph.wMM),height:P(ph.hMM),
                      cursor:"move",overflow:ph.shape==="circle"?"visible":"hidden",boxSizing:"border-box",
                      clipPath:ph.shape==="circle"?"ellipse(50% 50% at 50% 50%)":"none",
                      borderRadius:ph.shape==="circle"?"0":`${ph.radius||0}px`,
                      transform:`rotate(${ph.rotate||0}deg) scaleX(${ph.flipX?-1:1})`,transformOrigin:"center center",
                      zIndex:zIdx(ph.id),pointerEvents:isVisible(ph.id)?"auto":"none",
                      background:"#f8f9fa",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      outline:"none",
                      boxShadow:isSel?"inset 0 0 0 2px #e74c3c":(!ph.src?"inset 0 0 0 1px #bdc3c7":"none")}}
                    {...(!ph.src?{'data-ph-bg':'1'}:{})}>
                    {ph.src?(
                      <>
                        <img src={ph.src} draggable={false} alt=""
                          style={{width:"100%",height:"100%",objectFit:"fill",display:"block",pointerEvents:"none",transform:"scale(1.005)",transformOrigin:"center"}}/>
                        {(ph.borderW||0)>0&&(
                          <div style={{position:"absolute",inset:0,
                            boxShadow:`inset 0 0 0 ${(ph.borderW||0)*FSC}px ${ph.borderColor||"#000"}`,
                            borderRadius:ph.shape==="circle"?"50%":`${ph.radius||0}px`,
                            pointerEvents:"none"}}/>
                        )}
                      </>
                    ):(
                      <div data-no-capture="1" style={{pointerEvents:"none",display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",gap:2,textAlign:"center"}}>
                        <div style={{fontSize:Math.max(14,P(5))}}>📷</div>
                        <div style={{fontSize:Math.max(7,P(2.3)),fontWeight:600,letterSpacing:".08em",color:"#95a5a6"}}>PHOTO</div>
                        <div style={{fontSize:Math.max(6,P(1.9)),color:"#bdc3c7"}}>더블클릭하여 추가</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 아이콘 */}
              {icons.filter(ic=>isVisible(ic.id)).map(ic=>{
                const ix=P(ic.xMM), iy=P(ic.yMM), isz=P(ic.sizeMM);
                const isSel=sel===ic.id;
                return(
                  <div key={ic.id} data-elem-id={ic.id}
                    onMouseDown={e=>{if(isLocked(ic.id))return;startElem(e,ic.id,"icon");}}
                    onClick={e=>{if(isLocked(ic.id))return;setSel(ic.id);e.stopPropagation();}}
                    style={{position:"absolute",left:ix,top:iy,width:isz,height:isz,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      outline:isSel?"1.5px dashed #9b59b6":"none",
                      cursor:isLocked(ic.id)?"default":"move",
                      zIndex:zIdx(ic.id),pointerEvents:isVisible(ic.id)?"auto":"none",
                      transform:`rotate(${ic.rotate||0}deg) scaleX(${ic.flipX?-1:1})`,transformOrigin:"center center",
                      boxSizing:"border-box"}}>
                    <IcoSVG type={ic.type} color={ic.color} size={isz*0.8} style={{pointerEvents:"none"}}/>
                  </div>
                );
              })}

              {/* 텍스트 */}
              {texts.filter(t=>isVisible(t.id)).map(t=>{
                const isEditing=editing===t.id;
                const rot=t.rotate||0;
                const tdec=[t.strike?"line-through":"",t.underline?"underline":""].filter(Boolean).join(" ")||"none";
                return(
                  <div key={t.id} data-elem-id={t.id}
                    onMouseDown={e=>{
                      if(isLocked(t.id)||editing===t.id) return;
                      if(e.target===e.currentTarget) startElem(e,t.id,"text");
                    }}
                    style={{position:"absolute",left:P(t.xMM),top:P(t.yMM),zIndex:zIdx(t.id),
                      pointerEvents:isVisible(t.id)&&!isLocked(t.id)?"auto":"none",
                      cursor:isEditing?"text":"move",
                      outline:sel===t.id&&!isEditing&&!isLocked(t.id)?"1.5px dashed #2980b9":"none",
                      background:sel===t.id&&!isEditing&&!isLocked(t.id)?"rgba(41,128,185,.05)":"transparent",
                      padding:"0",lineHeight:1.4,
                      opacity:t.opacity??1,
                      transform:`rotate(${rot}deg) scaleX(${t.flipX?-1:1})`,transformOrigin:"center center"}}>
                    {isEditing?(
                      <input
                        defaultValue={t.text}
                        onChange={e=>{upd(t.id,"text",e.target.value);const el=e.target;el.style.width="1px";el.style.width=el.scrollWidth+"px";}}
                        onBlur={()=>setEditing(null)}
                        onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape"){e.preventDefault();setEditing(null);}e.stopPropagation();}}
                        onPaste={e=>e.stopPropagation()}
                        onClick={e=>e.stopPropagation()}
                        onMouseDown={e=>e.stopPropagation()}
                        ref={el=>{if(el&&!el.dataset.sized){el.style.width="1px";el.style.width=el.scrollWidth+"px";el.dataset.sized="1";el.focus({preventScroll:true});}}}
                        style={{fontSize:t.fs*FSC,color:t.color,
                          fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",
                          textDecoration:tdec,fontFamily:t.font||"'Noto Sans KR',sans-serif",lineHeight:1.4,
                          outline:"1.5px solid #2980b9",background:"rgba(255,255,255,.85)",
                          borderRadius:2,padding:"0 2px",whiteSpace:"pre",display:"inline-block",
                          minWidth:4,cursor:"text",border:"none",boxSizing:"content-box"}}
                      />
                    ):(
                      <div
                        onMouseDown={e=>{if(isLocked(t.id))return;startElem(e,t.id,"text");}}
                        onDoubleClick={e=>{if(isLocked(t.id))return;e.stopPropagation();setEditing(t.id);setSel(t.id);}}
                        onClick={e=>{if(isLocked(t.id))return;e.stopPropagation();setSel(t.id);}}
                        style={{fontSize:t.fs*FSC,color:t.color,
                          fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",
                          textDecoration:tdec,fontFamily:t.font||"'Noto Sans KR',sans-serif",whiteSpace:"pre",
                          WebkitTextStroke:(t.strokeW&&t.strokeW>0)?`${t.strokeW}px ${t.strokeColor||"#000"}`:"none",
                          paintOrder:"stroke fill"}}>
                        {t.text}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* 재단선: 카드 외부 오버레이로 이동됨 */}
            </div>{/* 카드 본체 끝 */}

            {/* 재단선 오버레이 - 카드 위에 독립 레이어 */}
            {showCutLine&&(
              <div style={{
                position:"absolute",
                left:RULER_SZ+MG,
                top:RULER_SZ+MG,
                width:CW-MG*2,
                height:CH-MG*2,
                border:"0.8px dashed rgba(200,50,50,.65)",
                pointerEvents:"none",
                boxSizing:"border-box",
                zIndex:50
              }}/>
            )}

            {/* 사진 핸들 */}
            {photos.filter(ph=>sel===ph.id).map(ph=>{
              const px=P(ph.xMM),py=P(ph.yMM),pw=P(ph.wMM),ph_h=P(ph.hMM);
              const rot=(ph.rotate||0)*Math.PI/180;
              const cosR=Math.cos(rot),sinR=Math.sin(rot);
              const BTN=22,H=BTN/2,OFF=BTN*0.6;
              const cx=RULER_SZ+px+pw/2, cy=RULER_SZ+py+ph_h/2;
              const corner=(dx,dy)=>({x:cx+dx*cosR-dy*sinR-H, y:cy+dx*sinR+dy*cosR-H});
              const pDel=corner(-pw/2-OFF,-ph_h/2-OFF);
              const pRot=corner( pw/2+OFF,-ph_h/2-OFF);
              const pRes=corner( pw/2+OFF, ph_h/2+OFF);
              const pCopy=corner(-pw/2-OFF, ph_h/2+OFF);
              return(
                <React.Fragment key={"ov-"+ph.id}>
                  {/* 삭제 - 좌상단 바깥 */}
                  <div onClick={e=>{e.stopPropagation();setPhotos(p=>p.filter(p2=>p2.id!==ph.id));removeLayer(ph.id);setSel(null);}}
                    onMouseDown={e=>e.stopPropagation()}
                    style={{position:"absolute",left:pDel.x,top:pDel.y,
                      width:BTN,height:BTN,background:"#e74c3c",borderRadius:"50%",
                      cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:"#fff",fontSize:13,fontWeight:700,
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </div>
                  {/* 복사 - 좌하단 바깥 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();copyElem();}}
                    style={{position:"absolute",left:pCopy.x,top:pCopy.y,
                      width:BTN,height:BTN,background:"#8e44ad",borderRadius:"50%",
                      cursor:"pointer",zIndex:30,display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  {/* 회전 - 우상단 바깥 */}
                  <div onMouseDown={e=>{
                      e.stopPropagation();e.preventDefault();
                      const cr=cardRef.current.getBoundingClientRect();
                      drag.current={mode:'photoRotate',id:ph.id,
                        cx:cr.left+px+pw/2, cy:cr.top+py+ph_h/2,
                        startAngle:Math.atan2(e.clientY-(cr.top+py+ph_h/2),e.clientX-(cr.left+px+pw/2))*180/Math.PI,
                        startRotate:ph.rotate||0, groupSnaps:buildGroupRotateSnaps(ph.id)};
                    }}
                    style={{position:"absolute",left:pRot.x,top:pRot.y,
                      width:BTN,height:BTN,background:"#2980b9",borderRadius:"50%",
                      cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  {/* 리사이즈 - 우하단 바깥 */}
                  <div onMouseDown={e=>{e.stopPropagation();e.preventDefault();
                      drag.current={mode:'photoResize',id:ph.id,startW:ph.wMM,startH:ph.hMM,startCX:e.clientX,startCY:e.clientY,startXMM:ph.xMM,startYMM:ph.yMM,groupSnaps:buildGroupSnaps(ph.id)};}}
                    style={{position:"absolute",left:pRes.x,top:pRes.y,
                      width:BTN,height:BTN,background:"#27ae60",borderRadius:"50%",
                      cursor:"nwse-resize",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 3 3 3 3 9"/><polyline points="15 21 21 21 21 15"/>
                      <line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
                    </svg>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 이미지 핸들 */}
            {images.filter(im=>sel===im.id&&isVisible(im.id)).map(im=>{
              const ix=P(im.xMM),iy=P(im.yMM),iw=P(im.wMM),ih=P(im.hMM);
              const irot=(im.rotate||0)*Math.PI/180;
              const icosR=Math.cos(irot),isinR=Math.sin(irot);
              const BTN2=22,H2=BTN2/2,OFF=BTN2*0.6;
              const icx=RULER_SZ+ix+iw/2,icy=RULER_SZ+iy+ih/2;
              const icorner=(dx,dy)=>({x:icx+dx*icosR-dy*isinR-H2,y:icy+dx*isinR+dy*icosR-H2});
              const iDel=icorner(-iw/2-OFF,-ih/2-OFF);
              const iRot=icorner(iw/2+OFF,-ih/2-OFF);
              const iRes=icorner(iw/2+OFF,ih/2+OFF);
              const iCpy=icorner(-iw/2-OFF,ih/2+OFF);
              return(
                <React.Fragment key={"im-h-"+im.id}>
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();setImages(p=>p.filter(i=>i.id!==im.id));removeLayer(im.id);setSel(null);}}
                    style={{position:"absolute",left:iDel.x,top:iDel.y,width:BTN2,height:BTN2,
                      background:"#e74c3c",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </div>
                  {/* 복사 — 좌하단 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();copyElem();}}
                    style={{position:"absolute",left:iCpy.x,top:iCpy.y,width:BTN2,height:BTN2,
                      background:"#8e44ad",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{
                      e.stopPropagation();e.preventDefault();
                      const cr=cardRef.current.getBoundingClientRect();
                      drag.current={mode:'imageRotate',id:im.id,cx:cr.left+ix+iw/2,cy:cr.top+iy+ih/2,
                        startAngle:Math.atan2(e.clientY-(cr.top+iy+ih/2),e.clientX-(cr.left+ix+iw/2))*180/Math.PI,
                        startRotate:im.rotate||0, groupSnaps:buildGroupRotateSnaps(im.id)};
                    }}
                    style={{position:"absolute",left:iRot.x,top:iRot.y,width:BTN2,height:BTN2,
                      background:"#2980b9",borderRadius:"50%",cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{
                      e.stopPropagation();e.preventDefault();
                      drag.current={mode:'imageResize',id:im.id,startW:im.wMM,startH:im.hMM,startCX:e.clientX,startCY:e.clientY,aspect:im.aspect,startXMM:im.xMM,startYMM:im.yMM,groupSnaps:buildGroupSnaps(im.id)};
                    }}
                    style={{position:"absolute",left:iRes.x,top:iRes.y,width:BTN2,height:BTN2,
                      background:"#27ae60",borderRadius:"50%",cursor:"nwse-resize",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 3 3 3 3 9"/><polyline points="15 21 21 21 21 15"/>
                      <line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
                    </svg>
                  </div>
                  {/* 4면 엣지 핸들 - 귤색 화살표, 회전 적용 */}
                  {(()=>{
                    const ARR=20, AOFF=ARR/2, GAP=BTN2*0.3+H2;
                    const rotDeg=im.rotate||0;
                    const edges=[
                      {edge:'right',  dx:iw/2+GAP, dy:0,         path:'M4 10 L16 10 M11 5 L16 10 L11 15'},
                      {edge:'left',   dx:-iw/2-GAP,dy:0,         path:'M16 10 L4 10 M9 5 L4 10 L9 15'},
                      {edge:'bottom', dx:0,         dy:ih/2+GAP, path:'M10 4 L10 16 M5 11 L10 16 L15 11'},
                      {edge:'top',    dx:0,         dy:-ih/2-GAP,path:'M10 16 L10 4 M5 9 L10 4 L15 9'},
                    ];
                    return edges.map(({edge,dx,dy,path})=>{
                      const pos=icorner(dx,dy);
                      return(
                        <div key={edge} onMouseDown={e=>{
                            e.stopPropagation();e.preventDefault();
                            drag.current={mode:'imageEdgeResize',id:im.id,edge,startW:im.wMM,startH:im.hMM,
                              startX:e.clientX,startY:e.clientY,startXMM:im.xMM,startYMM:im.yMM};
                          }}
                          style={{position:'absolute',left:pos.x,top:pos.y,width:ARR,height:ARR,
                            cursor:'crosshair',zIndex:30,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <svg width={ARR} height={ARR} viewBox="0 0 20 20" fill="none"
                            stroke="#e67e22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{transform:'rotate('+rotDeg+'deg)',transformOrigin:'center'}}>
                            <path d={path}/>
                          </svg>
                        </div>
                      );
                    });
                  })()}
                </React.Fragment>
              );
            })}

            {/* 도형 핸들 */}
            {shapes.filter(sh=>sel===sh.id&&isVisible(sh.id)).map(sh=>{
              const sx=P(sh.xMM), sy=P(sh.yMM), sw=P(sh.wMM), shh=P(sh.hMM);
              const rot=(sh.rotate||0)*Math.PI/180;
              const cosR=Math.cos(rot), sinR=Math.sin(rot);
              const BTN=22, H=BTN/2;
              // 도형 중심 (컨테이너 기준, 자 포함)
              const cx=RULER_SZ+sx+sw/2, cy=RULER_SZ+sy+shh/2;
              // 회전 적용해서 코너로 이동하는 함수
              const OFFSET=BTN*0.6;
              const corner=(dx,dy)=>({
                x: cx + dx*cosR - dy*sinR - H,
                y: cy + dx*sinR + dy*cosR - H,
              });
              const del = corner(-sw/2-OFFSET, -shh/2-OFFSET);
              const rot2= corner( sw/2+OFFSET, -shh/2-OFFSET);
              const res = corner( sw/2+OFFSET,  shh/2+OFFSET);
              const cpy = corner(-sw/2-OFFSET,  shh/2+OFFSET);
              return(
                <React.Fragment key={"sh-h-"+sh.id}>
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();setShapes(p=>p.filter(s=>s.id!==sh.id));removeLayer(sh.id);setSel(null);}}
                    style={{position:"absolute",left:del.x,top:del.y,width:BTN,height:BTN,
                      background:"#e74c3c",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </div>
                  {/* 복사 — 좌하단 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();copyElem();}}
                    style={{position:"absolute",left:cpy.x,top:cpy.y,width:BTN,height:BTN,
                      background:"#8e44ad",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{
                      e.stopPropagation();e.preventDefault();
                      const cr=cardRef.current.getBoundingClientRect();
                      const acx=cr.left+sx+sw/2, acy=cr.top+sy+shh/2;
                      drag.current={mode:'shapeRotate',id:sh.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:sh.rotate||0, groupSnaps:buildGroupRotateSnaps(sh.id)};
                    }}
                    style={{position:"absolute",left:rot2.x,top:rot2.y,width:BTN,height:BTN,
                      background:"#2980b9",borderRadius:"50%",cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{e.stopPropagation();e.preventDefault();
                      drag.current={mode:'shapeResize',id:sh.id,startW:sh.wMM,startH:sh.hMM,startCX:e.clientX,startCY:e.clientY,startXMM:sh.xMM,startYMM:sh.yMM,groupSnaps:buildGroupSnaps(sh.id)};}}
                    style={{position:"absolute",left:res.x,top:res.y,width:BTN,height:BTN,
                      background:"#27ae60",borderRadius:"50%",cursor:"nwse-resize",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 3 3 3 3 9"/><polyline points="15 21 21 21 21 15"/>
                      <line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
                    </svg>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 아이콘 핸들 */}
            {icons.filter(ic=>sel===ic.id&&isVisible(ic.id)).map(ic=>{
              const ix=P(ic.xMM), iy=P(ic.yMM), isz=P(ic.sizeMM);
              const rot=(ic.rotate||0)*Math.PI/180;
              const cosR=Math.cos(rot), sinR=Math.sin(rot);
              const BTN=22, H=BTN/2;
              const cx=RULER_SZ+ix+isz/2, cy=RULER_SZ+iy+isz/2;
              const OFFSET=BTN*0.6;
              const corner=(dx,dy)=>({
                x: cx + dx*cosR - dy*sinR - H,
                y: cy + dx*sinR + dy*cosR - H,
              });
              const del = corner(-isz/2-OFFSET, -isz/2-OFFSET);
              const rot2= corner( isz/2+OFFSET, -isz/2-OFFSET);
              const res = corner( isz/2+OFFSET,  isz/2+OFFSET);
              const cpy = corner(-isz/2-OFFSET,  isz/2+OFFSET);
              return(
                <React.Fragment key={"ic-h-"+ic.id}>
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();setIcons(p=>p.filter(i=>i.id!==ic.id));removeLayer(ic.id);setSel(null);}}
                    style={{position:"absolute",left:del.x,top:del.y,width:BTN,height:BTN,
                      background:"#e74c3c",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </div>
                  {/* 복사 — 좌하단 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();copyElem();}}
                    style={{position:"absolute",left:cpy.x,top:cpy.y,width:BTN,height:BTN,
                      background:"#8e44ad",borderRadius:"50%",cursor:"pointer",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{
                      e.stopPropagation();e.preventDefault();
                      const cr=cardRef.current.getBoundingClientRect();
                      const acx=cr.left+ix+isz/2, acy=cr.top+iy+isz/2;
                      drag.current={mode:'iconRotate',id:ic.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:ic.rotate||0, groupSnaps:buildGroupRotateSnaps(ic.id)};
                    }}
                    style={{position:"absolute",left:rot2.x,top:rot2.y,width:BTN,height:BTN,
                      background:"#2980b9",borderRadius:"50%",cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{e.stopPropagation();e.preventDefault();
                      drag.current={mode:'iconResize',id:ic.id,startSz:ic.sizeMM,startCX:e.clientX,startCY:e.clientY,startXMM:ic.xMM,startYMM:ic.yMM,groupSnaps:buildGroupSnaps(ic.id)};}}                    style={{position:"absolute",left:res.x,top:res.y,width:BTN,height:BTN,
                      background:"#27ae60",borderRadius:"50%",cursor:"nwse-resize",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 3 3 3 3 9"/><polyline points="15 21 21 21 21 15"/>
                      <line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
                    </svg>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 텍스트 회전/삭제/리사이즈 핸들 */}
            {texts.filter(t=>sel===t.id&&editing!==t.id).map(t=>{
              const domEl=document.querySelector(`[data-elem-id="${t.id}"]`);
              let tw,th;
              const visibleW=CW-P(t.xMM); // 텍스트 시작 위치에서 카드 오른쪽 끝까지의 실제 보이는 폭
              if(domEl){tw=Math.min(domEl.offsetWidth,visibleW);th=domEl.offsetHeight;}
              else{tw=Math.min(t.text.length*t.fs*FSC*0.6+6,visibleW);th=t.fs*FSC*1.4+2;}
              const tx=RULER_SZ+P(t.xMM), ty=RULER_SZ+P(t.yMM);
              const cx=tx+tw/2, cy=ty+th/2;
              const BTN=22;
              const rot=(t.rotate||0)*Math.PI/180;
              const cosR=Math.cos(rot), sinR=Math.sin(rot);
              // 회전된 좌표계에서 버튼 위치 계산 (중심 기준 오프셋 → 회전 적용)
              const rotPt=(dx,dy)=>({
                x: cx + dx*cosR - dy*sinR - BTN/2,
                y: cy + dx*sinR + dy*cosR - BTN/2,
              });
              const delPos  = rotPt(-tw/2 - BTN*0.6, -th/2 - BTN*0.6); // 좌상단
              const rotPos  = rotPt( tw/2 + BTN*0.6, -th/2 - BTN*0.6); // 우상단
              const resPos  = rotPt( tw/2 + BTN*0.6,  th/2 + BTN*0.6); // 우하단
              const cpyPos  = rotPt(-tw/2 - BTN*0.6,  th/2 + BTN*0.6); // 좌하단
              return(
                <React.Fragment key={"th-"+t.id}>
                  {/* 삭제 — 좌상단 바깥 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();setTexts(p=>p.filter(t2=>t2.id!==t.id));removeLayer(t.id);setSel(null);}}
                    style={{position:"absolute",left:delPos.x,top:delPos.y,
                      width:BTN,height:BTN,background:"#e74c3c",borderRadius:"50%",
                      cursor:"pointer",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </div>
                  {/* 복사 — 좌하단 */}
                  <div onMouseDown={e=>e.stopPropagation()}
                    onClick={e=>{e.stopPropagation();copyElem();}}
                    style={{position:"absolute",left:cpyPos.x,top:cpyPos.y,
                      width:BTN,height:BTN,background:"#8e44ad",borderRadius:"50%",
                      cursor:"pointer",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </div>
                  {/* 회전 — 우상단 바깥 */}
                  <div onMouseDown={e=>{
                      e.stopPropagation(); e.preventDefault();
                      const cr=cardRef.current.getBoundingClientRect();
                      const acx=cr.left+P(t.xMM)+tw/2, acy=cr.top+P(t.yMM)+th/2;
                      drag.current={mode:'textRotate',id:t.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:t.rotate||0, groupSnaps:buildGroupRotateSnaps(t.id)};
                    }}
                    style={{position:"absolute",left:rotPos.x,top:rotPos.y,
                      width:BTN,height:BTN,background:"#2980b9",borderRadius:"50%",
                      cursor:"grab",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  {/* 리사이즈 — 우하단 바깥 */}
                  <div onMouseDown={e=>{
                      e.stopPropagation(); e.preventDefault();
                      drag.current={mode:'textResize',id:t.id,startFs:t.fs,startCY:e.clientY,startCX:e.clientX,startXMM:t.xMM,startYMM:t.yMM,groupSnaps:buildGroupSnaps(t.id)};
                    }}
                    style={{position:"absolute",left:resPos.x,top:resPos.y,
                      width:BTN,height:BTN,background:"#27ae60",borderRadius:"50%",
                      cursor:"nwse-resize",zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",
                      boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 3 3 3 3 9"/><polyline points="15 21 21 21 21 15"/>
                      <line x1="3" y1="3" x2="10" y2="10"/><line x1="21" y1="21" x2="14" y2="14"/>
                    </svg>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 가이드 삭제 버튼 — 세로선: 아래 끝, 가로선: 오른쪽 끝 */}
            {guides.filter(g=>g.visible&&selGuide===g.id).map(g=>(
              <div key={"gd-"+g.id}
                onMouseDown={e=>e.stopPropagation()}
                onClick={e=>{e.stopPropagation();setGuides(gs=>gs.filter(gd=>gd.id!==g.id));setSelGuide(null);setSel(null);}}
                style={{position:"absolute",
                  ...(g.type==="v"
                    ? {left:RULER_SZ+P(g.posMM)-10, top:RULER_SZ+CH+6}
                    : {left:RULER_SZ+CW+6,           top:RULER_SZ+P(g.posMM)-10}),
                  width:20,height:20,background:"#e74c3c",borderRadius:"50%",
                  cursor:"pointer",zIndex:30,display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:12,fontWeight:700,boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}>
                ×
              </div>
            ))}

          </div>{/* 자 + 카드 컨테이너 끝 */}

          {/* 프리셋 슬롯 — 줌 위 한 줄 */}
          <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center",marginTop:60,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"#5d6d7e",fontWeight:600,flexShrink:0}}>프리셋</span>
            {[1,2,3,4,5].map(slot=>{
              const p=presets[slot];
              return(
                <div key={slot} style={{display:"flex",alignItems:"center",gap:2}}>
                  <button onClick={()=>{ if(p){ applyPresetSlot(slot); } else { savePreset(slot); } }}
                    title={p?`P${slot} 불러오기`:`P${slot} — 클릭하여 저장`}
                    style={{padding:"3px 9px",fontSize:13,borderRadius:4,cursor:"pointer",
                      background:p?"#3d8bcd":"rgba(0,0,0,.08)",border:p?"1px solid #2e7bb5":"1px solid rgba(0,0,0,.15)",
                      color:p?"#fff":"#5d6d7e",fontWeight:p?600:400,whiteSpace:"nowrap"}}>{`P${slot}`}</button>
                  {p&&<button onClick={e=>{e.stopPropagation();setConfirmSlot(slot);}} title="덮어쓰기"
                    style={{width:20,height:20,padding:0,background:"#708090",border:"none",borderRadius:3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>}
                  {p&&<button onClick={e=>{e.stopPropagation();clearPreset(slot);}} title="삭제"
                    style={{width:20,height:20,padding:0,background:"#e74c3c",border:"none",borderRadius:3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
                    </svg>
                  </button>}
                </div>
              );
            })}
          </div>

          {/* 격자/스냅/재단선 컨트롤 */}
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:8,flexWrap:"wrap",justifyContent:"center"}}>
            <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:13,color:"#5d6d7e",flexShrink:0}}>
              <input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)}
                style={{accentColor:"#708090",width:13,height:13}}/>격자
            </label>
            <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:13,color:"#5d6d7e",flexShrink:0}}>
              <input type="checkbox" checked={snapEnabled} onChange={e=>setSnapEnabled(e.target.checked)}
                style={{accentColor:"#708090",width:13,height:13}}/>스냅
            </label>
            <div style={{width:1,height:20,background:"rgba(0,0,0,.15)",margin:"0 2px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <span style={{fontSize:13,color:"#5d6d7e"}}>재단선</span>
              <div onClick={()=>setShowCutLine(v=>!v)} title={showCutLine?"재단선 숨기기":"재단선 보이기"}
                style={{cursor:"pointer",color:showCutLine?"#e74c3c":"#bdc3c7",display:"flex",alignItems:"center"}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showCutLine
                    ?<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    :<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  }
                </svg>
              </div>
            </div>
          </div>


          {/* 작업 사이즈 설정 */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
            <span style={{fontSize:13,fontWeight:600,color:"#5d6d7e",flexShrink:0}}>작업 사이즈</span>
            <input type="number" value={customW} onChange={e=>setCustomW(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){const w=parseFloat(customW),h=parseFloat(customH);if(w>0&&h>0)applyPreset(w,h);}}}
              style={{width:52,padding:"3px 6px",background:"#fff",color:"#2c3e50",
                border:"1px solid #bdc3c7",borderRadius:4,fontSize:13,outline:"none",textAlign:"center"}}/>
            <span style={{fontSize:13,color:"#95a5a6"}}>x</span>
            <input type="number" value={customH} onChange={e=>setCustomH(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){const w=parseFloat(customW),h=parseFloat(customH);if(w>0&&h>0)applyPreset(w,h);}}}
              style={{width:52,padding:"3px 6px",background:"#fff",color:"#2c3e50",
                border:"1px solid #bdc3c7",borderRadius:4,fontSize:13,outline:"none",textAlign:"center"}}/>
            <span style={{fontSize:13,color:"#95a5a6"}}>mm</span>
            <button onClick={()=>{const w=parseFloat(customW),h=parseFloat(customH);if(w>0&&h>0)applyPreset(w,h);}}
              style={{padding:"3px 10px",background:"#708090",border:"none",
                color:"#fff",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:600}}>적용</button>
            <div style={{width:1,height:20,background:"rgba(0,0,0,.15)",margin:"0 2px"}}/>
            <button onClick={()=>applyPreset(90,58,"landscape","card")}
              style={{padding:"3px 9px",
                background:cardW===90&&cardH===58?"#3d8bcd":"rgba(0,0,0,.08)",
                border:cardW===90&&cardH===58?"1px solid #2e7bb5":"1px solid rgba(0,0,0,.15)",
                color:cardW===90&&cardH===58?"#fff":"#5d6d7e",
                borderRadius:4,cursor:"pointer",fontSize:13,flexShrink:0}}>
              카드·신분증
            </button>
            <button onClick={()=>applyPreset(92,52,"landscape","biz")}
              style={{padding:"3px 9px",
                background:cardW===92&&cardH===52?"#3d8bcd":"rgba(0,0,0,.08)",
                border:cardW===92&&cardH===52?"1px solid #2e7bb5":"1px solid rgba(0,0,0,.15)",
                color:cardW===92&&cardH===52?"#fff":"#5d6d7e",
                borderRadius:4,cursor:"pointer",fontSize:13,flexShrink:0}}>
              명함
            </button>
            <button onClick={applyBlankTemplate}
              style={{padding:"3px 9px",
                background:"rgba(0,0,0,.08)",
                border:"1px solid rgba(0,0,0,.15)",
                color:"#5d6d7e",
                borderRadius:4,cursor:"pointer",fontSize:13,flexShrink:0}}>
              빈 템플릿
            </button>

          </div>
          {/* 크기 보정 */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"center",marginTop:10}}>
            <span style={{fontSize:13,fontWeight:600,color:"#5d6d7e"}}>실제 크기 보정</span>
            <input type="number" value={calVal} onChange={e=>setCalVal(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&applyCal()}
              placeholder="측정값"
              style={{width:80,padding:"3px 8px",background:"#fff",color:"#2c3e50",
                border:"1px solid #bdc3c7",borderRadius:4,fontSize:13,outline:"none"}}/>
            <span style={{fontSize:13,color:"#95a5a6"}}>mm</span>
            <button onClick={applyCal}
              style={{padding:"3px 11px",background:"#708090",border:"none",
                color:"#fff",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:600}}>적용</button>
            {scale!==1&&<>
              <button onClick={()=>setScale(1)}
                style={{padding:"2px 8px",background:"none",border:"1px solid #bdc3c7",
                  color:"#95a5a6",borderRadius:4,cursor:"pointer",fontSize:13}}>초기화</button>
              <span style={{fontSize:13,color:"#7f8c8d"}}>보정 x{scale.toFixed(4)}</span>
            </>}
            <div style={{width:"100%",textAlign:"center",fontSize:13,color:"#95a5a6",marginTop:2}}>
              카드 가로를 자로 모니터 화면에 대고 측정 후 수치를 입력하면 실제 사이즈로 맞춰집니다.
            </div>
          </div>

          {/* 전체 초기화 */}
          <div style={{display:"flex",justifyContent:"center",marginTop:20}}>
            <button onClick={()=>onReset&&onReset()}
              style={{padding:"5px 20px",background:"#e74c3c",border:"none",
                color:"#fff",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:600}}>
              초기화
            </button>
          </div>
          <div style={{marginTop:16,display:"flex",justifyContent:"center"}}>
            <ul style={{fontSize:13,color:"#95a5a6",lineHeight:1.8,textAlign:"left",listStyle:"disc",paddingLeft:16,margin:0}}>
              <li>레이어 체크박스로 오브젝트 정렬이 가능합니다.</li>
              <li>프리셋은 에디터에서 제공하는 옵션과 배치만 기억하며 불러온 이미지는 기억하지 않습니다.</li>
              <li>프리셋은 브라우저 캐시를 지우면 날아가니 주의해주세요.</li>
              <li>글자 테두리는 미리보기에서만 각져 보이며 이미지로 내려받을 시 라운드로 적용됩니다.</li>
              <li>내려받기 시 이미지의 해상도는 300dpi입니다.</li>
            </ul>
          </div>

        </div>

        {/* ══ 레이어 패널 ══ */}
        <LayerPanel
          toolbarH={toolbarH}
          copyrightH={copyrightH}
          layers={layers} setLayers={setLayers}
          texts={texts} photos={photos} images={images} shapes={shapes} icons={icons}
          ppm={BASE*scale*zoom} setTexts={setTexts} setPhotos={setPhotos} setImages={setImages} setShapes={setShapes} setIcons={setIcons}
          groups={groups} setGroups={setGroups}
          multiSel={multiSel} setMultiSel={setMultiSel}
          selGroups={selGroups} setSelGroups={setSelGroups}
          sel={sel} setSel={setSel}
          editBarActive={!!(sT||sSh||sIcon)} pickerActive={showIconPicker}
          onDelete={(id)=>{
            setTexts(p=>p.filter(t=>t.id!==id));
            setPhotos(p=>p.filter(p=>p.id!==id));
            setImages(p=>p.filter(i=>i.id!==id));
            setShapes(p=>p.filter(s=>s.id!==id));
            setIcons(p=>p.filter(i=>i.id!==id));
            setGroups(p=>p.map(g=>({...g,memberIds:g.memberIds.filter(m=>m!==id)})).filter(g=>g.memberIds.length>=2));
            removeLayer(id); setSel(null);
          }}
        />

      </div>{/* 메인 영역 끝 */}

      {/* 프리셋 덮어쓰기 확인 모달 */}
      {confirmSlot&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:2000,
          display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setConfirmSlot(null)}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"#2c3e50",borderRadius:10,padding:"28px 32px",
              boxShadow:"0 8px 32px rgba(0,0,0,.5)",minWidth:280,textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:10}}>
              P{confirmSlot} 덮어쓰기
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:24,lineHeight:1.6}}>
              이미 저장된 프리셋이 존재합니다.<br/>현재 상태로 덮어씌우시겠습니까?
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>{savePreset(confirmSlot);setConfirmSlot(null);}}
                style={{padding:"7px 24px",background:"#3498db",border:"none",
                  color:"#fff",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:600}}>
                예
              </button>
              <button onClick={()=>setConfirmSlot(null)}
                style={{padding:"7px 24px",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",
                  color:"#fff",borderRadius:6,cursor:"pointer",fontSize:13}}>
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 크롭 모달 */}
      {cropModal&&(
        <CropModal
          img={cropModal.img}
          photoId={cropModal.photoId}
          initShape={cropModal.shape}
          initRadius={cropModal.radius||0}
          initVState={cropModal.vState||null}
          initWMM={cropModal.wMM}
          initHMM={cropModal.hMM}
          defaultWMM={PW}
          defaultHMM={PH}
          initOrigSrc={cropModal.src}
          onApply={applyCrop}
          onCancel={()=>setCropModal(null)}
        />
      )}

      {/* 미리보기 모달 */}
      {showPreview&&(
        <PreviewModal
          orient={orient} photos={photos} texts={texts} images={images} shapes={shapes} icons={icons}
          layers={layers}
          scale={scale} cardBg={cardBg} cardW={cardW} cardH={cardH} onClose={()=>setShowPreview(false)}
        />
      )}

    </div>
  );
}

/* ════ 미리보기 모달 ════ */

export default CardEditor;
