# Area 1 review sheet — setup, language switch, RTL, common/auth

**Status:** complete (foundation landed via merge; verified this pass)  
**Default:** English first visit; `localStorage` + `profiles.preferred_language`

## Foundation

| Piece | Location |
| --- | --- |
| react-i18next init | `src/lib/i18n/index.ts` |
| LanguageProvider | `src/lib/i18n/LanguageProvider.tsx` → root |
| LanguageSwitch | header + profile (`LanguageSwitch.tsx`) |
| Migration | `reference/migrations/12_preferred_language.sql` |
| RTL + Nastaliq | `src/styles.css` + Google Fonts in `__root.tsx` |
| Tests | `src/test/i18n.test.ts` |
| Gates | `npm run i18n:check` / `i18n:report` |

## Top 40 visible strings (common + auth)

| Key | English | Urdu |
| --- | --- | --- |
| common:signIn | Sign in | لاگ اِن |
| common:signUp | Sign up | رجسٹر کریں |
| common:logout | Logout | لاگ آؤٹ |
| common:save | Save | محفوظ کریں |
| common:cancel | Cancel | منسوخ کریں |
| common:delete | Delete | حذف کریں |
| common:search | Search | تلاش کریں |
| common:approve | Approve | منظور کریں |
| common:reject | Reject | مسترد کریں |
| common:dashboard | Dashboard | ڈیش بورڈ |
| common:wishlist | Wishlist | پسندیدہ فہرست |
| common:inquiry | Inquiry | استفسار |
| common:plot | Plot | پلاٹ |
| common:society | Society | سوسائٹی |
| common:dealer | Dealer | ڈیلر |
| common:buyer | Buyer | خریدار |
| common:installment | Installment | قسط |
| common:receipt | Receipt | رسید |
| common:rs | Rs | روپے |
| common:language | Language | زبان |
| common:switchToUrdu | اردو | اردو |
| common:switchToEnglish | English | English |
| auth:signInTitle | Your next move starts here. | آپ کا اگلا قدم یہاں سے شروع ہوتا ہے۔ |
| auth:signUpTitle | Make yourself at home. | اپنے گھر جیسا محسوس کریں۔ |
| auth:forgotTitle | Forgot your password? | پاس ورڈ بھول گئے؟ |
| auth:emailAddress | Email address | ای میل ایڈریس |
| auth:password | Password | پاس ورڈ |
| auth:createAccount | Create account | اکاؤنٹ بنائیں |
| auth:forgotPassword | Forgot password? | پاس ورڈ بھول گئے؟ |
| auth:backToMarketplace | Back to marketplace | مارکیٹ پلیس پر واپس |
| auth:verificationCode | Verification code | تصدیقی کوڈ |
| auth:verifyCreateAccount | Verify & create account | تصدیق کریں اور اکاؤنٹ بنائیں |
| auth:welcomeEyebrow | WELCOME TO MANZILIQ | ManzilIQ میں خوش آمدید |
| auth:accountType | Account type | اکاؤنٹ کی قسم |
| auth:newToBrand | New to ManzilIQ? | ManzilIQ پر نئے ہیں؟ |
| auth:alreadyHaveAccount | Already have an account? | پہلے سے اکاؤنٹ ہے؟ |
| auth:goToSignIn | Go to sign in | لاگ اِن پر جائیں |
| auth:setNewPassword | Set a new password. | نیا پاس ورڈ سیٹ کریں۔ |
| common:notifications | Notifications | اطلاعات |
| common:marketplace | Marketplace | مارکیٹ پلیس |

## Files (Area 1)

- `src/lib/i18n/*`, `LanguageSwitch.tsx`, `PageFrame.tsx`, `__root.tsx`, `styles.css`
- `src/locales/en|ur/{common,auth}.json`
- `src/routes/login.tsx`, `reset-password.tsx`, `profile.tsx`
- `ForgotPasswordForm.tsx`, `PasswordInput.tsx`, `RegistrationForms.tsx`
- `reference/migrations/12_preferred_language.sql`

## NEEDS NATIVE REVIEW

- Marketing login headlines (`signInTitle`, `signUpTitle`) — tone/poetry
- `auth:welcomeEyebrow` casing in Urdu

## Needs decision

- None (English mode markup/classNames unchanged aside from switch control + `t()` swaps).

## Rollback

Remove `LanguageSwitch` / skip `LanguageProvider` language change → app stays English (`fallbackLng: 'en'`).
