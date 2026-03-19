import React, { useState, useRef } from "react";
import { BASE } from "../constants";
import { IcoSVG } from "./ui";

function LayerPanel({layers,setLayers,texts,photos,images,shapes,icons=[],setTexts,setPhotos,setImages,setShapes,setIcons,groups=[],setGroups,multiSel=[],setMultiSel,selGroups=null,setSelGroups,ppm=BASE,sel,setSel,editBarActive,pickerActive=false,toolbarH=46,copyrightH=32,onDelete}){
  const dragRef=useRef(null);
  const [dragIdx,setDragIdx]=useState(null);
  const [overIdx,setOverIdx]=useState(null);

  const toggleMulti=(id)=>setMultiSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  // 그룹 생성
  const doGroup=()=>{
    if(multiSel.length<2) return;
    const gid=`g${Date.now()}`;
    const memberIds=[...multiSel];
    setGroups(p=>{
      const filtered=p.filter(g=>!g.memberIds.some(m=>memberIds.includes(m)));
      return [...filtered,{id:gid,name:'그룹',memberIds,collapsed:false}];
    });
    // 레이어 정렬: 멤버들을 그 중 가장 위(높은 인덱스)에 인접하게 모음
    setLayers(prev=>{
      const memberSet=new Set(memberIds);
      const topIdx=Math.max(...memberIds.map(id=>prev.findIndex(l=>l.id===id)));
      // 멤버가 아닌 레이어 + 멤버 레이어를 topIdx 위치에 블록으로 삽입
      const nonMembers=prev.filter(l=>!memberSet.has(l.id));
      const members=memberIds.map(id=>prev.find(l=>l.id===id)).filter(Boolean);
      // topIdx는 prev 기준, nonMembers에서의 삽입 위치 계산
      const insertAfter=prev.slice(0,topIdx+1).filter(l=>!memberSet.has(l.id)).length;
      const result=[...nonMembers.slice(0,insertAfter),...members,...nonMembers.slice(insertAfter)];
      return result;
    });
    setMultiSel([]);
  };

  // 그룹 해제
  const doUngroup=(gid)=>{
    setGroups(p=>p.filter(g=>g.id!==gid));
  };

  // 그룹 접기/펼치기
  const toggleCollapse=(gid)=>{
    setGroups(p=>p.map(g=>g.id!==gid?g:{...g,collapsed:!g.collapsed}));
  };

  // 멤버가 속한 그룹 찾기
  const getGroup=(id)=>groups.find(g=>g.memberIds.includes(id));

  const moveLayer=(id, dir)=>{
    // reversed 기준 위(앞) = layers 배열 뒤쪽 (높은 인덱스)
    setLayers(prev=>{
      const idx=prev.findIndex(l=>l.id===id);
      if(idx<0) return prev;
      const next=[...prev];
      if(dir==='up'&&idx<prev.length-1){
        [next[idx],next[idx+1]]=[next[idx+1],next[idx]];
      } else if(dir==='down'&&idx>0){
        [next[idx],next[idx-1]]=[next[idx-1],next[idx]];
      }
      return next;
    });
  };

  // 오브젝트 바운딩 박스 가져오기
  const getBBox=(id)=>{
    const t=texts.find(x=>x.id===id);
    if(t){
      // data-elem-id DOM에서 offsetWidth/Height 읽기 (zoom*scale 보정)
      const el=document.querySelector(`[data-elem-id="${id}"]`);
      if(el && ppm>0){
        const wMM=el.offsetWidth/ppm;
        const hMM=el.offsetHeight/ppm;
        return {xMM:t.xMM, yMM:t.yMM, wMM, hMM};
      }
      return {xMM:t.xMM, yMM:t.yMM, wMM:t.text.length*t.fs*0.55/BASE, hMM:t.fs*1.2/BASE};
    }
    const ph=photos.find(x=>x.id===id); if(ph) return {xMM:ph.xMM,yMM:ph.yMM,wMM:ph.wMM,hMM:ph.hMM};
    const im=images.find(x=>x.id===id); if(im) return {xMM:im.xMM,yMM:im.yMM,wMM:im.wMM,hMM:im.hMM};
    const sh=shapes.find(x=>x.id===id); if(sh) return {xMM:sh.xMM,yMM:sh.yMM,wMM:sh.wMM,hMM:sh.hMM};
    const ic=icons.find(x=>x.id===id); if(ic) return {xMM:ic.xMM,yMM:ic.yMM,wMM:ic.sizeMM||10,hMM:ic.sizeMM||10};
    return null;
  };

  // 그룹 전체 바운딩박스
  const getGroupBBox=(grp)=>{
    const boxes=grp.memberIds.map(id=>getBBox(id)).filter(Boolean);
    if(boxes.length===0) return null;
    const xMM=Math.min(...boxes.map(b=>b.xMM));
    const yMM=Math.min(...boxes.map(b=>b.yMM));
    const maxX=Math.max(...boxes.map(b=>b.xMM+b.wMM));
    const maxY=Math.max(...boxes.map(b=>b.yMM+b.hMM));
    return {xMM,yMM,wMM:maxX-xMM,hMM:maxY-yMM};
  };

  // multiSel을 정렬 단위 목록으로 변환
  // selGroups에 있는 그룹 → 하나의 단위, 나머지 → 개별 단위
  const getAlignUnits=()=>{
    const sg=selGroups||new Set();
    if(sg.size>0){
      const units=[];
      const seenGrp=new Set();
      multiSel.forEach(id=>{
        const grp=getGroup(id);
        if(grp&&sg.has(grp.id)){
          if(seenGrp.has(grp.id)) return;
          seenGrp.add(grp.id);
          const bb=getGroupBBox(grp);
          if(bb) units.push({id:grp.id,isGroup:true,memberIds:grp.memberIds,...bb});
        } else {
          const bb=getBBox(id);
          if(bb) units.push({id,isGroup:false,...bb});
        }
      });
      return units;
    }
    return multiSel.map(id=>{ const bb=getBBox(id); return bb?{id,isGroup:false,...bb}:null; }).filter(Boolean);
  };

  const doAlign=(type)=>{
    if(multiSel.length<2) return;
    const units=getAlignUnits();
    if(units.length<2) return;
    const minX=Math.min(...units.map(u=>u.xMM));
    const maxX=Math.max(...units.map(u=>u.xMM+u.wMM));
    const minY=Math.min(...units.map(u=>u.yMM));
    const maxY=Math.max(...units.map(u=>u.yMM+u.hMM));
    const midX=(minX+maxX)/2;
    const midY=(minY+maxY)/2;
    const posMap={};
    units.forEach(u=>{
      let nx=u.xMM, ny=u.yMM;
      if(type==='left')    nx=minX;
      if(type==='right')   nx=maxX-u.wMM;
      if(type==='centerH') nx=midX-u.wMM/2;
      if(type==='top')     ny=minY;
      if(type==='bottom')  ny=maxY-u.hMM;
      if(type==='centerV') ny=midY-u.hMM/2;
      const dxMM=nx-u.xMM, dyMM=ny-u.yMM;
      const ids=u.isGroup?u.memberIds:[u.id];
      ids.forEach(id=>{
        const bb=getBBox(id); if(!bb) return;
        posMap[id]={x:bb.xMM+dxMM, y:bb.yMM+dyMM};
      });
    });
    setTexts(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setPhotos(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setImages(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setShapes(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setIcons(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
  };

  const doDistribute=(axis)=>{
    if(multiSel.length<2) return;
    const units=getAlignUnits();
    if(units.length<3) return;
    const posMap={};
    if(axis==='h'){
      const sorted=[...units].sort((a,b)=>a.xMM-b.xMM);
      const totalSpan=(sorted[sorted.length-1].xMM+sorted[sorted.length-1].wMM)-sorted[0].xMM;
      const totalW=sorted.reduce((s,u)=>s+u.wMM,0);
      const gap=(totalSpan-totalW)/(sorted.length-1);
      let cursor=sorted[0].xMM+sorted[0].wMM;
      sorted.forEach((u,i)=>{
        const nx=i===0?u.xMM:i===sorted.length-1?u.xMM:cursor+gap;
        const dxMM=nx-u.xMM;
        (u.isGroup?u.memberIds:[u.id]).forEach(id=>{const bb=getBBox(id);if(bb)posMap[id]={x:bb.xMM+dxMM,y:bb.yMM};});
        if(i>0&&i<sorted.length-1) cursor=nx+u.wMM;
        else if(i===0) cursor=u.xMM+u.wMM;
      });
    } else {
      const sorted=[...units].sort((a,b)=>a.yMM-b.yMM);
      const totalSpan=(sorted[sorted.length-1].yMM+sorted[sorted.length-1].hMM)-sorted[0].yMM;
      const totalH=sorted.reduce((s,u)=>s+u.hMM,0);
      const gap=(totalSpan-totalH)/(sorted.length-1);
      let cursor=sorted[0].yMM+sorted[0].hMM;
      sorted.forEach((u,i)=>{
        const ny=i===0?u.yMM:i===sorted.length-1?u.yMM:cursor+gap;
        const dyMM=ny-u.yMM;
        (u.isGroup?u.memberIds:[u.id]).forEach(id=>{const bb=getBBox(id);if(bb)posMap[id]={x:bb.xMM,y:bb.yMM+dyMM};});
        if(i>0&&i<sorted.length-1) cursor=ny+u.hMM;
        else if(i===0) cursor=u.yMM+u.hMM;
      });
    }
    setTexts(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setPhotos(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setImages(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setShapes(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
    setIcons(p=>p.map(t=>posMap[t.id]?{...t,xMM:posMap[t.id].x,yMM:posMap[t.id].y}:t));
  };

  // layers 역순: 패널 위 = 앞(높은 z)
  const reversed=[...layers].reverse();

  const getLabel=(l)=>{
    if(l.type==="text"){ const t=texts.find(t=>t.id===l.id); return t?t.text.slice(0,8):"텍스트"; }
    if(l.type==="photo") return "사진";
    if(l.type==="image") return "이미지";
    if(l.type==="shape"){ const s=shapes.find(s=>s.id===l.id); if(s){return s.type==="circle"?"원형":s.type==="triangle"?"삼각형":s.type==="heart"?"하트":s.type==="star"?"별":s.type==="pentagon"?"오각형":s.type==="hexagon"?"육각형":"사각형";} return "도형"; }
    if(l.type==="icon"){ const ic=icons.find(i=>i.id===l.id); return ic?`아이콘`:"아이콘"; }
    return "레이어";
  };

  const getThumb=(l)=>{
    if(l.type==="photo"){ const ph=photos.find(p=>p.id===l.id); if(ph?.src) return <img src={ph.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/> }
    if(l.type==="image"){ const im=images.find(i=>i.id===l.id); if(im?.src) return <img src={im.src} style={{width:"100%",height:"100%",objectFit:"cover"}}/> }
    if(l.type==="text") return <div style={{fontSize:10,color:"#fff",fontWeight:700,textAlign:"center",lineHeight:1}}>T</div>;
    if(l.type==="icon"){ const ic=icons.find(i=>i.id===l.id); if(ic) return <IcoSVG type={ic.type} color={ic.color} size={14}/>; }
    if(l.type==="shape"){
      const sh=shapes.find(s=>s.id===l.id);
      const c=sh?.fill||"#3498db";
      if(sh?.type==="circle") return <div style={{width:18,height:18,borderRadius:"50%",background:c}}/>;
      if(sh?.type==="triangle") return <svg width="18" height="18"><polygon points="9,2 17,16 1,16" fill={c}/></svg>;
      return <div style={{width:18,height:18,background:c,borderRadius:2}}/>;
    }
    return null;
  };

  const toggleVisible=(id)=>setLayers(p=>p.map(l=>l.id===id?{...l,visible:!l.visible}:l));
  const toggleLocked=(id)=>setLayers(p=>p.map(l=>l.id===id?{...l,locked:!l.locked}:l));

  // drag to reorder (in reversed view, then convert back)
  const onDragStart=(e,revIdx,groupId=null)=>{
    dragRef.current={revIdx,groupId};
    setDragIdx(revIdx);
    e.dataTransfer.effectAllowed="move";
  };
  const onDragOver=(e,revIdx)=>{
    e.preventDefault();
    setOverIdx(revIdx);
  };
  const onDrop=(e,revIdx)=>{
    e.preventDefault();
    if(!dragRef.current) return;
    const {revIdx:fromRevIdx,groupId}=dragRef.current;
    if(fromRevIdx===revIdx){setDragIdx(null);setOverIdx(null);return;}
    const n=layers.length;
    setLayers(p=>{
      const arr=[...p];
      if(groupId){
        // 그룹 전체 멤버를 블록으로 이동
        const grp=groups.find(g=>g.id===groupId);
        if(!grp){setDragIdx(null);setOverIdx(null);return p;}
        const memberSet=new Set(grp.memberIds);
        const members=arr.filter(l=>memberSet.has(l.id));
        const nonMembers=arr.filter(l=>!memberSet.has(l.id));
        const toIdx=n-1-revIdx;
        // toIdx는 원본 arr 기준이므로 nonMembers에서 상대 위치 계산
        const nonMemberToIdx=arr.slice(0,toIdx+1).filter(l=>!memberSet.has(l.id)).length;
        return [...nonMembers.slice(0,nonMemberToIdx),...members,...nonMembers.slice(nonMemberToIdx)];
      } else {
        const fromIdx=n-1-fromRevIdx;
        const toIdx=n-1-revIdx;
        const [item]=arr.splice(fromIdx,1);
        arr.splice(toIdx,0,item);
        return arr;
      }
    });
    dragRef.current=null;
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd=()=>{dragRef.current=null;setDragIdx(null);setOverIdx(null);};

  return(
    <div style={{position:"fixed",right:0,top:copyrightH,bottom:0,width:220,background:"#1e272e",
      borderLeft:"1px solid rgba(0,0,0,.3)",
      display:"flex",flexDirection:"column",userSelect:"none",zIndex:99}}>
      <div style={{padding:'4px 10px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.5)',
        letterSpacing:'.08em',borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>레이어</div>

      {/* 레이어 목록 — 스크롤 */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
        {(()=>{
          const rendered=new Set();
          const rows=[];
          const revLayers=[...layers].reverse();
          revLayers.forEach((l,revIdx)=>{
            const grp=getGroup(l.id);
            if(grp){
              if(!rendered.has(grp.id)){
                rendered.add(grp.id);
                const grpActive=(selGroups||new Set()).has(grp.id);
                rows.push(
                  <div key={'grp-'+grp.id}
                    draggable
                    onDragStart={e=>onDragStart(e,revIdx,grp.id)}
                    onDragOver={e=>onDragOver(e,revIdx)}
                    onDrop={e=>onDrop(e,revIdx)}
                    onDragEnd={onDragEnd}
                    onClick={()=>{
                      if(grpActive){
                        setSelGroups(p=>{const n=new Set(p);n.delete(grp.id);return n;});
                        setMultiSel(p=>p.filter(id=>!grp.memberIds.includes(id)));
                      } else {
                        setSelGroups(p=>new Set([...p,grp.id]));
                        setMultiSel(p=>[...new Set([...p,...grp.memberIds])]);
                        setSel(grp.memberIds[0]);
                      }
                    }}
                    style={{display:'flex',alignItems:'center',gap:5,
                    padding:'3px 8px 3px 6px',
                    background:grpActive?'rgba(243,156,18,.3)':'rgba(243,156,18,.1)',
                    cursor:'pointer',
                    borderBottom:'1px solid rgba(243,156,18,.2)',borderTop:'1px solid rgba(243,156,18,.2)'}}>
                    <div onClick={e=>{e.stopPropagation();
                      if(grpActive){
                        setSelGroups(p=>{const n=new Set(p);n.delete(grp.id);return n;});
                        setMultiSel(p=>p.filter(id=>!grp.memberIds.includes(id)));
                      } else {
                        setSelGroups(p=>new Set([...p,grp.id]));
                        setMultiSel(p=>[...new Set([...p,...grp.memberIds])]);
                        setSel(grp.memberIds[0]);
                      }
                    }} style={{flexShrink:0,width:14,height:14,border:`1.5px solid ${grpActive?'#f39c12':'rgba(255,255,255,.2)'}`,
                      borderRadius:3,background:grpActive?'#f39c12':'transparent',
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {grpActive&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>}
                    </div>
                    <span style={{fontSize:10,cursor:'pointer',userSelect:'none',color:'rgba(255,255,255,.5)'}} onClick={e=>{e.stopPropagation();toggleCollapse(grp.id);}}>{grp.collapsed?'▶':'▼'}</span>
                    {/* 그룹 전체 눈 아이콘 */}
                    {(()=>{
                      const allVisible=grp.memberIds.every(mid=>{const lyr=layers.find(l=>l.id===mid);return lyr?lyr.visible!==false:true;});
                      return(
                        <div onClick={e=>{e.stopPropagation();
                          setLayers(p=>p.map(l=>grp.memberIds.includes(l.id)?{...l,visible:!allVisible}:l));
                        }} style={{flexShrink:0,width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',
                          cursor:'pointer',color:allVisible?'rgba(255,255,255,.8)':'rgba(255,255,255,.25)'}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {allVisible
                              ?<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                              :<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            }
                          </svg>
                        </div>
                      );
                    })()}
                    <span style={{fontSize:10,color:'#f39c12',fontWeight:600,flex:1}}>📦 {grp.name}</span>
                    <button onClick={e=>{e.stopPropagation();doUngroup(grp.id);}} style={{fontSize:9,color:'rgba(255,255,255,.4)',background:'none',border:'none',cursor:'pointer',padding:'1px 4px',borderRadius:3}}>해제</button>
                  </div>
                );
              }
              if(grp.collapsed) return;
            }
            const isSel=sel===l.id;
            const isDrag=dragIdx===revIdx;
            const isOver=overIdx===revIdx&&dragIdx!==revIdx;
            rows.push(
              <div key={l.id} draggable
                onDragStart={e=>onDragStart(e,revIdx)} onDragOver={e=>onDragOver(e,revIdx)}
                onDrop={e=>onDrop(e,revIdx)} onDragEnd={onDragEnd}
                onClick={()=>{if(!l.locked){setSel(l.id);}}}
                style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",
                  paddingLeft:grp?16:8,
                  background:isSel?"rgba(52,152,219,.25)":isDrag?"rgba(255,255,255,.04)":grp?"rgba(255,255,255,.04)":"transparent",
                  borderTop:isOver?"2px solid #3498db":"2px solid transparent",
                  cursor:l.locked?"default":"pointer",opacity:l.visible?1:0.45,transition:"background .1s"}}>
                <div onClick={e=>{e.stopPropagation();toggleMulti(l.id);}}
                  style={{flexShrink:0,width:14,height:14,border:`1.5px solid ${multiSel.includes(l.id)?'#3498db':'rgba(255,255,255,.2)'}`,
                    borderRadius:3,background:multiSel.includes(l.id)?'#3498db':'transparent',
                    cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {multiSel.includes(l.id)&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>}
                </div>
                <div onClick={e=>{e.stopPropagation();toggleVisible(l.id);}}
                  style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                    color:l.visible?"rgba(255,255,255,.8)":"rgba(255,255,255,.25)"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {l.visible?<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>:<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}
                  </svg>
                </div>
                <div style={{flexShrink:0,width:28,height:28,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden",
                  display:"flex",alignItems:"center",justifyContent:"center",border:isSel?"1px solid #3498db":"1px solid transparent"}}>
                  {getThumb(l)}
                </div>
                <div style={{flex:1,fontSize:11,color:isSel?"#fff":"rgba(255,255,255,.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getLabel(l)}</div>
                <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                  {[['up','2,7 5,3 8,7'],['down','2,3 5,7 8,3']].map(([dir,pts])=>(
                    <div key={dir} onClick={e=>{e.stopPropagation();moveLayer(l.id,dir);}}
                      style={{width:16,height:13,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,.3)"}}
                      onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.3)"}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={pts}/></svg>
                    </div>
                  ))}
                </div>
                <div onClick={e=>{e.stopPropagation();toggleLocked(l.id);if(!l.locked)setSel(s=>s===l.id?null:s);}}
                  style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:l.locked?"#e74c3c":"rgba(255,255,255,.2)"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {l.locked?<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>:<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>}
                  </svg>
                </div>
                <div onClick={e=>{e.stopPropagation();onDelete&&onDelete(l.id);}}
                  style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(255,255,255,.18)",transition:"color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#e74c3c"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.18)"}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </div>
              </div>
            );
          });
          return rows;
        })()}
      </div>

      {/* 하단 고정 툴바 */}
      <div style={{flexShrink:0,borderTop:'1px solid rgba(255,255,255,.08)',background:'#17202a',padding:'5px 6px 6px',display:'flex',flexDirection:'column',gap:3}}>
        {multiSel.length>=2&&<div style={{fontSize:9,color:'rgba(255,255,255,.35)',textAlign:'center'}}>{multiSel.length}개 선택됨</div>}
        <div style={{display:'flex',gap:3,justifyContent:'center'}}>
          {[
            {t:'left',title:'왼쪽 맞춤',path:'M4 6h16M4 12h10M4 18h13'},
            {t:'centerH',title:'수평 중앙',path:'M12 3v18M7 8h10M7 16h10'},
            {t:'right',title:'오른쪽 맞춤',path:'M20 6H4M20 12h-10M20 18H7'},
            {t:'top',title:'위쪽 맞춤',path:'M6 4h12M12 4v16M8 20h8'},
            {t:'centerV',title:'수직 중앙',path:'M3 12h18M8 7v10M16 7v10'},
            {t:'bottom',title:'아래쪽 맞춤',path:'M6 20h12M12 4v16M8 4h8'},
          ].map(({t,title,path})=>(
            <button key={t} onClick={()=>doAlign(t)} title={title} disabled={multiSel.length<2}
              style={{width:26,height:26,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',
                borderRadius:4,cursor:multiSel.length<2?'not-allowed':'pointer',opacity:multiSel.length<2?0.3:1,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round"><path d={path}/></svg>
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:3,justifyContent:'center'}}>
          <button onClick={()=>doDistribute('h')} title="가로 간격 균등" disabled={multiSel.length<3}
            style={{flex:1,height:24,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:4,
              cursor:multiSel.length<3?'not-allowed':'pointer',opacity:multiSel.length<3?0.3:1,
              display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="7" width="5" height="10" rx="1"/><rect x="10" y="5" width="4" height="14" rx="1"/><rect x="18" y="7" width="5" height="10" rx="1"/>
              <line x1="6" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="18" y2="12"/>
            </svg>
            <span style={{fontSize:9,color:'rgba(255,255,255,.6)'}}>가로</span>
          </button>
          <button onClick={()=>doDistribute('v')} title="세로 간격 균등" disabled={multiSel.length<3}
            style={{flex:1,height:24,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',borderRadius:4,
              cursor:multiSel.length<3?'not-allowed':'pointer',opacity:multiSel.length<3?0.3:1,
              display:'flex',alignItems:'center',justifyContent:'center',gap:3}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="1" width="10" height="5" rx="1"/><rect x="5" y="10" width="14" height="4" rx="1"/><rect x="7" y="18" width="10" height="5" rx="1"/>
              <line x1="12" y1="6" x2="12" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/>
            </svg>
            <span style={{fontSize:9,color:'rgba(255,255,255,.6)'}}>세로</span>
          </button>
          <button onClick={doGroup} title="그룹으로 묶기" disabled={multiSel.length<2}
            style={{flex:1,height:24,background:'rgba(243,156,18,.12)',border:'1px solid rgba(243,156,18,.25)',borderRadius:4,
              cursor:multiSel.length<2?'not-allowed':'pointer',opacity:multiSel.length<2?0.3:1,
              display:'flex',alignItems:'center',justifyContent:'center',gap:2}}>
            <span style={{fontSize:11}}>📦</span>
            <span style={{fontSize:9,color:'#f39c12',fontWeight:600}}>그룹</span>
          </button>
          {multiSel.length>=1&&(
            <button onClick={()=>setMultiSel([])}
              style={{flex:1,height:24,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:4,
                cursor:'pointer',fontSize:9,color:'rgba(255,255,255,.4)'}}>
              해제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LayerPanel;
