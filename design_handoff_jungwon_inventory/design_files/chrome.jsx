// Shared mock data and navigation chrome
window.MOCK = (() => {
  const skus = [
    { sku:'JW-CB-2.5SQ', name:'2.5SQ 전선 케이블 (흑색)', cat:'전선', loc:'A-01-03', stock: 1240, min: 800, unit: 'm', supplier:'대한전선', price: 850 },
    { sku:'JW-CB-4.0SQ', name:'4.0SQ 전선 케이블 (녹색)', cat:'전선', loc:'A-01-04', stock: 320, min: 500, unit: 'm', supplier:'대한전선', price: 1340 },
    { sku:'JW-CB-6.0SQ', name:'6.0SQ 전선 케이블 (적색)', cat:'전선', loc:'A-01-05', stock: 180, min: 300, unit: 'm', supplier:'삼화전선', price: 1980 },
    { sku:'JW-MC-220V', name:'마그네틱 컨탕터 220V 3P', cat:'자재', loc:'B-02-01', stock: 86,  min: 30,  unit: 'EA', supplier:'LS일렉트릭', price: 32000 },
    { sku:'JW-BR-50A', name:'배선용 차단기 50A', cat:'차단기', loc:'B-02-02', stock: 24, min: 40, unit: 'EA', supplier:'LS일렉트릭', price: 18500 },
    { sku:'JW-BR-100A', name:'배선용 차단기 100A', cat:'차단기', loc:'B-02-03', stock: 58, min: 25, unit: 'EA', supplier:'현대일렉트릭', price: 38000 },
    { sku:'JW-PD-1Φ', name:'박스 프로텍터 1Φ', cat:'부자재', loc:'C-03-02', stock: 0, min: 50, unit: 'EA', supplier:'경원산업', price: 4200 },
    { sku:'JW-LD-50W', name:'LED 다운라이트 50W', cat:'조명', loc:'D-04-01', stock: 412, min: 100, unit: 'EA', supplier:'오스람', price: 14500 },
    { sku:'JW-LD-100W', name:'LED 고천장등 100W', cat:'조명', loc:'D-04-02', stock: 145, min: 50, unit: 'EA', supplier:'오스람', price: 42000 },
    { sku:'JW-CC-1.5T', name:'전선관 1.5T', cat:'부자재', loc:'C-03-04', stock: 920, min: 200, unit: 'm', supplier:'한국다퍼', price: 2100 },
  ];
  const lowStock = skus.filter(s => s.stock <= s.min);
  const activity = [
    { t:'09:42', who:'이재혁', what:'입고', detail:'JW-CB-2.5SQ × 500m', tone:'success' },
    { t:'09:18', who:'박동욱', what:'출고', detail:'JW-LD-50W × 24EA → 종로현장', tone:'info' },
    { t:'08:55', who:'시스템',   what:'알림',   detail:'JW-PD-1Φ 재고 소진', tone:'danger' },
    { t:'08:30', who:'김수진', what:'재고조사', detail:'B동 차단기 구역 완료', tone:'neutral' },
    { t:'어제', who:'구매팀', what:'발주',   detail:'PO-2026-0418 대한전선 압송', tone:'brand' },
    { t:'어제', who:'최은혜', what:'자재신청', detail:'강남현장 - LED 50W × 12EA', tone:'warning' },
  ];
  const orders = [
    { id:'PO-2026-0421', supplier:'대한전선', items:3, total:'₩2,840,000', status:'입고예정', date:'04-21' },
    { id:'PO-2026-0418', supplier:'대한전선', items:2, total:'₩1,420,000', status:'운송중', date:'04-18' },
    { id:'PO-2026-0415', supplier:'LS일렉트릭', items:5, total:'₩3,640,000', status:'입고완료', date:'04-15' },
    { id:'PO-2026-0412', supplier:'오스람', items:4, total:'₩1,860,000', status:'입고완료', date:'04-12' },
    { id:'PO-2026-0410', supplier:'경원산업', items:1, total:'₩420,000', status:'승인대기', date:'04-10' },
  ];
  const sites = [
    { name:'종로현장', mgr:'박동욱', status:'진행중', items:14, due:'04-30' },
    { name:'강남현장', mgr:'최은혜', status:'진행중', items:8, due:'05-08' },
    { name:'연희동 공사', mgr:'이재혁', status:'자재대기', items:6, due:'05-02' },
    { name:'판교 현장', mgr:'정민수', status:'완료', items:0, due:'04-15' },
  ];
  const requests = [
    { id:'REQ-0421-03', site:'강남현장', who:'최은혜', items:'LED 50W × 12, 전선 4.0SQ × 200m', status:'승인대기', tone:'warning', when:'10분 전' },
    { id:'REQ-0421-02', site:'종로현장', who:'박동욱', items:'차단기 50A × 4', status:'승인', tone:'success', when:'2시간 전' },
    { id:'REQ-0421-01', site:'연희동 공사', who:'이재혁', items:'마그네틱 220V × 2', status:'출고완료', tone:'info', when:'어제' },
    { id:'REQ-0420-04', site:'판교 현장', who:'정민수', items:'박스 프로텍터 × 30', status:'보류', tone:'danger', when:'어제' },
  ];

  return { skus, lowStock, activity, orders, sites, requests };
})();

/* =========================
   Sidebar nav (desktop)
   ========================= */
window.SidebarNav = function SidebarNav({ active, onNavigate, theme, onToggleTheme, collapsed }) {
  const { Icon, IconBtn, Avatar } = window.UI;
  const sections = [
    { key:'home',     icon:<Icon.Dashboard/>, label:'대시보드' },
    { key:'inventory',icon:<Icon.Box/>,       label:'재고 목록' },
    { key:'inbound',  icon:<Icon.ArrowDown/>, label:'입고 관리' },
    { key:'outbound', icon:<Icon.ArrowUp/>,   label:'출고 관리' },
    { key:'orders',   icon:<Icon.Truck/>,     label:'발주/주문' },
    { key:'sites',    icon:<Icon.Hard/>,      label:'현장관리', badge: 4 },
    { key:'requests', icon:<Icon.Send/>,      label:'자재신청', badge: 3 },
    { key:'suppliers',icon:<Icon.Building/>,  label:'공급업체' },
    { key:'reports',  icon:<Icon.Chart/>,     label:'리포트/분석' },
    { key:'activity', icon:<Icon.Activity/>,  label:'활동 로그' },
    { key:'staff',    icon:<Icon.Users/>,     label:'직원·권한' },
  ];
  const w = collapsed ? 64 : 232;

  return (
    <aside style={{
      width: w, height:'100%', flexShrink:0,
      background:'var(--bg-surface)',
      borderRight:'1px solid var(--border-subtle)',
      display:'flex', flexDirection:'column',
      transition:'width 200ms ease',
    }}>
      {/* Brand */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 18px',
        display:'flex', alignItems:'center', gap:10,
        borderBottom:'1px solid var(--border-subtle)',
        height: 64,
      }}>
        <div style={{
          width:32, height:32, borderRadius:'var(--radius-md)',
          background:'var(--c-brand-500)', color:'#fff',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
        }}>
          <Icon.Warehouse size={18} stroke={2}/>
        </div>
        {!collapsed && (
          <div style={{minWidth:0}}>
            <div style={{
              fontFamily:'var(--font-display)', fontSize:15, fontWeight:600,
              letterSpacing:'-0.01em',
            }}>정원전기</div>
            <div style={{fontSize:11, color:'var(--fg-muted)'}}>재고관리 · v2.4</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{flex:1, padding:'10px 8px', overflow:'auto'}}>
        {sections.map(s => {
          const isActive = active === s.key;
          return (
            <button key={s.key} onClick={() => onNavigate?.(s.key)} style={{
              width:'100%', height: 36,
              padding: collapsed ? 0 : '0 10px',
              display:'flex', alignItems:'center', gap:10,
              borderRadius:'var(--radius-md)',
              background: isActive ? 'var(--c-brand-50)' : 'transparent',
              color: isActive ? 'var(--c-brand-700)' : 'var(--fg-muted)',
              border:'none', textAlign:'left',
              fontSize:13, fontWeight: isActive ? 600 : 500,
              marginBottom: 2,
              justifyContent: collapsed ? 'center' : 'flex-start',
              position:'relative',
            }}>
              <span style={{display:'inline-flex', flexShrink:0}}>{s.icon}</span>
              {!collapsed && <span style={{flex:1}}>{s.label}</span>}
              {!collapsed && s.badge != null && (
                <span style={{
                  fontSize: 11, padding:'1px 7px', borderRadius:'var(--radius-pill)',
                  background: isActive ? 'var(--c-brand-500)' : 'var(--bg-muted)',
                  color: isActive ? '#fff' : 'var(--fg-muted)',
                  fontWeight: 600,
                }}>{s.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? 8 : 12,
        borderTop:'1px solid var(--border-subtle)',
        display:'flex', alignItems:'center',
        gap: 10,
        flexDirection: collapsed ? 'column' : 'row',
      }}>
        <Avatar name="김" size={32}/>
        {!collapsed && (
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:13, fontWeight:600, lineHeight:1.2}}>김재호</div>
            <div style={{fontSize:11, color:'var(--fg-muted)'}}>창고관리자</div>
          </div>
        )}
        <IconBtn icon={theme==='dark'?<Icon.Sun size={16}/>:<Icon.Moon size={16}/>} onClick={onToggleTheme}/>
      </div>
    </aside>
  );
};

/* =========================
   Topbar (desktop)
   ========================= */
window.TopBar = function TopBar({ title, subtitle, actions, breadcrumbs }) {
  const { Icon, Input, IconBtn, Btn } = window.UI;
  return (
    <header style={{
      height: 64, padding:'0 24px',
      borderBottom:'1px solid var(--border-subtle)',
      display:'flex', alignItems:'center', gap: 16,
      background:'var(--bg-app)', flexShrink:0,
    }}>
      <div style={{flex: '1 1 auto', minWidth:0}}>
        {breadcrumbs && (
          <div style={{fontSize:12, color:'var(--fg-muted)', marginBottom:2}}>{breadcrumbs}</div>
        )}
        <div style={{
          fontFamily:'var(--font-display)', fontSize: 19, fontWeight: 600,
          letterSpacing:'-0.015em',
        }}>{title}</div>
        {subtitle && <div style={{fontSize:12.5, color:'var(--fg-muted)', marginTop:2}}>{subtitle}</div>}
      </div>
      <Input icon={<Icon.Search size={16}/>} placeholder="SKU, 품명, 발주번호 검색..." size="md" style={{width: 280}}/>
      <IconBtn icon={<span style={{position:'relative'}}><Icon.Bell/><span style={{position:'absolute', top:-1, right:-1, width:7, height:7, borderRadius:'50%', background:'var(--c-danger)'}}/></span>}/>
      <IconBtn icon={<Icon.Settings/>}/>
      {actions}
    </header>
  );
};

/* =========================
   Mobile bottom nav
   ========================= */
window.MobileNav = function MobileNav({ active, onNavigate }) {
  const { Icon } = window.UI;
  const tabs = [
    { key:'home',     icon:<Icon.Home/>,      label:'홈' },
    { key:'inventory',icon:<Icon.Box/>,       label:'재고' },
    { key:'scan',     icon:<Icon.Scan size={26}/>, label:'스캔', primary:true },
    { key:'requests', icon:<Icon.Send/>,      label:'신청' },
    { key:'me',       icon:<Icon.Users/>,     label:'내 정보' },
  ];
  return (
    <nav style={{
      height: 72, paddingBottom: 12,
      background:'var(--bg-surface)',
      borderTop:'1px solid var(--border-subtle)',
      display:'flex', alignItems:'stretch', justifyContent:'space-around',
      flexShrink:0,
    }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        if (t.primary) return (
          <button key={t.key} onClick={() => onNavigate?.(t.key)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            border:'none', background:'transparent', flex:1, cursor:'pointer',
            color:'var(--fg-on-brand)', position:'relative',
          }}>
            <span style={{
              width:52, height:52, borderRadius:'50%',
              background:'var(--c-brand-500)', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 8px 18px -6px rgba(201, 100, 66, 0.55)',
              transform:'translateY(-12px)',
            }}>{t.icon}</span>
            <span style={{fontSize:10.5, color:'var(--fg-muted)', marginTop:-6}}>{t.label}</span>
          </button>
        );
        return (
          <button key={t.key} onClick={() => onNavigate?.(t.key)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            paddingTop: 10,
            border:'none', background:'transparent', flex:1, cursor:'pointer',
            color: isActive ? 'var(--c-brand-600)' : 'var(--fg-muted)',
          }}>
            <span style={{display:'inline-flex'}}>{t.icon}</span>
            <span style={{fontSize:10.5, fontWeight: isActive ? 600 : 500}}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/* =========================
   Mobile top bar
   ========================= */
window.MobileTop = function MobileTop({ title, leading, trailing, sub }) {
  const { Icon, IconBtn } = window.UI;
  return (
    <header style={{
      height: sub ? 88 : 56, padding:'0 12px',
      display:'flex', alignItems:'center', gap: 8,
      background:'var(--bg-app)',
      borderBottom:'1px solid var(--border-subtle)',
      flexShrink:0,
    }}>
      {leading || <IconBtn icon={<Icon.Menu/>}/>}
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:15, fontWeight:600, fontFamily:'var(--font-display)', letterSpacing:'-0.01em'}}>{title}</div>
        {sub && <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2}}>{sub}</div>}
      </div>
      {trailing}
    </header>
  );
};
