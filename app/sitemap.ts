import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://chrisizworski.com/national-tools/grand-coulee/', changeFrequency: 'hourly', priority: 1 }];
}
