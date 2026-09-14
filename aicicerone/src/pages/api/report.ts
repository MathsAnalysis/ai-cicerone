export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer, { type Transporter } from 'nodemailer';
import { DEST, TOURS } from '../../data/tours';
import { clientIp, env, json, limited, readJson, sameOrigin, str } from '../../lib/api';

// Destinatari di ogni segnalazione. Sovrascrivibili con REPORT_TO (lista separata da virgole).
const DEFAULT_TO = ['carlo4340@outlook.it', 'mario@aicicerone.com'];

let transport: Transporter | null = null;
function mailer(): Transporter | null {
  if (!env.smtpUrl) return null;
  transport ??= nodemailer.createTransport(env.smtpUrl);
  return transport;
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return json(403, { error: 'forbidden' });
  const ip = clientIp(request, clientAddress);
  if (limited('report', ip, 5)) return json(429, { error: 'rate_limited' });

  const body = await readJson(request, 12_000);
  if (!body) return json(400, { error: 'bad_request' });
  const destId = str(body.dest, 40);
  const tourId = str(body.tour, 40);
  const stop = str(body.stop, 4);
  const stopName = str(body.stopName, 120);
  const guide = str(body.guide, 40);
  const lang = body.lang === 'it' || body.lang === 'en' ? body.lang : null;
  const type = str(body.type, 80);
  const text = str(body.text, 2000);
  const url = str(body.url, 300) ?? '';
  const appVersion = str(body.appVersion, 40) ?? '';
  const dest = destId ? DEST[destId] : undefined;
  const tour = tourId ? TOURS[tourId] : undefined;
  if (!dest || !tour || !stop || !stopName || !guide || !lang || !type || !text) return json(400, { error: 'bad_request' });

  let coords = '';
  const c = body.coords as Record<string, unknown> | undefined;
  if (c && typeof c === 'object') {
    const lat = num(c.lat, -90, 90);
    const lng = num(c.lng, -180, 180);
    const acc = num(c.acc, 0, 100_000);
    if (lat != null && lng != null) coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}${acc != null ? ` (±${Math.round(acc)} m)` : ''}`;
  }

  const m = mailer();
  if (!m) {
    console.error('report: SMTP_URL mancante');
    return json(503, { error: 'email_not_configured' });
  }
  const when = new Date().toISOString();
  const subject = `[AiCicerone] ${tour.city} · ${lang === 'it' ? 'tappa' : 'stop'} ${stop} · ${type}`;
  const lines = [
    `Segnalazione dall'app AiCicerone`,
    ``,
    `Destinazione: ${dest.name} (${destId})`,
    `Tour: ${tour.name} (${tourId})`,
    `Tappa: ${stop} · ${stopName}`,
    `Guida: ${guide}`,
    `Lingua: ${lang}`,
    `Tipo: ${type}`,
    ``,
    `Testo:`,
    text,
    ``,
    `Posizione GPS: ${coords || 'non disponibile'}`,
    `Pagina: ${url}`,
    `Versione app: ${appVersion}`,
    `Data (UTC): ${when}`,
    `IP: ${ip}`,
  ];
  try {
    await m.sendMail({
      from: env.reportFrom,
      to: env.reportTo.length ? env.reportTo : DEFAULT_TO,
      subject,
      text: lines.join('\n'),
    });
  } catch (e) {
    console.error('report: invio fallito', e instanceof Error ? e.message : e);
    return json(502, { error: 'email_failed' });
  }
  console.log(JSON.stringify({ kind: 'report', dest: destId, tour: tourId, stop, type, when }));
  return json(200, { ok: true });
};
