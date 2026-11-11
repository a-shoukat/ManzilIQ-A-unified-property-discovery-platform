import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { errorText } from '@/lib/manzil/errors';
import {
  bannerImageUrl,
  bannerSchema,
  contentMap,
  DEFAULT_SITE_CONTENT,
  deleteBanner,
  fetchBanners,
  fetchSiteContent,
  resetSiteContentToDefault,
  saveBanner,
  upsertSiteContent,
  type SiteBanner,
} from '@/lib/manzil/cms';

/** Screen 3 — Homepage CMS (admin only). Does not wire public homepage (Needs decision). */
function AdminCms({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [content, setContent] = useState<Record<string, string>>({ ...DEFAULT_SITE_CONTENT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [href, setHref] = useState('');
  const [sort, setSort] = useState('0');
  const [active, setActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([fetchBanners(), fetchSiteContent()]);
      setBanners(b);
      setContent(contentMap(c));
      const next: Record<string, string> = {};
      for (const banner of b) {
        const u = await bannerImageUrl(banner.image_path);
        if (u) next[banner.id] = u;
      }
      setUrls(next);
    } catch (e) {
      setError(errorText(e, 'Could not load CMS. Run reference/migrations/10_phase10_ui_support.sql if tables are missing.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bannerSchema.safeParse({
      title,
      subtitle,
      href,
      sort_order: Number(sort) || 0,
      active,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid banner');
      return;
    }
    setBusy(true);
    try {
      await saveBanner({ ...parsed.data, imageFile: image });
      setTitle('');
      setSubtitle('');
      setHref('');
      setImage(null);
      setMsg('Banner saved');
      await load();
    } catch (err) {
      setError(errorText(err, 'Could not save banner'));
    } finally {
      setBusy(false);
    }
  };

  const saveContent = async () => {
    setBusy(true);
    try {
      for (const [key, value] of Object.entries(content)) {
        await upsertSiteContent(key, value);
      }
      setMsg('Site content saved');
    } catch (err) {
      setError(errorText(err, 'Could not save content'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await resetSiteContentToDefault();
      setContent({ ...DEFAULT_SITE_CONTENT });
      setMsg('Reset to default copy');
    } catch (err) {
      setError(errorText(err, 'Reset failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Homepage CMS</h1>
          <p className="muted" style={{ margin: 0 }}>Banners & site content (admin)</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => setPreview(!preview)}>
            {preview ? 'Hide preview' : 'Preview'}
          </Button>
          <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void reset()}>
            Reset to default
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>
            Admin hub
          </Button>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>
        Public marketplace homepage is unchanged until homepage wiring is approved (Needs decision).
        Edits here persist to site_banners / site_content only.
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {preview && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3>Preview</h3>
              <p className="muted small">{content['marketplace_eyebrow']}</p>
              <h2>{content['marketplace_title']}</h2>
              <p>{content['marketplace_subtitle']}</p>
              <hr />
              <p className="muted small">{content['hero_eyebrow']}</p>
              <h2 style={{ whiteSpace: 'pre-line' }}>{content['hero_title']}</h2>
              <p>{content['hero_subtitle']}</p>
              {banners.filter((b) => b.active).map((b) => (
                <div key={b.id} className="queue-card">
                  <strong>{b.title}</strong>
                  {b.subtitle && <p className="muted">{b.subtitle}</p>}
                  {urls[b.id] && <img src={urls[b.id]} alt="" style={{ maxWidth: '100%', marginTop: 8 }} />}
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Site content</h3>
            {Object.keys(content).map((key) => (
              <label key={key}>
                {key}
                <textarea
                  rows={key.includes('title') ? 2 : 2}
                  value={content[key] ?? ''}
                  onChange={(e) => setContent({ ...content, [key]: e.target.value })}
                />
              </label>
            ))}
            <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void saveContent()}>
              Save content
            </Button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3>Banners ({banners.length})</h3>
            {banners.length === 0 ? (
              <p className="muted">No banners yet.</p>
            ) : (
              banners.map((b) => (
                <div key={b.id} className="queue-card">
                  <div className="queue-head">
                    <div>
                      <strong>{b.title}</strong>
                      <div className="muted small">order {b.sort_order} · {b.active ? 'active' : 'inactive'}</div>
                      {b.subtitle && <p style={{ margin: '8px 0 0' }}>{b.subtitle}</p>}
                    </div>
                    <span className={`badge ${b.active ? 'ok' : 'warn'}`}>{b.active ? 'active' : 'off'}</span>
                  </div>
                  {urls[b.id] && <img src={urls[b.id]} alt="" width={160} style={{ marginTop: 8 }} />}
                  <div className="link-row">
                    <Button
                      variant="legacy"
                      className="btn secondary small"
                      disabled={busy}
                      onClick={() => void saveBanner({
                        id: b.id,
                        title: b.title,
                        subtitle: b.subtitle,
                        href: b.href,
                        sort_order: b.sort_order,
                        active: !b.active,
                      }).then(load)}
                    >
                      Toggle active
                    </Button>
                    <Button
                      variant="legacy"
                      className="btn danger small"
                      disabled={busy}
                      onClick={() => void deleteBanner(b.id).then(load)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}

            <h3 style={{ marginTop: 16 }}>Add banner</h3>
            <form onSubmit={(e) => void addBanner(e)}>
              <div className="form-row">
                <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
                <label>Sort order<input type="number" min={0} value={sort} onChange={(e) => setSort(e.target.value)} /></label>
              </div>
              <label>Subtitle<input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
              <label>Link href<input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/ or https://…" /></label>
              <label>Image<input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} /></label>
              <label className="small">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
              </label>
              <Button variant="legacy" className="btn small" disabled={busy}>{busy ? 'Saving…' : 'Add banner'}</Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/admin-cms')({
  head: () => pageHead('Homepage CMS'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <AdminCms onNavigate={onNavigate} />
    </PageFrame>
  );
}
