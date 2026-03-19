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

/* ════════════════ 메인 에디터 ════════════════ */

const _IC = {
  phone:     "M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.56a1 1 0 01-.25 1.02l-2.2 2.21z",
  fax:       "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
  mobile:    "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  email:     "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm18 2l-10 7L2 6",
  link:      "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  globe:     "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  house:     "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  building:  "M6 2h12v20H6zM2 22h20M12 2v20M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01",
  location:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z",
  store:     "M2 3h20l-2 9H4L2 3zM4 12v9h16v-9M9 21v-5h6v5",
  cart:      "M9 22a1 1 0 100-2 1 1 0 000 2zM20 22a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6",
  qrcode:    "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v4h-2zM17 19h4v2h-4zM15 17h2v2h-2z",
  kakao:     "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  instagram: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a5 5 0 100-10 5 5 0 000 10z",
  youtube:   "M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 001.95-1.97A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
  twitter:   "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
  xtwitter:  "M18 6L6 18M6 6l12 12",
  facebook:  "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
  blog:      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  line:      "M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zM8 10h8M8 14h5",
  tiktok:    "M9 18V5l12-2v13M9 18a3 3 0 11-3-3 3 3 0 013 3zM21 16a3 3 0 11-3-3 3 3 0 013 3z",
  sms:       "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 10h8M8 14h5",
  message:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  comment:   "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  commentdots:"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2zM8 10h.01M12 10h.01M16 10h.01",
  android:   "M7 12h10M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4M5 12h14a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2zM9 16h.01M15 16h.01M6.5 7l-1.5-3M17.5 7l1.5-3",
  apple:     "M17 3s-1 1-1 3 1.5 3 1.5 3-1.5.5-3 0C12 7.5 10 7 9 8c-3 3-2 8 0 11 1 1.5 2 2 3 2s1.5-.5 3-.5 2 .5 3 .5 2-.5 3-2c1-1.5 1.5-3 1.5-3s-2.5-1-2.5-4 2-4 2-4-1.5-1-3-1z",
  user:      "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  cloud:     "M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z",
  star:      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  heart:     "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  moon:      "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  snowflake: "M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07",
  image:     "M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
  folder:    "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  headset:   "M3 18v-6a9 9 0 0118 0v6M3 18a2 2 0 002 2h.5a2 2 0 002-2v-3a2 2 0 00-2-2H3zM21 18a2 2 0 01-2 2h-.5a2 2 0 01-2-2v-3a2 2 0 012-2H21z",
  compass:   "M12 2a10 10 0 100 20A10 10 0 0012 2zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
  robot:     "M12 2a2 2 0 012 2v1h3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2zM9 10h.01M15 10h.01M9 14h6M3 10h2M19 10h2",
  flag:      "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  hourglass: "M5 22h14M5 2h14M17 22v-4.17a2 2 0 00-.59-1.42L12 12l-4.41 4.41A2 2 0 007 17.83V22M7 2v4.17a2 2 0 00.59 1.42L12 12l4.41-4.41A2 2 0 0017 6.17V2",
  trash:     "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  sqcheck:   "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  squp:      "M3 3h18v18H3zM12 16V8M8 12l4-4 4 4",
  sqright:   "M3 3h18v18H3zM8 12h8M12 8l4 4-4 4",
  sqleft:    "M3 3h18v18H3zM16 12H8M12 8L8 12l4 4",
  sqdown:    "M3 3h18v18H3zM12 8v8M8 12l4 4 4-4",
  smile:     "M12 22a10 10 0 100-20 10 10 0 000 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  frown:     "M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01",
  angry:     "M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M8.5 9l2.5 1M13 10l2.5-1",
  dizzy:     "M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M8 8l3 3M11 8l-3 3M13 8l3 3M16 8l-3 3",
  tongue:    "M12 22a10 10 0 100-20 10 10 0 000 20zM8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M12 17v-4M10 15h4",
  sadtear:   "M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01M15 8l.5-2",
  tired:     "M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M8 9.5l3 1M13 10.5l3-1",
  meh:       "M12 22a10 10 0 100-20 10 10 0 000 20zM8 15h8M9 9h.01M15 9h.01",
  hearteyes: "M12 22a10 10 0 100-20 10 10 0 000 20zM8 13s1.5 2 4 2 4-2 4-2M8 9l1.5 1.5L11 9M13 9l1.5 1.5L16 9",
  stareyes:  "M12 22a10 10 0 100-20 10 10 0 000 20zM8 13s1.5 2 4 2 4-2 4-2M9 7l.5 1.5L11 9l-1.5.5L9 11l-.5-1.5L7 9l1.5-.5zM15 7l.5 1.5L17 9l-1.5.5L15 11l-.5-1.5L13 9l1.5-.5z",
  surprise:  "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16a3 3 0 100-6 3 3 0 000 6zM9 9h.01M15 9h.01",
};

const _IC_FILLED = new Set(["twitter","phone","star","heart","moon"]);

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
