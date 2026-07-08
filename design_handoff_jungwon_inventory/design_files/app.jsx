// Main composition — desktop & mobile artboards on a design canvas
const { useState: useStateApp } = React;

/* =========================
   Desktop product shell (interactive)
   ========================= */
function DesktopApp({ initialNav = 'home', initialTheme = 'light', collapsed }) {
  const [nav, setNav] = useStateApp(initialNav);
  const [theme, setTheme] = useStateApp(initialTheme);
  const { Frame } = window.UI;

  const titles = {
    home: ['대시보드', '오늘 입고 5건 · 출고 3건 · 부족 7건'],
    inventory: ['재고 목록', '전체 1,284 SKU · 부족 7건'],
    inbound: ['입고 관리', '오늘 예정 3건'],
    outbound: ['출고 관리', '오늘 예정 2건'],
    orders: ['발주 / 주문 관리', '진행 중 5건'],
    sites: ['현장 관리 · 자재 신청', '활성 현장 3곳 · 신청 대기 3건'],
    requests: ['자재 신청', '신청 대기 3건'],
    suppliers: ['공급업체', '협력사 7곳 · A등급 2'],
    reports: ['리포트 / 분석', '월간 · 2026-04'],
    activity: ['활동 로그', '오늘 32건'],
    staff: ['직원 · 권한', '활성 직원 6명 · 역할 4개'],
  };
  const [t, sub] = titles[nav] || titles.home;

  const Screen = {
    home: window.DesktopDashboard,
    inventory: window.DesktopInventory,
    inbound: window.DesktopInbound,
    outbound: window.DesktopOutbound,
    orders: window.DesktopOrders,
    sites: window.DesktopSites,
    requests: window.DesktopSites,
    suppliers: window.DesktopSuppliers,
    reports: window.DesktopReports,
    activity: window.DesktopDashboard,
    staff: window.DesktopStaff,
  }[nav] || window.DesktopDashboard;

  return (
    <Frame theme={theme}>
      <div style={{display:'flex', height:'100%', width:'100%'}}>
        <window.SidebarNav
          active={nav}
          onNavigate={setNav}
          theme={theme}
          onToggleTheme={() => setTheme(theme==='light'?'dark':'light')}
          collapsed={collapsed}
        />
        <main style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, height:'100%'}}>
          <window.TopBar title={t} subtitle={sub}/>
          <Screen/>
        </main>
      </div>
    </Frame>
  );
}

/* =========================
   Mobile shell
   ========================= */
function MobileApp({ initialNav='home', initialTheme='light' }) {
  const [nav, setNav] = useStateApp(initialNav);
  const [theme, setTheme] = useStateApp(initialTheme);
  const { Frame, Icon, IconBtn } = window.UI;

  const Screen = {
    home: window.MobileHome,
    inventory: window.MobileInventory,
    scan: window.MobileScan,
    requests: window.MobileRequests,
    me: window.MobileHome,
  }[nav] || window.MobileHome;

  const titles = {
    home: ['정원전기 재고관리', '오늘 입고 24 · 출고 18'],
    inventory: ['재고 목록', null],
    scan: [null, null],
    requests: ['자재 신청', null],
    me: ['내 정보', null],
  };
  const [t, sub] = titles[nav] || titles.home;

  const showTop = nav !== 'scan';

  return (
    <Frame theme={theme}>
      <div style={{display:'flex', flexDirection:'column', height:'100%', width:'100%', position:'relative'}}>
        {showTop && (
          <window.MobileTop
            title={t}
            sub={sub}
            trailing={
              <IconBtn icon={theme==='dark'?<Icon.Sun size={18}/>:<Icon.Moon size={18}/>} onClick={() => setTheme(theme==='light'?'dark':'light')}/>
            }
          />
        )}
        <Screen/>
        <window.MobileNav active={nav} onNavigate={setNav}/>
      </div>
    </Frame>
  );
}

/* =========================
   App: design canvas of artboards
   ========================= */
function App() {
  const { DesignCanvas, DCSection, DCArtboard } = window;

  return (
    <DesignCanvas>

      <DCSection id="web-light" title="웹 (데스크톱) — Light 모드" subtitle="기본 사이드바 + 카드형 레이아웃. 사이드바 항목을 눌러 페이지 전환을 확인할 수 있어요.">
        <DCArtboard id="web-dashboard" label="01 · 대시보드" width={1280} height={820}>
          <DesktopApp initialNav="home" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-inventory" label="02 · 재고 목록" width={1280} height={820}>
          <DesktopApp initialNav="inventory" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-inbound" label="03 · 입고 관리" width={1280} height={820}>
          <DesktopApp initialNav="inbound" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-orders" label="04 · 발주 관리" width={1280} height={820}>
          <DesktopApp initialNav="orders" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-sites" label="05 · 현장 + 자재신청" width={1280} height={820}>
          <DesktopApp initialNav="sites" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-reports" label="06 · 리포트" width={1280} height={820}>
          <DesktopApp initialNav="reports" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-outbound" label="07 · 출고 관리" width={1280} height={820}>
          <DesktopApp initialNav="outbound" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-suppliers" label="08 · 공급업체" width={1280} height={820}>
          <DesktopApp initialNav="suppliers" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="web-staff" label="09 · 직원·권한" width={1280} height={820}>
          <DesktopApp initialNav="staff" initialTheme="light"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="web-dark" title="웹 (데스크톱) — Dark 모드" subtitle="동일한 디자인 시스템 위에서 다크 토큰 적용. 사이드바 하단 토글로 직접 전환도 가능합니다.">
        <DCArtboard id="web-dark-dashboard" label="대시보드 (Dark)" width={1280} height={820}>
          <DesktopApp initialNav="home" initialTheme="dark"/>
        </DCArtboard>
        <DCArtboard id="web-dark-inventory" label="재고 목록 (Dark)" width={1280} height={820}>
          <DesktopApp initialNav="inventory" initialTheme="dark"/>
        </DCArtboard>
        <DCArtboard id="web-dark-collapsed" label="대시보드 (Dark · 접힌 사이드바)" width={1100} height={820}>
          <DesktopApp initialNav="home" initialTheme="dark" collapsed/>
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile-light" title="모바일 웹 — Light 모드" subtitle="현장 직원용 모바일 화면. 하단 탭으로 화면 전환, FAB로 신규 신청. 가운데 스캔 버튼은 카메라형 화면을 띄웁니다.">
        <DCArtboard id="m-home" label="홈" width={390} height={780}>
          <MobileApp initialNav="home" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="m-inventory" label="재고 목록" width={390} height={780}>
          <MobileApp initialNav="inventory" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="m-scan" label="바코드 스캔" width={390} height={780}>
          <MobileApp initialNav="scan" initialTheme="light"/>
        </DCArtboard>
        <DCArtboard id="m-requests" label="자재 신청" width={390} height={780}>
          <MobileApp initialNav="requests" initialTheme="light"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile-dark" title="모바일 웹 — Dark 모드" subtitle="어두운 환경/현장 야간 작업 가정.">
        <DCArtboard id="m-home-dark" label="홈 (Dark)" width={390} height={780}>
          <MobileApp initialNav="home" initialTheme="dark"/>
        </DCArtboard>
        <DCArtboard id="m-inventory-dark" label="재고 목록 (Dark)" width={390} height={780}>
          <MobileApp initialNav="inventory" initialTheme="dark"/>
        </DCArtboard>
        <DCArtboard id="m-requests-dark" label="자재 신청 (Dark)" width={390} height={780}>
          <MobileApp initialNav="requests" initialTheme="dark"/>
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
