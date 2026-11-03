// Static pages by default; React only for the components a page hydrates (client:*).
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://meroalpha.com',
  integrations: [react()],
  // privacy.html, terms.html: keeps the old .html addresses working, and Workers serves /privacy too.
  build: { format: 'file' },
});
