// Segnalazione discrepanze: POST a /api/report, che la inoltra via email alla redazione.

export type Report = {
  dest: string;
  tour: string;
  stop: string;
  stopName: string;
  guide: string;
  lang: string;
  type: string;
  text: string;
  coords?: { lat: number; lng: number; acc: number };
  url: string;
  appVersion: string;
};

export const APP_VERSION = 'web-2026.09';

export async function sendReport(rep: Report): Promise<void> {
  const r = await fetch('/api/report/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rep),
  });
  if (!r.ok) throw new Error(`report ${r.status}`);
}
