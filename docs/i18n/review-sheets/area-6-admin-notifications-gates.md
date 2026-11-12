# Area 6 review sheet — admin + notifications + errors + validation + gates

**Status:** phase10 admin screens via i18n getters; notifications prefs; key parity script green  
**Namespaces:** `admin`, `inquiries`, `notifications`, `errors`, `validation`

## Coverage

| Screen | Route | Source |
| --- | --- | --- |
| Moderation | `/admin-moderation` | `MODERATION_COPY` → admin |
| CMS | `/admin-cms` | `CMS_COPY` → admin |
| Audit | `/admin-audit` | `AUDIT_COPY` → admin |
| Status | `/admin-status` | `STATUS_COPY` → admin |
| Notif prefs | `/settings/notifications` | `NOTIF_PREFS_COPY` |
| Inquiries | `/inquiries`, `/my-inquiries` | `INQUIRY_COPY` |
| Errors | shared | `errors.ts` + `errors` ns |
| Validation | Zod messages | `validation` ns |
| Gates | `scripts/check-i18n-keys.mjs`, `report-hardcoded-strings.mjs`, `src/test/i18n.test.ts` |

## Top strings

| Key | English | Urdu |
| --- | --- | --- |
| admin:moderationTitle | Listing moderation | اشتہار کی جانچ |
| admin:approve | Approve | منظور کریں |
| admin:reject | Reject | مسترد کریں |
| admin:cmsTitle | Homepage CMS | ہوم پیج CMS |
| admin:auditTitle | Audit log | آڈٹ لاگ |
| admin:statusTitle | System status | سسٹم کی حالت |
| notifications:prefsTitle | Notification preferences | اطلاع کی ترجیحات |
| notifications:saved | Preferences saved | ترجیحات محفوظ ہو گئیں |
| inquiries:myTitle | My inquiries | میرے استفسارات |
| inquiries:statusNew | new | نیا |
| inquiries:statusContacted | contacted | رابطہ کیا گیا |
| inquiries:statusQualified | qualified | اہل |
| inquiries:statusConverted | converted | تبدیل شدہ |
| inquiries:statusClosed | closed | بند |
| errors:generic | Something went wrong… | کچھ غلط ہو گیا… |
| errors:unauthorized | Please sign in to continue. | جاری رکھنے کے لیے لاگ اِن کریں۔ |
| validation:required | This field is required | یہ فیلڈ لازمی ہے |
| validation:invalidCnic | Enter a valid CNIC… | درست شناختی کارڈ درج کریں… |
| validation:invalidPhone | Enter a valid contact number | درست رابطہ نمبر درج کریں |
| common:verification | Verification | تصدیق |

## Quality gates

```bash
bun run i18n:check   # en/ur key parity
bun run i18n:report  # remaining hardcoded candidates
bunx vitest run src/test/i18n.test.ts
```

## Remaining hardcoded (follow-up)

`i18n:report` still lists many secondary screens (analytics, AI assistant, master-plan workspace). Marked for incremental passes; English unchanged.

## NEEDS NATIVE REVIEW

- Admin env-flag banners (`approvalOff`)
- Error fallbacks that interpolate technical DB messages
