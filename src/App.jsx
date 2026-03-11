import React, { useState, useRef, useEffect, useCallback } from "react";

const BASE = 96 / 25.4;
const toP  = (mm, s, z) => mm * BASE * s * z;

const CARD = { landscape:{w:90,h:58}, portrait:{w:58,h:90} };
const MAR  = 2;
const GRID = 5;
const PW   = 35;
const PH   = 45;

let _id=0; const uid=()=>`e${++_id}`;

const INIT_TEXTS = [
  {id:"t1", xMM:MAR+2, yMM:MAR+3,  text:"반려묘 카드",  fs:13, color:"#1a2744", bold:true,  italic:false, rotate:0},
  {id:"t2", xMM:MAR+2, yMM:MAR+13, text:"이        름",   fs:13, color:"#2d3748", bold:false, italic:false, rotate:0},
  {id:"t2v",xMM:MAR+22,yMM:MAR+13, text:"김푸름",      fs:13, color:"#1a2744", bold:false, italic:false, rotate:0},
  {id:"t3", xMM:MAR+2, yMM:MAR+21, text:"생년월일",     fs:13, color:"#2d3748", bold:false, italic:false, rotate:0},
  {id:"t3v",xMM:MAR+22,yMM:MAR+21, text:"2월 14일",   fs:13, color:"#1a2744", bold:false, italic:false, rotate:0},
  {id:"t4", xMM:MAR+2, yMM:MAR+29, text:"집        사",     fs:13, color:"#2d3748", bold:false, italic:false, rotate:0},
  {id:"t4v",xMM:MAR+22,yMM:MAR+29, text:"김무지",       fs:13, color:"#1a2744", bold:false, italic:false, rotate:0},
];

// 명함 초기 프리셋 (작업 92×52mm)
const INIT_TEXTS_BIZ = [
  {id:"bt1", xMM:MAR+3,  yMM:MAR+3,   text:"김  무  지",  fs:23, color:"#1a2744", bold:true,  italic:false, rotate:0, font:"'Noto Sans KR',sans-serif"},
  {id:"bt2", xMM:MAR+31, yMM:MAR+5,   text:"대리",        fs:17, color:"#2d3748", bold:false, italic:false, rotate:0, font:"'Noto Sans KR',sans-serif"},
  {id:"bt3", xMM:MAR+3,  yMM:MAR+16,  text:"디자인팀",    fs:14, color:"#2d3748", bold:false, italic:false, rotate:0, font:"'Noto Sans KR',sans-serif"},
  {id:"bt4", xMM:MAR+3,  yMM:MAR+24,  text:"mujimuji.purity012@aleeas.com", fs:14, color:"#2d3748", bold:false, italic:false, rotate:0, font:"'Noto Sans KR',sans-serif"},
  {id:"bt5", xMM:MAR+3,  yMM:MAR+32,  text:"https://smartstore.naver.com/wg0057", fs:14, color:"#1a2744", bold:false, italic:false, rotate:0, font:"'Noto Sans KR',sans-serif"},
];
const INIT_LAYERS_BIZ = ()=>[
  ...INIT_TEXTS_BIZ.map(t=>({id:t.id,type:"text",visible:true,locked:false})),
];
const INIT_LAYERS_CARD = ()=>[
  ...INIT_TEXTS.map(t=>({id:t.id,type:"text",visible:true,locked:false})),
  {id:"ph1",type:"photo",visible:true,locked:false},
];

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

const ICON_LIST = [
  {label:"전화",    type:"phone"},
  {label:"팩스",    type:"fax"},
  {label:"모바일",  type:"mobile"},
  {label:"이메일",  type:"email"},
  {label:"링크",    type:"link"},
  {label:"글로벌",  type:"globe"},
  {label:"홈페이지",type:"house"},
  {label:"회사",    type:"building"},
  {label:"위치",    type:"location"},
  {label:"스토어",  type:"store"},
  {label:"카트",    type:"cart"},
  {label:"큐알",    type:"qrcode"},
  {label:"카카오",  type:"kakao"},
  {label:"인스타",  type:"instagram"},
  {label:"유튜브",  type:"youtube"},
  {label:"트위터",  type:"twitter"},
  {label:"X",       type:"xtwitter"},
  {label:"페이스북",type:"facebook"},
  {label:"블로그",  type:"blog"},
  {label:"라인",    type:"line"},
  {label:"틱톡",    type:"tiktok"},
  {label:"sms",     type:"sms"},
  {label:"메세지",  type:"message"},
  {label:"말풍선",  type:"comment"},
  {label:"코멘트",  type:"commentdots"},
  {label:"안드로이드",type:"android"},
  {label:"애플",    type:"apple"},
  {label:"유저",    type:"user"},
  {label:"구름",    type:"cloud"},
  {label:"별",      type:"star"},
  {label:"하트",    type:"heart"},
  {label:"초승달",  type:"moon"},
  {label:"눈결정",  type:"snowflake"},
  {label:"이미지",  type:"image"},
  {label:"폴더",    type:"folder"},
  {label:"헤드셋",  type:"headset"},
  {label:"나침반",  type:"compass"},
  {label:"로봇",    type:"robot"},
  {label:"깃발",    type:"flag"},
  {label:"모래시계",type:"hourglass"},
  {label:"쓰레기통",type:"trash"},
  {label:"체크",    type:"sqcheck"},
  {label:"상",      type:"squp"},
  {label:"우",      type:"sqright"},
  {label:"좌",      type:"sqleft"},
  {label:"하",      type:"sqdown"},
  {label:"스마일",  type:"smile"},
  {label:"속상",    type:"frown"},
  {label:"화남",    type:"angry"},
  {label:"멘붕",    type:"dizzy"},
  {label:"메롱",    type:"tongue"},
  {label:"슬픔",    type:"sadtear"},
  {label:"피곤",    type:"tired"},
  {label:"정색",    type:"meh"},
  {label:"하트눈",  type:"hearteyes"},
  {label:"별눈",    type:"stareyes"},
  {label:"놀람",    type:"surprise"},
];


const FONT_LIST = [
  // ── 한국어 ──
  {label:"── 한국어 ──",  family:"",   url:null, divider:true},
  {label:"Noto Sans KR",   family:"'Noto Sans KR',sans-serif",        url:"https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap"},
  {label:"Noto Serif KR",  family:"'Noto Serif KR',serif",            url:"https://fonts.googleapis.com/css2?family=Noto+Serif+KR&display=swap"},
  {label:"나눔고딕",        family:"'Nanum Gothic',sans-serif",         url:"https://fonts.googleapis.com/css2?family=Nanum+Gothic&display=swap"},
  {label:"나눔펜글씨",      family:"'Nanum Pen Script',cursive",       url:"https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap"},
  {label:"Gothic A1",      family:"'Gothic A1',sans-serif",            url:"https://fonts.googleapis.com/css2?family=Gothic+A1&display=swap"},
  {label:"Gamja Flower",   family:"'Gamja Flower',cursive",            url:"https://fonts.googleapis.com/css2?family=Gamja+Flower&display=swap"},
  {label:"Black Han Sans", family:"'Black Han Sans',sans-serif",       url:"https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap"},
  {label:"Dongle",         family:"'Dongle',sans-serif",               url:"https://fonts.googleapis.com/css2?family=Dongle&display=swap"},
  {label:"Gowun Batang",   family:"'Gowun Batang',serif",             url:"https://fonts.googleapis.com/css2?family=Gowun+Batang&display=swap"},
  {label:"Gowun Dodum",    family:"'Gowun Dodum',sans-serif",         url:"https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap"},
  {label:"Do Hyeon",       family:"'Do Hyeon',sans-serif",            url:"https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap"},
  {label:"Single Day",     family:"'Single Day',cursive",             url:"https://fonts.googleapis.com/css2?family=Single+Day&display=swap"},
  {label:"Song Myung",     family:"'Song Myung',serif",               url:"https://fonts.googleapis.com/css2?family=Song+Myung&display=swap"},
  {label:"Cute Font",      family:"'Cute Font',cursive",              url:"https://fonts.googleapis.com/css2?family=Cute+Font&display=swap"},
  {label:"Asta Sans",      family:"'Asta Sans',sans-serif",           url:"https://fonts.googleapis.com/css2?family=Asta+Sans&display=swap"},
  {label:"Chiron Sung HK", family:"'Chiron Sung HK',serif",           url:"https://fonts.googleapis.com/css2?family=Chiron+Sung+HK&display=swap"},
  {label:"Sour Gummy",     family:"'Sour Gummy',cursive",             url:"https://fonts.googleapis.com/css2?family=Sour+Gummy&display=swap"},
  // ── 영문 ──
  {label:"── 영문 ──",    family:"",   url:null, divider:true},
  {label:"Roboto",         family:"'Roboto',sans-serif",              url:"https://fonts.googleapis.com/css2?family=Roboto&display=swap"},
  {label:"Gelasio",        family:"'Gelasio',serif",                  url:"https://fonts.googleapis.com/css2?family=Gelasio&display=swap"},
  {label:"Italianno",      family:"'Italianno',cursive",              url:"https://fonts.googleapis.com/css2?family=Italianno&display=swap"},
  // ── 일본어 ──
  {label:"── 일본어 ──",  family:"",   url:null, divider:true},
  {label:"Noto Sans JP",   family:"'Noto Sans JP',sans-serif",        url:"https://fonts.googleapis.com/css2?family=Noto+Sans+JP&display=swap"},
  {label:"Noto Serif JP",  family:"'Noto Serif JP',serif",            url:"https://fonts.googleapis.com/css2?family=Noto+Serif+JP&display=swap"},
  {label:"Kiwi Maru",      family:"'Kiwi Maru',serif",               url:"https://fonts.googleapis.com/css2?family=Kiwi+Maru&display=swap"},
  {label:"LINE Seed JP",   family:"'Line Seed JP',sans-serif",        url:"https://fonts.googleapis.com/css2?family=Line+Seed+JP&display=swap"},
  {label:"Dela Gothic One",family:"'Dela Gothic One',cursive",        url:"https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap"},
  {label:"Hachi Maru Pop", family:"'Hachi Maru Pop',cursive",         url:"https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&display=swap"},
  // ── 중국어 ──
  {label:"── 중국어 ──",  family:"",   url:null, divider:true},
  {label:"Noto Sans TC",   family:"'Noto Sans TC',sans-serif",        url:"https://fonts.googleapis.com/css2?family=Noto+Sans+TC&display=swap"},
  {label:"Noto Serif TC",  family:"'Noto Serif TC',serif",            url:"https://fonts.googleapis.com/css2?family=Noto+Serif+TC&display=swap"},
  {label:"Ma Shan Zheng",  family:"'Ma Shan Zheng',cursive",          url:"https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap"},
  {label:"WDXL 루브리폰트",family:"'WDXL Lubrifont SC',sans-serif",   url:"https://fonts.googleapis.com/css2?family=WDXL+Lubrifont+SC&display=swap"},
  {label:"Chiron GoRound TC",family:"'Chiron GoRound TC',sans-serif", url:"https://fonts.googleapis.com/css2?family=Chiron+GoRound+TC&display=swap"},
];


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
  stateRef.current = {texts,photos,images,shapes,icons,layers};

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
    setSel(null);
    setTimeout(()=>{ skipHistory.current=false; },50);
  },[]);

  const savePreset = (slot)=>{
    const s = stateRef.current;
    const snap = {
      label: `슬롯${slot}`,
      texts:  JSON.parse(JSON.stringify(s.texts)),
      photos: s.photos.map(ph=>({...ph, src:null, imgX:0, imgY:0, imgScale:1})), // 이미지 제외
      images: [], // 이미지 파일 제외
      shapes: JSON.parse(JSON.stringify(s.shapes)),
      icons:  JSON.parse(JSON.stringify(s.icons)),
      layers: JSON.parse(JSON.stringify(s.layers)),
      cardW, cardH, cardBg, orient,
    };
    const updated = {...loadPresets(), [slot]: snap};
    try{ localStorage.setItem(PRESET_KEY, JSON.stringify(updated)); }catch(e){}
    setPresets(updated);
  };
  const applyPresetSlot = (slot)=>{
    const snap = presets[slot];
    if(!snap) return;
    skipHistory.current = true;
    setTexts(snap.texts); setPhotos(snap.photos); setImages([]/*이미지 제외*/);
    setShapes(snap.shapes); setIcons(snap.icons); setLayers(snap.layers);
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
  },[texts,photos,images,shapes,icons,layers]);

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

  const eDrag   = useRef(null);
  const rDrag   = useRef(null);
  const iResize = useRef(null);
  const iEdgeDrag = useRef(null); // {id,edge,startW,startH,startX,startY,xMM,yMM}
  const sResize = useRef(null);
  const iRotate = useRef(null);
  const tRotate = useRef(null);
  const tResize = useRef(null);
  const phRotate = useRef(null);
  const shRotate = useRef(null);
  const iconRotate = useRef(null);
  const iconResize = useRef(null);
  const gDrag   = useRef(null);
  const fileRef    = useRef(null);
  const imgFileRef = useRef(null);
  const cardRef    = useRef(null);
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
    const onMove = e=>{
      if(!eDrag.current&&!rDrag.current&&!iResize.current&&!iRotate.current&&!tRotate.current&&!tResize.current&&!sResize.current&&!shRotate.current&&!iconRotate.current&&!iconResize.current&&!gDrag.current&&!phRotate.current&&!iEdgeDrag.current) return;
      const cl=gc(e);
      const csMM={w:rCardW.current, h:rCardH.current};
      const ppm=BASE*rScale.current*rZoom.current;

      // 이미지 회전
      if(iRotate.current){
        const {id,cx,cy,startAngle,startRotate}=iRotate.current;
        const cur=Math.atan2(cl.clientY-cy,cl.clientX-cx)*180/Math.PI;
        let d=cur-startAngle; if(d>180)d-=360; if(d<-180)d+=360;
        setImages(p=>p.map(im=>im.id!==id?im:{...im,rotate:startRotate+d}));
        return;
      }
      // 텍스트 회전
      if(tRotate.current){
        const {id,cx,cy,startAngle,startRotate}=tRotate.current;
        const cur=Math.atan2(cl.clientY-cy,cl.clientX-cx)*180/Math.PI;
        let d=cur-startAngle; if(d>180)d-=360; if(d<-180)d+=360;
        setTexts(p=>p.map(t=>t.id!==id?t:{...t,rotate:startRotate+d}));
        return;
      }
      // 텍스트 리사이즈
      if(tResize.current){
        const {id,startFs,startCY,startCX}=tResize.current;
        const d=(cl.clientX-startCX+cl.clientY-startCY)/2;
        const newFs=Math.max(4,Math.round(startFs+d/2));
        setTexts(p=>p.map(t=>t.id!==id?t:{...t,fs:newFs}));
        return;
      }
      // 가이드 드래그
      if(gDrag.current){
        const {id,type,startPosMM,startClient}=gDrag.current;
        let newMM;
        if(type==="h") newMM=startPosMM+(cl.clientY-startClient)/ppm;
        else           newMM=startPosMM+(cl.clientX-startClient)/ppm;
        newMM=Math.max(0,Math.min(newMM,type==="h"?csMM.h:csMM.w));
        setGuides(g=>g.map(gd=>gd.id!==id?gd:{...gd,posMM:newMM}));
        return;
      }
      // 사진 리사이즈
      if(rDrag.current){
        const {id,startW,startH,startCX,startCY}=rDrag.current;
        const aspect=startW/startH;
        const dxMM=(cl.clientX-startCX)/ppm, dyMM=(cl.clientY-startCY)/ppm;
        const delta=(Math.abs(dxMM)>Math.abs(dyMM)?dxMM:dyMM);
        const newW=Math.max(8,startW+delta);
        const newH=newW/aspect;
        setPhotos(p=>p.map(ph=>{
          if(ph.id!==id) return ph;
          return {...ph,wMM:newW,hMM:newH};
        }));
        return;
      }
      // 이미지 리사이즈
      if(iResize.current){
        const {id,startW,startH,startCX,startCY,aspect}=iResize.current;
        const dxMM=(cl.clientX-startCX)/ppm;
        const newW=Math.max(5,startW+dxMM);
        const newH=newW/aspect;
        setImages(p=>p.map(im=>im.id!==id?im:{...im,wMM:newW,hMM:newH}));
        return;
      }
      // 이미지 엣지 리사이즈 (4면, 비율 무관)
      if(iEdgeDrag.current){
        const {id,edge,startW,startH,startX,startY,startXMM,startYMM}=iEdgeDrag.current;
        const dxMM=(cl.clientX-startX)/ppm;
        const dyMM=(cl.clientY-startY)/ppm;
        setImages(p=>p.map(im=>{
          if(im.id!==id) return im;
          let {wMM,hMM,xMM,yMM}={wMM:startW,hMM:startH,xMM:startXMM,yMM:startYMM};
          if(edge==='right')  { wMM=Math.max(3,startW+dxMM); }
          if(edge==='left')   { const nw=Math.max(3,startW-dxMM); xMM=startXMM+startW-nw; wMM=nw; }
          if(edge==='bottom') { hMM=Math.max(3,startH+dyMM); }
          if(edge==='top')    { const nh=Math.max(3,startH-dyMM); yMM=startYMM+startH-nh; hMM=nh; }
          return {...im,wMM,hMM,xMM,yMM};
        }));
        return;
      }
      // 아이콘 회전
      if(iconRotate.current){
        const {id,cx,cy,startAngle,startRotate}=iconRotate.current;
        const cur=Math.atan2(cl.clientY-cy,cl.clientX-cx)*180/Math.PI;
        let d=cur-startAngle; if(d>180)d-=360; if(d<-180)d+=360;
        setIcons(p=>p.map(ic=>ic.id!==id?ic:{...ic,rotate:(startRotate||0)+d}));
        return;
      }
      // 아이콘 리사이즈
      if(iconResize.current){
        const {id,startSz,startCX,startCY}=iconResize.current;
        const d=(cl.clientX-startCX+cl.clientY-startCY)/2;
        setIcons(p=>p.map(ic=>ic.id!==id?ic:{...ic,sizeMM:Math.max(3,startSz+d/BASE)}));
        return;
      }
      // 사진 회전
      if(phRotate.current){
        const {id,cx,cy,startAngle,startRotate}=phRotate.current;
        const cur=Math.atan2(cl.clientY-cy,cl.clientX-cx)*180/Math.PI;
        let dv=cur-startAngle; if(dv>180)dv-=360; if(dv<-180)dv+=360;
        setPhotos(p=>p.map(ph=>ph.id!==id?ph:{...ph,rotate:(startRotate||0)+dv}));
        return;
      }
      // 도형 회전
      if(shRotate.current){
        const {id,cx,cy,startAngle,startRotate}=shRotate.current;
        const cur=Math.atan2(cl.clientY-cy,cl.clientX-cx)*180/Math.PI;
        let d=cur-startAngle; if(d>180)d-=360; if(d<-180)d+=360;
        setShapes(p=>p.map(sh=>sh.id!==id?sh:{...sh,rotate:(startRotate||0)+d}));
        return;
      }
      // 도형 리사이즈
      if(sResize.current){
        const {id,startW,startH,startCX,startCY}=sResize.current;
        const dxMM=(cl.clientX-startCX)/ppm, dyMM=(cl.clientY-startCY)/ppm;
        setShapes(p=>p.map(sh=>sh.id!==id?sh:{...sh,wMM:Math.max(5,startW+dxMM),hMM:Math.max(5,startH+dyMM)}));
        return;
      }
      // 요소 드래그
      if(eDrag.current){
        const {id,type,startXMM,startYMM,startCX,startCY}=eDrag.current;
        const dxPx=cl.clientX-startCX, dyPx=cl.clientY-startCY;
        // 4px 이상 움직여야 드래그 시작 (클릭 오인식 방지)
        if(!eDrag.current.moved){
          if(Math.abs(dxPx)<4&&Math.abs(dyPx)<4) return;
          eDrag.current.moved=true;
          e.preventDefault?.();
        }
        const xMM=startXMM+dxPx/ppm;
        const yMM=startYMM+dyPx/ppm;
        // 스냅 — 좌/우 엣지, 상/하 엣지만 체크 (센터 제외)
        let sx=xMM, sy=yMM;
        if(rSnapEnabled.current){
          const {wMM:ew=0,hMM:eh=0}=eDrag.current;
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
        if(type==="text") setTexts(p=>p.map(t=>t.id!==id?t:{...t,xMM:sx,yMM:sy}));
        else if(type==="photo") setPhotos(p=>p.map(ph=>ph.id!==id?ph:{...ph,xMM:sx,yMM:sy}));
        else if(type==="image") setImages(p=>p.map(im=>im.id!==id?im:{...im,xMM:sx,yMM:sy}));
        else if(type==="shape") setShapes(p=>p.map(sh=>sh.id!==id?sh:{...sh,xMM:sx,yMM:sy}));
        else if(type==="icon") setIcons(p=>p.map(ic=>ic.id!==id?ic:{...ic,xMM:sx,yMM:sy}));
      }
    };
    const onUp=()=>{
      eDrag.current=null; rDrag.current=null; iResize.current=null;
      iRotate.current=null; tRotate.current=null; tResize.current=null; sResize.current=null; shRotate.current=null; iconRotate.current=null; iconResize.current=null; gDrag.current=null; phRotate.current=null; iEdgeDrag.current=null;
    };
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

  /* ── 키보드 Delete ── */
  useEffect(()=>{
    const k=e=>{
      if(editing) return;
      const tag=e.target?.tagName?.toLowerCase();
      if(tag==="input"||tag==="textarea") return;
      if((e.key==="Delete"||e.key==="Backspace")&&sel){
        setTexts(p=>p.filter(t=>t.id!==sel));
        setPhotos(p=>p.filter(ph=>ph.id!==sel));
        setImages(p=>p.filter(im=>im.id!==sel));
        setShapes(p=>p.filter(sh=>sh.id!==sel));
        setIcons(p=>p.filter(ic=>ic.id!==sel));
        setGuides(p=>p.filter(g=>g.id!==sel));
        removeLayer(sel);
        setSel(null);
      }
    };
    window.addEventListener("keydown",k);
    return()=>window.removeEventListener("keydown",k);
  },[sel,editing]);

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
    eDrag.current={id,type,startXMM:elem.xMM,startYMM:elem.yMM,startCX:cl.clientX,startCY:cl.clientY,wMM,hMM};
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
    const cutW = cardW - MAR * 2;
    const cutH = cardH - MAR * 2;
    const CW   = Math.round(cutW * ppm);
    const CH   = Math.round(cutH * ppm);
    const P    = mm => (mm - MAR) * ppm;      // 재단 기준 좌표
    const FSC  = ppm / BASE;                   // 폰트 크기 스케일 (scale/zoom 무관)

    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d');
    // 재단선 영역만 클립
    ctx.beginPath();
    ctx.rect(0, 0, CW, CH);
    ctx.clip();
    ctx.fillStyle = cardBg || '#fff';
    ctx.fillRect(0, 0, CW, CH);

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
        ctx.translate(P(im.xMM)+P(im.wMM)/2, P(im.yMM)+P(im.hMM)/2);
        ctx.rotate((im.rotate||0)*Math.PI/180);
        if(im.flipX) ctx.scale(-1,1);
        ctx.drawImage(img,-P(im.wMM)/2,-P(im.hMM)/2,P(im.wMM),P(im.hMM));
        ctx.restore();
      }

      else if(layer.type==='shape'){
        const sh = shapes.find(s=>s.id===layer.id);
        if(!sh) continue;
        const hw=P(sh.wMM)/2, hh=P(sh.hMM)/2;
        ctx.save();
        ctx.translate(P(sh.xMM)+hw, P(sh.yMM)+hh);
        if(sh.flipX) ctx.scale(-1,1);
        ctx.rotate((sh.rotate||0)*Math.PI/180);
        ctx.fillStyle = sh.fill||'#ccc';
        if(sh.type==='circle'){
          ctx.beginPath(); ctx.ellipse(0,0,hw,hh,0,0,Math.PI*2); ctx.fill();
        } else if(sh.type==='triangle'){
          ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(hw,hh); ctx.lineTo(-hw,hh); ctx.closePath(); ctx.fill();
        } else {
          const r=Math.min(sh.radius||0,hw,hh);
          ctx.beginPath();
          ctx.moveTo(-hw+r,-hh); ctx.lineTo(hw-r,-hh); ctx.arcTo(hw,-hh,hw,-hh+r,r);
          ctx.lineTo(hw,hh-r);  ctx.arcTo(hw,hh,hw-r,hh,r);
          ctx.lineTo(-hw+r,hh); ctx.arcTo(-hw,hh,-hw,hh-r,r);
          ctx.lineTo(-hw,-hh+r);ctx.arcTo(-hw,-hh,-hw+r,-hh,r);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }

      else if(layer.type==='photo'){
        const ph = photos.find(p=>p.id===layer.id);
        if(!ph?.src) continue;
        const img = await loadImg(ph.src);
        if(!img) continue;
        const hw=P(ph.wMM)/2, hh=P(ph.hMM)/2;
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
        ctx.drawImage(img,-hw,-hh,P(ph.wMM),P(ph.hMM));
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
        ctx.translate(P(t.xMM), P(t.yMM));
        ctx.rotate((t.rotate||0)*Math.PI/180);
        if(t.flipX) ctx.scale(-1,1);
        ctx.font         = `${sty} ${wgt} ${fs}px "${fam}",sans-serif`;
        ctx.fillStyle    = t.color || '#000';
        ctx.textBaseline = 'top';
        if(t.strokeW && t.strokeW>0){
          ctx.lineWidth   = t.strokeW * 2;
          ctx.strokeStyle = t.strokeColor || '#000';
          ctx.lineJoin    = 'round';
          ctx.strokeText(t.text, 0, 0);
        }
        ctx.fillText(t.text, 0, 0);
        if(t.underline || t.strike){
          const w = ctx.measureText(t.text).width;
          ctx.fillRect(0, t.underline ? fs*1.1 : fs*0.55, w, Math.max(1, fs*0.07));
        }
        ctx.restore();
      }

      else if(layer.type==='icon'){
        const ic = icons.find(i=>i.id===layer.id);
        if(!ic) continue;
        const isz = P(ic.sizeMM);
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

    canvas.toBlob(blob => {
      if(!blob) return;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = 'card.png';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
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
    setPhotos(p=>[...p,{id,xMM:MAR,yMM:MAR,wMM:PW,hMM:PH,src:null,imgX:0,imgY:0,imgScale:1,shape:"rect"}]);
    addLayer(id,"photo");
  };

  const addImage=()=>imgFileRef.current?.click();
  const addShape=(type)=>{
    const id=uid();
    setSel(id);
    const fill=type==="rect"?"#eb6100":type==="circle"?"#097c25":"#3498db";
    setShapes(p=>[...p,{id,type,xMM:cs.w/2-10,yMM:cs.h/2-10,wMM:20,hMM:20,fill,stroke:"none",strokeW:0,opacity:1}]);
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
  },[sel,cardW,cardH,shapes,photos,images,icons,texts]);

  // ── 빈 템플릿 ──
  const applyBlankTemplate=()=>{
    setTexts([]);setPhotos([]);setImages([]);setShapes([]);setIcons([]);
    setLayers([]);setSel(null);setEditing(null);
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
        setCropModal({photoId:phId,img:url,src:url,shape:ph.shape,wMM:ph.wMM,hMM:ph.hMM});
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
        <span>Copyright 2026. MUJIMUJI Options Editor All rights reserved. &nbsp;|&nbsp; 본 서비스(에디터)의 무단 복제, 수정 및 배포를 금지합니다.</span>
        <span>문의 및 버그 제보 Mail : <a href="mailto:mujimuji.purity012@aleeas.com" style={{color:"#708090",textDecoration:"none"}}>mujimuji.purity012@aleeas.com</a></span>
      </div>
      <div style={{position:"sticky",top:0,zIndex:200,marginRight:220,background:"#708090"}}>
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
        <Btn onClick={()=>addShape("rect")}>＋ <svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><rect x="1" y="1" width="12" height="12" rx="1" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("circle")}>＋ <svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><ellipse cx="7" cy="7" rx="6" ry="6" fill="currentColor"/></svg></Btn>
        <Btn onClick={()=>addShape("triangle")}>＋ <svg width="11" height="11" viewBox="0 0 14 14" style={{display:"inline",verticalAlign:"middle"}}><polygon points="7,1 13,13 1,13" fill="currentColor"/></svg></Btn>
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
          {sSh.type==="rect"&&<>
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
          <AlignBtns/>
        </div>
      )}
      </div>{/* sticky 끝 */}
      <div style={{flex:1,display:"flex",flexDirection:"row",overflow:"hidden",background:"#ecf0f1",marginRight:220}}>

        {/* 자 + 카드 영역 */}
        <div onMouseDown={e=>{if(e.target===e.currentTarget){setSel(null);setEditing(null);setSelGuide(null);setShowIconPicker(false);}}} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",
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
          <div style={{position:"relative",display:"inline-block",flexShrink:0,verticalAlign:"top"}}>
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
                gDrag.current={id,type:"h",startPosMM:posMM,startClient:e.clientY};
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
                gDrag.current={id,type:"v",startPosMM:posMM,startClient:e.clientX};
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
                overflow:"hidden",cursor:"default",flexShrink:0,
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
                    setSelGuide(g.id); setSel(g.id);
                    gDrag.current={id:g.id,type:g.type,startPosMM:g.posMM,
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
                const shapeEl=()=>{
                  if(sh.type==="circle") return(
                    <svg width={sw} height={shh} style={{display:"block",pointerEvents:"none"}}>
                      <ellipse cx={sw/2} cy={shh/2} rx={sw/2} ry={shh/2} fill={sh.fill} stroke={sh.stroke==="none"?"none":sh.stroke} strokeWidth={sh.strokeW||0}/>
                    </svg>
                  );
                  if(sh.type==="triangle") return(
                    <svg width={sw} height={shh} style={{display:"block",pointerEvents:"none"}}>
                      <polygon points={`${sw/2},0 ${sw},${shh} 0,${shh}`} fill={sh.fill} stroke={sh.stroke==="none"?"none":sh.stroke} strokeWidth={sh.strokeW||0}/>
                    </svg>
                  );
                  return(
                    <svg width={sw} height={shh} style={{display:"block",pointerEvents:"none"}}>
                      <rect x={0} y={0} width={sw} height={shh} rx={sh.radius||0} ry={sh.radius||0} fill={sh.fill} stroke={sh.stroke==="none"?"none":sh.stroke} strokeWidth={sh.strokeW||0}/>
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
                      onMouseDown={e=>startElem(e,im.id,"image")}
                      onClick={e=>{setSel(im.id);e.stopPropagation();}}
                      style={{position:"absolute",left:ix,top:iy,width:iw,height:ih,
                        outline:isSel?"2px solid #e67e22":"none",
                        cursor:isLocked(im.id)?"default":"move",zIndex:zIdx(im.id),boxSizing:"border-box",pointerEvents:isVisible(im.id)?"auto":"none",
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
                    onMouseDown={e=>startElem(e,ph.id,"photo")}
                    onClick={e=>{if(isLocked(ph.id))return;setSel(ph.id);e.stopPropagation();}}
                    onDoubleClick={e=>{if(isLocked(ph.id))return;e.stopPropagation();if(ph.src)openCropModal(ph);else document.getElementById(inputId)?.click();}}
                    style={{position:"absolute",left:P(ph.xMM),top:P(ph.yMM),
                      width:P(ph.wMM),height:P(ph.hMM),
                      cursor:"move",overflow:"hidden",boxSizing:"border-box",
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
                    onMouseDown={e=>startElem(e,ic.id,"icon")}
                    onClick={e=>{setSel(ic.id);e.stopPropagation();}}
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
                    style={{position:"absolute",left:P(t.xMM),top:P(t.yMM),zIndex:zIdx(t.id),pointerEvents:isVisible(t.id)?"auto":"none",
                      cursor:isLocked(t.id)?"default":isEditing?"text":"move",
                      outline:sel===t.id&&!isEditing&&!isLocked(t.id)?"1.5px dashed #2980b9":"none",
                      background:sel===t.id&&!isEditing&&!isLocked(t.id)?"rgba(41,128,185,.05)":"transparent",
                      padding:"1px 3px",lineHeight:1.4,
                      transform:`rotate(${rot}deg) scaleX(${t.flipX?-1:1})`,transformOrigin:"center center"}}>
                    {isEditing?(
                      <input autoFocus
                        defaultValue={t.text}
                        onChange={e=>{upd(t.id,"text",e.target.value);e.target.style.width="1px";e.target.style.width=e.target.scrollWidth+"px";}}
                        onBlur={()=>setEditing(null)}
                        onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape"){e.preventDefault();setEditing(null);}e.stopPropagation();}}
                        onClick={e=>e.stopPropagation()}
                        onMouseDown={e=>e.stopPropagation()}
                        ref={el=>{if(el){el.style.width="1px";el.style.width=el.scrollWidth+"px";}}}
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
                      phRotate.current={id:ph.id,
                        cx:cr.left+px+pw/2, cy:cr.top+py+ph_h/2,
                        startAngle:Math.atan2(e.clientY-(cr.top+py+ph_h/2),e.clientX-(cr.left+px+pw/2))*180/Math.PI,
                        startRotate:ph.rotate||0};
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
                      rDrag.current={id:ph.id,startW:ph.wMM,startH:ph.hMM,startCX:e.clientX,startCY:e.clientY};}}
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
                      iRotate.current={id:im.id,cx:cr.left+ix+iw/2,cy:cr.top+iy+ih/2,
                        startAngle:Math.atan2(e.clientY-(cr.top+iy+ih/2),e.clientX-(cr.left+ix+iw/2))*180/Math.PI,
                        startRotate:im.rotate||0};
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
                      iResize.current={id:im.id,startW:im.wMM,startH:im.hMM,startCX:e.clientX,startCY:e.clientY,aspect:im.aspect};
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
                            iEdgeDrag.current={id:im.id,edge,startW:im.wMM,startH:im.hMM,
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
                      shRotate.current={id:sh.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:sh.rotate||0};
                    }}
                    style={{position:"absolute",left:rot2.x,top:rot2.y,width:BTN,height:BTN,
                      background:"#2980b9",borderRadius:"50%",cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{e.stopPropagation();e.preventDefault();
                      sResize.current={id:sh.id,startW:sh.wMM,startH:sh.hMM,startCX:e.clientX,startCY:e.clientY};}}
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
                      iconRotate.current={id:ic.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:ic.rotate||0};
                    }}
                    style={{position:"absolute",left:rot2.x,top:rot2.y,width:BTN,height:BTN,
                      background:"#2980b9",borderRadius:"50%",cursor:"grab",zIndex:30,
                      display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 5px rgba(0,0,0,.35)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </div>
                  <div onMouseDown={e=>{e.stopPropagation();e.preventDefault();
                      iconResize.current={id:ic.id,startSz:ic.sizeMM,startCX:e.clientX,startCY:e.clientY};}}
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

            {/* 텍스트 회전/삭제/리사이즈 핸들 */}
            {texts.filter(t=>sel===t.id&&editing!==t.id).map(t=>{
              const domEl=document.querySelector(`[data-elem-id="${t.id}"]`);
              let tw,th;
              if(domEl){tw=domEl.offsetWidth;th=domEl.offsetHeight;}
              else{tw=t.text.length*t.fs*FSC*0.6+6;th=t.fs*FSC*1.4+2;}
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
                      tRotate.current={id:t.id,cx:acx,cy:acy,
                        startAngle:Math.atan2(e.clientY-acy,e.clientX-acx)*180/Math.PI,
                        startRotate:t.rotate||0};
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
                      tResize.current={id:t.id,startFs:t.fs,startCY:e.clientY,startCX:e.clientX};
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

          {/* 줌 컨트롤 */}
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:8,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={zOut} disabled={zoom<=ZMIN}
              style={{width:28,height:28,background:"rgba(0,0,0,.08)",border:"1px solid rgba(0,0,0,.15)",
                color:zoom<=ZMIN?"#bdc3c7":"#5d6d7e",borderRadius:5,cursor:zoom<=ZMIN?"not-allowed":"pointer",
                fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300}}>−</button>
            <div style={{display:"flex",alignItems:"center",background:"#fff",border:"1px solid #bdc3c7",
              borderRadius:5,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.07)"}}>
              <input value={zInput} onChange={e=>setZInput(e.target.value)}
                onBlur={onZCommit}
                onKeyDown={e=>{if(e.key==="Enter")onZCommit();if(e.key==="Escape")setZInput(String(Math.round(zoom*100)));}}
                style={{width:44,height:28,border:"none",outline:"none",textAlign:"right",
                  fontSize:13,fontWeight:600,color:"#2c3e50",padding:"0 2px 0 6px",background:"transparent"}}/>
              <span style={{fontSize:12,color:"#95a5a6",paddingRight:7,paddingLeft:1,fontWeight:500}}>%</span>
            </div>
            <button onClick={zIn} disabled={zoom>=ZMAX}
              style={{width:28,height:28,background:"rgba(0,0,0,.08)",border:"1px solid rgba(0,0,0,.15)",
                color:zoom>=ZMAX?"#bdc3c7":"#5d6d7e",borderRadius:5,cursor:zoom>=ZMAX?"not-allowed":"pointer",
                fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300}}>＋</button>
            <button onClick={()=>applyZoom(1)}
              style={{padding:"4px 10px",background:"rgba(0,0,0,.08)",border:"1px solid rgba(0,0,0,.15)",
                color:"#5d6d7e",borderRadius:5,cursor:"pointer",fontSize:13}}>100%</button>

            <div style={{width:1,height:20,background:"rgba(0,0,0,.15)",margin:"0 4px"}}/>

            {/* 격자/스냅/재단선 컨트롤 */}
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
          sel={sel} setSel={setSel}
          editBarActive={!!(sT||sSh||sIcon)} pickerActive={showIconPicker}
          onDelete={(id)=>{
            setTexts(p=>p.filter(t=>t.id!==id));
            setPhotos(p=>p.filter(p=>p.id!==id));
            setImages(p=>p.filter(i=>i.id!==id));
            setShapes(p=>p.filter(s=>s.id!==id));
            setIcons(p=>p.filter(i=>i.id!==id));
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
          scale={scale} cardBg={cardBg} cardW={cardW} cardH={cardH} onClose={()=>setShowPreview(false)}
        />
      )}

    </div>
  );
}

/* ════ 미리보기 모달 ════ */
function PreviewModal({orient,photos,texts,images,shapes=[],icons=[],scale,cardBg="#fff",onClose,cardW,cardH}){
  const cs={w:cardW||CARD[orient].w, h:cardH||CARD[orient].h};
  const maxW=Math.min(window.innerWidth*0.82,700);
  const maxH=window.innerHeight*0.80;
  const ppm=Math.min(maxW/cs.w,maxH/cs.h);
  const CW=cs.w*ppm, CH=cs.h*ppm;
  const P=mm=>mm*ppm;
  const MAR_=MAR*ppm;
  const FSC=scale*(ppm/BASE);
  return(
    <div onClick={onClose}
      style={{position:"fixed",inset:0,zIndex:1000,
        background:"repeating-conic-gradient(#555 0% 25%,#333 0% 50%) 0 0/20px 20px",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
      <div style={{color:"rgba(255,255,255,.6)",fontSize:12}}>클릭하여 닫기</div>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",width:CW,height:CH,background:cardBg,
          boxShadow:"0 8px 40px rgba(0,0,0,.5)",borderRadius:2,overflow:"hidden"}}>
        {images.map(im=>(
          <div key={im.id} style={{position:"absolute",left:P(im.xMM),top:P(im.yMM),
            width:P(im.wMM),height:P(im.hMM),
            transform:`rotate(${im.rotate||0}deg)`,transformOrigin:"center center",overflow:"hidden"}}>
            <img src={im.src} alt="" draggable={false}
              style={{width:"100%",height:"100%",objectFit:"fill",display:"block"}}/>
          </div>
        ))}
        {shapes.map(sh=>{
          const sx=P(sh.xMM),sy=P(sh.yMM),sw=P(sh.wMM),shh=P(sh.hMM);
          if(sh.type==="circle") return(
            <svg key={sh.id} style={{position:"absolute",left:sx,top:sy,width:sw,height:shh,display:"block"}}>
              <ellipse cx={sw/2} cy={shh/2} rx={sw/2} ry={shh/2} fill={sh.fill}/>
            </svg>
          );
          if(sh.type==="triangle") return(
            <svg key={sh.id} style={{position:"absolute",left:sx,top:sy,width:sw,height:shh,display:"block"}}>
              <polygon points={`${sw/2},0 ${sw},${shh} 0,${shh}`} fill={sh.fill}/>
            </svg>
          );
          return(
            <svg key={sh.id} style={{position:"absolute",left:sx,top:sy,width:sw,height:shh,display:"block"}}>
              <rect x={0} y={0} width={sw} height={shh} rx={sh.radius||0} ry={sh.radius||0} fill={sh.fill}/>
            </svg>
          );
        })}
        {photos.filter(ph=>ph.src).map(ph=>{
          return(
            <div key={ph.id} style={{position:"absolute",left:P(ph.xMM),top:P(ph.yMM),
              width:P(ph.wMM),height:P(ph.hMM),overflow:"hidden",
              clipPath:ph.shape==="circle"?"ellipse(50% 50% at 50% 50%)":"none",
              borderRadius:ph.shape==="circle"?"0":`${ph.radius||0}px`}}>
              <img src={ph.src} draggable={false} alt=""
                style={{width:"100%",height:"100%",objectFit:"fill",display:"block"}}/>
            </div>
          );
        })}
        {texts.map(t=>{
          const tdec=[t.strike?"line-through":"",t.underline?"underline":""].filter(Boolean).join(" ")||"none";
          return(
            <div key={t.id} style={{position:"absolute",left:P(t.xMM),top:P(t.yMM),
              fontSize:t.fs*FSC,color:t.color,
              fontWeight:t.bold?"700":"400",fontStyle:t.italic?"italic":"normal",
              textDecoration:tdec,fontFamily:t.font||"'Noto Sans KR',sans-serif",whiteSpace:"pre",lineHeight:1.4,pointerEvents:"none",
              transform:`rotate(${t.rotate||0}deg)`,transformOrigin:"center center"}}>
              {t.text}
            </div>
          );
        })}
        {icons.map(ic=>{
          const isz=P(ic.sizeMM);
          return(
            <div key={ic.id} style={{position:"absolute",left:P(ic.xMM),top:P(ic.yMM),
              width:isz,height:isz,display:"flex",alignItems:"center",justifyContent:"center",
              pointerEvents:"none",transform:`rotate(${ic.rotate||0}deg)`,transformOrigin:"center center"}}>
              <IcoSVG type={ic.type} color={ic.color} size={isz*0.8}/>
            </div>
          );
        })}
      </div>
      <div style={{color:"rgba(255,255,255,.45)",fontSize:11}}>재단 영역 {cs.w-4}{"×"}{cs.h-4}mm</div>
    </div>
  );
}


/* ════ 레이어 패널 ════ */
function LayerPanel({layers,setLayers,texts,photos,images,shapes,icons=[],setTexts,setPhotos,setImages,setShapes,setIcons,ppm=BASE,sel,setSel,editBarActive,pickerActive=false,toolbarH=46,copyrightH=32,onDelete}){
  const dragRef=useRef(null);
  const [dragIdx,setDragIdx]=useState(null);
  const [overIdx,setOverIdx]=useState(null);
  const [multiSel,setMultiSel]=useState([]);

  const toggleMulti=(id)=>setMultiSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

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

  const doAlign=(type)=>{
    if(multiSel.length<2) return;
    const boxes=multiSel.map(id=>({id,...getBBox(id)})).filter(b=>b&&b.xMM!==undefined);
    if(boxes.length<2) return;
    const minX=Math.min(...boxes.map(b=>b.xMM));
    const maxX=Math.max(...boxes.map(b=>b.xMM+b.wMM));
    const minY=Math.min(...boxes.map(b=>b.yMM));
    const maxY=Math.max(...boxes.map(b=>b.yMM+b.hMM));
    const midX=(minX+maxX)/2;
    const midY=(minY+maxY)/2;

    // 각 오브젝트의 새 위치 맵 계산
    const posMap={};
    boxes.forEach(b=>{
      let nx=b.xMM, ny=b.yMM;
      if(type==='left')    nx=minX;
      if(type==='right')   nx=maxX-b.wMM;
      if(type==='centerH') nx=midX-b.wMM/2;
      if(type==='top')     ny=minY;
      if(type==='bottom')  ny=maxY-b.hMM;
      if(type==='centerV') ny=midY-b.hMM/2;
      posMap[b.id]={x:nx, y:ny};
    });

    // 각 setter에 한번만 호출 (forEach 대신 전체 배열을 한번에 처리)
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
    if(l.type==="shape"){ const s=shapes.find(s=>s.id===l.id); if(s){return s.type==="circle"?"원형":s.type==="triangle"?"삼각형":"사각형";} return "도형"; }
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
  const onDragStart=(e,revIdx)=>{
    dragRef.current={revIdx};
    setDragIdx(revIdx);
    e.dataTransfer.effectAllowed="move";
  };
  const onDragOver=(e,revIdx)=>{
    e.preventDefault();
    setOverIdx(revIdx);
  };
  const onDrop=(e,revIdx)=>{
    e.preventDefault();
    if(dragRef.current===null) return;
    const fromRevIdx=dragRef.current.revIdx;
    if(fromRevIdx===revIdx){setDragIdx(null);setOverIdx(null);return;}
    // convert reversed idx → actual idx
    const n=layers.length;
    const fromIdx=n-1-fromRevIdx;
    const toIdx=n-1-revIdx;
    setLayers(p=>{
      const arr=[...p];
      const [item]=arr.splice(fromIdx,1);
      arr.splice(toIdx,0,item);
      return arr;
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
      <div style={{padding:'4px 10px 4px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.5)',
        letterSpacing:'.08em',borderBottom:'1px solid rgba(255,255,255,.07)'}}>레이어</div>
      {multiSel.length>=2&&(
        <div style={{padding:'5px 6px',background:'rgba(52,152,219,.12)',borderBottom:'1px solid rgba(52,152,219,.25)',
          display:'flex',flexDirection:'column',gap:4}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,.4)',textAlign:'center',letterSpacing:'.05em'}}>
            {multiSel.length}개 선택됨
          </div>
          <div style={{display:'flex',gap:3,justifyContent:'center'}}>
            {[
              {t:'left',   title:'왼쪽 맞춤',   path:'M4 6h16M4 12h10M4 18h13'},
              {t:'centerH',title:'수평 중앙',    path:'M12 3v18M7 8h10M7 16h10'},
              {t:'right',  title:'오른쪽 맞춤',  path:'M20 6H4M20 12h-10M20 18H7'},
              {t:'top',    title:'위쪽 맞춤',    path:'M6 4h12M12 4v16M8 20h8'},
              {t:'centerV',title:'수직 중앙',    path:'M3 12h18M8 7v10M16 7v10'},
              {t:'bottom', title:'아래쪽 맞춤',  path:'M6 20h12M12 4v16M8 4h8'},
            ].map(({t,title,path})=>(
              <button key={t} onClick={()=>doAlign(t)} title={title}
                style={{width:26,height:26,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',
                  borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,.8)" strokeWidth="2" strokeLinecap="round">
                  <path d={path}/>
                </svg>
              </button>
            ))}
          </div>
          <button onClick={()=>setMultiSel([])}
            style={{fontSize:9,color:'rgba(255,255,255,.35)',background:'none',border:'none',cursor:'pointer',padding:'1px 0'}}>
            선택 해제
          </button>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto"}}>
        {reversed.map((l,revIdx)=>{
          const isSel=sel===l.id;
          const isDrag=dragIdx===revIdx;
          const isOver=overIdx===revIdx&&dragIdx!==revIdx;
          return(
            <div key={l.id}
              draggable
              onDragStart={e=>onDragStart(e,revIdx)}
              onDragOver={e=>onDragOver(e,revIdx)}
              onDrop={e=>onDrop(e,revIdx)}
              onDragEnd={onDragEnd}
              onClick={()=>{if(!l.locked)setSel(l.id);}}
              style={{display:"flex",alignItems:"center",gap:6,
                padding:"5px 8px",
                background:isSel?"rgba(52,152,219,.25)":isDrag?"rgba(255,255,255,.04)":"transparent",
                borderTop:isOver?"2px solid #3498db":"2px solid transparent",
                cursor:l.locked?"default":"pointer",
                opacity:l.visible?1:0.45,
                transition:"background .1s"}}>
              {/* 체크박스 */}
              <div onClick={e=>{e.stopPropagation();toggleMulti(l.id);}}
                title="다중 선택"
                style={{flexShrink:0,width:14,height:14,border:`1.5px solid ${multiSel.includes(l.id)?'#3498db':'rgba(255,255,255,.2)'}`,
                  borderRadius:3,background:multiSel.includes(l.id)?'#3498db':'transparent',
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {multiSel.includes(l.id)&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5,5 4,7.5 8.5,2.5"/></svg>}
              </div>
              {/* 눈 아이콘 */}
              <div onClick={e=>{e.stopPropagation();toggleVisible(l.id);}}
                title={l.visible?"숨기기":"보이기"}
                style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",
                  justifyContent:"center",cursor:"pointer",borderRadius:3,
                  color:l.visible?"rgba(255,255,255,.8)":"rgba(255,255,255,.25)"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {l.visible
                    ?<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    :<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  }
                </svg>
              </div>
              {/* 썸네일 */}
              <div style={{flexShrink:0,width:28,height:28,background:"rgba(255,255,255,.08)",
                borderRadius:3,overflow:"hidden",display:"flex",alignItems:"center",
                justifyContent:"center",border:isSel?"1px solid #3498db":"1px solid transparent"}}>
                {getThumb(l)}
              </div>
              {/* 이름 */}
              <div style={{flex:1,fontSize:11,color:isSel?"#fff":"rgba(255,255,255,.75)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {getLabel(l)}
              </div>
              {/* 위/아래 이동 */}
              <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0}}>
                <div onClick={e=>{e.stopPropagation();moveLayer(l.id,'up');}}
                  title="위로"
                  style={{width:16,height:13,display:"flex",alignItems:"center",justifyContent:"center",
                    cursor:"pointer",borderRadius:2,color:"rgba(255,255,255,.3)",transition:"color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                  onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.3)"}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,7 5,3 8,7"/>
                  </svg>
                </div>
                <div onClick={e=>{e.stopPropagation();moveLayer(l.id,'down');}}
                  title="아래로"
                  style={{width:16,height:13,display:"flex",alignItems:"center",justifyContent:"center",
                    cursor:"pointer",borderRadius:2,color:"rgba(255,255,255,.3)",transition:"color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#fff"}
                  onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.3)"}>
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2,3 5,7 8,3"/>
                  </svg>
                </div>
              </div>
              {/* 잠금 아이콘 */}
              <div onClick={e=>{e.stopPropagation();toggleLocked(l.id);if(!l.locked&&setSel)setSel(s=>s===l.id?null:s);}}
                title={l.locked?"잠금 해제":"잠금"}
                style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",
                  justifyContent:"center",cursor:"pointer",borderRadius:3,
                  color:l.locked?"#e74c3c":"rgba(255,255,255,.2)"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {l.locked
                    ?<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                    :<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>
                  }
                </svg>
              </div>
              {/* 휴지통 */}
              <div onClick={e=>{e.stopPropagation();onDelete&&onDelete(l.id);}}
                title="삭제"
                style={{flexShrink:0,width:18,height:18,display:"flex",alignItems:"center",
                  justifyContent:"center",cursor:"pointer",borderRadius:3,
                  color:"rgba(255,255,255,.18)",transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color="#e74c3c"}
                onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,.18)"}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════ 크롭 모달 ════ */
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

    // 사진 그리기
    ctx.save();
    ctx.translate(SIZE/2,SIZE/2);
    ctx.rotate(v.current.rot*Math.PI/180);
    ctx.scale(v.current.scale,v.current.scale);
    ctx.drawImage(imgEl,-imgEl.width/2+v.current.ox,-imgEl.height/2+v.current.oy);
    ctx.restore();

    // 크롭 영역 외부 어둡게
    ctx.fillStyle="rgba(0,0,0,.55)";
    ctx.fillRect(0,0,SIZE,SIZE);

    // 크롭 영역 원본 사진으로 복구 (destination-out → 다시 그리기)
    ctx.save();
    ctx.globalCompositeOperation="destination-out";
    if(shape==="circle"){
      ctx.beginPath();
      ctx.ellipse(SIZE/2,SIZE/2,bw/2,bh/2,0,0,Math.PI*2);
      ctx.fill();
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
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(bx,by,bw,bh);
      }
    }
    ctx.restore();

    // 사진 다시 크롭 영역에만 그리기
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

    // 테두리
    ctx.strokeStyle="rgba(255,255,255,.8)"; ctx.lineWidth=1.5;
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
  },[img,shape,wMM,hMM,radius]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const imgEl=new window.Image(); imgEl.src=img;
    imgEl.onload=()=>drawBase(ctx,imgEl,true,radius);
  },[img,drawBase]);

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
          <div style={{display:"flex",alignItems:"center",gap:6,width:"100%"}}>
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

        {/* 4. 캔버스 */}
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{borderRadius:6,cursor:"move",background:"#1a252f",width:SIZE,height:SIZE}}
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

export default function App(){
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <CardEditor
      key={resetKey}
      onReset={()=>setResetKey(k=>k+1)}
    />
  );
}
