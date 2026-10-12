import { getSupabase } from './supabase';
import { estimateLocal } from './estimator';
import { formatPrice } from './properties';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}


const SYSTEM_PROMPT = `You are ManzilIQ AI Assistant, a helpful real-estate guide for the ManzilIQ platform (Pakistani housing societies: plots, bookings, installments, dealers).
Rules:
- Answer in the user's language (Roman Urdu or English, match them).
- Be concise: max 120 words unless they ask for detail.
- You know: booking flow (search → book → token → installments → transfer), 2% monthly late fee, plot map colors (green available, amber reserved, red sold), dealers manage leads & pipeline, societies manage inventory & maps.
- Never invent plot prices; say you'll check live listings instead.
- No legal advice beyond general info.`;

/** Local rule-based brain (no API key needed). */
async function localBrain(input: string): Promise<{ text: string; action?: { label: string; page: string } }> {
  const q = input.toLowerCase();

  // marla conversions
  if (/marla|sq ?ft|square feet|kanal/.test(q) && /convert|how many|kitn/.test(q)) {
    return {
      text: '1 Marla = 272.25 sq ft.\n• 3 Marla = 817 sq ft\n• 5 Marla = 1,361 sq ft\n• 7 Marla = 1,906 sq ft\n• 10 Marla = 2,723 sq ft\n• 1 Kanal (20 Marla) = 5,445 sq ft',
    };
  }

  // price estimate intent: "price of 5 marla in narowal"
  const m = q.match(/(\d+(?:\.\d+)?)\s*marla/);
  if (/price|estimate|rate|qimat|kimat/.test(q) && m) {
    const cityM = q.match(/in\s+([a-z\s]+)/);
    const commercial = /commercial/.test(q);
    const res = await estimateLocal({
      city: cityM ? (cityM[1] ?? '').trim() : '',
      area: '',
      sizeMarla: Number(m[1]),
      category: commercial ? 'commercial' : 'residential',
      bedrooms: null,
      society: '',
    });
    return {
      text: `Estimated price for ${m[1]} Marla ${commercial ? 'commercial' : 'residential'}: **${formatPrice(res.mid)}** (range ${formatPrice(res.low)} – ${formatPrice(res.high)}, confidence ${res.confidence}%).\n${res.reasoning}`,
      action: { label: 'Open full estimator', page: 'price-estimator' },
    };
  }

  // search listings
  if (/show|find|search|list|dekho|dikhao/.test(q) && /plot|propert|societ/.test(q)) {
    const supabase = getSupabase();
    let text = 'I could not reach the listings right now.';
    if (supabase) {
      const cityM = q.match(/in\s+([a-z\s]+)/);
      let query = supabase.from('properties').select('title, city, price, plot_size_marla').limit(3);
      if (cityM) query = query.ilike('city', `%${(cityM[1] ?? '').trim()}%`);
      const { data } = await query;
      const rows = (data as { title: string; city: string; price: number; plot_size_marla: number }[] | null) ?? [];
      text = rows.length
        ? 'Top listings:\n' + rows.map((r) => `• ${r.title} — ${r.plot_size_marla} Marla, ${r.city} — ${formatPrice(Number(r.price))}`).join('\n')
        : 'No listings matched. Try the marketplace with different filters.';
    }
    return { text, action: { label: 'Open marketplace', page: 'marketplace' } };
  }

  // booking flow
  if (/book|token|installment|qist/.test(q)) {
    return {
      text: 'Booking flow:\n1. Browse & pick a plot (green = available)\n2. Book with token amount (simulated payment)\n3. Society approves → allotment letter auto-generated\n4. Pay installments (2% monthly late fee on delays)\n5. Full payment → transfer deed + NOC letter',
      action: { label: 'Start booking', page: 'book-plot' },
    };
  }

  // dispute / freeze
  if (/dispute|fraud|complaint/.test(q)) {
    return {
      text: 'You can file a dispute from the Disputes page. Admins can freeze the plot during investigation so it cannot be double-sold, then issue a resolution notice.',
      action: { label: 'Open disputes', page: 'admin-disputes' },
    };
  }

  // documents
  if (/document|allotment|deed|noc|receipt/.test(q)) {
    return {
      text: 'Documents generate automatically: allotment letter on approval, receipts on payments, transfer deed + NOC on completion. Find them in your document locker.',
      action: { label: 'Open documents', page: 'documents' },
    };
  }

  // greeting
  if (/^(salam|assalam|hello|hi|aoa)\b/.test(q)) {
    return { text: "Hello! 👋 I'm the ManzilIQ assistant. How can I help with plot prices, bookings, installments or documents?" };
  }

  return {
    text: 'I can help with:\n• Plot price estimate (e.g. "price of 5 marla in Narowal")\n• Listings search (e.g. "show plots in Lahore")\n• Booking & installment guide\n• Marla conversions\n• Documents & disputes help',
  };
}

export async function askAssistant(
  history: ChatMessage[],
  input: string,
): Promise<{ text: string; action?: { label: string; page: string } }> {
  return localBrain(input);
}

export const QUICK_PROMPTS = [
  'Price of 5 marla in Narowal',
  'How do I book a plot?',
  'Show commercial plots',
  'Convert 10 marla to sq ft',
  'How do installments work?',
];
