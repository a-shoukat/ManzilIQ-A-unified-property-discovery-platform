# Manual QA checklist (EN + UR)

## English (must stay pixel-identical aside from language switch control)

- [ ] Marketplace hero/layout matches pre-i18n baseline
- [ ] Login / sign-up forms layout unchanged
- [ ] Sidebar width, spacing, icons unchanged
- [ ] Language switch visible in header (ghost button style)

## Urdu (RTL)

- [ ] `<html lang="ur" dir="rtl">` when Urdu selected
- [ ] Sidebar on the right; workspace margin flips
- [ ] Chevrons / back arrows flip; logo does not
- [ ] CNIC, phone, email, URLs stay LTR (`dir="ltr"`)
- [ ] Nastaliq not clipped on buttons, inputs, tables, badges, tabs, dialogs, tooltips
- [ ] Line height comfortable (~1.9–2.1)
- [ ] No overflow at 375px and 1280px on login, marketplace, dashboard

## Persistence

- [ ] First visit = English
- [ ] Toggle saves to `localStorage` key `manziliq.preferred_language`
- [ ] When signed in + migration applied, saves `profiles.preferred_language`
- [ ] Reload restores preference

## Rollback

Removing the language switch / provider leaves default English resources; app remains usable in English.
