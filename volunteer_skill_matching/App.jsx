import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  bg:        "#03070F",
  bgCard:    "rgba(10,18,40,0.75)",
  bgInput:   "rgba(6,12,28,0.85)",
  blue:      "#4F9CF9",
  blueDim:   "rgba(79,156,249,0.12)",
  blueBorder:"rgba(79,156,249,0.22)",
  purple:    "#8B5CF6",
  purpleDim: "rgba(139,92,246,0.12)",
  emerald:   "#10B981",
  emeraldDim:"rgba(16,185,129,0.12)",
  amber:     "#F59E0B",
  red:       "#EF4444",
  text:      "#F0F6FF",
  muted:     "#94A3B8",
  faint:     "#334155",
};

const URGENCY = {
  low:      { color: C.emerald, bg: C.emeraldDim, label: "LOW",      dot: "#10B981" },
  medium:   { color: C.amber,   bg: "rgba(245,158,11,0.12)", label: "MEDIUM",  dot: "#F59E0B" },
  high:     { color: "#F97316", bg: "rgba(249,115,22,0.12)",  label: "HIGH",    dot: "#F97316" },
  critical: { color: C.red,     bg: "rgba(239,68,68,0.12)",   label: "CRITICAL",dot: "#EF4444" },
};

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #03070F; font-family: 'Inter', sans-serif; color: #F0F6FF; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #03070F; }
  ::-webkit-scrollbar-thumb { background: rgba(79,156,249,0.35); border-radius: 3px; }
  input, textarea, select, button { font-family: 'Inter', sans-serif; }
  input:focus, textarea:focus, select:focus { outline: none; }
  button { cursor: pointer; }
  textarea { resize: vertical; }

  @keyframes orb1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(80px,-60px) scale(1.15); }
    66%      { transform: translate(-40px,80px) scale(0.9); }
  }
  @keyframes orb2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%      { transform: translate(-90px,60px) scale(1.2); }
    70%      { transform: translate(60px,-80px) scale(0.85); }
  }
  @keyframes orb3 {
    0%,100% { transform: translate(0,0) scale(1); }
    30%      { transform: translate(50px,90px) scale(1.1); }
    60%      { transform: translate(-70px,-50px) scale(0.95); }
  }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes scalePop { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  @keyframes spin     { to   { transform: rotate(360deg); } }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 18px rgba(79,156,249,0.25)} 50%{box-shadow:0 0 40px rgba(79,156,249,0.55)} }
  @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes bar      { from{width:0} to{width:var(--w)} }
  @keyframes typeOn   { from{width:0} to{width:100%} }
  @keyframes blink    { 50%{border-color:transparent} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes scanLine { 0%{top:0%} 100%{top:100%} }
  @keyframes neonPulse{ 0%,100%{text-shadow:0 0 8px rgba(79,156,249,0.8),0 0 20px rgba(79,156,249,0.4)} 50%{text-shadow:0 0 16px rgba(79,156,249,1),0 0 40px rgba(79,156,249,0.7)} }

  .vol-card:hover  { transform:translateY(-3px); border-color: rgba(79,156,249,0.4) !important; box-shadow: 0 12px 40px rgba(79,156,249,0.12) !important; }
  .cri-card:hover  { transform:translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important; }
  .nav-btn:hover   { background: rgba(79,156,249,0.12) !important; color: #4F9CF9 !important; }
  .match-card:hover{ transform:translateY(-2px); box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important; }
  .form-input:focus { border-color: rgba(79,156,249,0.55) !important; box-shadow: 0 0 0 3px rgba(79,156,249,0.1) !important; background: rgba(8,16,36,0.95) !important; }
  .seed-btn:hover  { box-shadow: 0 0 30px rgba(16,185,129,0.5) !important; transform:translateY(-2px) !important; }
  .run-btn:hover   { box-shadow: 0 0 40px rgba(79,156,249,0.6) !important; transform:translateY(-2px) !important; }
  .skeleton        { background: linear-gradient(90deg, #0d1a2e 25%, #162035 50%, #0d1a2e 75%); background-size: 400px 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
  .tag-skill       { background: rgba(79,156,249,0.12); color:#4F9CF9; border:1px solid rgba(79,156,249,0.25); }
  .tag-lang        { background: rgba(139,92,246,0.12); color:#8B5CF6; border:1px solid rgba(139,92,246,0.25); }
  .tag-avail       { background: rgba(16,185,129,0.12); color:#10B981; border:1px solid rgba(16,185,129,0.25); }
  .tag-need        { background: rgba(245,158,11,0.12); color:#F59E0B; border:1px solid rgba(245,158,11,0.25); }
  .vol-card, .cri-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .match-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const initials = name => name ? name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2) : "?";
const avatarColor = name => {
  const colors = ["#4F9CF9","#8B5CF6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899"];
  let h = 0; for(const c of (name||"")) h = c.charCodeAt(0) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
};
const Tag = ({text, cls}) => (
  <span className={cls} style={{padding:"3px 10px",borderRadius:"6px",fontSize:"0.72rem",fontWeight:600,letterSpacing:"0.03em",whiteSpace:"nowrap"}}>{text}</span>
);

// ─── BACKGROUND ORBS ─────────────────────────────────────────────────────────
const Background = () => (
  <div style={{position:"fixed",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
    <div style={{position:"absolute",top:"10%",left:"15%",width:"500px",height:"500px",background:"radial-gradient(circle,rgba(79,156,249,0.07) 0%,transparent 70%)",animation:"orb1 18s ease-in-out infinite",borderRadius:"50%"}}/>
    <div style={{position:"absolute",top:"55%",right:"10%",width:"420px",height:"420px",background:"radial-gradient(circle,rgba(139,92,246,0.065) 0%,transparent 70%)",animation:"orb2 22s ease-in-out infinite",borderRadius:"50%"}}/>
    <div style={{position:"absolute",bottom:"5%",left:"40%",width:"380px",height:"380px",background:"radial-gradient(circle,rgba(16,185,129,0.055) 0%,transparent 70%)",animation:"orb3 26s ease-in-out infinite",borderRadius:"50%"}}/>
    {/* Grid overlay */}
    <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(79,156,249,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,156,249,0.03) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
  </div>
);

// ─── NOTIFICATION ─────────────────────────────────────────────────────────────
const Notification = ({n}) => n ? (
  <div style={{position:"fixed",top:"76px",right:"24px",zIndex:9999,padding:"14px 20px",borderRadius:"14px",fontSize:"0.875rem",fontWeight:500,maxWidth:"400px",animation:"slideIn 0.3s ease",backdropFilter:"blur(20px)",border:`1px solid ${n.type==="error"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.3)"}`,background:n.type==="error"?"rgba(239,68,68,0.15)":"rgba(16,185,129,0.15)",color:n.type==="error"?"#FCA5A5":"#6EE7B7",boxShadow:`0 8px 32px ${n.type==="error"?"rgba(239,68,68,0.15)":"rgba(16,185,129,0.15)"}`}}>
    {n.msg}
  </div>
) : null;

// ─── SPINNER ──────────────────────────────────────────────────────────────────
const Spinner = ({size=18,color="#fff"}) => (
  <div style={{width:size,height:size,border:`2px solid rgba(255,255,255,0.15)`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}}/>
);

// ─── NAV ─────────────────────────────────────────────────────────────────────
const Nav = ({tab,setTab,counts}) => {
  const tabs = [
    {id:"dashboard", icon:"◈", label:"Dashboard"},
    {id:"volunteers",icon:"◉", label:"Volunteers"},
    {id:"crises",    icon:"◎", label:"Crises"},
    {id:"match",     icon:"⬡", label:"Match Engine"},
  ];
  return (
    <nav style={{position:"sticky",top:0,zIndex:100,height:"64px",display:"flex",alignItems:"center",padding:"0 28px",gap:"6px",background:"rgba(3,7,15,0.85)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(79,156,249,0.1)"}}>
      {/* Logo */}
      <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:"34px",height:"34px",background:"linear-gradient(135deg,#4F9CF9,#8B5CF6)",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",boxShadow:"0 0 20px rgba(79,156,249,0.3)",animation:"glow 3s ease infinite"}}>⬡</div>
        <div>
          <div style={{fontWeight:800,fontSize:"0.95rem",letterSpacing:"-0.02em",color:C.text}}>VolunteerMatch</div>
          <div style={{fontSize:"0.65rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em"}}>AI ENGINE v2.0</div>
        </div>
      </div>
      {tabs.map(t => (
        <button key={t.id} className="nav-btn" onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:"7px",padding:"8px 16px",borderRadius:"10px",border:"none",fontSize:"0.84rem",fontWeight:500,transition:"all 0.2s",background:tab===t.id?"rgba(79,156,249,0.15)":"transparent",color:tab===t.id?C.blue:C.muted,position:"relative"}}>
          <span style={{fontSize:"0.9rem"}}>{t.icon}</span>
          {t.label}
          {t.id==="volunteers" && counts.v>0 && <span style={{background:"rgba(79,156,249,0.25)",color:C.blue,fontSize:"0.65rem",fontWeight:700,padding:"1px 7px",borderRadius:"20px"}}>{counts.v}</span>}
          {t.id==="crises"     && counts.c>0 && <span style={{background:"rgba(239,68,68,0.25)",color:C.red,fontSize:"0.65rem",fontWeight:700,padding:"1px 7px",borderRadius:"20px"}}>{counts.c}</span>}
          {tab===t.id && <div style={{position:"absolute",bottom:"-1px",left:"50%",transform:"translateX(-50%)",width:"60%",height:"2px",background:"linear-gradient(90deg,transparent,#4F9CF9,transparent)",borderRadius:"2px"}}/>}
        </button>
      ))}
    </nav>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({icon,label,value,sub,color,delay=0}) => (
  <div style={{background:C.bgCard,border:`1px solid rgba(255,255,255,0.06)`,borderRadius:"18px",padding:"22px 24px",animation:`fadeUp 0.5s ease ${delay}s both`,backdropFilter:"blur(20px)",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:"80px",height:"80px",background:`radial-gradient(circle at top right,${color}18,transparent 70%)`,borderRadius:"0 18px 0 0"}}/>
    <div style={{fontSize:"1.5rem",marginBottom:"10px"}}>{icon}</div>
    <div style={{fontSize:"1.9rem",fontWeight:800,color,letterSpacing:"-0.03em",marginBottom:"4px"}}>{value}</div>
    <div style={{fontSize:"0.78rem",fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
    {sub && <div style={{fontSize:"0.72rem",color:C.faint,marginTop:"4px",fontFamily:"'JetBrains Mono',monospace"}}>{sub}</div>}
  </div>
);

// ─── FLOW STEP ────────────────────────────────────────────────────────────────
const FlowStep = ({n,icon,title,desc,color,last,delay=0}) => (
  <div style={{display:"flex",gap:"16px",animation:`fadeUp 0.5s ease ${delay}s both`}}>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
      <div style={{width:"44px",height:"44px",borderRadius:"14px",background:`linear-gradient(135deg,${color}22,${color}08)`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{icon}</div>
      {!last && <div style={{width:"1px",flex:1,background:`linear-gradient(to bottom,${color}30,transparent)`,margin:"6px 0"}}/>}
    </div>
    <div style={{paddingBottom: last?"0":"20px"}}>
      <div style={{fontSize:"0.65rem",fontFamily:"'JetBrains Mono',monospace",color,fontWeight:700,letterSpacing:"0.1em",marginBottom:"3px"}}>STEP {n.toString().padStart(2,"0")}</div>
      <div style={{fontSize:"0.92rem",fontWeight:700,color:C.text,marginBottom:"5px"}}>{title}</div>
      <div style={{fontSize:"0.8rem",color:C.muted,lineHeight:1.6}}>{desc}</div>
    </div>
  </div>
);

// ─── VOLUNTEER CARD ───────────────────────────────────────────────────────────
const VolCard = ({v,i}) => {
  const ac = avatarColor(v.name);
  return (
    <div className="vol-card" style={{background:C.bgCard,border:"1px solid rgba(79,156,249,0.1)",borderRadius:"16px",padding:"18px",animation:`fadeUp 0.4s ease ${i*0.06}s both`,backdropFilter:"blur(20px)"}}>
      <div style={{display:"flex",gap:"12px",marginBottom:"12px",alignItems:"flex-start"}}>
        <div style={{width:"42px",height:"42px",borderRadius:"12px",background:`linear-gradient(135deg,${ac},${ac}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",fontWeight:800,color:"#fff",flexShrink:0,boxShadow:`0 4px 12px ${ac}30`}}>{initials(v.name)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:"0.95rem",color:C.text,marginBottom:"2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v.name}</div>
          <div style={{fontSize:"0.73rem",color:C.muted}}>📍 {v.location} &nbsp;·&nbsp; {v.experience_years}yr exp</div>
        </div>
        <div style={{background:"rgba(79,156,249,0.1)",border:"1px solid rgba(79,156,249,0.2)",borderRadius:"8px",padding:"3px 10px",fontSize:"0.7rem",fontWeight:700,color:C.blue,whiteSpace:"nowrap"}}>{v.experience_years}yr</div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"8px"}}>
        {v.skills?.map(s=><Tag key={s} text={s} cls="tag-skill"/>)}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
        {v.languages?.map(l=><Tag key={l} text={l} cls="tag-lang"/>)}
        {v.availability?.map(a=><Tag key={a} text={a} cls="tag-avail"/>)}
      </div>
    </div>
  );
};

// ─── CRISIS CARD ──────────────────────────────────────────────────────────────
const CriCard = ({c,i}) => {
  const urg = URGENCY[c.urgency] || URGENCY.medium;
  return (
    <div className="cri-card" style={{background:C.bgCard,border:"1px solid rgba(255,255,255,0.06)",borderLeft:`3px solid ${urg.color}`,borderRadius:"16px",padding:"18px",animation:`fadeUp 0.4s ease ${i*0.06}s both`,backdropFilter:"blur(20px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px",gap:"10px"}}>
        <div style={{fontWeight:700,fontSize:"0.93rem",color:C.text,flex:1}}>{c.title}</div>
        <span style={{background:urg.bg,color:urg.color,border:`1px solid ${urg.color}40`,padding:"3px 10px",borderRadius:"7px",fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.07em",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"5px"}}>
          <span style={{width:"6px",height:"6px",background:urg.dot,borderRadius:"50%",animation:urg.label==="CRITICAL"?"pulse 1.2s ease infinite":"none"}}/>
          {urg.label}
        </span>
      </div>
      <p style={{fontSize:"0.78rem",color:C.muted,lineHeight:1.55,marginBottom:"10px"}}>{c.description?.slice(0,120)}{c.description?.length>120?"…":""}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"8px"}}>
        {c.needs?.map(n=><Tag key={n} text={n} cls="tag-need"/>)}
      </div>
      <div style={{fontSize:"0.72rem",color:C.faint}}>📍 {c.location} &nbsp;·&nbsp; by {c.reported_by}</div>
    </div>
  );
};

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
const ScoreBar = ({pct,color}) => (
  <div style={{position:"relative",height:"6px",background:"rgba(255,255,255,0.06)",borderRadius:"3px",overflow:"hidden",margin:"8px 0 14px"}}>
    <div style={{position:"absolute",top:0,left:0,height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color}aa,${color})`,borderRadius:"3px",animation:"bar 1.2s cubic-bezier(0.16,1,0.3,1) forwards",boxShadow:`0 0 10px ${color}60`}}/>
  </div>
);

// ─── MATCH CARD ───────────────────────────────────────────────────────────────
const MatchCard = ({m,i,delay}) => {
  const pct   = Math.round(m.score*100);
  const colors = ["#F59E0B","#94A3B8","#CD7C2E","#4F9CF9","#8B5CF6"];
  const medals = ["🥇","🥈","🥉","4th","5th"];
  const ac     = avatarColor(m.name);
  const rc     = colors[i] || C.blue;
  return (
    <div className="match-card" style={{background:"rgba(8,15,34,0.9)",border:`1px solid ${rc}28`,borderLeft:`3px solid ${rc}`,borderRadius:"18px",padding:"24px",marginBottom:"14px",animation:`fadeUp 0.5s ease ${delay}s both`,backdropFilter:"blur(20px)",position:"relative",overflow:"hidden"}}>
      {/* rank glow */}
      <div style={{position:"absolute",top:0,right:0,width:"120px",height:"120px",background:`radial-gradient(circle at top right,${rc}14,transparent 70%)`,pointerEvents:"none"}}/>
      {/* Header row */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{width:"48px",height:"48px",borderRadius:"14px",background:`linear-gradient(135deg,${ac},${ac}80)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"0.9rem",color:"#fff",boxShadow:`0 4px 16px ${ac}30`}}>{initials(m.name)}</div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
              <span style={{fontWeight:800,fontSize:"1.05rem",color:C.text}}>{m.name}</span>
              <span style={{fontSize:"1.1rem"}}>{medals[i]||""}</span>
            </div>
            <div style={{fontSize:"0.75rem",color:C.muted}}>📍 {m.location} &nbsp;·&nbsp; {m.experience_years}yr experience</div>
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:"2.2rem",fontWeight:900,color:rc,letterSpacing:"-0.04em",lineHeight:1}}>{pct}%</div>
          <div style={{fontSize:"0.65rem",color:C.muted,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>MATCH SCORE</div>
        </div>
      </div>
      <ScoreBar pct={pct} color={rc}/>
      {/* Tags */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"14px"}}>
        {m.skills?.map(s=><Tag key={s} text={s} cls="tag-skill"/>)}
        {m.languages?.map(l=><Tag key={l} text={l} cls="tag-lang"/>)}
        {m.availability?.map(a=><Tag key={a} text={a} cls="tag-avail"/>)}
      </div>
      {/* AI Explanation */}
      <div style={{background:"rgba(79,156,249,0.05)",border:"1px solid rgba(79,156,249,0.12)",borderRadius:"12px",padding:"14px 16px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"8px"}}>
          <div style={{width:"20px",height:"20px",borderRadius:"6px",background:"linear-gradient(135deg,#4F9CF9,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.65rem"}}>✦</div>
          <span style={{fontSize:"0.68rem",fontWeight:700,color:C.blue,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>GPT-4o-mini · AI Explanation</span>
        </div>
        <p style={{fontSize:"0.83rem",color:"#BFD4F0",lineHeight:1.65}}>{m.explanation}</p>
      </div>
    </div>
  );
};

// ─── FORM HELPERS ─────────────────────────────────────────────────────────────
const Field = ({label,hint,children}) => (
  <div style={{marginBottom:"16px"}}>
    <label style={{display:"block",fontSize:"0.73rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"6px"}}>{label}{hint&&<span style={{fontWeight:400,textTransform:"none",letterSpacing:0,marginLeft:"6px",color:C.faint}}>({hint})</span>}</label>
    {children}
  </div>
);
const Input = ({...p}) => <input className="form-input" style={{width:"100%",background:C.bgInput,border:"1px solid rgba(79,156,249,0.15)",borderRadius:"10px",padding:"11px 14px",color:C.text,fontSize:"0.875rem",transition:"all 0.2s"}} {...p}/>;
const Textarea = ({...p}) => <textarea className="form-input" style={{width:"100%",background:C.bgInput,border:"1px solid rgba(79,156,249,0.15)",borderRadius:"10px",padding:"11px 14px",color:C.text,fontSize:"0.875rem",transition:"all 0.2s",minHeight:"88px"}} {...p}/>;
const Select = ({children,...p}) => <select className="form-input" style={{width:"100%",background:C.bgInput,border:"1px solid rgba(79,156,249,0.15)",borderRadius:"10px",padding:"11px 14px",color:C.text,fontSize:"0.875rem",transition:"all 0.2s"}} {...p}>{children}</select>;

const PrimaryBtn = ({children,loading,onClick,disabled,style={}}) => (
  <button onClick={onClick} disabled={loading||disabled} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",width:"100%",padding:"13px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#4F9CF9,#6366F1)",color:"#fff",fontWeight:700,fontSize:"0.9rem",transition:"all 0.25s",opacity:(loading||disabled)?0.65:1,...style}}>
    {loading?<Spinner/>:children}
  </button>
);

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
const Empty = ({icon,msg,sub}) => (
  <div style={{padding:"40px 20px",textAlign:"center",border:"1px dashed rgba(79,156,249,0.15)",borderRadius:"16px",animation:"fadeIn 0.4s ease"}}>
    <div style={{fontSize:"2.5rem",marginBottom:"10px",animation:"float 3s ease infinite"}}>{icon}</div>
    <div style={{fontSize:"0.9rem",fontWeight:600,color:C.muted,marginBottom:"4px"}}>{msg}</div>
    <div style={{fontSize:"0.8rem",color:C.faint}}>{sub}</div>
  </div>
);

// ─── TECH PILL ────────────────────────────────────────────────────────────────
const TechPill = ({label,sub,color}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"12px 16px",background:`${color}10`,border:`1px solid ${color}25`,borderRadius:"14px",flex:1,minWidth:"100px"}}>
    <div style={{fontSize:"0.78rem",fontWeight:700,color,textAlign:"center"}}>{label}</div>
    <div style={{fontSize:"0.65rem",color:C.faint,textAlign:"center"}}>{sub}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,        setTab]        = useState("dashboard");
  const [volunteers, setVolunteers] = useState([]);
  const [crises,     setCrises]     = useState([]);
  const [matches,    setMatches]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [seeding,    setSeeding]    = useState(false);
  const [notif,      setNotif]      = useState(null);
  const [selCrisis,  setSelCrisis]  = useState("");
  const [matchLoad,  setMatchLoad]  = useState(false);

  const [vf, setVf] = useState({name:"",skills:"",languages:"",availability:"",location:"",experience_years:1,bio:""});
  const [cf, setCf] = useState({title:"",description:"",urgency:"medium",location:"",needs:"",reported_by:""});

  const notify = (msg,type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),4500); };

  const fetchData = async () => {
    try {
      const [v,c] = await Promise.all([
        fetch(`${API}/volunteers`).then(r=>r.json()),
        fetch(`${API}/crises`).then(r=>r.json()),
      ]);
      setVolunteers(Array.isArray(v)?v:[]);
      setCrises(Array.isArray(c)?c:[]);
    } catch {}
  };

  useEffect(()=>{ fetchData(); },[]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      await fetch(`${API}/seed`,{method:"POST"});
      await fetchData();
      notify("Demo data loaded — 5 volunteers + 1 critical crisis ready");
    } catch { notify("Backend not reachable. Run: uvicorn main:app --reload","error"); }
    setSeeding(false);
  };

  const registerVolunteer = async () => {
    if(!vf.name||!vf.skills) return notify("Name and skills are required","error");
    setLoading(true);
    try {
      const payload={...vf,skills:vf.skills.split(",").map(s=>s.trim()).filter(Boolean),languages:vf.languages.split(",").map(s=>s.trim()).filter(Boolean),availability:vf.availability.split(",").map(s=>s.trim()).filter(Boolean),experience_years:parseInt(vf.experience_years)||1};
      await fetch(`${API}/volunteers`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      await fetchData();
      notify(`${vf.name} has been registered and embedded`);
      setVf({name:"",skills:"",languages:"",availability:"",location:"",experience_years:1,bio:""});
    } catch { notify("Registration failed. Is the backend running?","error"); }
    setLoading(false);
  };

  const reportCrisis = async () => {
    if(!cf.title||!cf.description) return notify("Title and description are required","error");
    setLoading(true);
    try {
      const payload={...cf,needs:cf.needs.split(",").map(s=>s.trim()).filter(Boolean)};
      await fetch(`${API}/crises`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      await fetchData();
      notify(`Crisis "${cf.title}" has been reported`);
      setCf({title:"",description:"",urgency:"medium",location:"",needs:"",reported_by:""});
    } catch { notify("Failed to report crisis","error"); }
    setLoading(false);
  };

  const runMatch = async () => {
    if(!selCrisis) return notify("Please select a crisis first","error");
    setMatchLoad(true); setMatches(null);
    try {
      const res = await fetch(`${API}/match`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({crisis_id:selCrisis,top_k:5})});
      const data = await res.json();
      setMatches(data);
      notify(`${data.top_matches?.length} volunteers matched and ranked`);
    } catch { notify("Matching failed. Is the backend running?","error"); }
    setMatchLoad(false);
  };

  const PAGE = {maxWidth:"1120px",margin:"0 auto",padding:"40px 24px",position:"relative",zIndex:1};
  const SPLIT = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px",alignItems:"start"};
  const CARD  = {background:C.bgCard,border:"1px solid rgba(255,255,255,0.06)",borderRadius:"20px",padding:"28px",backdropFilter:"blur(20px)"};

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  const Dashboard = () => (
    <div style={PAGE}>
      {/* Hero */}
      <div style={{marginBottom:"40px",animation:"fadeUp 0.5s ease both"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"rgba(79,156,249,0.1)",border:"1px solid rgba(79,156,249,0.2)",borderRadius:"30px",padding:"5px 14px",fontSize:"0.72rem",fontWeight:700,color:C.blue,letterSpacing:"0.08em",marginBottom:"18px",fontFamily:"'JetBrains Mono',monospace"}}>
          ◈ POWERED BY OPENAI EMBEDDINGS + GPT-4o-mini
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"20px",flexWrap:"wrap"}}>
          <div>
            <h1 style={{fontSize:"2.8rem",fontWeight:900,letterSpacing:"-0.04em",lineHeight:1.1,marginBottom:"12px",background:"linear-gradient(135deg,#F0F6FF 30%,#4F9CF9 70%,#8B5CF6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Volunteer Skill<br/>Matching Engine
            </h1>
            <p style={{fontSize:"0.95rem",color:C.muted,maxWidth:"520px",lineHeight:1.65}}>
              AI-powered semantic matching connects trained volunteers to humanitarian crises in real-time — bridging language barriers and saving lives in underserved communities.
            </p>
          </div>
          <button className="seed-btn" onClick={seedDemo} disabled={seeding} style={{display:"flex",alignItems:"center",gap:"10px",padding:"14px 24px",borderRadius:"14px",border:"1px solid rgba(16,185,129,0.3)",background:"rgba(16,185,129,0.1)",color:C.emerald,fontWeight:700,fontSize:"0.9rem",transition:"all 0.25s",backdropFilter:"blur(10px)",flexShrink:0}}>
            {seeding?<Spinner color={C.emerald}/>:<span>⬡</span>}
            {seeding?"Seeding data...":"Load Demo Data"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px",marginBottom:"32px"}}>
        <StatCard icon="👥" label="Volunteers" value={volunteers.length} sub="registered profiles" color={C.blue}   delay={0.05}/>
        <StatCard icon="🚨" label="Active Crises" value={crises.length}  sub="pending matches"   color={C.red}    delay={0.1}/>
        <StatCard icon="🧠" label="Chat Model"  value="4o-mini"          sub="gpt-4o-mini"        color={C.purple} delay={0.15}/>
        <StatCard icon="⚡" label="Embeddings"  value="1536-dim"         sub="text-embedding-3-small" color={C.emerald} delay={0.2}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px",marginBottom:"24px"}}>
        {/* How it works */}
        <div style={{...CARD,animation:"fadeUp 0.5s ease 0.25s both"}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:C.blue,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace",marginBottom:"16px"}}>⬡ HOW IT WORKS</div>
          <FlowStep n={1} icon="🔢" title="Semantic Embedding" desc="Volunteer profiles are converted to 1536-dim vectors using text-embedding-3-small. Meaning is captured, not just keywords." color={C.blue}   delay={0.3}/>
          <FlowStep n={2} icon="📡" title="Crisis Embedding"   desc="Crisis reports undergo identical embedding — urgency, location, and specific needs become part of the vector." color={C.purple} delay={0.35}/>
          <FlowStep n={3} icon="📐" title="Cosine Similarity"  desc="Every volunteer vector is compared to the crisis vector via cosine similarity. Score: 0 (unrelated) → 1 (perfect match)." color={C.amber}  delay={0.4}/>
          <FlowStep n={4} icon="💬" title="AI Explanation" desc="GPT-4o-mini reads both profiles and writes a plain-English explanation — telling coordinators exactly why each match was made." color={C.emerald} last delay={0.45}/>
        </div>

        {/* Tech stack */}
        <div>
          <div style={{...CARD,marginBottom:"16px",animation:"fadeUp 0.5s ease 0.3s both"}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,color:C.purple,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace",marginBottom:"14px"}}>⬡ TECHNOLOGY STACK</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
              <TechPill label="FastAPI"            sub="REST API"       color={C.blue}/>
              <TechPill label="text-embedding-3-small" sub="OpenAI" color={C.purple}/>
              <TechPill label="gpt-4o-mini"        sub="Explanations"  color={C.emerald}/>
              <TechPill label="NumPy"              sub="Cosine Sim"    color={C.amber}/>
              <TechPill label="Pydantic v2"        sub="Validation"    color="#06B6D4"/>
              <TechPill label="React"              sub="Frontend"      color="#EC4899"/>
            </div>
          </div>
          <div style={{...CARD,animation:"fadeUp 0.5s ease 0.35s both"}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,color:C.emerald,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace",marginBottom:"12px"}}>⬡ SOCIAL IMPACT</div>
            {[
              ["🌍","Bridges language barriers","Multilingual volunteers reach communities in their native language"],
              ["⚡","Real-time matching","Critical crises get the right responder in minutes, not days"],
              ["💡","Zero expertise needed","Field coordinators see plain-English match explanations, not raw scores"],
            ].map(([icon,title,desc])=>(
              <div key={title} style={{display:"flex",gap:"12px",marginBottom:"12px",alignItems:"flex-start"}}>
                <span style={{fontSize:"1.1rem",flexShrink:0,marginTop:"1px"}}>{icon}</span>
                <div>
                  <div style={{fontSize:"0.83rem",fontWeight:600,color:C.text,marginBottom:"2px"}}>{title}</div>
                  <div style={{fontSize:"0.76rem",color:C.muted,lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick start banner */}
      <div style={{padding:"16px 22px",background:"rgba(79,156,249,0.06)",border:"1px solid rgba(79,156,249,0.14)",borderRadius:"14px",display:"flex",alignItems:"center",gap:"12px",animation:"fadeUp 0.5s ease 0.45s both"}}>
        <div style={{fontSize:"1.1rem"}}>🚀</div>
        <div style={{fontSize:"0.85rem",color:C.muted}}>
          <strong style={{color:C.blue}}>Quick Start:</strong> Click <em>Load Demo Data</em> → Navigate to <em>Match Engine</em> → Select the crisis → Click <strong style={{color:C.text}}>Run AI Match</strong>
        </div>
      </div>
    </div>
  );

  // ── VOLUNTEERS ─────────────────────────────────────────────────────────────
  const Volunteers = () => (
    <div style={PAGE}>
      <div style={{marginBottom:"28px",animation:"fadeUp 0.4s ease both"}}>
        <h2 style={{fontSize:"1.9rem",fontWeight:800,letterSpacing:"-0.03em",color:C.text,marginBottom:"6px"}}>Register Volunteer</h2>
        <p style={{color:C.muted,fontSize:"0.9rem"}}>Profiles are semantically embedded via OpenAI and stored for AI-powered matching</p>
      </div>
      <div style={SPLIT}>
        {/* Form */}
        <div style={CARD}>
          <Field label="Full Name"><Input placeholder="Maria Santos" value={vf.name} onChange={e=>setVf({...vf,name:e.target.value})}/></Field>
          <Field label="Skills" hint="comma-separated"><Input placeholder="nurse, first aid, triage" value={vf.skills} onChange={e=>setVf({...vf,skills:e.target.value})}/></Field>
          <Field label="Languages" hint="comma-separated"><Input placeholder="English, Spanish, French" value={vf.languages} onChange={e=>setVf({...vf,languages:e.target.value})}/></Field>
          <Field label="Availability" hint="comma-separated"><Input placeholder="weekends, evenings, on-call" value={vf.availability} onChange={e=>setVf({...vf,availability:e.target.value})}/></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <Field label="Location"><Input placeholder="Los Angeles, CA" value={vf.location} onChange={e=>setVf({...vf,location:e.target.value})}/></Field>
            <Field label="Years Exp"><Input type="number" min={0} max={50} value={vf.experience_years} onChange={e=>setVf({...vf,experience_years:e.target.value})}/></Field>
          </div>
          <Field label="Bio" hint="optional"><Textarea placeholder="Brief background and motivation..." value={vf.bio} onChange={e=>setVf({...vf,bio:e.target.value})}/></Field>
          <PrimaryBtn loading={loading} onClick={registerVolunteer}>{loading?"Generating embedding…":"Register Volunteer"}</PrimaryBtn>
        </div>
        {/* List */}
        <div>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"14px",animation:"fadeIn 0.4s ease both"}}>
            Registered volunteers — {volunteers.length}
          </div>
          {volunteers.length===0
            ? <Empty icon="👤" msg="No volunteers yet" sub="Load demo data or register one using the form"/>
            : volunteers.map((v,i)=><VolCard key={v.id} v={v} i={i}/>)
          }
        </div>
      </div>
    </div>
  );

  // ── CRISES ─────────────────────────────────────────────────────────────────
  const Crises = () => (
    <div style={PAGE}>
      <div style={{marginBottom:"28px",animation:"fadeUp 0.4s ease both"}}>
        <h2 style={{fontSize:"1.9rem",fontWeight:800,letterSpacing:"-0.03em",color:C.text,marginBottom:"6px"}}>Report a Crisis</h2>
        <p style={{color:C.muted,fontSize:"0.9rem"}}>Describe the situation — the AI will find the best-matched volunteers across the network</p>
      </div>
      <div style={SPLIT}>
        {/* Form */}
        <div style={CARD}>
          <Field label="Crisis Title"><Input placeholder="Medical Emergency in Spanish-Speaking Community" value={cf.title} onChange={e=>setCf({...cf,title:e.target.value})}/></Field>
          <Field label="Description"><Textarea placeholder="Describe what's happening, who needs help, and what resources are needed..." value={cf.description} onChange={e=>setCf({...cf,description:e.target.value})}/></Field>
          <Field label="Urgency Level">
            <Select value={cf.urgency} onChange={e=>setCf({...cf,urgency:e.target.value})}>
              {Object.entries(URGENCY).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Location"><Input placeholder="East Los Angeles, CA" value={cf.location} onChange={e=>setCf({...cf,location:e.target.value})}/></Field>
          <Field label="Specific Needs" hint="comma-separated"><Input placeholder="medical help, Spanish speaker, triage, logistics" value={cf.needs} onChange={e=>setCf({...cf,needs:e.target.value})}/></Field>
          <Field label="Reported By"><Input placeholder="LA Emergency Services" value={cf.reported_by} onChange={e=>setCf({...cf,reported_by:e.target.value})}/></Field>
          <PrimaryBtn loading={loading} onClick={reportCrisis} style={{background:"linear-gradient(135deg,#EF4444,#F97316)"}}>{loading?"Processing…":"Report Crisis"}</PrimaryBtn>
        </div>
        {/* List */}
        <div>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"14px",animation:"fadeIn 0.4s ease both"}}>
            Active crises — {crises.length}
          </div>
          {crises.length===0
            ? <Empty icon="🚨" msg="No crises reported" sub="Load demo data or report one using the form"/>
            : crises.map((c,i)=><CriCard key={c.id} c={c} i={i}/>)
          }
        </div>
      </div>
    </div>
  );

  // ── MATCH ENGINE ───────────────────────────────────────────────────────────
  const Match = () => (
    <div style={PAGE}>
      <div style={{marginBottom:"28px",animation:"fadeUp 0.4s ease both"}}>
        <h2 style={{fontSize:"1.9rem",fontWeight:800,letterSpacing:"-0.03em",color:C.text,marginBottom:"6px"}}>AI Match Engine</h2>
        <p style={{color:C.muted,fontSize:"0.9rem"}}>Select a crisis — the engine computes cosine similarity across all volunteer embeddings and ranks the best matches</p>
      </div>

      {/* Selector row */}
      <div style={{...CARD,marginBottom:"24px",display:"flex",gap:"14px",alignItems:"flex-end",animation:"fadeUp 0.4s ease 0.05s both"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"7px"}}>Select Crisis</div>
          <Select value={selCrisis} onChange={e=>setSelCrisis(e.target.value)}>
            <option value="">— choose a crisis to match —</option>
            {crises.map(c=>{const urg=URGENCY[c.urgency]||URGENCY.medium; return <option key={c.id} value={c.id}>[{urg.label}] {c.title}</option>;})}
          </Select>
        </div>
        <button className="run-btn" onClick={runMatch} disabled={matchLoad||!selCrisis} style={{display:"flex",alignItems:"center",gap:"9px",padding:"13px 30px",borderRadius:"12px",border:"1px solid rgba(79,156,249,0.3)",background:"linear-gradient(135deg,rgba(79,156,249,0.15),rgba(99,102,241,0.15))",color:C.blue,fontWeight:700,fontSize:"0.9rem",transition:"all 0.25s",animation:"glow 2.5s ease infinite",opacity:(matchLoad||!selCrisis)?0.5:1,flexShrink:0}}>
          {matchLoad?<Spinner color={C.blue}/>:"⬡"}
          {matchLoad?"Computing…":"Run AI Match"}
        </button>
      </div>

      {/* Loading state */}
      {matchLoad && (
        <div style={{textAlign:"center",padding:"60px 20px",animation:"fadeIn 0.3s ease both"}}>
          <div style={{fontSize:"3rem",marginBottom:"16px",animation:"float 2s ease infinite"}}>🧠</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:C.muted,marginBottom:"8px"}}>Computing semantic similarity across {volunteers.length} volunteers…</div>
          <div style={{fontSize:"0.8rem",color:C.faint,fontFamily:"'JetBrains Mono',monospace"}}>text-embedding-3-small → cosine similarity → gpt-4o-mini explanations</div>
        </div>
      )}

      {/* Results */}
      {matches && !matchLoad && (
        <div style={{animation:"fadeIn 0.4s ease both"}}>
          {/* Crisis summary bar */}
          <div style={{...CARD,marginBottom:"22px",borderLeft:`3px solid ${C.blue}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:"16px"}}>
            <div>
              <div style={{fontSize:"0.65rem",fontFamily:"'JetBrains Mono',monospace",color:C.blue,fontWeight:700,letterSpacing:"0.1em",marginBottom:"4px"}}>MATCHED CRISIS</div>
              <div style={{fontSize:"1.1rem",fontWeight:700,color:C.text}}>{matches.crisis_title}</div>
              <div style={{fontSize:"0.78rem",color:C.muted,marginTop:"2px"}}>Urgency: <span style={{color:URGENCY[matches.urgency]?.color||C.amber}}>{matches.urgency?.toUpperCase()}</span></div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:"0.65rem",color:C.muted,marginBottom:"2px",fontFamily:"'JetBrains Mono',monospace"}}>SEARCHED</div>
              <div style={{fontSize:"2.4rem",fontWeight:900,color:C.blue,letterSpacing:"-0.04em",lineHeight:1}}>{matches.total_volunteers_searched}</div>
              <div style={{fontSize:"0.65rem",color:C.muted}}>volunteers</div>
            </div>
          </div>

          <div style={{fontSize:"0.72rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"14px"}}>
            Top {matches.top_matches?.length} Matches — ranked by semantic similarity
          </div>

          {matches.top_matches?.map((m,i)=><MatchCard key={m.volunteer_id} m={m} i={i} delay={i*0.08}/>)}
        </div>
      )}

      {/* Empty state */}
      {!matches && !matchLoad && (
        <div style={{padding:"70px 20px",textAlign:"center",border:"1px dashed rgba(79,156,249,0.12)",borderRadius:"20px",animation:"fadeIn 0.4s ease both"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"14px",animation:"float 3s ease infinite"}}>⬡</div>
          <div style={{fontSize:"1.05rem",fontWeight:600,color:C.muted,marginBottom:"6px"}}>Ready to match</div>
          <div style={{fontSize:"0.85rem",color:C.faint}}>Select a crisis above and click "Run AI Match" to find the best volunteers</div>
          {crises.length===0 && <div style={{marginTop:"16px",fontSize:"0.8rem",color:C.faint}}>No crises yet — go to Dashboard and load demo data first</div>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',sans-serif"}}>
      <style>{GLOBAL_CSS}</style>
      <Background/>
      <Notification n={notif}/>
      <Nav tab={tab} setTab={setTab} counts={{v:volunteers.length,c:crises.length}}/>
      {tab==="dashboard"  && <Dashboard/>}
      {tab==="volunteers" && <Volunteers/>}
      {tab==="crises"     && <Crises/>}
      {tab==="match"      && <Match/>}
    </div>
  );
}
