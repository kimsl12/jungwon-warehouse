// Additional desktop screens: Outbound, Suppliers, Staff/Permissions
const { useState: useStateD2 } = React;

/* =========================
   Outbound (출고)
   ========================= */
window.DesktopOutbound = function DesktopOutbound() {
  const { Icon, Card, Btn, Input, StatusBadge, IconBtn, Avatar } = window.UI;

  const queue = [
    { id:'OUT-2026-0421-04', site:'강남현장', mgr:'최은혜', items:[
      { name:'LED 다운라이트 50W', sku:'JW-LD-50W', qty:12, unit:'EA' },
      { name:'4.0SQ 전선 케이블', sku:'JW-CB-4.0SQ', qty:200, unit:'m' },
    ], status:'피킹중', tone:'info', priority:'긴급', when:'10분 전' },
    { id:'OUT-2026-0421-03', site:'종로현장', mgr:'박동욱', items:[
      { name:'배선용 차단기 50A', sku:'JW-BR-50A', qty:4, unit:'EA' },
    ], status:'대기', tone:'warning', priority:'일반', when:'30분 전' },
    { id:'OUT-2026-0421-02', site:'연희동 공사', mgr:'이재혁', items:[
      { name:'마그네틱 컨택터 220V', sku:'JW-MC-220V', qty:2, unit:'EA' },
      { name:'2.5SQ 전선 케이블', sku:'JW-CB-2.5SQ', qty:150, unit:'m' },
    ], status:'출고완료', tone:'success', priority:'일반', when:'2시간 전' },
    { id:'OUT-2026-0421-01', site:'판교 현장', mgr:'정민수', items:[
      { name:'LED 고천장등 100W', sku:'JW-LD-100W', qty:8, unit:'EA' },
    ], status:'출고완료', tone:'success', priority:'일반', when:'어제' },
  ];

  return (
    <div style={{padding:'20px 24px 28px', display:'grid', gridTemplateColumns:'1fr 360px', gap:20, overflow:'auto', flex:1, alignContent:'flex-start'}}>
      {/* Left: outbound queue */}
      <div style={{display:'flex', flexDirection:'column', gap:16, minWidth:0}}>
        {/* Stats strip */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12}}>
          {[
            { label:'오늘 출고 예정', value:'8', tone:'info' },
            { label:'피킹 중', value:'2', tone:'warning' },
            { label:'완료', value:'6', tone:'success' },
            { label:'금일 출고가', value:'₩4.2M', tone:'brand' },
          ].map((k, i) => (
            <div key={i} style={{
              padding:'14px 16px', background:'var(--bg-surface)',
              border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)',
            }}>
              <div style={{fontSize:12, color:'var(--fg-muted)', fontWeight:500}}>{k.label}</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:6}}>
                <div style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>{k.value}</div>
                <StatusBadge tone={k.tone}>활성</StatusBadge>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <Input icon={<Icon.Search size={16}/>} placeholder="출고번호, 현장명 검색" style={{width:280}}/>
          <div style={{display:'flex', gap:4, padding:3, background:'var(--bg-muted)', borderRadius:'var(--radius-md)'}}>
            {['전체', '대기', '피킹중', '완료'].map((c, i) => (
              <button key={c} style={{
                padding:'6px 12px', fontSize:12.5, fontWeight: i===0?600:500,
                background: i===0?'var(--bg-surface)':'transparent',
                border:'none', borderRadius:'var(--radius-sm)',
                color: i===0?'var(--fg-default)':'var(--fg-muted)',
                boxShadow: i===0?'var(--shadow-xs)':'none', cursor:'pointer',
              }}>{c}</button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <Btn size="md" variant="secondary" icon={<Icon.Scan size={14}/>}>스캔 출고</Btn>
          <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>출고 등록</Btn>
        </div>

        {/* Cards */}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {queue.map(o => (
            <Card key={o.id} padding={0}>
              <div style={{padding:'16px 20px', display:'grid', gridTemplateColumns:'auto 1fr auto', gap:16, alignItems:'center', borderBottom:'1px solid var(--border-subtle)'}}>
                <div style={{
                  width:44, height:44, borderRadius:'var(--radius-md)',
                  background:'var(--c-brand-50)', color:'var(--c-brand-600)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}><Icon.ArrowUp/></div>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:3}}>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--fg-muted)'}}>{o.id}</div>
                    {o.priority==='긴급' && <StatusBadge tone="danger" dot>긴급</StatusBadge>}
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:12}}>
                    <div style={{fontWeight:600, fontSize:14}}>{o.site}</div>
                    <div style={{fontSize:12, color:'var(--fg-muted)', display:'inline-flex', alignItems:'center', gap:6}}>
                      <Avatar name={o.mgr} size={18}/> {o.mgr}
                    </div>
                    <div style={{fontSize:12, color:'var(--fg-subtle)'}}>· {o.when}</div>
                  </div>
                </div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <StatusBadge tone={o.tone} dot>{o.status}</StatusBadge>
                  <IconBtn size={32} icon={<Icon.More size={16}/>}/>
                </div>
              </div>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
                <tbody>
                  {o.items.map((it, i) => (
                    <tr key={i} style={{borderTop: i?'1px solid var(--border-subtle)':'none'}}>
                      <td style={{padding:'10px 20px', width:'50%'}}>
                        <div style={{fontWeight:500}}>{it.name}</div>
                        <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)', marginTop:2}}>{it.sku}</div>
                      </td>
                      <td style={{padding:'10px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600}}>
                        {it.qty.toLocaleString()} <span style={{fontSize:11, color:'var(--fg-muted)', fontWeight:500}}>{it.unit}</span>
                      </td>
                      <td style={{padding:'10px 20px', width:120, textAlign:'right'}}>
                        {o.status === '출고완료'
                          ? <StatusBadge tone="success" dot>완료</StatusBadge>
                          : o.status === '피킹중'
                            ? <StatusBadge tone="info">피킹중</StatusBadge>
                            : <StatusBadge tone="neutral">대기</StatusBadge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {o.status !== '출고완료' && (
                <div style={{padding:'12px 20px', display:'flex', justifyContent:'flex-end', gap:8, background:'var(--bg-muted)'}}>
                  <Btn size="sm" variant="secondary">송장 인쇄</Btn>
                  <Btn size="sm" variant="primary">출고 확정</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Right: quick outbound form */}
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        <Card>
          <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:14}}>빠른 출고</div>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <Field2 label="현장 선택">
              <Input icon={<Icon.Hard size={14}/>} placeholder="강남현장 / 종로현장..." full/>
            </Field2>
            <Field2 label="요청자">
              <Input placeholder="현장 담당자" full/>
            </Field2>
            <Field2 label="품목">
              <Input icon={<Icon.Box size={14}/>} placeholder="SKU 또는 품명" full/>
            </Field2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <Field2 label="수량"><Input placeholder="0" full/></Field2>
              <Field2 label="픽업 위치"><Input icon={<Icon.Tag size={14}/>} placeholder="A-01-03" full/></Field2>
            </div>
            <Field2 label="비고"><Input placeholder="선택" full/></Field2>
            <Btn size="md" variant="primary" full>출고 등록</Btn>
          </div>
        </Card>

        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div style={{fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600}}>최근 7일 출고</div>
          </div>
          {[
            { name:'2.5SQ 전선', val:'1,840m', pct: 92 },
            { name:'LED 50W', val:'124EA', pct: 78 },
            { name:'차단기 50A', val:'48EA', pct: 54 },
            { name:'마그네틱 220V', val:'18EA', pct: 32 },
            { name:'박스 프로텍터', val:'92EA', pct: 22 },
          ].map((r, i) => (
            <div key={i} style={{padding:'8px 0'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5}}>
                <span style={{fontWeight:500}}>{r.name}</span>
                <span style={{color:'var(--fg-muted)', fontVariantNumeric:'tabular-nums'}}>{r.val}</span>
              </div>
              <div style={{height:5, background:'var(--bg-muted)', borderRadius:3, overflow:'hidden'}}>
                <div style={{width:`${r.pct}%`, height:'100%', background:'var(--c-brand-500)', opacity:0.5+r.pct/200, borderRadius:3}}/>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

function Field2({ label, children }) {
  return (
    <div>
      <div style={{fontSize:12, fontWeight:500, color:'var(--fg-muted)', marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
}

/* =========================
   Suppliers (공급업체)
   ========================= */
window.DesktopSuppliers = function DesktopSuppliers() {
  const { Icon, Card, Btn, Input, StatusBadge, IconBtn, Avatar, Sparkline } = window.UI;
  const [selected, setSelected] = useStateD2(0);

  const suppliers = [
    { name:'대한전선', code:'SUP-001', tier:'A', contact:'이정훈', phone:'010-2234-5678', items:24, lead:5, ytd:'₩42.8M', tone:'success', trend:[12,14,18,16,22,20,26,24,28,32,30,38] },
    { name:'LS일렉트릭', code:'SUP-002', tier:'A', contact:'김선우', phone:'010-3456-7890', items:18, lead:7, ytd:'₩28.4M', tone:'success', trend:[8,10,9,12,14,12,16,18,15,20,22,24] },
    { name:'오스람', code:'SUP-003', tier:'B', contact:'박지민', phone:'010-4567-1234', items:12, lead:10, ytd:'₩14.2M', tone:'info', trend:[4,6,5,7,8,6,9,8,10,11,9,12] },
    { name:'현대일렉트릭', code:'SUP-004', tier:'B', contact:'최영준', phone:'010-5678-2345', items:9, lead:12, ytd:'₩9.6M', tone:'info', trend:[3,4,3,5,6,4,5,7,6,8,7,9] },
    { name:'삼화전선', code:'SUP-005', tier:'B', contact:'정수아', phone:'010-6789-3456', items:6, lead:14, ytd:'₩6.4M', tone:'info', trend:[2,3,2,4,3,5,4,5,6,5,7,6] },
    { name:'한국다퍼', code:'SUP-006', tier:'C', contact:'홍성민', phone:'010-7890-4567', items:4, lead:18, ytd:'₩2.8M', tone:'warning', trend:[1,2,1,3,2,2,3,2,4,3,4,3] },
    { name:'경원산업', code:'SUP-007', tier:'C', contact:'장혜진', phone:'010-8901-5678', items:3, lead:21, ytd:'₩1.4M', tone:'warning', trend:[1,1,2,1,2,1,2,2,3,1,2,3] },
  ];
  const s = suppliers[selected];

  return (
    <div style={{padding:'20px 24px 28px', display:'grid', gridTemplateColumns:'1fr 380px', gap:20, overflow:'auto', flex:1, alignContent:'flex-start'}}>
      <div style={{display:'flex', flexDirection:'column', gap:14, minWidth:0}}>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <Input icon={<Icon.Search size={16}/>} placeholder="업체명, 담당자 검색" style={{width:280}}/>
          <Btn size="md" variant="secondary" icon={<Icon.Filter size={14}/>}>등급</Btn>
          <div style={{flex:1}}/>
          <Btn size="md" variant="secondary" icon={<Icon.Download size={14}/>}>내보내기</Btn>
          <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>업체 등록</Btn>
        </div>

        <Card padding={0}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead style={{background:'var(--bg-muted)'}}>
              <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
                <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>업체</th>
                <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>담당자</th>
                <th style={{textAlign:'right', padding:'10px 20px', fontWeight:500}}>등급</th>
                <th style={{textAlign:'right', padding:'10px 20px', fontWeight:500}}>취급품목</th>
                <th style={{textAlign:'right', padding:'10px 20px', fontWeight:500}}>리드타임</th>
                <th style={{textAlign:'right', padding:'10px 20px', fontWeight:500}}>YTD</th>
                <th style={{padding:'10px 20px', width:120}}>거래 추이</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((sp, i) => (
                <tr key={sp.code} onClick={()=>setSelected(i)} style={{
                  borderTop:'1px solid var(--border-subtle)',
                  background: selected===i ? 'var(--c-brand-50)' : 'transparent',
                  cursor:'pointer',
                }} className="row-hover">
                  <td style={{padding:'14px 20px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div style={{
                        width:36, height:36, borderRadius:'var(--radius-md)',
                        background: selected===i ? 'var(--c-brand-100)' : 'var(--bg-muted)',
                        color: selected===i ? 'var(--c-brand-700)' : 'var(--fg-muted)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}><Icon.Building size={16}/></div>
                      <div>
                        <div style={{fontWeight:600}}>{sp.name}</div>
                        <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)', marginTop:2}}>{sp.code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'14px 20px'}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <Avatar name={sp.contact} size={22}/>
                      <div>
                        <div style={{fontWeight:500, fontSize:12.5}}>{sp.contact}</div>
                        <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)'}}>{sp.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'14px 20px', textAlign:'right'}}>
                    <StatusBadge tone={sp.tier==='A'?'success':sp.tier==='B'?'info':'warning'}>{sp.tier}등급</StatusBadge>
                  </td>
                  <td style={{padding:'14px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{sp.items}건</td>
                  <td style={{padding:'14px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--fg-muted)'}}>{sp.lead}일</td>
                  <td style={{padding:'14px 20px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600}}>{sp.ytd}</td>
                  <td style={{padding:'14px 20px', width:120}}>
                    <Sparkline data={sp.trend} height={28} fill="var(--c-brand-500)"/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Detail panel */}
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        <Card>
          <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
            <div style={{
              width:48, height:48, borderRadius:'var(--radius-md)',
              background:'var(--c-brand-50)', color:'var(--c-brand-600)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}><Icon.Building/></div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, letterSpacing:'-0.01em'}}>{s.name}</div>
              <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>{s.code} · {s.tier}등급 협력사</div>
            </div>
            <IconBtn size={32} icon={<Icon.More size={16}/>}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14}}>
            <KV label="담당자" value={s.contact}/>
            <KV label="연락처" value={s.phone} mono/>
            <KV label="평균 리드타임" value={`${s.lead}일`}/>
            <KV label="YTD 거래액" value={s.ytd}/>
          </div>
          <div style={{display:'flex', gap:8}}>
            <Btn size="md" variant="secondary" icon={<Icon.Send size={14}/>} full>발주 보내기</Btn>
            <Btn size="md" variant="primary" full>상세 보기</Btn>
          </div>
        </Card>

        <Card>
          <div style={{fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, marginBottom:12}}>최근 발주 내역</div>
          {[
            { id:'PO-2026-0421', date:'04-21', status:'입고예정', tone:'brand' },
            { id:'PO-2026-0418', date:'04-18', status:'운송중', tone:'info' },
            { id:'PO-2026-0405', date:'04-05', status:'입고완료', tone:'success' },
            { id:'PO-2026-0322', date:'03-22', status:'입고완료', tone:'success' },
          ].map((p, i) => (
            <div key={p.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderTop: i?'1px dashed var(--border-subtle)':'none'}}>
              <div>
                <div style={{fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600}}>{p.id}</div>
                <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2, fontVariantNumeric:'tabular-nums'}}>2026-{p.date}</div>
              </div>
              <StatusBadge tone={p.tone} dot>{p.status}</StatusBadge>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{fontFamily:'var(--font-display)', fontSize:14.5, fontWeight:600, marginBottom:12}}>주요 취급 품목</div>
          {[
            { name:'2.5SQ 전선 케이블', sku:'JW-CB-2.5SQ' },
            { name:'4.0SQ 전선 케이블', sku:'JW-CB-4.0SQ' },
            { name:'전선관 1.5T', sku:'JW-CC-1.5T' },
          ].map((it, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop: i?'1px dashed var(--border-subtle)':'none'}}>
              <div style={{
                width:30, height:30, borderRadius:'var(--radius-sm)',
                background:'var(--bg-muted)', color:'var(--fg-muted)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}><Icon.Box size={14}/></div>
              <div style={{flex:1}}>
                <div style={{fontSize:13, fontWeight:500}}>{it.name}</div>
                <div style={{fontSize:11, color:'var(--fg-muted)', fontFamily:'var(--font-mono)'}}>{it.sku}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

function KV({ label, value, mono }) {
  return (
    <div>
      <div style={{fontSize:11, color:'var(--fg-muted)', fontWeight:500, marginBottom:3}}>{label}</div>
      <div style={{fontSize:13, fontWeight:600, fontFamily: mono ? 'var(--font-mono)' : undefined}}>{value}</div>
    </div>
  );
}

/* =========================
   Staff & Permissions (직원·권한)
   ========================= */
window.DesktopStaff = function DesktopStaff() {
  const { Icon, Card, Btn, Input, StatusBadge, IconBtn, Avatar } = window.UI;
  const [tab, setTab] = useStateD2('members');

  const members = [
    { name:'김재호', email:'jaeho@jungwon.kr', role:'창고관리자', dept:'재고팀', active:true,  last:'방금 전' },
    { name:'이정훈', email:'jh.lee@jungwon.kr', role:'관리자',     dept:'경영지원', active:true, last:'10분 전' },
    { name:'박동욱', email:'dwpark@jungwon.kr', role:'현장직원',   dept:'종로현장', active:true, last:'1시간 전' },
    { name:'최은혜', email:'choieh@jungwon.kr', role:'현장직원',   dept:'강남현장', active:true, last:'2시간 전' },
    { name:'이재혁', email:'jhlee@jungwon.kr',  role:'현장직원',   dept:'연희동',   active:true, last:'어제' },
    { name:'정민수', email:'jms@jungwon.kr',    role:'현장직원',   dept:'판교',     active:false, last:'2주 전' },
    { name:'홍성민', email:'sm.hong@jungwon.kr',role:'구매',      dept:'경영지원', active:true, last:'30분 전' },
  ];

  const roles = [
    { name:'관리자', color:'var(--c-brand-500)', members:1, desc:'전 권한 · 시스템 설정 가능',
      perms:[true, true, true, true, true, true, true, true] },
    { name:'창고관리자', color:'var(--c-info)', members:1, desc:'재고/발주/출고 모든 작업 가능',
      perms:[true, true, true, true, true, false, true, false] },
    { name:'구매', color:'var(--c-success)', members:1, desc:'발주 작성·승인·공급업체 관리',
      perms:[true, false, false, true, true, true, false, false] },
    { name:'현장직원', color:'var(--c-warning)', members:4, desc:'재고조회·자재신청·바코드 스캔',
      perms:[true, false, false, false, false, false, false, false] },
  ];
  const permLabels = ['재고 조회', '재고 수정', '입고 등록', '발주 작성', '발주 승인', '공급업체 관리', '리포트 조회', '직원 관리'];

  return (
    <div style={{padding:'20px 24px 28px', display:'flex', flexDirection:'column', gap:16, overflow:'auto', flex:1}}>
      {/* Tabs */}
      <div style={{display:'flex', gap:4, padding:3, background:'var(--bg-muted)', borderRadius:'var(--radius-md)', alignSelf:'flex-start'}}>
        {[
          { k:'members', l:'직원 (7)' },
          { k:'roles',   l:'역할 (4)' },
          { k:'audit',   l:'권한 변경 로그' },
        ].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'7px 16px', fontSize:13, fontWeight: tab===t.k?600:500,
            background: tab===t.k?'var(--bg-surface)':'transparent',
            border:'none', borderRadius:'var(--radius-sm)',
            color: tab===t.k?'var(--fg-default)':'var(--fg-muted)',
            boxShadow: tab===t.k?'var(--shadow-xs)':'none', cursor:'pointer',
          }}>{t.l}</button>
        ))}
      </div>

      {tab==='members' && (
        <>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <Input icon={<Icon.Search size={16}/>} placeholder="이름, 이메일, 부서 검색" style={{width:280}}/>
            <Btn size="md" variant="secondary" icon={<Icon.Filter size={14}/>}>역할</Btn>
            <div style={{flex:1}}/>
            <Btn size="md" variant="secondary" icon={<Icon.Upload size={14}/>}>일괄 초대</Btn>
            <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>직원 추가</Btn>
          </div>
          <Card padding={0}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
              <thead style={{background:'var(--bg-muted)'}}>
                <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500, width:32}}><input type="checkbox"/></th>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>이름</th>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>이메일</th>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>역할</th>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>부서/현장</th>
                  <th style={{textAlign:'left', padding:'10px 20px', fontWeight:500}}>상태</th>
                  <th style={{textAlign:'right', padding:'10px 20px', fontWeight:500}}>최근 접속</th>
                  <th style={{padding:'10px 20px', width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.email} style={{borderTop:'1px solid var(--border-subtle)'}} className="row-hover">
                    <td style={{padding:'12px 20px'}}><input type="checkbox"/></td>
                    <td style={{padding:'12px 20px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <Avatar name={m.name} size={32}/>
                        <div style={{fontWeight:600}}>{m.name}</div>
                      </div>
                    </td>
                    <td style={{padding:'12px 20px', color:'var(--fg-muted)', fontFamily:'var(--font-mono)', fontSize:12}}>{m.email}</td>
                    <td style={{padding:'12px 20px'}}>
                      <StatusBadge tone={m.role==='관리자'?'brand':m.role==='창고관리자'?'info':m.role==='구매'?'success':'warning'}>{m.role}</StatusBadge>
                    </td>
                    <td style={{padding:'12px 20px', color:'var(--fg-muted)'}}>{m.dept}</td>
                    <td style={{padding:'12px 20px'}}>
                      <StatusBadge tone={m.active?'success':'neutral'} dot>{m.active?'활성':'비활성'}</StatusBadge>
                    </td>
                    <td style={{padding:'12px 20px', textAlign:'right', color:'var(--fg-muted)', fontSize:12}}>{m.last}</td>
                    <td style={{padding:'12px 20px'}}><IconBtn size={28} icon={<Icon.More size={16}/>}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab==='roles' && (
        <>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <div style={{flex:1}}/>
            <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>역할 추가</Btn>
          </div>

          <Card padding={0} style={{overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
              <thead style={{background:'var(--bg-muted)'}}>
                <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
                  <th style={{textAlign:'left', padding:'12px 20px', fontWeight:500, width:280}}>역할</th>
                  {permLabels.map(p => (
                    <th key={p} style={{textAlign:'center', padding:'12px 8px', fontWeight:500, fontSize:10.5}}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.name} style={{borderTop:'1px solid var(--border-subtle)'}}>
                    <td style={{padding:'18px 20px'}}>
                      <div style={{display:'flex', alignItems:'center', gap:12}}>
                        <div style={{
                          width:8, height:36, borderRadius:4, background:r.color,
                        }}/>
                        <div>
                          <div style={{fontWeight:600, fontSize:14, marginBottom:2}}>
                            {r.name} <span style={{fontSize:11.5, color:'var(--fg-muted)', fontWeight:500}}>· {r.members}명</span>
                          </div>
                          <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>{r.desc}</div>
                        </div>
                      </div>
                    </td>
                    {r.perms.map((on, i) => (
                      <td key={i} style={{padding:'18px 8px', textAlign:'center'}}>
                        {on
                          ? <span style={{
                              display:'inline-flex', width:22, height:22, borderRadius:6,
                              background:'var(--c-success-bg)', color:'var(--c-success)',
                              alignItems:'center', justifyContent:'center',
                            }}><Icon.Check size={14} stroke={2.5}/></span>
                          : <span style={{
                              display:'inline-flex', width:22, height:22, borderRadius:6,
                              background:'var(--bg-muted)', color:'var(--fg-subtle)',
                              alignItems:'center', justifyContent:'center',
                            }}><Icon.Minus size={14}/></span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab==='audit' && (
        <Card padding={0}>
          <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div>
              <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600}}>권한 변경 로그</div>
              <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>최근 30일 내 권한 관련 변경 내역</div>
            </div>
            <Btn size="sm" variant="secondary" icon={<Icon.Download size={14}/>}>CSV</Btn>
          </div>
          {[
            { who:'이정훈', act:'역할 변경', target:'박동욱 → 현장직원', when:'04-21 14:32' },
            { who:'이정훈', act:'직원 추가', target:'홍성민 (구매)', when:'04-19 10:15' },
            { who:'김재호', act:'권한 부여', target:'창고관리자: 발주 승인', when:'04-15 16:48' },
            { who:'이정훈', act:'직원 비활성', target:'정민수', when:'04-12 09:22' },
            { who:'시스템', act:'역할 추가', target:'구매', when:'04-08 11:00' },
          ].map((a, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, padding:'14px 20px', alignItems:'center', borderTop: i?'1px solid var(--border-subtle)':'none'}}>
              <Avatar name={a.who} size={32}/>
              <div>
                <div style={{fontSize:13, marginBottom:3}}>
                  <strong style={{fontWeight:600}}>{a.who}</strong>
                  <span style={{color:'var(--fg-muted)'}}> 님이 </span>
                  <StatusBadge tone="info">{a.act}</StatusBadge>
                  <span style={{color:'var(--fg-muted)'}}> 했습니다</span>
                </div>
                <div style={{fontSize:12, color:'var(--fg-muted)'}}>{a.target}</div>
              </div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)', fontVariantNumeric:'tabular-nums'}}>{a.when}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

Object.assign(window, {
  DesktopOutbound: window.DesktopOutbound,
  DesktopSuppliers: window.DesktopSuppliers,
  DesktopStaff: window.DesktopStaff,
});
