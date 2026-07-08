// Mobile web screens
const { useState: useStateM } = React;

/* =========================
   Mobile Dashboard / Home
   ========================= */
window.MobileHome = function MobileHome() {
  const { Icon, StatusBadge, Avatar, Sparkline } = window.UI;
  const { activity } = window.MOCK;

  return (
    <div style={{flex:1, overflow:'auto', display:'flex', flexDirection:'column', gap:16, padding:'12px 14px 24px', background:'var(--bg-app)'}}>
      {/* Greeting */}
      <div style={{display:'flex', alignItems:'center', gap:12, padding:'4px 4px 0'}}>
        <Avatar name="김" size={42}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12.5, color:'var(--fg-muted)'}}>안녕하세요,</div>
          <div style={{fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, letterSpacing:'-0.01em'}}>김재호님</div>
        </div>
        <button style={{
          width:38, height:38, borderRadius:'var(--radius-md)',
          background:'var(--bg-surface)', border:'1px solid var(--border-default)',
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          color:'var(--fg-default)', position:'relative',
        }}>
          <Icon.Bell size={18}/>
          <span style={{position:'absolute', top:8, right:8, width:7, height:7, borderRadius:'50%', background:'var(--c-danger)'}}/>
        </button>
      </div>

      {/* Big stat */}
      <div style={{
        background:'linear-gradient(180deg, var(--c-brand-500), var(--c-brand-600))',
        color:'#fff', padding:18, borderRadius:'var(--radius-lg)',
        boxShadow:'var(--shadow-md)',
      }}>
        <div style={{fontSize:12.5, opacity:0.85, fontWeight:500}}>오늘 처리 현황</div>
        <div style={{display:'flex', gap:24, marginTop:10, alignItems:'baseline'}}>
          <div>
            <div style={{fontFamily:'var(--font-display)', fontSize:30, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>24<span style={{fontSize:14, opacity:0.85, marginLeft:3}}>건</span></div>
            <div style={{fontSize:11.5, opacity:0.85}}>입고</div>
          </div>
          <div>
            <div style={{fontFamily:'var(--font-display)', fontSize:30, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>18<span style={{fontSize:14, opacity:0.85, marginLeft:3}}>건</span></div>
            <div style={{fontSize:11.5, opacity:0.85}}>출고</div>
          </div>
          <div style={{flex:1}}/>
          <div style={{width:60, opacity:0.85}}>
            <Sparkline data={[3,5,4,7,8,6,9,12,10,14]} color="#fff" fill="#fff" height={40}/>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8}}>
        {[
          { i:<Icon.Scan/>, l:'바코드' },
          { i:<Icon.ArrowDown/>, l:'입고' },
          { i:<Icon.ArrowUp/>, l:'출고' },
          { i:<Icon.Send/>, l:'자재신청' },
        ].map((a, i) => (
          <button key={i} style={{
            background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)', padding:'14px 8px',
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            color:'var(--fg-default)',
          }}>
            <span style={{
              width:38, height:38, borderRadius:'var(--radius-md)',
              background:'var(--c-brand-50)', color:'var(--c-brand-600)',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
            }}>{a.i}</span>
            <span style={{fontSize:11.5, fontWeight:500}}>{a.l}</span>
          </button>
        ))}
      </div>

      {/* Alerts */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 4px 8px'}}>
          <div style={{fontSize:13.5, fontWeight:600}}>알림</div>
          <div style={{fontSize:12, color:'var(--c-brand-600)'}}>전체보기</div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {[
            { tone:'danger', t:'재고 소진', d:'박스 프로텍터 1Φ가 소진되었어요', when:'10분 전' },
            { tone:'warning', t:'재고 부족', d:'4.0SQ 전선이 최소 재고 미만', when:'1시간 전' },
            { tone:'info', t:'입고 예정', d:'14:00 대한전선 운송 도착', when:'2시간 전' },
          ].map((n, i) => (
            <div key={i} style={{
              display:'flex', gap:12, padding:'12px 14px',
              background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
              borderRadius:'var(--radius-md)',
            }}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:3}}>
                  <StatusBadge tone={n.tone} dot>{n.t}</StatusBadge>
                  <span style={{fontSize:11, color:'var(--fg-subtle)'}}>{n.when}</span>
                </div>
                <div style={{fontSize:12.5, color:'var(--fg-muted)', lineHeight:1.5}}>{n.d}</div>
              </div>
              <Icon.Chevron size={16} style={{color:'var(--fg-subtle)', alignSelf:'center'}}/>
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 4px 8px'}}>
          <div style={{fontSize:13.5, fontWeight:600}}>최근 활동</div>
          <div style={{fontSize:12, color:'var(--c-brand-600)'}}>전체보기</div>
        </div>
        <div style={{
          background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
          borderRadius:'var(--radius-md)', overflow:'hidden',
        }}>
          {activity.slice(0,4).map((a, i) => (
            <div key={i} style={{
              display:'flex', gap:10, padding:'12px 14px',
              borderTop: i?'1px solid var(--border-subtle)':'none',
            }}>
              <div style={{
                width:32, height:32, borderRadius:'var(--radius-md)',
                background: 'var(--bg-muted)',
                color:'var(--fg-muted)',
                display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              }}>
                {a.what==='입고' ? <Icon.ArrowDown size={15}/> : a.what==='출고' ? <Icon.ArrowUp size={15}/> : <Icon.Activity size={15}/>}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:12.5, marginBottom:2}}>
                  <strong style={{fontWeight:600}}>{a.who}</strong>
                  <span style={{color:'var(--fg-muted)'}}> · {a.what}</span>
                </div>
                <div style={{fontSize:11.5, color:'var(--fg-muted)', lineHeight:1.4}}>{a.detail}</div>
              </div>
              <div style={{fontSize:11, color:'var(--fg-subtle)', fontVariantNumeric:'tabular-nums', flexShrink:0}}>{a.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================
   Mobile Inventory list
   ========================= */
window.MobileInventory = function MobileInventory() {
  const { Icon, Input, StatusBadge } = window.UI;
  const { skus } = window.MOCK;
  const [q, setQ] = useStateM('');
  const filtered = skus.filter(s => q==='' || s.name.includes(q) || s.sku.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{flex:1, overflow:'auto', display:'flex', flexDirection:'column', background:'var(--bg-app)'}}>
      <div style={{padding:'8px 14px 12px', display:'flex', flexDirection:'column', gap:10, borderBottom:'1px solid var(--border-subtle)', background:'var(--bg-app)', position:'sticky', top:0, zIndex:5}}>
        <Input icon={<Icon.Search size={16}/>} placeholder="SKU, 품명 검색" value={q} onChange={e=>setQ(e.target.value)} full size="lg"/>
        <div style={{display:'flex', gap:6, overflow:'auto'}}>
          {['전체','전선','차단기','조명','자재','부자재'].map((c,i) => (
            <button key={c} style={{
              padding:'7px 14px', fontSize:12.5, fontWeight: i===0?600:500,
              background: i===0?'var(--c-brand-500)':'var(--bg-surface)',
              color: i===0?'#fff':'var(--fg-muted)',
              border:'1px solid', borderColor: i===0?'var(--c-brand-500)':'var(--border-default)',
              borderRadius:'var(--radius-pill)', whiteSpace:'nowrap', flexShrink:0,
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{padding:'12px 14px', display:'flex', flexDirection:'column', gap:8}}>
        {filtered.map(s => (
          <div key={s.sku} style={{
            background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)', padding:14,
            display:'flex', gap:12,
          }}>
            <div style={{
              width:46, height:46, borderRadius:'var(--radius-md)',
              background:'var(--bg-muted)', color:'var(--c-brand-600)',
              display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}><Icon.Box size={20}/></div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
                <div style={{fontWeight:600, fontSize:13.5, lineHeight:1.3, flex:1, minWidth:0}}>{s.name}</div>
                {s.stock===0 ? <StatusBadge tone="danger">소진</StatusBadge>
                  : s.stock <= s.min ? <StatusBadge tone="warning">부족</StatusBadge>
                  : <StatusBadge tone="success">정상</StatusBadge>}
              </div>
              <div style={{fontSize:11.5, color:'var(--fg-muted)', fontFamily:'var(--font-mono)', marginTop:3}}>{s.sku} · {s.loc}</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
                <div style={{fontSize:13, fontVariantNumeric:'tabular-nums'}}>
                  <span style={{fontWeight:600, color: s.stock<=s.min?'var(--c-warning)':'var(--fg-default)'}}>{s.stock.toLocaleString()}</span>
                  <span style={{color:'var(--fg-muted)'}}> / {s.min.toLocaleString()} {s.unit}</span>
                </div>
                <div style={{fontSize:12, color:'var(--fg-muted)'}}>{s.supplier}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* =========================
   Mobile Scan screen
   ========================= */
window.MobileScan = function MobileScan() {
  const { Icon, Btn, StatusBadge } = window.UI;
  return (
    <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column', background:'#0a0a0a', color:'#fff', position:'relative'}}>
      {/* Camera placeholder */}
      <div style={{
        flex:1, position:'relative',
        background:'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {/* Scanline frame */}
        <div style={{
          width:240, height:240, position:'relative',
          border:'1px solid rgba(255,255,255,0.15)', borderRadius:18,
        }}>
          {[[0,0],[1,0],[0,1],[1,1]].map(([x,y], i) => (
            <div key={i} style={{
              position:'absolute',
              [x?'right':'left']: -1, [y?'bottom':'top']: -1,
              width:32, height:32,
              borderTop: y?'none':'3px solid var(--c-brand-400)',
              borderLeft: x?'none':'3px solid var(--c-brand-400)',
              borderRight: x?'3px solid var(--c-brand-400)':'none',
              borderBottom: y?'3px solid var(--c-brand-400)':'none',
              borderRadius: `${y?0:14}px ${x&&!y?14:0}px ${x&&y?14:0}px ${!x&&y?14:0}px`,
            }}/>
          ))}
          {/* scan line */}
          <div style={{
            position:'absolute', top:'50%', left:8, right:8, height:2,
            background:'linear-gradient(90deg, transparent, var(--c-brand-400), transparent)',
            boxShadow:'0 0 20px var(--c-brand-500)',
          }}/>
        </div>

        <div style={{
          position:'absolute', top:18, left:18, right:18,
          display:'flex', alignItems:'center', gap:10,
        }}>
          <button style={{
            width:38, height:38, borderRadius:'var(--radius-md)',
            background:'rgba(255,255,255,0.12)', border:'none',
            color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(12px)',
          }}><Icon.X size={18}/></button>
          <div style={{flex:1, fontSize:14, fontWeight:600, textAlign:'center'}}>바코드 스캔</div>
          <button style={{
            width:38, height:38, borderRadius:'var(--radius-md)',
            background:'rgba(255,255,255,0.12)', border:'none',
            color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(12px)',
          }}><Icon.Settings size={18}/></button>
        </div>

        <div style={{
          position:'absolute', bottom:24, left:0, right:0, textAlign:'center',
          fontSize:13, opacity:0.85,
        }}>
          바코드를 사각형 안에 맞춰주세요
        </div>
      </div>

      {/* Result preview */}
      <div style={{
        padding:'16px 16px 20px', background:'var(--bg-surface)', color:'var(--fg-default)',
        borderTopLeftRadius:'var(--radius-xl)', borderTopRightRadius:'var(--radius-xl)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:14}}>
          <div style={{
            width:46, height:46, borderRadius:'var(--radius-md)',
            background:'var(--c-success-bg)', color:'var(--c-success)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
          }}><Icon.Check stroke={2.5}/></div>
          <div style={{flex:1}}>
            <div style={{fontSize:11.5, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>JW-CB-2.5SQ</div>
            <div style={{fontWeight:600, fontSize:14}}>2.5SQ 전선 케이블 (흑색)</div>
            <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2}}>위치 A-01-03 · 재고 1,240m</div>
          </div>
          <StatusBadge tone="success" dot>인식</StatusBadge>
        </div>
        <div style={{display:'flex', gap:8}}>
          <Btn variant="secondary" full icon={<Icon.ArrowDown size={14}/>}>입고</Btn>
          <Btn variant="primary" full icon={<Icon.ArrowUp size={14}/>}>출고</Btn>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Mobile Material Request
   ========================= */
window.MobileRequests = function MobileRequests() {
  const { Icon, StatusBadge, Btn } = window.UI;
  const { requests } = window.MOCK;

  return (
    <div style={{flex:1, overflow:'auto', display:'flex', flexDirection:'column', background:'var(--bg-app)'}}>
      <div style={{padding:'8px 14px 12px', display:'flex', gap:6, overflow:'auto', borderBottom:'1px solid var(--border-subtle)'}}>
        {['전체', '대기 3', '승인', '출고완료', '보류'].map((t,i) => (
          <button key={t} style={{
            padding:'7px 14px', fontSize:12.5, fontWeight: i===0?600:500,
            background: i===0?'var(--c-brand-500)':'var(--bg-surface)',
            color: i===0?'#fff':'var(--fg-muted)',
            border:'1px solid', borderColor: i===0?'var(--c-brand-500)':'var(--border-default)',
            borderRadius:'var(--radius-pill)', whiteSpace:'nowrap', flexShrink:0,
          }}>{t}</button>
        ))}
      </div>

      <div style={{padding:'12px 14px', display:'flex', flexDirection:'column', gap:10}}>
        {requests.map((r, i) => (
          <div key={i} style={{
            background:'var(--bg-surface)', border:'1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)', padding:14,
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
              <div>
                <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)'}}>{r.id}</div>
                <div style={{fontWeight:600, fontSize:14, marginTop:3}}>{r.site}</div>
                <div style={{fontSize:11.5, color:'var(--fg-muted)', marginTop:2}}>요청자 {r.who} · {r.when}</div>
              </div>
              <StatusBadge tone={r.tone} dot>{r.status}</StatusBadge>
            </div>
            <div style={{
              fontSize:12.5, color:'var(--fg-default)', lineHeight:1.5,
              padding:'10px 12px', background:'var(--bg-muted)', borderRadius:'var(--radius-sm)',
              marginBottom:10,
            }}>{r.items}</div>
            {r.status==='승인대기' && (
              <div style={{display:'flex', gap:8}}>
                <Btn variant="secondary" full size="sm">반려</Btn>
                <Btn variant="primary" full size="sm">승인</Btn>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FAB */}
      <button style={{
        position:'absolute', right:18, bottom:96,
        width:56, height:56, borderRadius:'50%',
        background:'var(--c-brand-500)', color:'#fff', border:'none',
        boxShadow:'0 8px 22px -6px rgba(201,100,66,0.6)',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}><Icon.Plus size={24} stroke={2.2}/></button>
    </div>
  );
};

Object.assign(window, {
  MobileHome: window.MobileHome,
  MobileInventory: window.MobileInventory,
  MobileScan: window.MobileScan,
  MobileRequests: window.MobileRequests,
});
