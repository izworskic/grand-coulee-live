import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://grandcoulee.chrisizworski.com/', changeFrequency: 'hourly', priority: 1 }];
}
