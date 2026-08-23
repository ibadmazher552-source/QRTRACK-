import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Line, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import {
  Activity, ArrowRight, BarChart3, Check, ChevronDown, Copy, Download, Edit3, ExternalLink, FileUp, Gift,
  Grid2X2, LayoutDashboard, Link2, LogOut, Mail, Menu, Moon, MoreHorizontal, Palette, Plus, QrCode,
  Search, Settings, ShieldCheck, Smartphone, Sun, Trash2, Users, X, Zap,
} from 'lucide-react'
import { authService } from './lib/auth'
import { dataService } from './lib/data-service'
import { defaultDesign, type Campaign, type CampaignInput, type DesignSettings, type ScanEvent, type TemplateId, type WorkspaceData } from './lib/types'
import { QRPreview } from './components/QRPreview'

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)
type Session = { email: string; workspaceId: string }
type Section = 'dashboard' | 'create' | 'codes' | 'analytics' | 'designer' | 'settings'
type Toast = { id: number; text: string; kind?: 'error' | 'success' }
const templates: Array<{ id: TemplateId; label: string; icon: typeof Gift; text: string }> = [
  { id: 'qr-only', label: 'QR Only', icon: QrCode, text: '' }, { id: 'gift', label: 'Gift', icon: Gift, text: 'SCAN ME 🎁' },
  { id: 'envelope', label: 'Envelope', icon: Mail, text: 'SCAN HERE' }, { id: 'scan-me', label: 'Scan Me', icon: Smartphone, text: 'SCAN ME' },
  { id: 'scan-here', label: 'Scan Here', icon: Grid2X2, text: 'SCAN HERE' }, { id: 'whatsapp', label: 'WhatsApp', icon: Link2, text: 'SCAN TO CHAT ON WHATSAPP' },
  { id: 'custom', label: 'Custom', icon: Palette, text: 'MY STORE' },
]
const emptyInput: CampaignInput = { campaignName: '', description: '', destinationUrl: '', template: 'qr-only', customText: 'SCAN ME', designSettings: defaultDesign }
const appUrl = () => {
  if (typeof window === 'undefined') return 'https://your-domain.netlify.app'
  const configured = import.meta.env.PUBLIC_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL
  return String(configured || window.location.origin).replace(/\/$/, '')
}
const trackingUrl = (slug: string) => `${appUrl()}/r/${slug}`
const isLocal = () => typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No activity'
const shortDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
const eventStats = (campaign: Campaign, events: ScanEvent[]) => {
  const own = events.filter((event) => event.campaignId === campaign.id)
  const scans = own.filter((event) => event.eventType === 'scan')
  const opens = own.filter((event) => event.eventType === 'open')
  return { scans: scans.length, opens: opens.length, unique: new Set(scans.map((event) => event.visitorId)).size, last: own[0]?.timestamp || null, openRate: scans.length ? Math.round(opens.length / scans.length * 100) : 0 }
}
const validateInput = (input: CampaignInput) => {
  if (!input.campaignName.trim()) return 'Campaign name is required.'
  try { const url = new URL(input.destinationUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error() } catch { return 'Please enter a valid destination URL.' }
  return ''
}
const slugPreview = 'preview123'

export default function QRTrackApp() {
  const [session, setSession] = useState<Session | null>(() => typeof window === 'undefined' ? null : authService.session())
  const [path, setPath] = useState(() => typeof window === 'undefined' ? '/' : window.location.pathname)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => typeof window === 'undefined' ? 'system' : (localStorage.getItem('qrtrack.theme') as 'light' | 'dark' | 'system') || 'system')
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => { const onPop = () => setPath(window.location.pathname); addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop) }, [])
  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark); localStorage.setItem('qrtrack.theme', theme)
  }, [theme])
  const go = (next: string) => { history.pushState({}, '', next); setPath(next); scrollTo({ top: 0, behavior: 'smooth' }) }
  const toast = (text: string, kind: Toast['kind'] = 'success') => { const id = Date.now(); setToasts((items) => [...items, { id, text, kind }]); setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500) }
  return <>
    {path === '/login' || (session && path !== '/') ? <Workspace session={session} setSession={setSession} path={path} go={go} toast={toast} theme={theme} setTheme={setTheme} /> : <Landing go={go} hasSession={Boolean(session)} />}
    <div className="toast-stack" aria-live="polite">{toasts.map((item) => <div key={item.id} className={`toast ${item.kind}`}><Check size={17}/>{item.text}</div>)}</div>
  </>
}

function Brand() { return <div className="brand"><span className="brand-mark"><QrCode size={22}/></span><span>QRTrack</span></div> }
function Landing({ go, hasSession }: { go: (path: string) => void; hasSession: boolean }) {
  const features: Array<[typeof QrCode, string, string]> = [
    [QrCode, 'Create QR codes', 'Public tracking links that work from any phone.'], [Palette, 'Customize templates', 'Print-ready layouts with live design controls.'],
    [BarChart3, 'Track scans', 'Real scan events, devices, browsers, and regions.'], [Link2, 'Dynamic destinations', 'Update the destination without reprinting the code.'],
  ]
  return <main className="landing">
    <nav className="landing-nav"><Brand/><div className="landing-actions"><button className="text-button" onClick={() => go('/login')}>Sign in</button><button className="button compact" onClick={() => go(hasSession ? '/dashboard' : '/login')}>{hasSession ? 'View Dashboard' : 'Create a QR'} <ArrowRight size={16}/></button></div></nav>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><Zap size={14}/> Dynamic QR campaigns, simplified</div><h1>Create.<br/><em>Scan.</em> Track.</h1><p>Create smart QR codes, customize their design, and track real campaign activity from one simple dashboard.</p><div className="hero-actions"><button className="button large" onClick={() => go(hasSession ? '/create' : '/login')}>Create Your First QR <ArrowRight size={18}/></button><button className="button secondary large" onClick={() => go(hasSession ? '/dashboard' : '/login')}>View Dashboard</button></div><div className="trust-row"><ShieldCheck size={18}/><span>Dynamic destinations</span><span>•</span><span>Real scan tracking</span><span>•</span><span>No subscriptions</span></div></div>
      <div className="hero-visual"><div className="orbit one"/><div className="orbit two"/><div className="poster-card"><div className="poster-top"><span>FIELD NOTES / 04</span><span>NEW DROP</span></div><h2>Take the<br/>long way.</h2><div className="poster-code"><QRPreview compact data={`${appUrl()}/r/sample`} template="scan-here" text="SCAN HERE" design={defaultDesign}/></div><p>Scan to explore the collection</p></div><div className="floating-stat"><Activity size={18}/><div><b>Live activity</b><span>Recorded on every scan</span></div></div></div>
    </section>
    <section className="feature-strip">{features.map(([Icon, title, copy]) => <article key={title}><span><Icon size={21}/></span><h3>{title}</h3><p>{copy}</p></article>)}</section>
  </main>
}

function Workspace({ session, setSession, path, go, toast, theme, setTheme }: { session: Session | null; setSession: (session: Session | null) => void; path: string; go: (path: string) => void; toast: (text: string, kind?: Toast['kind']) => void; theme: 'light' | 'dark' | 'system'; setTheme: (theme: 'light' | 'dark' | 'system') => void }) {
  if (!session) return <Login onSession={(value) => { setSession(value); go('/dashboard') }} go={go}/>
  const section = (path.slice(1).split('/')[0] || 'dashboard') as Section
  return <AppShell section={section} session={session} onSignOut={() => { authService.signOut(); setSession(null); go('/') }} go={go} toast={toast} theme={theme} setTheme={setTheme}/>
}
function Login({ onSession, go }: { onSession: (session: Session) => void; go: (path: string) => void }) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [remember, setRemember] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [lit, setLit] = useState(true)
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); if (!email || password.length < 6) return setError('Enter a valid email and a password with at least 6 characters.'); setBusy(true); try { onSession(await (mode === 'signin' ? authService.signIn(email, password, remember) : authService.create(email, password, remember))) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to continue.') } finally { setBusy(false) } }
  return <main className="auth-page"><button className="brand auth-brand" onClick={() => go('/')}><span className="brand-mark"><QrCode size={22}/></span><span>QRTrack</span></button><section className={`auth-card ${lit ? '' : 'lamp-off'}`}><div className="auth-lamp" role="button" tabIndex={0} aria-label="Toggle lamp" aria-pressed={lit} onClick={() => setLit((value) => !value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setLit((value) => !value) } }}><span className="auth-lamp-cord"><span className="auth-lamp-pull"/></span><span className="auth-lamp-shade"><span className="auth-lamp-bulb"/></span><span className="auth-lamp-beam"/><span className="auth-lamp-bot"><span className="auth-lamp-ear left"/><span className="auth-lamp-ear right"/><span className="auth-lamp-eyes"><i/><i/></span><span className="auth-lamp-smile"/></span></div><div className="eyebrow">Personal workspace</div><h1>{mode === 'signin' ? 'Welcome back.' : 'Create your workspace.'}</h1><p>{mode === 'signin' ? 'Pull the cord to light your way in.' : 'This local login separates workspaces in this browser.'} It is not server-grade authentication.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}/></label><label className="check-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/><span>Remember session</span></label>{error && <div className="inline-error">{error}</div>}<button className="button full" disabled={busy}>{busy ? 'Working…' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button></form><button className="switch-auth" onClick={() => { setMode(mode === 'signin' ? 'create' : 'signin'); setError('') }}>{mode === 'signin' ? 'New here? Create Account' : 'Already have a workspace? Sign In'}</button></section></main>
}

function AppShell({ section, session, onSignOut, go, toast, theme, setTheme }: { section: Section; session: Session; onSignOut: () => void; go: (path: string) => void; toast: (text: string, kind?: Toast['kind']) => void; theme: 'light' | 'dark' | 'system'; setTheme: (theme: 'light' | 'dark' | 'system') => void }) {
  const [data, setData] = useState<WorkspaceData>({ campaigns: [], events: [] }); const [loading, setLoading] = useState(true); const [menu, setMenu] = useState(false); const [selected, setSelected] = useState<Campaign | null>(null)
  const load = async (showLoading = true) => { if (showLoading) setLoading(true); try { setData(await dataService.getWorkspace(session.workspaceId)) } catch (error) { toast(error instanceof Error ? error.message : 'Unable to load workspace.', 'error') } finally { if (showLoading) setLoading(false) } }
  useEffect(() => { void load() }, [session.workspaceId])
  const navigate = (value: Section) => { go(`/${value}`); setMenu(false); if (value !== 'create' && value !== 'designer') setSelected(null) }
  const edit = (campaign: Campaign) => { setSelected(campaign); go('/create') }
  const nav = [[LayoutDashboard, 'Dashboard', 'dashboard'], [Plus, 'Create QR', 'create'], [QrCode, 'My QR Codes', 'codes'], [BarChart3, 'QR Analytics', 'analytics'], [Palette, 'Template Designer', 'designer'], [Settings, 'Settings', 'settings']] as const
  return <div className="app-shell"><aside className={`sidebar ${menu ? 'open' : ''}`}><div className="sidebar-top"><Brand/><button className="icon-button mobile-only" onClick={() => setMenu(false)} aria-label="Close menu"><X/></button></div><nav>{nav.map(([Icon, label, value]) => <button key={value} className={section === value ? 'active' : ''} onClick={() => navigate(value)}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><div className="user-chip"><span>{session.email.slice(0, 1).toUpperCase()}</span><div><b>{session.email}</b><small>Personal workspace</small></div></div><button onClick={onSignOut}><LogOut size={18}/>Sign out</button></div></aside>{menu && <div className="scrim" onClick={() => setMenu(false)}/>}<main className="workspace"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setMenu(true)} aria-label="Open menu"><Menu/></button><div className="topbar-spacer"/><button className="theme-quick" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="button compact" onClick={() => navigate('create')}><Plus size={16}/> Create QR</button></header><div className="page-wrap">
    {loading ? <LoadingState/> : section === 'dashboard' ? <Dashboard data={data} go={navigate} edit={edit}/> : section === 'codes' ? <Codes data={data} session={session} reload={load} edit={edit} go={navigate} toast={toast}/> : section === 'analytics' ? <Analytics data={data} initial={selected} edit={edit} toast={toast}/> : section === 'settings' ? <SettingsPage data={data} session={session} reload={load} onSignOut={onSignOut} theme={theme} setTheme={setTheme} toast={toast}/> : <CampaignEditor session={session} existing={selected} designerOnly={section === 'designer'} reload={load} go={navigate} toast={toast}/>} 
  </div></main></div>
}
function LoadingState() { return <div className="skeleton-page"><div/><div className="skeleton-grid"><span/><span/><span/><span/></div><div className="skeleton-panel"/></div> }
function PageHead({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="page-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{copy}</p></div>{action}</div> }
function EmptyState({ icon: Icon = QrCode, title, copy, action }: { icon?: typeof QrCode; title: string; copy: string; action?: React.ReactNode }) { return <div className="empty-state"><span><Icon size={28}/></span><h3>{title}</h3><p>{copy}</p>{action}</div> }

function Dashboard({ data, go, edit }: { data: WorkspaceData; go: (section: Section) => void; edit: (campaign: Campaign) => void }) {
  const totalScans = data.events.filter((event) => event.eventType === 'scan').length; const opens = data.events.filter((event) => event.eventType === 'open').length; const unique = new Set(data.events.filter((event) => event.eventType === 'scan').map((event) => event.visitorId)).size
  const cards: Array<[typeof QrCode, string, number | string, string]> = [[QrCode, 'Total QR Codes', data.campaigns.length, 'Active QR campaigns'], [Activity, 'Total Scans', totalScans, 'Recorded scan events'], [Users, 'Unique Visitors', unique, 'Anonymous estimate'], [ExternalLink, 'Landing Page Opens', opens, 'Verified opens only'], [BarChart3, 'Open Rate', totalScans ? `${Math.round(opens / totalScans * 100)}%` : '0%', 'Opens ÷ scans']]
  return <><PageHead title="Dashboard" copy="Track your QR campaigns and see how they perform." action={<button className="button" onClick={() => go('create')}><Plus size={17}/> Create QR</button>}/>{!data.campaigns.length ? <EmptyState title="No QR campaigns yet" copy="Create a QR code to start tracking your campaigns." action={<button className="button" onClick={() => go('create')}>Create Your First QR</button>}/> : <><div className="stat-grid">{cards.map(([Icon, label, value, note]) => <article className="stat-card" key={String(label)}><div className="stat-icon"><Icon size={19}/></div><span>{String(label)}</span><strong>{String(value)}</strong><small>{String(note)}</small></article>)}</div><section className="panel chart-panel"><PanelTitle title="Scan Activity" subtitle="Real tracking visits over the last 30 days"/>{totalScans ? <ActivityChart events={data.events}/> : <EmptyState icon={Activity} title="No scan data yet" copy="Create and share a QR code to start tracking."/>}</section><div className="two-column"><section className="panel"><PanelTitle title="Top Campaigns" subtitle="Ranked by total scans"/>{data.campaigns.slice().sort((a,b) => eventStats(b,data.events).scans-eventStats(a,data.events).scans).slice(0,5).map((campaign) => { const stats=eventStats(campaign,data.events); return <button className="campaign-row" key={campaign.id} onClick={() => edit(campaign)}><span className="mini-qr"><QrCode size={20}/></span><span><b>{campaign.campaignName}</b><small>{stats.scans} scans · {stats.unique} visitors</small></span><span className="row-end">{stats.openRate}%<ArrowRight size={16}/></span></button>})}</section><section className="panel"><PanelTitle title="Recent Activity" subtitle="Latest verified events"/>{data.events.length ? data.events.slice(0,6).map((event) => { const campaign=data.campaigns.find((item)=>item.id===event.campaignId); return <div className="event-row" key={event.id}><span className="event-dot"/><span><b>{campaign?.campaignName || event.slug}</b><small>{event.eventType === 'scan' ? 'Scan' : 'Open'} · {event.device} · {event.browser}</small></span><time>{dateTime(event.timestamp)}</time></div>}) : <div className="panel-empty">No scans recorded yet.</div>}</section></div></>}</>
}
function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div> }
function ActivityChart({ events, type = 'scan' }: { events: ScanEvent[]; type?: 'scan' | 'open' }) {
  const [range, setRange] = useState<'7' | '30' | '90' | 'all'>('30')
  const points = useMemo(() => { const requested = range === 'all' ? Math.max(1, Math.ceil((Date.now() - Math.min(...events.map((event) => +new Date(event.timestamp)), Date.now())) / 86_400_000) + 1) : Number(range); const days = Array.from({length:requested},(_,index)=>{ const date=new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate()-(requested-1-index)); return date }); return days.map((date)=>({ label: date.toLocaleDateString(undefined,{month:'short',day:'numeric'}), count: events.filter((event)=>event.eventType===type && new Date(event.timestamp).toDateString()===date.toDateString()).length })) }, [events,type,range])
  return <><div className="range-tabs">{([['7','7 Days'],['30','30 Days'],['90','90 Days'],['all','All Time']] as const).map(([value,label])=><button className={range===value?'active':''} onClick={()=>setRange(value)} key={value}>{label}</button>)}</div><div className="chart-box"><Line data={{ labels: points.map((p)=>p.label), datasets:[{ data:points.map((p)=>p.count), borderColor:'#89a419', backgroundColor:'rgba(197,225,69,.14)', fill:true, tension:.35, pointRadius:2, pointHoverRadius:5 }] }} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{displayColors:false}}, scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:'rgba(128,140,125,.12)'}}} }}/></div></>
}

function Codes({ data, session, reload, edit, go, toast }: { data: WorkspaceData; session: Session; reload: () => Promise<void>; edit: (campaign: Campaign) => void; go: (section: Section) => void; toast: (text: string, kind?: Toast['kind']) => void }) {
  const [search,setSearch]=useState(''); const [sort,setSort]=useState('newest'); const [filter,setFilter]=useState('all')
  const rows=data.campaigns.filter((c)=>`${c.campaignName} ${c.destinationUrl}`.toLowerCase().includes(search.toLowerCase()) && (filter==='all'||(filter==='active'&&c.active))).sort((a,b)=>sort==='name'?a.campaignName.localeCompare(b.campaignName):+new Date(b.createdAt)-+new Date(a.createdAt))
  const remove=async(c:Campaign)=>{if(!confirm('Delete this QR campaign?'))return; try{await dataService.deleteCampaign(session.workspaceId,c.slug); await reload(); toast('Campaign deleted')}catch(e){toast(e instanceof Error?e.message:'Delete failed.','error')}}
  const duplicate=async(c:Campaign)=>{try{await dataService.createCampaign(session.workspaceId,{campaignName:`${c.campaignName} Copy`,description:c.description,destinationUrl:c.destinationUrl,template:c.template,customText:c.customText,designSettings:c.designSettings}); await reload(); toast('Campaign duplicated')}catch(e){toast(e instanceof Error?e.message:'Duplicate failed.','error')}}
  return <><PageHead title="My QR Codes" copy="Manage destinations, designs, downloads, and campaign activity." action={<button className="button" onClick={()=>go('create')}><Plus size={17}/> Create QR</button>}/><div className="toolbar"><label className="search"><Search size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search campaigns"/></label><select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All campaigns</option><option value="active">Active</option></select><select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="name">Campaign name</option></select></div>{rows.length?<div className="campaign-grid">{rows.map((campaign)=>{const stats=eventStats(campaign,data.events); return <article className="campaign-card" key={campaign.id}><div className="campaign-preview"><QRPreview compact data={trackingUrl(campaign.slug)} template={campaign.template} text={campaign.customText} design={campaign.designSettings}/><span className="status active">Active</span></div><div className="campaign-card-body"><div className="campaign-heading"><div><h3>{campaign.campaignName}</h3><a href={campaign.destinationUrl} target="_blank" rel="noreferrer">{campaign.destinationUrl}</a></div><MoreHorizontal size={19}/></div><div className="metric-row"><span><b>{stats.scans}</b>Scans</span><span><b>{stats.unique}</b>Visitors</span><span><b>{stats.openRate}%</b>Open rate</span></div><div className="campaign-meta"><span>Created {shortDate(campaign.createdAt)}</span><span>{dateTime(stats.last)}</span></div><div className="card-actions"><button onClick={()=>edit(campaign)}><Edit3 size={16}/> Edit</button><button onClick={()=>{void downloadRaw(campaign,'png');toast('QR downloaded')}}><Download size={16}/> Download</button><button onClick={()=>duplicate(campaign)}><Copy size={16}/> Duplicate</button><button className="danger" onClick={()=>remove(campaign)} aria-label="Delete campaign"><Trash2 size={16}/></button></div></div></article>})}</div>:<EmptyState title="No campaigns found" copy="Create a QR code to start tracking your campaigns." action={<button className="button" onClick={()=>go('create')}>Create QR</button>}/>}</>
}

async function downloadRaw(campaign: Campaign, type: 'png' | 'svg') {
  const url=trackingUrl(campaign.slug); const name=campaign.campaignName.toLowerCase().replace(/[^a-z0-9]+/g,'-')
  if(type==='png'){const value=await QRCode.toDataURL(url,{width:1600,margin:4,color:{dark:campaign.designSettings.qrColor,light:'#ffffff'},errorCorrectionLevel:'H'}); triggerDownload(value,`${name}-qr.png`)} else {const value=await QRCode.toString(url,{type:'svg',width:1200,margin:4,color:{dark:campaign.designSettings.qrColor,light:'#ffffff'},errorCorrectionLevel:'H'}); triggerDownload(URL.createObjectURL(new Blob([value],{type:'image/svg+xml'})),`${name}-qr.svg`)}
}
function triggerDownload(url:string,name:string){const link=document.createElement('a');link.href=url;link.download=name;link.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),1000)}

function CampaignEditor({ session, existing, designerOnly, reload, go, toast }: { session: Session; existing: Campaign | null; designerOnly: boolean; reload: (showLoading?: boolean) => Promise<void>; go: (section: Section) => void; toast: (text: string, kind?: Toast['kind']) => void }) {
  const [input, setInput] = useState<CampaignInput>(existing ? { campaignName: existing.campaignName, description: existing.description, destinationUrl: existing.destinationUrl, template: existing.template, customText: existing.customText, designSettings: existing.designSettings } : { ...emptyInput, designSettings: { ...defaultDesign } })
  const [saved, setSaved] = useState<Campaign | null>(existing)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [qrReady, setQrReady] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const generatedRef = useRef<HTMLElement>(null)
  const isCreation = !existing && !designerOnly
  const markQrReady = useCallback(() => setQrReady(true), [])

  useEffect(() => {
    if (existing) {
      setInput({ campaignName: existing.campaignName, description: existing.description, destinationUrl: existing.destinationUrl, template: existing.template, customText: existing.customText, designSettings: existing.designSettings })
      setSaved(existing)
    }
  }, [existing])

  const update = (patch: Partial<CampaignInput>) => setInput((current) => ({ ...current, ...patch }))
  const updateDesign = (patch: Partial<DesignSettings>) => setInput((current) => ({ ...current, designSettings: { ...current.designSettings, ...patch } }))
  const chooseTemplate = (id: TemplateId, text: string) => update({ template: id, customText: id === 'custom' ? input.customText || text : text })
  const save = async () => {
    const validation = validateInput(input)
    setError(validation)
    if (validation) return
    setBusy(true)
    const updating = Boolean(saved)
    try {
      const result = saved ? await dataService.updateCampaign(session.workspaceId, saved.slug, input) : await dataService.createCampaign(session.workspaceId, input)
      setSaved(result)
      await reload(false)
      toast(updating ? 'Campaign updated' : 'QR created successfully')
      if (isCreation && !updating) requestAnimationFrame(() => generatedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : 'Unable to save campaign.', 'error')
    } finally {
      setBusy(false)
    }
  }
  const exportTemplate = async () => {
    if (!saved) return setError('Save the campaign before downloading the template.')
    const node = previewRef.current
    if (!node || !qrReady) return
    try {
      await document.fonts.ready
      await Promise.all(Array.from(node.querySelectorAll('img')).map((image) => image.decode().catch(() => undefined)))
      const data = await toPng(node, { pixelRatio: 4, cacheBust: true, backgroundColor: input.designSettings.backgroundColor })
      triggerDownload(data, `${input.campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-template.png`)
      toast('Template downloaded')
    } catch {
      toast('Template export failed. Try removing the logo and download again.', 'error')
    }
  }
  const logo = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateDesign({ logoDataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }
  const unsafe = contrast(input.designSettings.qrColor, input.designSettings.backgroundColor) < 3.5 || Boolean(input.designSettings.logoDataUrl)
  const previewUrl = saved ? trackingUrl(saved.slug) : `${appUrl()}/r/${slugPreview}`
  const downloadCampaign = saved ? { ...saved, ...input } : null
  useEffect(() => setQrReady(false), [previewUrl, input.designSettings.logoDataUrl, input.designSettings.qrColor, input.designSettings.qrSize, input.designSettings.qrStyle])

  const campaignFields = <>
    <label>Campaign Name<input value={input.campaignName} onChange={(event) => update({ campaignName: event.target.value })} placeholder="Summer Sale Poster"/></label>
    <label>Description <small>Optional</small><textarea value={input.description} onChange={(event) => update({ description: event.target.value })} placeholder="Instagram promotional poster." rows={3}/></label>
    <label>Destination URL<input value={input.destinationUrl} onChange={(event) => update({ destinationUrl: event.target.value })} placeholder="https://example.com" inputMode="url"/></label>
    {error && <div className="inline-error">{error}</div>}
  </>
  const templatePicker = <div className="template-grid">{templates.map((template) => {
    const TemplateIcon = template.icon
    return <button type="button" key={template.id} className={input.template === template.id ? 'selected' : ''} onClick={() => chooseTemplate(template.id, template.text)}>
      <div className="template-thumb"><QRPreview compact exportSafe data={previewUrl} template={template.id} text={template.text} design={{ ...input.designSettings, backgroundColor: template.id === 'gift' ? '#fff7df' : template.id === 'whatsapp' ? '#e8f8ee' : input.designSettings.backgroundColor }}/></div>
      <span><TemplateIcon size={15}/>{template.label}</span>
    </button>
  })}</div>
  const designControls = <>
    <label>CTA Text<input value={input.customText} onChange={(event) => update({ customText: event.target.value })} maxLength={80}/></label>
    <div className="control-grid">
      <Select label="Text Size" value={input.designSettings.textSize} onChange={(value) => updateDesign({ textSize: value as DesignSettings['textSize'] })} options={['small', 'medium', 'large']}/>
      <Select label="QR Size" value={input.designSettings.qrSize} onChange={(value) => updateDesign({ qrSize: value as DesignSettings['qrSize'] })} options={['small', 'medium', 'large']}/>
      <Select label="QR Style" value={input.designSettings.qrStyle} onChange={(value) => updateDesign({ qrStyle: value as DesignSettings['qrStyle'] })} options={['square', 'rounded', 'dots']}/>
      <Select label="Alignment" value={input.designSettings.alignment} onChange={(value) => updateDesign({ alignment: value as DesignSettings['alignment'] })} options={['left', 'center', 'right']}/>
      <label>QR Color<div className="color-input"><input type="color" value={input.designSettings.qrColor} onChange={(event) => updateDesign({ qrColor: event.target.value })}/><span>{input.designSettings.qrColor}</span></div></label>
      <label>Background<div className="color-input"><input type="color" value={input.designSettings.backgroundColor} onChange={(event) => updateDesign({ backgroundColor: event.target.value })}/><span>{input.designSettings.backgroundColor}</span></div></label>
    </div>
    <label>Optional Logo<input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => logo(event.target.files?.[0])}/></label>
    {input.designSettings.logoDataUrl && <button type="button" className="text-button danger-text" onClick={() => updateDesign({ logoDataUrl: undefined })}>Remove logo</button>}
    {unsafe && <div className="notice warning compact-notice"><ShieldCheck size={17}/><span>Warning: This design may reduce QR readability. Test it before printing.</span></div>}
  </>
  const localWarning = isLocal() && <div className="notice warning"><Zap size={18}/><div><b>Local development QR warning</b><span>Local QR codes cannot be scanned from another device. Deploy QRTrack to Netlify to create public tracking QR codes.</span></div></div>

  if (isCreation) return <div className="creation-page">
    <PageHead eyebrow="New campaign" title="Create QR" copy="Create a dynamic tracking link, then choose and customize its visual template."/>
    {localWarning}
    <div className="creation-flow">
      <section className="form-card"><div className="step-label"><span>01</span> Campaign</div>{campaignFields}</section>
      <div className="editor-actions creation-generate"><button type="button" className="button full" disabled={busy} onClick={save}>{busy ? 'Generating…' : saved ? 'Update My QR' : 'Generate My QR'}</button></div>
      {saved && <>
        <section ref={generatedRef} className="form-card creation-result"><div className="step-label"><span>02</span> Your Generated QR</div><div className="generated-qr-stage"><QRPreview exportSafe data={previewUrl} template="qr-only" text="" design={input.designSettings}/></div><p className="tracking-note"><Link2 size={15}/>This QR keeps the same public tracking link when you edit its destination or template.</p></section>
        <section className="form-card"><div className="step-label"><span>03</span> Templates</div>{templatePicker}</section>
        <section className="form-card selected-template"><div className="step-label"><span>04</span> Selected Template Preview</div><div ref={previewRef} className="export-stage"><QRPreview exportSafe onReady={markQrReady} data={previewUrl} template={input.template} text={input.customText} design={input.designSettings}/></div></section>
        <section className="form-card"><div className="step-label"><span>05</span> Editable Template</div>{designControls}<div className="editor-actions template-save"><button type="button" className="button secondary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Template Changes'}</button></div></section>
        <section className="form-card creation-downloads"><div className="step-label"><span>06</span> Download</div><div className="download-stack"><button type="button" disabled={!downloadCampaign} onClick={() => downloadCampaign && downloadRaw(downloadCampaign, 'png')}><Download size={17}/>Download QR PNG</button><button type="button" disabled={!qrReady} onClick={exportTemplate}><Download size={17}/>Download Template PNG / Poster</button></div></section>
      </>}
    </div>
  </div>

  return <div className="editor-page">
    <PageHead eyebrow={designerOnly ? 'Design studio' : 'Edit campaign'} title={designerOnly ? 'Template Designer' : 'Edit QR Campaign'} copy={designerOnly ? 'Build a polished, print-ready QR composition with live controls.' : 'Create a dynamic tracking link, then choose and customize its visual template.'}/>
    {localWarning}
    <div className="editor-layout"><div className="editor-controls">
      <section className="form-card"><div className="step-label"><span>01</span> Campaign</div>{campaignFields}</section>
      <section className="form-card"><div className="step-label"><span>02</span> Choose a Template</div>{templatePicker}</section>
      <section className="form-card"><div className="step-label"><span>03</span> Customize Design</div>{designControls}</section>
      <div className="editor-actions"><button type="button" className="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : saved ? 'Save Changes' : 'Create Dynamic QR'}</button>{saved && <button type="button" className="button secondary" onClick={() => go('codes')}>View My QR Codes</button>}</div>
    </div><aside className="preview-column"><div className="preview-sticky"><div className="preview-title"><span>Live preview</span><small>{saved ? trackingUrl(saved.slug) : 'A permanent slug is assigned when saved'}</small></div><div ref={previewRef} className="export-stage"><QRPreview exportSafe onReady={markQrReady} data={previewUrl} template={input.template} text={input.customText} design={input.designSettings}/></div><div className="download-stack"><button type="button" disabled={!downloadCampaign} onClick={() => downloadCampaign && downloadRaw(downloadCampaign, 'png')}><Download size={17}/>Download QR PNG</button><button type="button" disabled={!downloadCampaign} onClick={() => downloadCampaign && downloadRaw(downloadCampaign, 'svg')}><Download size={17}/>Download QR SVG</button><button type="button" disabled={!saved || !qrReady} onClick={exportTemplate}><Download size={17}/>Download Template PNG</button></div><p className="tracking-note"><Link2 size={15}/>{saved ? 'This QR remains unchanged when you edit the destination.' : 'The QR encodes a public tracking URL, never the destination directly.'}</p></div></aside></div>
  </div>
}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[]}){return <label>{label}<div className="select-wrap"><select value={value} onChange={(e)=>onChange(e.target.value)}>{options.map((option)=><option key={option} value={option}>{option[0].toUpperCase()+option.slice(1)}</option>)}</select><ChevronDown size={16}/></div></label>}
function contrast(a:string,b:string){const lum=(hex:string)=>{const values=[1,3,5].map((i)=>parseInt(hex.slice(i,i+2),16)/255).map((v)=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*values[0]+.7152*values[1]+.0722*values[2]};const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05)}

function Analytics({data,initial,edit,toast}:{data:WorkspaceData;initial:Campaign|null;edit:(campaign:Campaign)=>void;toast:(text:string,kind?:Toast['kind'])=>void}){
  const [slug,setSlug]=useState(initial?.slug||data.campaigns[0]?.slug||''); const campaign=data.campaigns.find((item)=>item.slug===slug); if(!campaign)return <><PageHead title="QR Analytics" copy="Explore real campaign scans, visitors, devices, and locations."/><EmptyState icon={BarChart3} title="No analytics yet" copy="Create and share a QR code to start tracking real activity."/></>
  const own=data.events.filter((event)=>event.campaignId===campaign.id);const stats=eventStats(campaign,data.events);const summaryCards:Array<[typeof Activity,string,number|string]>=[[Activity,'Total Scans',stats.scans],[Users,'Unique Visitors',stats.unique],[ExternalLink,'Landing Page Opens',stats.opens],[BarChart3,'Open Rate',`${stats.openRate}%`]];const distributions=(key:'device'|'browser'|'operatingSystem')=>Object.entries(own.filter(e=>e.eventType==='scan').reduce<Record<string,number>>((acc,event)=>{acc[event[key]]=(acc[event[key]]||0)+1;return acc},{}));const copy=async()=>{await navigator.clipboard.writeText(trackingUrl(campaign.slug));toast('QR copied')}
  return <><PageHead eyebrow="Campaign analytics" title={campaign.campaignName} copy="Verified QR tracking activity with anonymous visitor estimates." action={<div className="head-actions"><button className="button secondary" onClick={()=>edit(campaign)}><Edit3 size={16}/>Edit</button><button className="button" onClick={copy}><Copy size={16}/>Copy Tracking Link</button></div>}/><div className="campaign-selector"><label>Campaign<select value={slug} onChange={(e)=>setSlug(e.target.value)}>{data.campaigns.map((item)=><option value={item.slug} key={item.id}>{item.campaignName}</option>)}</select></label><div><span>Destination</span><a href={campaign.destinationUrl} target="_blank" rel="noreferrer">{campaign.destinationUrl}</a></div><div><span>Tracking URL</span><code>{trackingUrl(campaign.slug)}</code></div><div><span>Created</span><b>{shortDate(campaign.createdAt)}</b></div></div><div className="stat-grid four">{summaryCards.map(([Icon,label,value])=><article className="stat-card" key={label}><div className="stat-icon"><Icon size={19}/></div><span>{label}</span><strong>{String(value)}</strong></article>)}</div><div className="notice"><ExternalLink size={18}/><div><b>External open tracking is unavailable</b><span>QRTrack records the redirect visit reliably, but cannot verify that an external destination fully loaded. No open events are invented.</span></div></div><div className="two-column analytics-charts"><section className="panel"><PanelTitle title="Scans Over Time" subtitle="Last 30 days"/>{stats.scans?<ActivityChart events={own}/>:<EmptyState icon={Activity} title="No scan data yet" copy="Share this QR to begin collecting activity."/>}</section><section className="panel"><PanelTitle title="Landing Page Opens Over Time" subtitle="Verified opens only"/>{stats.opens?<ActivityChart events={own} type="open"/>:<EmptyState icon={ExternalLink} title="No verified opens" copy="Open tracking is unavailable for this external destination."/>}</section></div><div className="three-column">{[['Device',distributions('device')],['Browser',distributions('browser')],['Operating System',distributions('operatingSystem')]].map(([title,values])=><Distribution key={String(title)} title={String(title)} values={values as [string,number][]}/>)}</div><section className="panel"><PanelTitle title="Recent Events" subtitle="No personal identity is collected"/>{own.length?<div className="event-table"><div className="event-table-head"><span>Event</span><span>Date & Time</span><span>Device</span><span>Browser / OS</span><span>Location</span></div>{own.slice(0,50).map((event)=><div className="event-table-row" key={event.id}><span><i className="event-dot"/>{event.eventType==='scan'?'Scan':'Open'}</span><time>{dateTime(event.timestamp)}</time><span>{event.device}</span><span>{event.browser} / {event.operatingSystem}</span><span>{[event.region,event.country].filter(Boolean).join(', ')||'Location unavailable'}</span></div>)}</div>:<div className="panel-empty">No scans recorded yet.</div>}</section></>
}
function Distribution({title,values}:{title:string;values:[string,number][]}){const total=values.reduce((sum,[,value])=>sum+value,0);return <section className="panel distribution"><PanelTitle title={title} subtitle={total?`${total} recorded scans`:'No data yet'}/>{values.length?<><div className="donut"><Doughnut data={{labels:values.map(([name])=>name),datasets:[{data:values.map(([,value])=>value),backgroundColor:['#c5df45','#213126','#729068','#e6ab4c','#a68be5'],borderWidth:0}]}} options={{plugins:{legend:{display:false}},cutout:'72%'}}/><b>{total}</b></div><div className="legend-list">{values.map(([name,value],index)=><span key={name}><i style={{backgroundColor:['#c5df45','#213126','#729068','#e6ab4c','#a68be5'][index%5]}}/>{name}<b>{Math.round(value/total*100)}%</b></span>)}</div></>:<div className="panel-empty">Analytics appear after the first scan.</div>}</section>}

function SettingsPage({data,session,reload,onSignOut,theme,setTheme,toast}:{data:WorkspaceData;session:Session;reload:()=>Promise<void>;onSignOut:()=>void;theme:'light'|'dark'|'system';setTheme:(theme:'light'|'dark'|'system')=>void;toast:(text:string,kind?:Toast['kind'])=>void}){
  const fileRef=useRef<HTMLInputElement>(null);const exportData=()=>{const backup={format:'qrtrack-backup',version:1,exportedAt:new Date().toISOString(),email:session.email,campaigns:data.campaigns,analytics:data.events};triggerDownload(URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),`qrtrack-backup-${new Date().toISOString().slice(0,10)}.json`);toast('Data exported')};const importData=async(file?:File)=>{if(!file)return;try{const parsed=JSON.parse(await file.text()) as {format?:string;campaigns?:CampaignInput[];analytics?:unknown[]};if(parsed.format!=='qrtrack-backup'||!Array.isArray(parsed.campaigns))throw new Error();await dataService.importData(session.workspaceId,{campaigns:parsed.campaigns,analytics:Array.isArray(parsed.analytics)?parsed.analytics:[]});await reload();toast('Backup imported')}catch{toast('Invalid QRTrack backup file.','error')}};const clear=async()=>{if(!confirm('Clear all analytics? Campaigns will remain active.'))return;await dataService.clearAnalytics(session.workspaceId);await reload();toast('Analytics cleared')};const removeAll=async()=>{if(!confirm('Delete all QR campaigns? Every public QR will become inactive.'))return;await dataService.deleteAllCampaigns(session.workspaceId);await reload();toast('All campaigns deleted')}
  return <><PageHead title="Settings" copy="Manage your local account, appearance, and QRTrack data."/><div className="settings-stack"><section className="settings-card"><div><span className="settings-icon"><Users size={20}/></span><h2>Account</h2><p>Your local personal workspace identity.</p></div><div className="settings-content"><label>Email<input value={session.email} readOnly/></label><label>Workspace ID<input value={session.workspaceId} readOnly/></label><p className="muted">This login is stored in this browser and is not equivalent to secure server authentication.</p></div></section><section className="settings-card"><div><span className="settings-icon"><Palette size={20}/></span><h2>Appearance</h2><p>Choose how QRTrack looks on this device.</p></div><div className="settings-content theme-options">{(['light','dark','system'] as const).map((value)=><button key={value} className={theme===value?'selected':''} onClick={()=>setTheme(value)}>{value==='light'?<Sun/>:value==='dark'?<Moon/>:<Smartphone/>}<span>{value[0].toUpperCase()+value.slice(1)}</span>{theme===value&&<Check size={17}/>}</button>)}</div></section><section className="settings-card"><div><span className="settings-icon"><FileUp size={20}/></span><h2>Data Management</h2><p>Back up or restore campaign data.</p></div><div className="settings-content action-list"><button onClick={exportData}><Download size={18}/><span><b>Export Data</b><small>Download campaigns, designs, and available analytics as JSON.</small></span><ArrowRight size={17}/></button><button onClick={()=>fileRef.current?.click()}><FileUp size={18}/><span><b>Import Data</b><small>Restore campaigns from a valid QRTrack backup.</small></span><ArrowRight size={17}/></button><input ref={fileRef} hidden type="file" accept="application/json" onChange={(e)=>importData(e.target.files?.[0])}/><button onClick={clear}><Trash2 size={18}/><span><b>Clear Analytics</b><small>Remove scan events while keeping campaigns active.</small></span><ArrowRight size={17}/></button><button className="danger" onClick={removeAll}><Trash2 size={18}/><span><b>Delete All Campaigns</b><small>Deactivate every public tracking link.</small></span><ArrowRight size={17}/></button></div></section><div className="notice warning"><ShieldCheck size={18}/><div><b>QRTrack Personal Edition</b><span>QRTrack Personal Edition stores your local workspace in this browser. Export a backup regularly.</span></div></div><button className="button secondary signout-button" onClick={onSignOut}><LogOut size={17}/>Sign Out</button></div></>
}
