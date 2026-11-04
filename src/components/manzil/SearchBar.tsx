import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props { value: string; onChange: (v: string) => void; onEnter?: () => void; onFocus?: () => void; placeholder?: string; autoFocus?: boolean; loading?: boolean; className?: string }

export function SearchBar({ value, onChange, onEnter, onFocus, placeholder = 'Search properties…', autoFocus, loading, className }: Props) {
  return <div className={`search-bar ${className ?? ''}`}>
    <Search size={16} className="search-bar-icon" />
    <input aria-label={placeholder} value={value} autoFocus={autoFocus} placeholder={placeholder} onFocus={onFocus}
      onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onEnter?.(); }} />
    {loading && <Loader2 size={14} className="search-bar-spin" />}
    {value && <Button variant="ghost" size="icon" className="search-bar-clear" aria-label="Clear search" onClick={() => onChange('')}><X size={14} /></Button>}
  </div>;
}
