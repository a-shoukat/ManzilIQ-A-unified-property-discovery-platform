import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { useWishlist } from '@/lib/manzil/wishlist';
import { formatPrice } from '@/lib/manzil/properties';
import type { Property } from '@/lib/manzil/types';

function Wishlist() {
  const { t } = useTranslation(['marketplace', 'common', 'auth']);
  const onNavigate = useAppNavigation();
  const { ids, toggle, ready } = useWishlist();
  const [list, setList] = useState<Property[]>([]);
  useEffect(() => {
    const db = getSupabase();
    if (!db || ids.size === 0) { setList([]); return; }
    void db.from('properties').select('*').in('id', [...ids]).then(({ data }) => setList((data as Property[]) ?? []));
  }, [ids]);
  return (
    <div className="container">
      <div className="card wide">
        <h1>{t('marketplace:wishlistTitle')}</h1>
        <p className="muted">{t('marketplace:wishlistSubtitle')}</p>
        {!ready ? <p className="muted">{t('auth:loadingEllipsis')}</p> : list.length === 0 ? (
          <div className="listing-empty"><Heart size={28} /><h3>{t('marketplace:wishlistEmpty')}</h3><p>{t('marketplace:wishlistEmptyHint')}</p>
            <Button variant="outline" onClick={() => onNavigate('marketplace')}>{t('marketplace:browseMarketplace')}</Button></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>{t('marketplace:property')}</th><th>{t('marketplace:city')}</th><th>{t('marketplace:price')}</th><th /></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td><Button variant="legacy" className="link inline" onClick={() => onNavigate('property', p.id)}>{p.title}</Button></td>
                <td>{p.city}</td><td>{formatPrice(p.price)}</td>
                <td><Button size="sm" variant="outline" onClick={() => void toggle(p.id)}>{t('marketplace:remove')}</Button></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/wishlist')({ head: () => pageHead('Wishlist'), component: () => <PageFrame><Wishlist /></PageFrame> });
