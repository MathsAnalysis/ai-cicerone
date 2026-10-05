import type { Lang } from '../data/tours';
import { env, thinks } from './api.ts';

export type Source = { title: string; url: string; text: string };

const UA = 'AiCicerone/1.0 (tour guide app; info@aicicerone.com)';
const TIMEOUT = 4000;
const MAX_CHARS = 400;
const SHORT_INTRO = 300;

const guard = (signal?: AbortSignal, ms = TIMEOUT): AbortSignal => (signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms));

function safeUrl(u: string): boolean {
  try {
    return /^https?:$/.test(new URL(u).protocol);
  } catch {
    return false;
  }
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

async function longer(title: string, lang: Lang, signal?: AbortSignal): Promise<string> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({ action: 'query', prop: 'extracts', titles: title, exchars: '600', explaintext: '1', format: 'json' }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: guard(signal) });
  if (!r.ok) return '';
  const j = (await r.json()) as { query?: { pages?: Record<string, { extract?: string }> } };
  return Object.values(j.query?.pages ?? {})[0]?.extract ?? '';
}

async function wikipedia(q: string, lang: Lang, signal?: AbortSignal): Promise<Source[]> {
  const u = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  u.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '3', gsrnamespace: '0',
    prop: 'extracts|info', exintro: '1', explaintext: '1', exlimit: '3', inprop: 'url', format: 'json',
  }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: guard(signal) });
  if (!r.ok) return [];
  const j = (await r.json()) as { query?: { pages?: Record<string, { title: string; extract?: string; fullurl?: string; index?: number }> } };
  const pages = Object.values(j.query?.pages ?? {}).filter((p) => p.fullurl).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const enriched = await Promise.all(pages.map(async (p, i) => {
    let text = p.extract ?? '';
    if (i < 4 && text.length < SHORT_INTRO) text = (await longer(p.title, lang, signal).catch(() => '')) || text;
    return text ? { title: `Wikipedia · ${p.title}`, url: p.fullurl!, text: clean(text) } : null;
  }));
  return enriched.filter((x): x is Source => x !== null);
}

async function searxng(q: string, lang: Lang, signal?: AbortSignal): Promise<Source[]> {
  if (!env.searxng) return [];
  const u = new URL(`${env.searxng}/search`);
  u.search = new URLSearchParams({ q, format: 'json', language: lang, safesearch: '1', categories: 'general' }).toString();
  const r = await fetch(u, { headers: { 'user-agent': UA }, signal: guard(signal) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (j.results ?? [])
    .filter((x) => x.title && x.url && x.content)
    .slice(0, 2)
    .map((x) => ({ title: x.title!, url: x.url!, text: clean(x.content!) }));
}

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

export async function extractTopic(question: string, lang: Lang, signal?: AbortSignal): Promise<string> {
  const prompt = lang === 'it'
    ? `Domanda di un visitatore: «${question}»\nScrivi solo il nome del luogo, monumento, opera, persona o argomento a cui si riferisce, in 1-5 parole, senza spiegazioni. Se non c'è un soggetto preciso scrivi: nessuno.`
    : `Visitor question: "${question}"\nWrite only the name of the place, monument, work, person or topic it refers to, in 1-5 words, no explanation. If there is no precise subject write: none.`;
  try {
    const r = await fetch(`${env.llmUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.model, prompt: prompt + (/qwen3/i.test(env.model) ? ' /no_think' : ''), stream: false, keep_alive: -1, ...(thinks(env.model) ? { think: false } : {}), options: { temperature: 0, num_predict: 24, num_ctx: 8192 } }),
      signal: guard(signal, 8000),
    });
    const j = (await r.json()) as { response?: string };
    const t = String(j.response ?? '').split('\n')[0].replace(/["«»*.:]/g, '').trim();
    return !t || t.length > 60 || /^(nessuno|none)\b/i.test(t) ? '' : t;
  } catch {
    return '';
  }
}

export async function retrieve(question: string, lang: Lang, city: string, signal?: AbortSignal): Promise<Source[]> {
  const qWords = searchQuery(question, lang, city);
  const byWords = wikipedia(qWords, lang, signal).catch((): Source[] => []);
  const topic = await extractTopic(question, lang, signal);
  const qTopic = topic ? searchQuery(topic, lang, city) : '';
  const [byTopic, web] = await Promise.all([
    qTopic ? wikipedia(qTopic, lang, signal).catch((): Source[] => []) : [],
    searxng(qTopic || qWords, lang, signal).catch((): Source[] => []),
  ]);
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const src of [...byTopic, ...(await byWords), ...web]) {
    if (!safeUrl(src.url) || seen.has(src.url)) continue;
    seen.add(src.url);
    out.push(src);
  }
  return out.slice(0, 5);
}
