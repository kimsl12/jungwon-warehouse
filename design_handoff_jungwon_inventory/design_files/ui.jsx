// Shared UI primitives for the inventory system
const { useState, useMemo, useEffect, useRef, createContext, useContext } = React;

/* =========================
   Icons (Lucide-style, hand-drawn paths kept simple)
   ========================= */
const I = ({ d, size = 18, stroke = 1.6, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {typeof d === 'string' ? <path d={d}/> : d}
  </svg>
);
const Icon = {
  Dashboard: (p) => <I {...p} d={<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>}/>,
  Box: (p) => <I {...p} d={<><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/></>}/>,
  ArrowDown: (p) => <I {...p} d="M12 5v14M5 12l7 7 7-7"/>,
  ArrowUp: (p) => <I {...p} d="M12 19V5M5 12l7-7 7 7"/>,
  Truck: (p) => <I {...p} d={<><path d="M14 18V6h-12v12"/><path d="M14 8h4l4 4v6h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>}/>,
  Users: (p) => <I {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M22 18c0-2.5-1.5-4-3.5-4"/></>}/>,
  Chart: (p) => <I {...p} d="M3 21h18M5 21V11M11 21V5M17 21v-7M21 21V8"/>,
  Bell: (p) => <I {...p} d={<><path d="M6 8a6 6 0 1 1 12 0v5l1.5 3h-15L6 13z"/><path d="M10 19a2 2 0 0 0 4 0"/></>}/>,
  Settings: (p) => <I {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>}/>,
  Search: (p) => <I {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  Plus: (p) => <I {...p} d="M12 5v14M5 12h14"/>,
  Minus: (p) => <I {...p} d="M5 12h14"/>,
  Filter: (p) => <I {...p} d="M3 5h18l-7 9v6l-4-2v-4z"/>,
  Download: (p) => <I {...p} d={<><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></>}/>,
  Upload: (p) => <I {...p} d={<><path d="M12 20V8"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/></>}/>,
  More: (p) => <I {...p} d={<><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>}/>,
  Check: (p) => <I {...p} d="M5 12l5 5 9-11"/>,
  X: (p) => <I {...p} d="M6 6l12 12M18 6L6 18"/>,
  Chevron: (p) => <I {...p} d="M9 6l6 6-6 6"/>,
  ChevronDown: (p) => <I {...p} d="M6 9l6 6 6-6"/>,
  ChevronLeft: (p) => <I {...p} d="M15 6l-6 6 6 6"/>,
  Logo: (p) => <I {...p} d={<><path d="M4 7l8-4 8 4-8 4z" fill="currentColor"/><path d="M4 7v10l8 4 8-4V7" opacity="0.4" fill="currentColor"/><path d="M4 7v10l8 4V11z" fill="currentColor"/></>} fill="currentColor" stroke="none"/>,
  Warehouse: (p) => <I {...p} d={<><path d="M3 21V9l9-5 9 5v12"/><path d="M9 21v-7h6v7"/><path d="M3 13h18"/></>}/>,
  Calendar: (p) => <I {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>}/>,
  Clock: (p) => <I {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  Activity: (p) => <I {...p} d="M3 12h4l3-8 4 16 3-8h4"/>,
  Hard: (p) => <I {...p} d={<><path d="M5 18h14l-1-7H6z"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>}/>,
  Doc: (p) => <I {...p} d={<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>}/>,
  Send: (p) => <I {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>,
  ArrowRight: (p) => <I {...p} d="M5 12h14M13 5l7 7-7 7"/>,
  ArrowLeft: (p) => <I {...p} d="M19 12H5M11 19l-7-7 7-7"/>,
  Menu: (p) => <I {...p} d="M4 6h16M4 12h16M4 18h16"/>,
  Sun: (p) => <I {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>}/>,
  Moon: (p) => <I {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
  Home: (p) => <I {...p} d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>,
  Scan: (p) => <I {...p} d={<><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M11 8v8M15 8v8"/></>}/>,
  Tag: (p) => <I {...p} d={<><path d="M20 12L12 4H4v8l8 8z"/><circle cx="8" cy="8" r="1.5"/></>}/>,
  Building: (p) => <I {...p} d={<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></>}/>,
};

/* =========================
   Status pill
   ========================= */
const StatusBadge = ({ tone = 'neutral', children, dot = false }) => {
  const map = {
    success: { bg: 'var(--c-success-bg)', fg: 'var(--c-success)' },
    warning: { bg: 'var(--c-warning-bg)', fg: 'var(--c-warning)' },
    danger:  { bg: 'var(--c-danger-bg)',  fg: 'var(--c-danger)' },
    info:    { bg: 'var(--c-info-bg)',    fg: 'var(--c-info)' },
    brand:   { bg: 'var(--c-brand-50)',   fg: 'var(--c-brand-700)' },
    neutral: { bg: 'var(--bg-muted)',     fg: 'var(--fg-muted)' },
  };
  const s = map[tone] || map.neutral;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding: '3px 8px', borderRadius:'var(--radius-pill)',
      background: s.bg, color: s.fg,
      fontSize: 11.5, fontWeight: 600, letterSpacing:'0.01em',
      whiteSpace:'nowrap',
    }}>
      {dot && <span style={{width:6, height:6, borderRadius:'50%', background: s.fg}}/>}
      {children}
    </span>
  );
};

/* =========================
   Button
   ========================= */
const Btn = ({ variant='secondary', size='md', icon, iconRight, children, onClick, style, full, disabled }) => {
  const sizes = {
    sm: { h: 30, px: 10, fz: 13, gap: 6 },
    md: { h: 36, px: 14, fz: 13.5, gap: 8 },
    lg: { h: 42, px: 18, fz: 14, gap: 10 },
  }[size];
  const variants = {
    primary: {
      background: 'var(--c-brand-500)', color: 'var(--fg-on-brand)',
      border: '1px solid var(--c-brand-600)', boxShadow: 'var(--shadow-xs)',
    },
    secondary: {
      background: 'var(--bg-surface)', color: 'var(--fg-default)',
      border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xs)',
    },
    ghost: {
      background: 'transparent', color: 'var(--fg-default)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--bg-surface)', color: 'var(--c-danger)',
      border: '1px solid var(--border-default)',
    },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fz,
      fontWeight: 500, letterSpacing:'-0.005em',
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap: sizes.gap,
      borderRadius:'var(--radius-md)', cursor: disabled?'not-allowed':'pointer',
      width: full ? '100%' : 'auto',
      opacity: disabled ? 0.5 : 1,
      transition: 'transform 60ms ease, background 120ms ease, box-shadow 120ms ease',
      ...variants, ...style,
    }}>
      {icon}{children}{iconRight}
    </button>
  );
};

/* =========================
   IconButton
   ========================= */
const IconBtn = ({ icon, onClick, active, size=34, title, style }) => (
  <button onClick={onClick} title={title} style={{
    width: size, height: size, borderRadius: 'var(--radius-md)',
    background: active ? 'var(--bg-pressed)' : 'transparent',
    border: '1px solid transparent',
    color: active ? 'var(--fg-default)' : 'var(--fg-muted)',
    display: 'inline-flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', transition:'background 120ms ease, color 120ms ease',
    ...style,
  }}>
    {icon}
  </button>
);

/* =========================
   Card
   ========================= */
const Card = ({ children, padding=20, style, hover }) => (
  <div style={{
    background:'var(--bg-surface)', borderRadius:'var(--radius-lg)',
    border:'1px solid var(--border-subtle)', padding,
    boxShadow:'var(--shadow-xs)',
    transition:'box-shadow 120ms ease',
    ...style,
  }} className={hover ? 'card-hover' : undefined}>
    {children}
  </div>
);

/* =========================
   Input
   ========================= */
const Input = ({ icon, placeholder, value, onChange, size='md', style, type='text', full }) => {
  const h = size==='sm' ? 32 : size==='lg' ? 42 : 36;
  return (
    <label style={{
      display:'inline-flex', alignItems:'center', gap: 8,
      height: h, padding: '0 12px',
      background:'var(--bg-surface)',
      border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)',
      width: full ? '100%' : 'auto',
      ...style,
    }}>
      {icon && <span style={{color:'var(--fg-muted)', display:'inline-flex'}}>{icon}</span>}
      <input type={type} placeholder={placeholder} value={value||''} onChange={onChange||(()=>{})} readOnly={!onChange}
        style={{
          border:'none', outline:'none', background:'transparent',
          flex:1, fontSize: 13.5, color:'var(--fg-default)',
          minWidth: 0,
        }}/>
    </label>
  );
};

/* =========================
   KPI tile
   ========================= */
const KPI = ({ label, value, delta, deltaTone='success', icon, accent }) => (
  <div style={{
    background:'var(--bg-surface)',
    border:'1px solid var(--border-subtle)',
    borderRadius:'var(--radius-lg)',
    padding: 18,
    display:'flex', flexDirection:'column', gap:12,
    boxShadow:'var(--shadow-xs)',
    minWidth: 0,
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div style={{fontSize: 12.5, color:'var(--fg-muted)', fontWeight:500}}>{label}</div>
      {icon && <div style={{
        width:32, height:32, borderRadius:'var(--radius-md)',
        background: accent || 'var(--c-brand-50)', color: accent ? 'var(--fg-on-brand)' : 'var(--c-brand-600)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>{icon}</div>}
    </div>
    <div style={{
      fontSize: 26, fontWeight: 600, fontFamily:'var(--font-display)',
      letterSpacing:'-0.02em', color:'var(--fg-default)',
      fontVariantNumeric:'tabular-nums', lineHeight: 1,
    }}>{value}</div>
    {delta && (
      <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--fg-muted)'}}>
        <StatusBadge tone={deltaTone}>{delta}</StatusBadge>
        <span>전주 대비</span>
      </div>
    )}
  </div>
);

/* =========================
   Sparkline / mini bars
   ========================= */
const Sparkline = ({ data, height=40, color='var(--c-brand-500)', fill }) => {
  const w = 200;
  const max = Math.max(...data); const min = Math.min(...data);
  const range = (max - min) || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length-1)) * w;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map((p, i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {fill && <path d={areaPath} fill={fill} opacity="0.18"/>}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const MiniBars = ({ data, height=44, color='var(--c-brand-500)' }) => {
  const max = Math.max(...data) || 1;
  const w = 200; const n = data.length; const gap = 3;
  const bw = (w - gap*(n-1)) / n;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        return <rect key={i} x={i*(bw+gap)} y={height-h} width={bw} height={h} rx="2" fill={color} opacity={0.55 + 0.45*(v/max)}/>;
      })}
    </svg>
  );
};

/* =========================
   Avatar
   ========================= */
const Avatar = ({ name, size=28, color }) => {
  const initials = (name||'?').slice(0,1);
  const palette = ['#C96442','#4A6E8E','#4F8A55','#C28B2B','#7A5AA0'];
  const c = color || palette[(name?.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:c+'22', color:c,
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      fontWeight:600, fontSize: size*0.42, flexShrink:0,
    }}>{initials}</div>
  );
};

/* =========================
   ThemeToggle (per-artboard local theme)
   ========================= */
const ThemeToggle = ({ theme, onToggle }) => (
  <IconBtn
    icon={theme==='dark' ? <Icon.Sun/> : <Icon.Moon/>}
    onClick={onToggle}
    title="테마 전환"
  />
);

/* =========================
   Frame wrapper that scopes theme to artboard
   ========================= */
const Frame = ({ theme='light', children, style, bg='var(--bg-app)' }) => (
  <div data-theme={theme} style={{
    background: bg, color:'var(--fg-default)',
    fontFamily:'var(--font-sans)',
    width:'100%', height:'100%', overflow:'hidden',
    ...style,
  }}>{children}</div>
);

window.UI = {
  Icon, StatusBadge, Btn, IconBtn, Card, Input, KPI, Sparkline, MiniBars,
  Avatar, ThemeToggle, Frame,
};
