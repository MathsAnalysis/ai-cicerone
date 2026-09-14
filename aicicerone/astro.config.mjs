import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// `site` alimenta canonical, Open Graph e sitemap: aggiornare se il dominio pubblico è diverso.
// Pagine prerenderizzate in build (statiche); solo /api/* gira a runtime sul server Node.
export default defineConfig({
  site: 'https://aicicerone.com',
  trailingSlash: 'always',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact(), sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  vite: { plugins: [tailwindcss()] },
});
