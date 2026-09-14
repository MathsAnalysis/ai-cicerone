import type { Lang } from '../data/tours';
import { env, thinks } from './api.ts';

// Recupero di fonti da internet per fondare la risposta del modello locale:
// Wikipedia (sempre, nella lingua del tour) + SearXNG self-hosted (se configurato).
// Nessuna chiave API, nessun servizio a pagamento.

export type Source = { title: string; url: string; text: string };

const UA = 'AiCicerone/1.0 (tour guide app; info@aicicerone.com)';
const TIMEOUT = 4000;
const MAX_CHARS = 400; // 2 vCPU: ogni 100 caratteri di fonte costano ~1 s di prompt eval
const SHORT_INTRO = 300; // sotto questa lunghezza l'incipit non basta: si scarica un estratto più lungo

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

// Estratto dall'inizio della voce (non solo l'incipit): per voci con introduzione di una riga.
async function longer(title: string, lang: Lang): Promise<string> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({ action: 'query', prop: 'extracts', titles: title, exchars: '600', explaintext: '1', format: 'json' }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) return '';
  const j = (await r.json()) as { query?: { pages?: Record<string, { extract?: string }> } };
  return Object.values(j.query?.pages ?? {})[0]?.extract ?? '';
}

async function wikipedia(q: string, lang: Lang): Promise<Source[]> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '3', gsrnamespace: '0',
    prop: 'extracts|info', exintro: '1', explaintext: '1', exlimit: '3', inprop: 'url', format: 'json',
  }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) return [];
  const j = (await r.json()) as { query?: { pages?: Record<string, { title: string; extract?: string; fullurl?: string; index?: number }> } };
  const pages = Object.values(j.query?.pages ?? {}).filter((p) => p.fullurl).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const enriched = await Promise.all(pages.map(async (p, i) => {
    let text = p.extract ?? '';
    if (i < 4 && text.length < SHORT_INTRO) text = (await longer(p.title, lang).catch(() => '')) || text;
    return text ? { title: `Wikipedia · ${p.title}`, url: p.fullurl!, text: clean(text) } : null;
  }));
  return enriched.filter((x): x is Source => x !== null);
}

async function searxng(q: string, lang: Lang): Promise<Source[]> {
  if (!env.searxng) return [];
  const u = new URL(`${env.searxng}/search`);
  u.search = new URLSearchParams({ q, format: 'json', language: lang, safesearch: '1', categories: 'general' }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (j.results ?? [])
    .filter((x) => x.title && x.url && x.content)
    .slice(0, 2)
    .map((x) => ({ title: x.title!, url: x.url!, text: clean(x.content!) }));
}

// Parole vuote tolte dalla domanda prima della ricerca: «cos'è la statua di Bellini» → «statua Bellini».
const STOP: Record<Lang, Set<string>> = {
  it: new Set('a al alla alle ai agli allo anche c che chi ci come cos cosa cose da dal dalla dalle dai dei del della delle degli dello di dimmi dov dove e è ed era erano essere fa fatto gli ha hanno ho i il in io l la le lo ma me mi mio mia ne nel nella nelle nei negli no non o parla parlami per perché più puoi qual quale quali quando quanto quanta quanti quante questo questa questi queste qui quello quella racconta raccontami sai se si sono su sul sulla sulle sui ti tu tua tuo un una uno vorrei'.split(' ')),
  en: new Set('a about an and are at be can could did do does for from give had has have how i in is it its me my of on or please s tell that the their there these they this those to was were what when where which who why will with would you your'.split(' ')),
};

export function searchQuery(question: string, lang: Lang, city: string): string {
  const words = question
    .toLowerCase()
    .replace(/[?!.,;:«»"()'’]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP[lang].has(w));
  const base = (words.length ? words : question.split(/\s+/)).join(' ');
  return (base.includes(city.toLowerCase()) ? base : `${base} ${city}`).slice(0, 200);
}

// Il modello estrae il soggetto della domanda («cos'è la statua di Bellini?» → «statua di Bellini»):
// una ricerca mirata trova la voce giusta molto più spesso della domanda grezza.
export async function extractTopic(question: string, lang: Lang): Promise<string> {
  const prompt = lang === 'it'
    ? `Domanda di un visitatore: «${question}»\nScrivi solo il nome del luogo, monumento, opera, persona o argomento a cui si riferisce, in 1-5 parole, senza spiegazioni. Se non c'è un soggetto preciso scrivi: nessuno.`
    : `Visitor question: "${question}"\nWrite only the name of the place, monument, work, person or topic it refers to, in 1-5 words, no explanation. If there is no precise subject write: none.`;
  try {
    const r = await fetch(`${env.llmUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.model, prompt: prompt + (/qwen3/i.test(env.model) ? ' /no_think' : ''), stream: false, keep_alive: -1, ...(thinks(env.model) ? { think: false } : {}), options: { temperature: 0, num_predict: 24, num_ctx: 8192 } }),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { response?: string };
    const t = String(j.response ?? '').split('\n')[0].replace(/["«»*.:]/g, '').trim();
    return !t || t.length > 60 || /^(nessuno|none)\b/i.test(t) ? '' : t;
  } catch {
    return '';
  }
}

export async function retrieve(question: string, lang: Lang, city: string): Promise<Source[]> {
  const topic = await extractTopic(question, lang);
  const qTopic = topic ? searchQuery(topic, lang, city) : '';
  const qWords = searchQuery(question, lang, city);
  const tasks = [qTopic ? wikipedia(qTopic, lang) : Promise.resolve([]), wikipedia(qWords, lang), searxng(qTopic || qWords, lang)];
  const settled = await Promise.allSettled(tasks);
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const src of s.value) {
      if (seen.has(src.url)) continue;
      seen.add(src.url);
      out.push(src);
    }
  }
  return out.slice(0, 5);
}
