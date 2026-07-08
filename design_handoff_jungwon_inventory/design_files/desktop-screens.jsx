// Desktop screens for the inventory system
const { useState: useStateD, useMemo: useMemoD } = React;

/* =========================
   1) Dashboard
   ========================= */
window.DesktopDashboard = function DesktopDashboard() {
  const { Icon, KPI, Card, StatusBadge, Btn, IconBtn, Sparkline, MiniBars, Avatar } = window.UI;
  const { skus, lowStock, activity, sites } = window.MOCK;

  return (
    <div style={{padding:'20px 24px 28px', display:'flex', flexDirection:'column', gap:20, overflow:'auto', flex:1}}>
      {/* KPI row */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16}}>
        <KPI label="총 재고 SKU" value="1,284" delta="+12" deltaTone="success" icon={<Icon.Box size={16}/>}/>
        <KPI label="재고 가치" value="₩148.2M" delta="+3.4%" deltaTone="success" icon={<Icon.Chart size={16}/>}/>
        <KPI label="재고 부족" value="7" delta="+2" deltaTone="danger" icon={<Icon.Bell size={16}/>}/>
        <KPI label="진행 중 발주" value="5" delta="2건 입고예정" deltaTone="info" icon={<Icon.Truck size={16}/>}/>
      </div>

      {/* Trends + sites */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16}}>
        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14}}>
            <div>
              <div style={{fontSize:13, color:'var(--fg-muted)', fontWeight:500}}>입출고 추이</div>
              <div style={{fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.015em', marginTop:2}}>
                지난 14일
              </div>
            </div>
            <div style={{display:'flex', gap:6}}>
              <Btn size="sm" variant="ghost">7일</Btn>
              <Btn size="sm" variant="secondary">14일</Btn>
              <Btn size="sm" variant="ghost">30일</Btn>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'flex-end', gap:24, marginBottom:8}}>
            <div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>입고</div>
              <div style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:'var(--c-success)', fontVariantNumeric:'tabular-nums'}}>3,840<span style={{fontSize:13, color:'var(--fg-muted)', marginLeft:4}}>건</span></div>
            </div>
            <div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>출고</div>
              <div style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:600, color:'var(--c-brand-600)', fontVariantNumeric:'tabular-nums'}}>2,612<span style={{fontSize:13, color:'var(--fg-muted)', marginLeft:4}}>건</span></div>
            </div>
            <div style={{flex:1}}/>
            <div style={{display:'flex', gap:14, fontSize:11.5, color:'var(--fg-muted)'}}>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:8, height:8, borderRadius:2, background:'var(--c-success)'}}/>입고</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:8, height:8, borderRadius:2, background:'var(--c-brand-500)'}}/>출고</span>
            </div>
          </div>
          {/* Bars chart */}
          <DualBars
            inbound={[42, 56, 38, 64, 71, 52, 45, 60, 78, 66, 54, 70, 82, 74]}
            outbound={[28, 34, 22, 41, 38, 30, 24, 36, 50, 44, 32, 48, 56, 52]}
          />
        </Card>

        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
            <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600}}>현장 현황</div>
            <Btn size="sm" variant="ghost" iconRight={<Icon.Chevron size={14}/>}>전체</Btn>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {sites.map(s => (
              <div key={s.name} style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', borderBottom:'1px dashed var(--border-subtle)'}}>
                <div style={{
                  width:36, height:36, borderRadius:'var(--radius-md)',
                  background:'var(--bg-muted)', color:'var(--fg-muted)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                }}>
                  <Icon.Hard size={16}/>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:600, marginBottom:2}}>{s.name}</div>
                  <div style={{fontSize:11.5, color:'var(--fg-muted)'}}>{s.mgr} · 자재 {s.items}건 · ~{s.due}</div>
                </div>
                <StatusBadge tone={s.status==='완료'?'success':s.status==='자재대기'?'warning':'info'} dot>{s.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Low stock + activity */}
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16}}>
        <Card padding={0}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 20px 12px'}}>
            <div>
              <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600}}>재고 부족 알림</div>
              <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>최소 재고 미만인 품목 {lowStock.length}건</div>
            </div>
            <Btn size="sm" variant="primary" icon={<Icon.Truck size={14}/>}>일괄 발주</Btn>
          </div>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead>
              <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
                <th style={th}>품목</th><th style={th}>위치</th><th style={{...th, textAlign:'right'}}>현재</th><th style={{...th, textAlign:'right'}}>최소</th><th style={th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(s => (
                <tr key={s.sku} style={{borderTop:'1px solid var(--border-subtle)'}}>
                  <td style={td}>
                    <div style={{fontWeight:600, marginBottom:2}}>{s.name}</div>
                    <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)'}}>{s.sku}</div>
                  </td>
                  <td style={{...td, color:'var(--fg-muted)', fontFamily:'var(--font-mono)', fontSize:12}}>{s.loc}</td>
                  <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color: s.stock===0?'var(--c-danger)':'var(--c-warning)'}}>{s.stock} {s.unit}</td>
                  <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--fg-muted)'}}>{s.min} {s.unit}</td>
                  <td style={td}><StatusBadge tone={s.stock===0?'danger':'warning'} dot>{s.stock===0?'재고 소진':'부족'}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
            <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600}}>최근 활동</div>
            <IconBtn size={28} icon={<Icon.More size={16}/>}/>
          </div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {activity.map((a, i) => (
              <div key={i} style={{display:'flex', gap:12, padding:'10px 0', borderTop: i?'1px dashed var(--border-subtle)':'none'}}>
                <div style={{width: 44, fontSize:11.5, color:'var(--fg-muted)', fontVariantNumeric:'tabular-nums', flexShrink:0, paddingTop:2}}>{a.t}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:12.5, marginBottom:3}}>
                    <strong style={{fontWeight:600}}>{a.who}</strong>
                    <span style={{color:'var(--fg-muted)'}}> · </span>
                    <StatusBadge tone={a.tone}>{a.what}</StatusBadge>
                  </div>
                  <div style={{fontSize:12, color:'var(--fg-muted)', lineHeight:1.45}}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const th = { textAlign:'left', padding:'10px 20px', fontWeight:500 };
const td = { padding:'12px 20px', verticalAlign:'middle' };

/* Dual bars chart */
function DualBars({ inbound, outbound }) {
  const max = Math.max(...inbound, ...outbound);
  const w = 720, h = 160, gap = 4, n = inbound.length;
  const groupW = (w - gap*(n-1)) / n;
  const barW = (groupW - 2) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{display:'block'}}>
      {[0.25, 0.5, 0.75].map(y => <line key={y} x1="0" x2={w} y1={h*y} y2={h*y} stroke="var(--border-subtle)" strokeDasharray="3 4"/>)}
      {inbound.map((v, i) => {
        const bh1 = (v / max) * (h - 8);
        const bh2 = (outbound[i] / max) * (h - 8);
        const x = i * (groupW + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - bh1} width={barW} height={bh1} fill="var(--c-success)" opacity="0.85" rx="2"/>
            <rect x={x + barW + 2} y={h - bh2} width={barW} height={bh2} fill="var(--c-brand-500)" opacity="0.85" rx="2"/>
          </g>
        );
      })}
    </svg>
  );
}

/* =========================
   2) Inventory list
   ========================= */
window.DesktopInventory = function DesktopInventory() {
  const { Icon, Card, Btn, IconBtn, Input, StatusBadge } = window.UI;
  const { skus } = window.MOCK;
  const [q, setQ] = useStateD('');
  const [cat, setCat] = useStateD('전체');
  const cats = ['전체', ...Array.from(new Set(skus.map(s=>s.cat)))];
  const filtered = useMemoD(() => skus.filter(s => (cat==='전체'||s.cat===cat) && (q==='' || s.name.includes(q) || s.sku.toLowerCase().includes(q.toLowerCase()))), [q, cat]);

  return (
    <div style={{padding:'20px 24px 28px', display:'flex', flexDirection:'column', gap:16, overflow:'auto', flex:1}}>
      {/* Toolbar */}
      <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
        <Input icon={<Icon.Search size={16}/>} placeholder="SKU, 품명 검색" value={q} onChange={e=>setQ(e.target.value)} style={{width:280}}/>
        <div style={{display:'flex', gap:4, padding:3, background:'var(--bg-muted)', borderRadius:'var(--radius-md)'}}>
          {cats.map(c => (
            <button key={c} onClick={()=>setCat(c)} style={{
              padding:'6px 12px', fontSize:12.5, fontWeight: cat===c?600:500,
              background: cat===c?'var(--bg-surface)':'transparent',
              border:'none', borderRadius:'var(--radius-sm)',
              color: cat===c?'var(--fg-default)':'var(--fg-muted)',
              boxShadow: cat===c?'var(--shadow-xs)':'none', cursor:'pointer',
            }}>{c}</button>
          ))}
        </div>
        <Btn size="md" variant="secondary" icon={<Icon.Filter size={14}/>}>필터</Btn>
        <div style={{flex:1}}/>
        <Btn size="md" variant="secondary" icon={<Icon.Download size={14}/>}>내보내기</Btn>
        <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>품목 추가</Btn>
      </div>

      <Card padding={0} style={{overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead style={{background:'var(--bg-muted)'}}>
            <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
              <th style={{...th, width:32}}><input type="checkbox"/></th>
              <th style={th}>품목</th>
              <th style={th}>분류</th>
              <th style={th}>위치</th>
              <th style={{...th, textAlign:'right'}}>재고</th>
              <th style={{...th, textAlign:'right'}}>최소재고</th>
              <th style={{...th, textAlign:'right'}}>단가</th>
              <th style={th}>공급업체</th>
              <th style={th}>상태</th>
              <th style={{...th, width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const ratio = s.min === 0 ? 1 : s.stock / Math.max(s.min, 1);
              return (
                <tr key={s.sku} style={{borderTop:'1px solid var(--border-subtle)'}} className="row-hover">
                  <td style={td}><input type="checkbox"/></td>
                  <td style={td}>
                    <div style={{display:'flex', alignItems:'center', gap:12}}>
                      <div style={{
                        width:36, height:36, borderRadius:'var(--radius-md)',
                        background:'var(--bg-muted)', color:'var(--c-brand-600)',
                        display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>
                        <Icon.Box size={16}/>
                      </div>
                      <div>
                        <div style={{fontWeight:600}}>{s.name}</div>
                        <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)', marginTop:2}}>{s.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{...td, color:'var(--fg-muted)'}}>{s.cat}</td>
                  <td style={{...td, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--fg-muted)'}}>{s.loc}</td>
                  <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600}}>
                    <div>{s.stock.toLocaleString()} <span style={{fontSize:11, color:'var(--fg-muted)', fontWeight:500}}>{s.unit}</span></div>
                    <div style={{width:80, height:4, background:'var(--bg-muted)', borderRadius:2, marginLeft:'auto', marginTop:6, overflow:'hidden'}}>
                      <div style={{width:`${Math.min(100, ratio*60)}%`, height:'100%', background: ratio<1?'var(--c-danger)':ratio<1.5?'var(--c-warning)':'var(--c-success)', borderRadius:2}}/>
                    </div>
                  </td>
                  <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums', color:'var(--fg-muted)'}}>{s.min.toLocaleString()} {s.unit}</td>
                  <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>₩{s.price.toLocaleString()}</td>
                  <td style={{...td, color:'var(--fg-muted)'}}>{s.supplier}</td>
                  <td style={td}>
                    {s.stock===0 ? <StatusBadge tone="danger" dot>소진</StatusBadge>
                      : s.stock <= s.min ? <StatusBadge tone="warning" dot>부족</StatusBadge>
                      : <StatusBadge tone="success" dot>정상</StatusBadge>}
                  </td>
                  <td style={td}><IconBtn size={28} icon={<Icon.More size={16}/>}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border-subtle)', fontSize:12, color:'var(--fg-muted)'}}>
          <div>{filtered.length} / {skus.length}건</div>
          <div style={{display:'flex', gap:6, alignItems:'center'}}>
            <Btn size="sm" variant="ghost" icon={<Icon.ChevronLeft size={14}/>}>이전</Btn>
            <span style={{fontSize:12.5}}>1 / 12</span>
            <Btn size="sm" variant="ghost" iconRight={<Icon.Chevron size={14}/>}>다음</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

/* =========================
   3) Inbound (입고)
   ========================= */
window.DesktopInbound = function DesktopInbound() {
  const { Icon, Card, Btn, Input, StatusBadge } = window.UI;
  return (
    <div style={{padding:'20px 24px 28px', display:'grid', gridTemplateColumns:'1fr 380px', gap:20, overflow:'auto', flex:1, alignContent:'flex-start'}}>
      <Card>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600}}>오늘 입고 예정</div>
          <Btn size="sm" variant="primary" icon={<Icon.Plus size={14}/>}>입고 등록</Btn>
        </div>
        {[
          { id:'IN-2026-0421-01', supplier:'대한전선', items:'2.5SQ × 500m, 4.0SQ × 200m', eta:'14:00', status:'운송중', tone:'info' },
          { id:'IN-2026-0421-02', supplier:'LS일렉트릭', items:'차단기 50A × 20EA', eta:'16:30', status:'대기', tone:'warning' },
          { id:'IN-2026-0421-03', supplier:'오스람', items:'LED 50W × 100EA', eta:'완료', status:'입고완료', tone:'success' },
        ].map((r, i) => (
          <div key={i} style={{
            padding:'14px 0', borderTop: i?'1px solid var(--border-subtle)':'none',
            display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center',
          }}>
            <div style={{
              width:44, height:44, borderRadius:'var(--radius-md)',
              background:'var(--c-success-bg)', color:'var(--c-success)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>
              <Icon.ArrowDown/>
            </div>
            <div>
              <div style={{fontWeight:600, fontSize:14}}>{r.supplier}</div>
              <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>{r.items}</div>
              <div style={{fontSize:11.5, color:'var(--fg-subtle)', fontFamily:'var(--font-mono)', marginTop:3}}>{r.id}</div>
            </div>
            <div style={{fontSize:13, color:'var(--fg-muted)', textAlign:'right'}}>
              <div>도착 예정</div>
              <div style={{fontWeight:600, color:'var(--fg-default)', marginTop:2, fontVariantNumeric:'tabular-nums'}}>{r.eta}</div>
            </div>
            <StatusBadge tone={r.tone} dot>{r.status}</StatusBadge>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:14}}>빠른 입고 등록</div>
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <Field label="발주번호"><Input icon={<Icon.Doc size={16}/>} placeholder="PO-2026-..." full/></Field>
          <Field label="공급업체"><Input placeholder="대한전선 / LS일렉트릭..." full/></Field>
          <Field label="품목"><Input icon={<Icon.Box size={16}/>} placeholder="SKU 또는 품명" full/></Field>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <Field label="수량"><Input placeholder="0" full/></Field>
            <Field label="위치"><Input icon={<Icon.Tag size={14}/>} placeholder="A-01-03" full/></Field>
          </div>
          <Field label="비고"><Input placeholder="선택" full/></Field>
          <div style={{display:'flex', gap:8, marginTop:6}}>
            <Btn size="md" variant="secondary" icon={<Icon.Scan size={14}/>}>바코드</Btn>
            <Btn size="md" variant="primary" full>입고 등록</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

function Field({ label, children }) {
  return (
    <div>
      <div style={{fontSize:12, fontWeight:500, color:'var(--fg-muted)', marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
}

/* =========================
   4) Orders (발주)
   ========================= */
window.DesktopOrders = function DesktopOrders() {
  const { Icon, Card, Btn, Input, StatusBadge, IconBtn } = window.UI;
  const { orders } = window.MOCK;
  const tone = (s) => s==='입고완료' ? 'success' : s==='운송중' ? 'info' : s==='입고예정' ? 'brand' : 'warning';

  return (
    <div style={{padding:'20px 24px 28px', display:'flex', flexDirection:'column', gap:16, overflow:'auto', flex:1}}>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <Input icon={<Icon.Search size={16}/>} placeholder="발주번호, 공급업체 검색" style={{width:300}}/>
        <Btn size="md" variant="secondary" icon={<Icon.Calendar size={14}/>}>2026-04</Btn>
        <Btn size="md" variant="secondary" icon={<Icon.Filter size={14}/>}>상태</Btn>
        <div style={{flex:1}}/>
        <Btn size="md" variant="primary" icon={<Icon.Plus size={14}/>}>발주서 작성</Btn>
      </div>

      {/* Stat strip */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12}}>
        {[
          { label:'대기 중', value:'3', tone:'warning' },
          { label:'운송 중', value:'2', tone:'info' },
          { label:'이번 달 입고', value:'12', tone:'success' },
          { label:'이번 달 총액', value:'₩28.4M', tone:'brand' },
        ].map((k, i) => (
          <div key={i} style={{
            padding:'14px 18px', background:'var(--bg-surface)',
            border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div>
              <div style={{fontSize:12, color:'var(--fg-muted)', fontWeight:500}}>{k.label}</div>
              <div style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:600, marginTop:4, fontVariantNumeric:'tabular-nums'}}>{k.value}</div>
            </div>
            <StatusBadge tone={k.tone} dot>활성</StatusBadge>
          </div>
        ))}
      </div>

      <Card padding={0}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead style={{background:'var(--bg-muted)'}}>
            <tr style={{color:'var(--fg-muted)', fontSize:11.5, textTransform:'uppercase', letterSpacing:'0.04em'}}>
              <th style={th}>발주번호</th>
              <th style={th}>공급업체</th>
              <th style={{...th, textAlign:'right'}}>품목수</th>
              <th style={{...th, textAlign:'right'}}>금액</th>
              <th style={th}>발주일</th>
              <th style={th}>상태</th>
              <th style={{...th, width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{borderTop:'1px solid var(--border-subtle)'}} className="row-hover">
                <td style={td}>
                  <div style={{fontFamily:'var(--font-mono)', fontSize:12.5, fontWeight:600}}>{o.id}</div>
                </td>
                <td style={td}>{o.supplier}</td>
                <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{o.items}</td>
                <td style={{...td, textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600}}>{o.total}</td>
                <td style={{...td, color:'var(--fg-muted)', fontVariantNumeric:'tabular-nums'}}>2026-{o.date}</td>
                <td style={td}><StatusBadge tone={tone(o.status)} dot>{o.status}</StatusBadge></td>
                <td style={td}><IconBtn size={28} icon={<Icon.More size={16}/>}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

/* =========================
   5) Sites + Material Requests
   ========================= */
window.DesktopSites = function DesktopSites() {
  const { Icon, Card, Btn, StatusBadge, Avatar, IconBtn } = window.UI;
  const { sites, requests } = window.MOCK;

  return (
    <div style={{padding:'20px 24px 28px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, overflow:'auto', flex:1, alignContent:'flex-start'}}>
      <Card>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div>
            <div style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600}}>현장</div>
            <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>활성 {sites.filter(s=>s.status!=='완료').length}곳 · 전체 {sites.length}곳</div>
          </div>
          <Btn size="sm" variant="secondary" icon={<Icon.Plus size={14}/>}>현장 등록</Btn>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {sites.map((s, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center',
              padding:'12px 14px', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)',
              background:'var(--bg-app)',
            }}>
              <div style={{
                width:40, height:40, borderRadius:'var(--radius-md)',
                background: s.status==='완료'?'var(--bg-muted)':'var(--c-brand-50)',
                color: s.status==='완료'?'var(--fg-muted)':'var(--c-brand-600)',
                display:'inline-flex', alignItems:'center', justifyContent:'center',
              }}><Icon.Hard size={18}/></div>
              <div>
                <div style={{fontWeight:600, fontSize:14}}>{s.name}</div>
                <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2, display:'flex', gap:10}}>
                  <span style={{display:'inline-flex', alignItems:'center', gap:4}}><Avatar name={s.mgr} size={16}/>{s.mgr}</span>
                  <span>자재 {s.items}건</span>
                  <span>마감 {s.due}</span>
                </div>
              </div>
              <StatusBadge tone={s.status==='완료'?'success':s.status==='자재대기'?'warning':'info'} dot>{s.status}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div>
            <div style={{fontFamily:'var(--font-display)', fontSize:16, fontWeight:600}}>자재 신청</div>
            <div style={{fontSize:12, color:'var(--fg-muted)', marginTop:2}}>승인 대기 {requests.filter(r=>r.status==='승인대기').length}건</div>
          </div>
          <Btn size="sm" variant="primary">전체 승인</Btn>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {requests.map((r, i) => (
            <div key={i} style={{
              padding:'12px 14px', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)',
              background:'var(--bg-app)',
            }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div>
                  <div style={{fontSize:11.5, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>{r.id}</div>
                  <div style={{fontWeight:600, fontSize:13.5, marginTop:3}}>{r.site} · {r.who}</div>
                </div>
                <StatusBadge tone={r.tone} dot>{r.status}</StatusBadge>
              </div>
              <div style={{fontSize:12.5, color:'var(--fg-muted)', marginBottom:8, lineHeight:1.5}}>{r.items}</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:11.5, color:'var(--fg-subtle)'}}>{r.when}</div>
                {r.status==='승인대기' && (
                  <div style={{display:'flex', gap:6}}>
                    <Btn size="sm" variant="ghost">반려</Btn>
                    <Btn size="sm" variant="primary">승인</Btn>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* =========================
   6) Reports
   ========================= */
window.DesktopReports = function DesktopReports() {
  const { Icon, Card, Btn, Sparkline, MiniBars, KPI } = window.UI;
  return (
    <div style={{padding:'20px 24px 28px', display:'flex', flexDirection:'column', gap:16, overflow:'auto', flex:1}}>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <Btn size="md" variant="secondary" icon={<Icon.Calendar size={14}/>}>2026-04 (월간)</Btn>
        <Btn size="md" variant="ghost">분기</Btn>
        <Btn size="md" variant="ghost">연간</Btn>
        <div style={{flex:1}}/>
        <Btn size="md" variant="secondary" icon={<Icon.Download size={14}/>}>PDF 다운로드</Btn>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14}}>
        <KPI label="회전율" value="4.2x" delta="+0.3" deltaTone="success" icon={<Icon.Activity size={16}/>}/>
        <KPI label="평균 보유일수" value="28일" delta="-2일" deltaTone="success" icon={<Icon.Clock size={16}/>}/>
        <KPI label="결품율" value="3.1%" delta="+0.4%" deltaTone="danger" icon={<Icon.Bell size={16}/>}/>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16}}>
        <Card>
          <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:6}}>분류별 매출원가</div>
          <div style={{fontSize:12, color:'var(--fg-muted)', marginBottom:14}}>4월 누적 ₩28.4M</div>
          {[
            { name:'전선', value: 12.4, color:'var(--c-brand-500)' },
            { name:'차단기', value: 6.8, color:'var(--c-info)' },
            { name:'조명', value: 4.2, color:'var(--c-success)' },
            { name:'자재', value: 3.6, color:'var(--c-warning)' },
            { name:'부자재', value: 1.4, color:'#7A5AA0' },
          ].map((r, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'80px 1fr 80px', alignItems:'center', gap:12, padding:'8px 0'}}>
              <div style={{fontSize:13, fontWeight:500}}>{r.name}</div>
              <div style={{height:10, background:'var(--bg-muted)', borderRadius:'var(--radius-pill)', overflow:'hidden'}}>
                <div style={{width: `${(r.value/12.4)*100}%`, height:'100%', background:r.color, borderRadius:'var(--radius-pill)'}}/>
              </div>
              <div style={{fontSize:13, fontVariantNumeric:'tabular-nums', textAlign:'right', fontWeight:600}}>₩{r.value}M</div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, marginBottom:14}}>TOP 출고 품목</div>
          {[
            { name:'2.5SQ 전선', n:142, trend:[8,12,10,16,14,18,22,24] },
            { name:'LED 50W', n:98, trend:[14,11,16,12,18,16,14,18] },
            { name:'차단기 50A', n:64, trend:[6,8,7,9,11,8,12,14] },
            { name:'마그네틱 220V', n:42, trend:[3,5,4,6,7,6,8,9] },
          ].map((r, i) => (
            <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i?'1px dashed var(--border-subtle)':'none'}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:600}}>{r.name}</div>
                <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2}}>{r.n}건 출고</div>
              </div>
              <div style={{width:80}}><Sparkline data={r.trend} height={28} fill="var(--c-brand-500)"/></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

Object.assign(window, {
  DesktopDashboard: window.DesktopDashboard,
  DesktopInventory: window.DesktopInventory,
  DesktopInbound: window.DesktopInbound,
  DesktopOrders: window.DesktopOrders,
  DesktopSites: window.DesktopSites,
  DesktopReports: window.DesktopReports,
});
