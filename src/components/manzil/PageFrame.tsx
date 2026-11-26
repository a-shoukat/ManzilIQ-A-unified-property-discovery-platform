import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Building2, LayoutGrid, Map, Sparkles, ArrowLeftRight, Wallet, CalendarDays, FileText, ChartNoAxesCombined, Bell, ChevronRight, LogOut, Menu, Plus, ShieldCheck, Users, House, ArrowUpRight, Heart, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/manzil/auth';
import { useCompare } from '@/lib/manzil/compare';
import AiAssistant from './AiAssistant';
import { BrandLogo } from './BrandLogo';
import { GatedFeature, RenewalBanner } from './GatedFeature';
import { PAGE_FEATURES } from '@/lib/manzil/plans';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { canAccessPage, needsApproval } from '@/lib/manzil/access';
import { LanguageSwitch } from './LanguageSwitch';
import { InboxBell } from './InboxBell';
import { CollapsibleNav } from './CollapsibleNav';

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

type NavItem = { key: string; labelKey: string; icon: LucideIcon };

const mainLinkDefs: NavItem[] = [
 {key:'marketplace',labelKey:'marketplace',icon:House}, {key:'map-view',labelKey:'mapExplorer',icon:Map}, {key:'master-plan',labelKey:'masterPlans',icon:LayoutGrid},
 {key:'price-estimator',labelKey:'priceEstimator',icon:Sparkles}, {key:'compare',labelKey:'compareProperties',icon:ArrowLeftRight},
];
const portfolioLinkDefs: NavItem[] = [
 {key:'dashboard',labelKey:'overview',icon:LayoutGrid}, {key:'my-bookings',labelKey:'myBookings',icon:CalendarDays},
 {key:'my-payments',labelKey:'payments',icon:Wallet}, {key:'payment-history',labelKey:'paymentHistory',icon:Wallet}, {key:'my-inquiries',labelKey:'myInquiries',icon:Bell}, {key:'documents',labelKey:'documents',icon:FileText},
 {key:'wishlist',labelKey:'wishlist',icon:Heart},{key:'saved-searches',labelKey:'savedSearches',icon:Bell}, {key:'inbox',labelKey:'notifications',icon:Bell},
];

function workspaceSectionLabel(role: string, t: (k: string) => string) {
  if (role === 'buyer') return t('myWorkspace');
  if (role === 'dealer') return t('dealerWorkspace');
  if (role === 'society_admin') return t('societyWorkspace');
  return t('administration');
}

export function PageFrame({children, publicPage=false}: {children:ReactNode; publicPage?:boolean}) {
 const { t } = useTranslation('common');
 const onNavigate = useAppNavigation();
 const navigate = useNavigate();
 const { session, profile, loading, signOut } = useAuth();
 const {items} = useCompare();
 const location = useLocation();
 const current = location.pathname === '/' ? 'marketplace' : (location.pathname.split('/')[1] ?? 'marketplace');
 const [open,setOpen] = useState(false);
 const isSociety = !!session && profile?.role === 'society_admin';
 const isDealer = !!session && profile?.role === 'dealer';
 const go = (key:string) => { onNavigate(key); setOpen(false); };
 const goLogin = () => {
  const next = `${location.pathname}${location.search || ''}`;
  void navigate({ to: '/login', search: { next } });
  setOpen(false);
 };
  const links = (list: NavItem[]) => list.filter(({key}) => canAccessPage(key, session ? profile?.role : undefined)).map(({key,labelKey,icon:Icon}) => <Button variant="legacy" key={key} className={`side-link${current===key?' active':''}`} onClick={()=>go(key)}><Icon size={18}/><span>{t(labelKey)}</span>{key==='compare' && items.length>0 && <span className="side-count">{items.length}</span>}</Button>);
  const allowed = canAccessPage(current, profile?.role);
  const gateFeature = profile?.role ? PAGE_FEATURES[current]?.[profile.role] : undefined;
  const crumb = current === 'marketplace' ? t('marketplace') : current.replaceAll('-', ' ');
  const roleLabel = profile ? t(`roles.${profile.role}`) : '';
  return <div className="app-shell">
   {open && <div className="mobile-scrim" onClick={()=>setOpen(false)}/>}
   <aside className={`sidebar${open?' open':''}`}>
    <Button variant="legacy" className="brand" onClick={()=>go('marketplace')} aria-label="ManzilIQ home"><BrandLogo /></Button>
    <div className="workspace-label">{t('yourPropertyPartner')}</div>
    <div className="nav-group"><div className="nav-section-label">{t('discover')}</div>{links(mainLinkDefs)}</div>
    {session && profile && <div className="nav-group"><div className="nav-section-label">{workspaceSectionLabel(profile.role, t)}</div>
     {profile.role==='buyer' && links(portfolioLinkDefs)}
     {isSociety && links([{key:'dashboard',labelKey:'overview',icon:LayoutGrid},{key:'society',labelKey:'societyManagement',icon:Building2},{key:'society-inventory',labelKey:'plotInventory',icon:LayoutGrid},{key:'society-map',labelKey:'masterPlanMap',icon:Map},{key:'society-bookings',labelKey:'bookingRequests',icon:CalendarDays},{key:'society-dealers',labelKey:'dealers',icon:Users},{key:'society-financials',labelKey:'financials',icon:Wallet},{key:'payment-history',labelKey:'paymentHistory',icon:Wallet},{key:'society-analytics',labelKey:'societyAnalytics',icon:ChartNoAxesCombined},{key:'inquiries',labelKey:'inquiries',icon:Bell},{key:'documents',labelKey:'documents',icon:FileText},{key:'inbox',labelKey:'notifications',icon:Bell}])}
     {isDealer && <>
      {links([{key:'dashboard',labelKey:'overview',icon:LayoutGrid},{key:'dealer',labelKey:'dealerWorkspace',icon:Users}])}
      <CollapsibleNav id="dealer-core" label={t('navLots')}>{links([{key:'dealer-lots',labelKey:'myLots',icon:LayoutGrid},{key:'dealer-discover',labelKey:'discover',icon:Map}])}</CollapsibleNav>
      <CollapsibleNav id="dealer-pipeline" label={t('navPipeline')}>{links([{key:'dealer-leads',labelKey:'leads',icon:Users},{key:'dealer-forms',labelKey:'saleForms',icon:FileText},{key:'dealer-book',labelKey:'bookForCustomer',icon:CalendarDays},{key:'inquiries',labelKey:'inquiries',icon:Bell}])}</CollapsibleNav>
      <CollapsibleNav id="dealer-more" label={t('navMore')} defaultOpen={false}>{links([{key:'dealer-commissions',labelKey:'commissions',icon:Wallet},{key:'dealer-analytics',labelKey:'performance',icon:ChartNoAxesCombined},{key:'documents',labelKey:'documents',icon:FileText},{key:'inbox',labelKey:'notifications',icon:Bell}])}</CollapsibleNav>
     </>}
     {profile.role==='super_admin' && links([{key:'admin',labelKey:'administration',icon:ShieldCheck},{key:'admin-users',labelKey:'users',icon:Users},{key:'admin-verification',labelKey:'approvals',icon:ShieldCheck},{key:'admin-moderation',labelKey:'listingModeration',icon:ShieldCheck},{key:'admin-cms',labelKey:'homepageCms',icon:LayoutGrid},{key:'admin-audit',labelKey:'auditLog',icon:FileText},{key:'admin-status',labelKey:'systemStatus',icon:ChartNoAxesCombined},{key:'admin-bookings',labelKey:'allBookings',icon:CalendarDays},{key:'admin-disputes',labelKey:'disputes',icon:ShieldCheck},{key:'admin-fraud',labelKey:'fraudAlerts',icon:ShieldCheck},{key:'admin-reports',labelKey:'reportedListings',icon:ShieldCheck},{key:'admin-templates',labelKey:'templates',icon:FileText},{key:'admin-analytics',labelKey:'platformAnalytics',icon:ChartNoAxesCombined},{key:'admin-subscriptions',labelKey:'subscriptions',icon:Wallet},{key:'inquiries',labelKey:'inquiries',icon:Bell},{key:'broadcast',labelKey:'broadcast',icon:Bell},{key:'inbox',labelKey:'notifications',icon:Bell}])}
    </div>}
    <div className="nav-group"><div className="nav-section-label">{t('insights')}</div>{links([{key:'market-trends',labelKey:'marketTrends',icon:ChartNoAxesCombined}])}</div>
    <div className="nav-group"><div className="nav-section-label">{t('account')}</div>{links([{key:'pricing',labelKey:'plansPricing',icon:Wallet},{key:'profile',labelKey:'profileSettings',icon:UserRound}])}</div>
   <div className="sidebar-bottom"><div className="advisor-note"><Sparkles size={19}/><strong>{t('advisorTitle')}</strong><span>{t('advisorBody')}</span><Button variant="legacy" className="advisor-link" onClick={()=>go('price-estimator')}>{t('exploreEstimates')} <ArrowUpRight size={16} className="dir-flip"/></Button></div>
   <Button variant="legacy" className="account-button" onClick={()=> session ? go('dashboard') : goLogin()}><span className="avatar">{session?.user.email?.[0]?.toUpperCase() ?? 'G'}</span><span><strong>{session?.user.email?.split('@')[0] ?? t('guestAccount')}</strong><small>{profile?.role?.replace('_',' ') ?? t('welcomeBrand')}</small></span><ChevronRight size={16} className="dir-flip"/></Button></div>
  </aside>
  <div className="workspace"><header className="workspace-header"><div className="breadcrumb"><Button variant="ghost" size="icon" className="mobile-menu" aria-label={t('openNavigation')} onClick={()=>setOpen(true)}><Menu/></Button><span>{t('workspace')}</span><ChevronRight size={14} className="dir-flip"/><strong>{crumb}</strong></div><div className="header-actions"><span className="market-label"><span/>{t('pakistanMarket')}</span><LanguageSwitch /><InboxBell onClick={()=>go('inbox')} label={t('notifications')} /><span className="header-divider"/>{session ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t('accountMenu')} className="avatar-btn"><span className="avatar-circle">{(profile?.email ?? 'U').charAt(0).toUpperCase()}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel><div className="text-sm font-medium truncate">{profile?.email}</div><div className="text-xs text-muted-foreground">{roleLabel}</div></DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>go('dashboard')}><LayoutGrid size={16}/>{t('dashboard')}</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('profile')}><UserRound size={16}/>{t('profileSettings')}</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('settings/notifications')}><Bell size={16}/>{t('notificationPrefs')}</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('wishlist')}><Heart size={16}/>{t('wishlist')}</DropdownMenuItem><DropdownMenuItem onSelect={()=>go('inbox')}><Bell size={16}/>{t('notifications')}</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem onSelect={()=>{void signOut().then(()=>go('marketplace'))}}><LogOut size={16}/>{t('signOut')}</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <Button variant="outline" onClick={goLogin}>{t('signIn')} <ArrowUpRight size={15} className="dir-flip"/></Button>}{profile?.role!=='buyer' && <Button onClick={()=>go('add-property')} className="list-property"><Plus size={16}/>{t('listProperty')}</Button>}</div></header>
   <main key={location.pathname}>{(() => {
     // Guests may view publicPage routes; signed-in users still hit role / plan gates.
     if (publicPage && !session && !loading) return children;
     if (loading || (session && !profile)) return <div className="page"><p className="muted">{t('loadingWorkspace')}</p></div>;
     if (!session) return <div className="signin-required"><ShieldCheck size={36}/><h1>{t('workspaceAwaits')}</h1><p className="muted">{t('signInToAccess')}</p><Button onClick={goLogin}>{t('signIn')} <ArrowUpRight className="dir-flip"/></Button></div>;
     if (!allowed) return <div className="signin-required"><ShieldCheck size={36}/><h1>{t('accessRestricted')}</h1><p className="muted">{t('workspaceUnavailable')}</p><Button onClick={()=>go('dashboard')}>{t('backToOverview')}</Button></div>;
     if (needsApproval(current, profile?.role, profile?.verification_status)) return <div className="signin-required"><ShieldCheck size={36}/><h1>{profile?.verification_status==='rejected'?t('verificationAttention'):t('awaitingApproval')}</h1><p className="muted">{profile?.verification_status==='rejected'?t('verificationRejected'):t('accountVerifying')}</p><Button onClick={()=>go('dashboard')}>{t('goToOverview')}</Button></div>;
     return <>{session && <RenewalBanner/>}{gateFeature ? <GatedFeature feature={gateFeature}>{children}</GatedFeature> : children}</>;
   })()}</main>
   <footer className="workspace-footer"><span>{t('copyright')}</span><span>{t('tagline')}</span><span><ShieldCheck size={13}/>{t('footerNote')}</span></footer>
  </div><AiAssistant onNavigate={onNavigate}/>
 </div>;
}
