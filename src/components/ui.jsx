import React, { useState } from "react";
import { _IC, _IC_FILLED } from "../constants";

const Sep=()=><div style={{width:1,height:22,background:"rgba(0,0,0,.15)",flexShrink:0}}/>;

function Btn({onClick,children,disabled}){
  const [h,sH]=useState(false);
  return <button disabled={disabled}
    onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} onClick={onClick}
    style={{padding:"4px 7px",
      background:disabled?"rgba(0,0,0,.06)":h?"rgba(0,0,0,.25)":"rgba(0,0,0,.15)",
      border:"1px solid rgba(0,0,0,.2)",
      color:disabled?"rgba(255,255,255,.3)":"rgba(255,255,255,.93)",
      borderRadius:4,cursor:disabled?"not-allowed":"pointer",
      fontSize:12,fontWeight:500,transition:"all .12s",flexShrink:0,lineHeight:1}}>
    {children}
  </button>;
}
function Chk({label,v,onChange}){
  return <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
    fontSize:12,color:"rgba(255,255,255,.85)",flexShrink:0}}>
    <input type="checkbox" checked={v} onChange={e=>onChange(e.target.checked)}
      style={{accentColor:"#fff",width:13,height:13}}/>{label}
  </label>;
}

function IcoSVG({type, color, size, style}) {
  const d = _IC[type] || "M12 2a10 10 0 100 20A10 10 0 0012 2z";
  const filled = _IC_FILLED.has(type);
  return (
    <svg viewBox="0 0 24 24" width={size||16} height={size||16}
      fill={filled ? (color||"currentColor") : "none"}
      stroke={filled ? "none" : (color||"currentColor")}
      strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{display:"inline-block",flexShrink:0,...(style||{})}}>
      <path d={d}/>
    </svg>
  );
}

export { Sep, Btn, Chk, IcoSVG };
