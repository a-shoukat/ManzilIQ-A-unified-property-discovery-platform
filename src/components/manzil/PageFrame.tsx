import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Building2, LayoutGrid, Map, Sparkles, ArrowLeftRight, Wallet, CalendarDays, FileText, ChartNoAxesCombined, Bell, ChevronRight, LogOut, Menu, X, Plus, ShieldCheck, Users, House, ArrowUpRight, Heart, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/manzil/auth';
import { useCompare } from '@/lib/manzil/compare';
import AiAssistant from './AiAssistant';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/lib/manzil/types';
import { canAccessPage, needsApproval } from '@/lib/manzil/access';

export function pageHead(name: string) {
 const title = `${name} | ManzilIQ`;
 const description = `${name} on ManzilIQ. Discover Pakistani real estate and manage properties, bookings, payments and documents.`;
 return { meta: [{ title }, { name:'description',content:description }, { property:'og:title',content:title }, { property:'og:description',content:description }, { property:'og:type',content:'website' }, { name:'twitter:card',content:'summary_large_image' }] };
}
export function useAppNavigation() {
 const navigate = useNavigate();
 return (page: string, arg?: string) => {
  if (page === 'property' && arg) { void navigate({ to:'/property/$id', params:{id:arg} }); return; }
  if (page === 'edit-property' && arg) { void navigate({ to:'/add-property', search:{ edit:arg } }); return; }
  const destination = page === 'marketplace' || page === 'browse' ? '/' : `/${page}`;
  void navigate({ to:destination });
 };
}
const mainLinks = [
 {key:'marketplace',label:'Marketplace',icon:House}, {key:'map-view',label:'Map explorer',icon:Map},
 {key:'price-estimator',label:'Price estimator',icon:Sparkles}, {key:'compare',label:'Compare properties',icon:ArrowLeftRight},
];
const portfolioLinks = [
 {key:'dashboard',label:'Overview',icon:LayoutGrid}, {key:'my-bookings',label:'My bookings',icon:CalendarDays},
 {key:'my-payments',label:'Payments',icon:Wallet}, {key:'documents',label:'Documents',icon:FileText},
 {key:'wishlist',label:'Wishlist',icon:Heart},{key:'saved-searches',label:'Saved searches',icon:Bell}, {key:'inbox',label:'Notifications',icon:Bell},
];
export function PageFrame({children, publicPage=false}: {children:ReactNode; publicPage?:boolean}) {
 const onNavigate = useAppNavigation();
 const { session, profile, loading, signOut } = useAuth();
 const {items} = useCompare();
 const location = useLocation();
 const current = location.pathname === '/' ? 'marketplace' : (location.pathname.split('/')[1] ?? 'marketplace');
 const [open,setOpen] = useState(false);
 const isSociety = profile?.role === 'society_admin' || profile?.role === 'super_admin';
 const isDealer = profile?.role === 'dealer' || profile?.role === 'super_admin';
 const go = (key:string) => { onNavigate(key); setOpen(false); };
  const links = (list:typeof mainLinks) => list.filter(({key}) => !session || canAccessPage(key, profile?.role)).map(({key,label,icon:Icon}) => <Button variant="legacy" key={key} className={`side-link${current===key?' active':''}`} onClick={()=>go(key)}><Icon size={18}/><span>{label}</span>{key==='compare' && items.length>0 && <span className="side-count">{items.length}</span>}</Button>);
  const allowed = canAccessPage(current, profile?.role);
  return <div className="app-shell">
   {open && <div className="mobile-scrim" onClick={()=>setOpen(false)}/>}
   <aside className={`sidebar${open?' open':''}`}>
    <Button variant="legacy" className="brand" onClick={()=>go('marketplace')}><span className="brand-symbol"><Building2 size={24}/></span><span>Manzil<span className="brand-iq">IQ</span></span></Button>
    <div className="workspace-label">YOUR PROPERTY PARTNER</div>
    <div className="nav-group"><div className="nav-section-label">DISCOVER</div>{links(mainLinks)}</div>
    <div className="nav-group"><div className="nav-section-label">MY WORKSPACE</div>{links(portfolioLinks)}</div>
    <div className="nav-group"><div className="nav-section-label">INSIGHTS</div>{links([{key:'market-trends',label:'Market trends',icon:ChartNoAxesCombined}])}
     {isSociety && links([{key:'society',label:'Society management',icon:Building2},{key:'society-inventory',label:'Plot inventory',icon:LayoutGrid},{key:'society-bookings',label:'Booking requests',icon:CalendarDays},{key:'society-dealers',label:'Dealers',icon:Users},{key:'society-financials',label:'Financials',icon:Wallet},{key:'society-analytics',label:'Society analytics',icon:ChartNoAxesCombined}])}
     {isDealer && links([{key:'dealer',label:'Dealer workspace',icon:Users},{key:'dealer-lots',label:'My lots',icon:LayoutGrid},{key:'dealer-leads',label:'Leads',icon:Users},{key:'dealer-book',label:'Book for customer',icon:CalendarDays},{key:'dealer-commissions',label:'Commissions',icon:Wallet},{key:'dealer-analytics',label:'Performance',icon:ChartNoAxesCombined}])}
    {profile?.role==='super_admin' && links([{key:'admin',label:'Administration',icon:ShieldCheck},{key:'admin-users',label:'Users',icon:Users},{key:'admin-verification',label:'Approvals',icon:ShieldCheck},{key:'admin-bookings',label:'All bookings',icon:CalendarDays},{key:'admin-disputes',label:'Disputes',icon:ShieldCheck},{key:'admin-fraud',label:'Fraud alerts',icon:ShieldCheck},{key:'admin-reports',label:'Reported listings',icon:ShieldCheck},{key:'admin-templates',label:'Templates',icon:FileText},{key:'admin-analytics',label:'Platform analytics',icon:ChartNoAxesCombined},{key:'broadcast',label:'Broadcast',icon:Bell}])}
   </div>
   <div className="sidebar-bottom"><div className="advisor-note"><Sparkles size={19}/><strong>A little clarity goes a long way.</strong><span>Find your next move with ManzilIQ.</span><Button variant="legacy" className="advisor-link" onClick={()=>go('price-estimator')}>Explore price estimates <ArrowUpRight size={16}/></Button></div>
   <Button variant="legacy" className="account-button" onClick={()=> session ? go('dashboard') : go('login')}><span className="avatar">{session?.user.email?.[0]?.toUpperCase() ?? 'G'}</span><span><strong>{session?.user.email?.split('@')[0] ?? 'Guest account'}</strong><small>{profile?.role?.replace('_',' ') ?? 'Welcome to ManzilIQ'}</small></span><ChevronRight size={16}/></Button></div>
  </aside>
  <div className="workspace"><header className="workspace-header"><div className="breadcrumb"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu/></Button><span>Workspace</span><ChevronRight size={14}/><strong>{current==='marketplace'?'Marketplace':current.replaceAll('-',' ')}</strong></div><div className="header-actions"><span className="market-label"><span/>Pakistan property market</span><Button variant="ghost" size="icon" aria-label="Notifications" onClick={()=>go('inbox')}><Bell size={18}/></Button><span className="header-divider"/>{session ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Account menu" className="avatar-btn"><span className="avatar-circle">{(profile?.email ?? 'U').charAt(0).toUpperCase()}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel><div className="text-sm font-medium truncate">{profile?.email}</div><div className="text-xs text-muted-foreground">{profile ? ROLE_LABELS[profile.role] : ''}</div></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>go('dashboard')}><LayoutGrid size={16}/>Dashboard</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('profile')}><UserRound size={16}/>Profile & settings</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('wishlist')}><Heart size={16}/>Wishlist</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('inbox')}><Bell size={16}/>Notifications</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>{void signOut();go('marketplace')}}><LogOut size={16}/>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <Button variant="outline" onClick={()=>go('login')}>Sign in <ArrowUpRight size={15}/></Button>}<Button onClick={()=>go('add-property')} className="list-property"><Plus size={16}/>List property</Button></div></header>
   <main>{publicPage ? children : loading ? <div className="page"><p className="muted">Loading your workspace…</p></div> : !session ? <div className="signin-required"><ShieldCheck size={36}/><h1>Your workspace awaits</h1><p className="muted">Sign in to access your properties, bookings and documents.</p><Button onClick={()=>go('login')}>Sign in <ArrowUpRight/></Button></div> : !allowed ? <div className="signin-required"><ShieldCheck size={36}/><h1>Access restricted</h1><p className="muted">This workspace is not available for your account.</p><Button onClick={()=>go('dashboard')}>Back to overview</Button></div>  : needsApproval(current, profile?.role, profile?.verification_status) ? <div className="signin-required"><ShieldCheck size={36}/><h1>{profile?.verification_status==='rejected'?'Verification needs attention':'Awaiting approval'}</h1><p className="muted">{profile?.verification_status==='rejected'?'Your verification was not approved. Please review the reason and resubmit from your overview.':'Your account is being verified by our team. This section unlocks once you are approved.'}</p><Button onClick={()=>go('dashboard')}>Go to overview</Button></div> : children}</main>
   <footer className="workspace-footer"><span>© 2026 ManzilIQ</span><span>Property, with perspective.</span><span><ShieldCheck size={13}/>Your next move, made clearer.</span></footer>
  </div><AiAssistant onNavigate={onNavigate}/>
 </div>;
}