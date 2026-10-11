/** Turns a spoken Urdu / Roman-Urdu / English listing description into form fields. Runs fully in the browser. */
export interface ParsedListing {
  title?: string; city?: string; area?: string; society?: string; block?: string;
  size?: number; unit?: 'marla' | 'kanal'; price?: number; bedrooms?: number; bathrooms?: number;
  purpose?: 'sale' | 'rent'; category?: 'residential' | 'commercial'; phone?: string; amenities?: string[];
}

const URDU_DIGITS = '۰۱۲۳۴۵۶۷۸۹', ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const WORD_NUM: Record<string, number> = {
  ek: 1, aik: 1, one: 1, 'ایک': 1, do: 2, two: 2, 'دو': 2, teen: 3, three: 3, 'تین': 3, char: 4, chaar: 4, four: 4, 'چار': 4,
  panch: 5, paanch: 5, five: 5, 'پانچ': 5, chay: 6, che: 6, six: 6, 'چھ': 6, saat: 7, seven: 7, 'سات': 7, aath: 8, eight: 8, 'آٹھ': 8,
  nau: 9, nine: 9, 'نو': 9, das: 10, ten: 10, 'دس': 10, barah: 12, twelve: 12, 'بارہ': 12, pandrah: 15, fifteen: 15, 'پندرہ': 15,
  bees: 20, twenty: 20, 'بیس': 20, pachas: 50, fifty: 50, 'پچاس': 50, sau: 100, hundred: 100, 'سو': 100,
};
const CITIES: [string, string[]][] = [
  ['Lahore', ['lahore', 'لاہور']], ['Karachi', ['karachi', 'کراچی']], ['Islamabad', ['islamabad', 'اسلام آباد']],
  ['Rawalpindi', ['rawalpindi', 'pindi', 'راولپنڈی']], ['Narowal', ['narowal', 'نارووال']], ['Faisalabad', ['faisalabad', 'فیصل آباد']],
  ['Multan', ['multan', 'ملتان']], ['Sialkot', ['sialkot', 'سیالکوٹ']], ['Gujranwala', ['gujranwala', 'گوجرانوالہ']],
  ['Peshawar', ['peshawar', 'پشاور']], ['Quetta', ['quetta', 'کوئٹہ']],
];
const AMENITY_WORDS: [string, string[]][] = [
  ['Gas', ['gas', 'گیس']], ['Electricity', ['electricity', 'bijli', 'بجلی']], ['Water', ['water', 'pani', 'پانی']],
  ['Corner plot', ['corner', 'کارنر']], ['Park facing', ['park facing', 'پارک فیسنگ']], ['Gated community', ['gated']],
  ['Security', ['security', 'سیکیورٹی']], ['Possession ready', ['possession', 'قبضہ']], ['Furnished', ['furnished', 'فرنشڈ']],
  ['Parking', ['parking', 'پارکنگ']], ['Main boulevard', ['boulevard', 'بولیوارڈ']],
];

export function normalize(text: string): string {
  let s = text;
  for (let i = 0; i < 10; i++) s = s.replaceAll(URDU_DIGITS[i]!, String(i)).replaceAll(ARABIC_DIGITS[i]!, String(i));
  s = s.replace(/(\d),(\d)/g, '$1$2').replace(/٫/g, '.');
  return ` ${s.toLowerCase().replace(/[،,؟?!]/g, ' ').replace(/\s+/g, ' ')} `;
}

const NUM = '(\\d+(?:\\.\\d+)?|[a-z\\u0600-\\u06ff]+)';
function toNum(tok: string | undefined): number | undefined {
  if (!tok) return undefined;
  const n = Number(tok);
  if (!Number.isNaN(n)) return n;
  return WORD_NUM[tok];
}
function before(s: string, words: string): number | undefined {
  const m = s.match(new RegExp(`${NUM}\\s*(?:${words})`));
  return toNum(m?.[1]);
}

export function parseListing(text: string): ParsedListing {
  const s = normalize(text);
  const out: ParsedListing = {};

  const kanal = before(s, 'kanal|کنال');
  const marla = before(s, 'marla|marlay|مرلہ|مرلے|مرلے');
  if (kanal) { out.size = kanal; out.unit = 'kanal'; } else if (marla) { out.size = marla; out.unit = 'marla'; }

  const crore = before(s, 'crore|karor|karod|کروڑ');
  const lakh = before(s, 'lakh|lac|laakh|لاکھ');
  if (crore || lakh) out.price = Math.round((crore ?? 0) * 1e7 + (lakh ?? 0) * 1e5);
  else { const m = s.match(/(?:price|qeemat|keemat|قیمت|rs|pkr|rupay|روپے)\s*(\d{4,})/) ?? s.match(/(\d{4,})\s*(?:rupay|rupees|روپے|pkr)/); if (m) out.price = Number(m[1]); }

  const beds = before(s, 'bed|beds|bedroom|bedrooms|kamre|kamray|kamra|کمرے|کمرہ|بیڈ');
  if (beds) out.bedrooms = beds;
  const baths = before(s, 'bath|baths|bathroom|bathrooms|washroom|washrooms|باتھ|واش روم');
  if (baths) out.bathrooms = baths;

  if (/(rent|kiraye|kiraya|kirae|کرایہ|کرائے)/.test(s)) out.purpose = 'rent';
  else if (/(sale|sell|bechna|farokht|فروخت|برائے فروخت|بیچنا)/.test(s)) out.purpose = 'sale';

  if (/(commercial|shop|dukan|office|plaza|کمرشل|دکان|دوکان|آفس|پلازہ)/.test(s)) out.category = 'commercial';
  else if (/(house|ghar|makan|home|residential|plot|گھر|مکان|رہائشی|پلاٹ)/.test(s)) out.category = 'residential';

  for (const [name, words] of CITIES) if (words.some((w) => s.includes(w))) { out.city = name; break; }

  const blk = s.match(/(?:block|بلاک)\s*([a-z0-9]{1,3})\b/) ?? s.match(/\b([a-z0-9]{1,2})\s*(?:block|بلاک)/);
  if (blk) out.block = blk[1]!.toUpperCase();

  const soc = s.match(/([a-z\u0600-\u06ff]+(?:\s+[a-z\u0600-\u06ff]+)?)\s+(?:society|town|housing|سوسائٹی|ٹاؤن)/);
  if (soc && !/^(in|mein|میں|ki|کی)$/.test(soc[1]!)) out.society = titleCase(`${soc[1]} ${/town|ٹاؤن/.test(soc[0]) ? 'Town' : 'Society'}`);

  const ph = s.replace(/[\s-]/g, '').match(/(03\d{9}|\+923\d{9})/);
  if (ph?.[1]) out.phone = ph[1];

  const am = AMENITY_WORDS.filter(([, w]) => w.some((x) => s.includes(x))).map(([n]) => n);
  if (am.length) out.amenities = am;

  if (out.size || out.category) {
    const kind = out.category === 'commercial' ? 'Commercial' : out.bedrooms ? 'House' : 'Plot';
    out.title = [out.size ? `${out.size} ${out.unit === 'kanal' ? 'Kanal' : 'Marla'}` : '', kind, out.purpose === 'rent' ? 'for Rent' : 'for Sale', out.society ? `— ${out.society}` : out.city ? `— ${out.city}` : ''].filter(Boolean).join(' ');
  }
  return out;
}

function titleCase(x: string) { return x.replace(/\b[a-z]/g, (c) => c.toUpperCase()); }

export function describeParsed(p: ParsedListing): string[] {
  const r: string[] = [];
  if (p.size) r.push(`Size: ${p.size} ${p.unit === 'kanal' ? 'Kanal' : 'Marla'}`);
  if (p.price) r.push(`Price: PKR ${p.price.toLocaleString()}`);
  if (p.city) r.push(`City: ${p.city}`);
  if (p.society) r.push(`Society: ${p.society}`);
  if (p.block) r.push(`Block: ${p.block}`);
  if (p.bedrooms) r.push(`Bedrooms: ${p.bedrooms}`);
  if (p.bathrooms) r.push(`Bathrooms: ${p.bathrooms}`);
  if (p.purpose) r.push(`Purpose: ${p.purpose === 'rent' ? 'Rent' : 'Sale'}`);
  if (p.category) r.push(`Type: ${p.category}`);
  if (p.phone) r.push(`Phone: ${p.phone}`);
  if (p.amenities?.length) r.push(`Amenities: ${p.amenities.join(', ')}`);
  return r;
}
