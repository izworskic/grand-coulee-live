import type { MetadataRoute } from 'next';

const BASE='https://chrisizworski.com/national-tools/grand-coulee';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/laser-show/`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/tours/`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/lake-roosevelt-water-level/`, changeFrequency: 'hourly', priority: 0.9 }
  ];
}
