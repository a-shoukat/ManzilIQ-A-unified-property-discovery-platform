# Area 2 review sheet — marketplace / listings / compare / wishlist / maps

**Status:** complete (coverage from merged i18n; verified)  
**Namespace:** `marketplace` (+ `common`)

## Coverage

| Screen | Route | i18n |
| --- | --- | --- |
| Marketplace | `/` | chrome via `t()`; CMS hero stays admin content |
| Property cards | `PropertyCard` | fully keyed |
| Compare | `/compare` | fully keyed |
| Wishlist | `/wishlist` | fully keyed |
| Map view | `/map-view` | fully keyed |

## Top 40 visible strings

| Key | English | Urdu |
| --- | --- | --- |
| marketplace:exploreOnMap | Explore on map | نقشے پر دیکھیں |
| marketplace:findYourPlace | Find your place | اپنی جگہ تلاش کریں |
| marketplace:allProperties | All properties | تمام پراپرٹیز |
| marketplace:buy | Buy | خریدیں |
| marketplace:rent | Rent | کرایہ |
| marketplace:searchPlaceholder | Search area, society or property… | علاقہ، سوسائٹی یا پراپرٹی تلاش کریں… |
| marketplace:filters | Filters | فلٹرز |
| marketplace:available | Available | دستیاب |
| marketplace:reserved | Reserved | محفوظ |
| marketplace:sold | Sold | فروخت شدہ |
| marketplace:propertiesForYou | Properties for you | آپ کے لیے پراپرٹیز |
| marketplace:compareProperties | Compare properties | پراپرٹیز کا موازنہ |
| marketplace:noProperties | No properties found | کوئی پراپرٹی نہیں ملی |
| marketplace:getPriceEstimate | Get a price estimate | قیمت کا تخمینہ لیں |
| marketplace:wishlistTitle | Wishlist | پسندیدہ فہرست |
| marketplace:wishlistEmpty | No saved properties yet | ابھی کوئی محفوظ پراپرٹی نہیں |
| marketplace:compareTitle | Compare plots | پلاٹس کا موازنہ |
| marketplace:compareEmpty | No plots selected… | کوئی پلاٹ منتخب نہیں… |
| marketplace:mapTitle | Interactive map | انٹرایکٹو نقشہ |
| marketplace:bookThisPlot | Book this plot | اس پلاٹ کی بکنگ کریں |
| marketplace:price | Price | قیمت |
| marketplace:size | Size | رقبہ |
| marketplace:location | Location | مقام |
| marketplace:featured | Featured | نمایاں |
| marketplace:beds | {{count}} Beds | {{count}} بیڈز |
| marketplace:baths | {{count}} Baths | {{count}} باتھز |
| marketplace:saveToWishlist | Save to wishlist | پسندیدہ فہرست میں محفوظ کریں |
| marketplace:addToCompare | Add to comparison | موازنہ میں شامل کریں |
| marketplace:residential | Residential | رہائشی |
| marketplace:commercial | Commercial | تجارتی |
| marketplace:allCities | All cities | تمام شہر |
| marketplace:newestFirst | Newest first | نئے پہلے |
| marketplace:resetFilters | Reset filters | فلٹر ری سیٹ کریں |
| marketplace:browseMarketplace | Browse marketplace | مارکیٹ پلیس دیکھیں |
| marketplace:clearAll | Clear all | سب صاف کریں |
| marketplace:paymentPlan | Payment plan | ادائیگی کا منصوبہ |
| marketplace:selectSociety | Select society | سوسائٹی منتخب کریں |
| marketplace:plotDetails | Plot details | پلاٹ کی تفصیل |
| marketplace:loadingPlots | Loading plots… | پلاٹس لوڈ ہو رہے ہیں… |
| marketplace:noPlots | No plots match these filters. | ان فلٹرز سے کوئی پلاٹ مماثل نہیں۔ |

## Files

- `src/routes/index.tsx`, `compare.tsx`, `wishlist.tsx`, `map-view.tsx`
- `src/components/manzil/PropertyCard.tsx`
- `src/locales/en|ur/marketplace.json`

## NEEDS NATIVE REVIEW

- Marketing banner/CMS fallback English in DB seed (not locale files)
- `freshness(...).label` on cards (relative time) — still English helper

## Needs decision

- None for English layout.
