import type { Lang } from '../data/tours';
import { env } from './api.ts';

// Recupero di fonti da internet per fondare la risposta del modello locale:
// Wikipedia (sempre, nella lingua del tour) + SearXNG self-hosted (se configurato).
// Nessuna chiave API, nessun servizio a pagamento.

export type Source = { title: string; url: string; text: string };

const UA = 'AiCicerone/1.0 (tour guide app; info@aicicerone.com)';
const TIMEOUT = 4000;
const MAX_CHARS = 700;

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

async function wikipedia(q: string, lang: Lang): Promise<Source[]> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '5', gsrnamespace: '0',
    prop: 'extracts|info', exintro: '1', explaintext: '1', exlimit: '5', inprop: 'url', format: 'json',
  }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) return [];
  const j = (await r.json()) as { query?: { pages?: Record<string, { title: string; extract?: string; fullurl?: string; index?: number }> } };
  const pages = Object.values(j.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .filter((p) => p.extract && p.fullurl)
    .map((p) => ({ title: `Wikipedia · ${p.title}`, url: p.fullurl!, text: clean(p.extract!) }));
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
    .slice(0, 4)
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

export async function retrieve(question: string, lang: Lang, city: string): Promise<Source[]> {
  const q = searchQuery(question, lang, city);
  const settled = await Promise.allSettled([wikipedia(q, lang), searxng(q, lang)]);
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
  return out.slice(0, 8);
}
