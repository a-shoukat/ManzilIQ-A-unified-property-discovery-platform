import { ArrowUpRight, MapPin, BedDouble, Bath, Maximize, ArrowLeftRight, Check, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Property } from '@/lib/manzil/types';
import { formatPrice } from '@/lib/manzil/properties';
import residence from '@/assets/residence.jpg';
import plot from '@/assets/plot.jpg';
import commercial from '@/assets/commercial.jpg';
interface Props {property:Property; onOpen:(id:string)=>void; inCompare:boolean; onToggleCompare:(p:Property)=>void}
export default function PropertyCard({property:p,onOpen,inCompare,onToggleCompare}:Props) {
 const image = p.image_url || (p.id.startsWith('demo-') ? p.category==='commercial'?commercial:p.bedrooms?residence:plot : null);
 return <article className="listing-card"><div className="listing-image"><Button variant="legacy" className="image-open" aria-label={`View ${p.title}`} onClick={()=>onOpen(p.id)}>{image?<img src={image} alt={p.title} width={1024} height={768} loading="lazy"/>:<ImageOff size={32}/>}</Button><span className="listing-purpose">For {p.purpose}</span><span className={`listing-status ${p.status==='available'?'available':'reserved'}`}><i/>{p.status}</span><Button variant="legacy" className={`listing-compare${inCompare?' selected':''}`} title={inCompare?'Remove from comparison':'Add to comparison'} aria-label={`Compare ${p.title}`} onClick={()=>onToggleCompare(p)}>{inCompare?<Check size={16}/>:<ArrowLeftRight size={16}/>}</Button></div>
 <div className="listing-body"><div className="listing-price"><strong>{formatPrice(p.price)}</strong>{p.purpose==='rent'&&<span>/ month</span>}</div><Button variant="legacy" className="listing-title" onClick={()=>onOpen(p.id)}>{p.title}<ArrowUpRight size={16}/></Button><div className="listing-location"><MapPin size={13}/>{p.area ? `${p.area}, `:''}{p.city}</div><div className="listing-specs"><span><Maximize size={14}/>{p.plot_size_marla} Marla</span>{p.bedrooms?<span><BedDouble size={15}/>{p.bedrooms} Beds</span>:<span>{p.category==='commercial'?'Commercial':'Residential'} plot</span>}{p.bathrooms?<span><Bath size={14}/>{p.bathrooms} Baths</span>:null}</div><div className="listing-bottom"><span>{p.society_name || 'Independent property'}</span><span>{p.id.startsWith('demo-')?'Sample listing':'Property listing'}</span></div></div></article>;
}