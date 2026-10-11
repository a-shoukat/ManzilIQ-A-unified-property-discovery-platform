import { freshness } from '@/lib/manzil/listing-detail';
import { formatSize } from '@/lib/manzil/phase3-rules';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/manzil/wishlist';
import { ArrowUpRight, MapPin, BedDouble, Bath, Maximize, ArrowLeftRight, Check, Building2, Home, LandPlot } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/manzil/types';
import { formatPrice } from '@/lib/manzil/properties';
import residence from '@/assets/residence.jpg';
import plot from '@/assets/plot.jpg';
import commercial from '@/assets/commercial.jpg';
interface Props {property:Property; onOpen:(id:string)=>void; inCompare:boolean; onToggleCompare:(p:Property)=>void}
export default function PropertyCard({property:p,onOpen,inCompare,onToggleCompare}:Props) {
 const fresh = freshness(p.created_at);
 const image = p.images?.[0] || p.image_url || (p.id.startsWith('demo-') ? p.category==='commercial'?commercial:p.bedrooms?residence:plot : null);
 const [failed,setFailed]=useState(false);
 const kind = p.category==='commercial'?'commercial':p.bedrooms?'home':'plot';
 const Icon = kind==='commercial'?Building2:kind==='home'?Home:LandPlot;
 const placeholder = <span className={`listing-placeholder ph-${kind}`}><Icon size={40} strokeWidth={1.5}/><small>{p.category==='commercial'?'Commercial':p.bedrooms?'Residence':'Plot'} · {p.city}</small></span>;
 return <article className="listing-card"><div className="listing-image"><Button variant="legacy" className="image-open" aria-label={`View ${p.title}`} onClick={()=>onOpen(p.id)}>{image&&!failed?<img src={image} alt={p.title} width={1024} height={768} loading="lazy" onError={()=>setFailed(true)}/>:placeholder}</Button><WishlistHeart id={p.id}/><span className="listing-purpose">For {p.purpose}</span><span className="listing-flags">{p.is_featured&&<span className="flag-featured">Featured</span>}{fresh.isNew&&!p.id.startsWith('demo-')&&<span className="flag-new">New</span>}</span><span className={`listing-status ${p.status==='available'?'available':'reserved'}`}><i/>{p.status}</span><Button variant="legacy" className={`listing-compare${inCompare?' selected':''}`} title={inCompare?'Remove from comparison':'Add to comparison'} aria-label={`Compare ${p.title}`} onClick={()=>onToggleCompare(p)}>{inCompare?<Check size={16}/>:<ArrowLeftRight size={16}/>}</Button></div>
 <div className="listing-body"><div className="listing-price"><strong>{formatPrice(p.price)}</strong>{p.purpose==='rent'&&<span>/ month</span>}</div><Button variant="legacy" className="listing-title" onClick={()=>onOpen(p.id)}>{p.title}<ArrowUpRight size={16}/></Button><div className="listing-location"><MapPin size={13}/>{p.area ? `${p.area}, `:''}{p.city}</div><div className="listing-specs"><span><Maximize size={14}/>{formatSize(p.plot_size_marla)}</span>{p.bedrooms?<span><BedDouble size={15}/>{p.bedrooms} Beds</span>:<span>{p.category==='commercial'?'Commercial':'Residential'} plot</span>}{p.bathrooms?<span><Bath size={14}/>{p.bathrooms} Baths</span>:null}</div><div className="listing-bottom"><span>{p.society_name || 'Independent property'}</span><span>{p.id.startsWith('demo-')?'Sample listing':fresh.label}</span></div></div></article>;
}
function WishlistHeart({ id }: { id: string }) {
  const { has, toggle } = useWishlist();
  const saved = has(id);
  return <Button variant="legacy" className={`listing-heart${saved ? ' selected' : ''}`} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} onClick={() => void toggle(id)}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /></Button>;
}
