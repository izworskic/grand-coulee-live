import { GrandCouleeDashboard } from '@/components/GrandCouleeDashboard';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate = 600;

const SITE_URL = 'https://chrisizworski.com/national-tools/grand-coulee/';

export default async function HomePage() {
  const status = await getGrandCouleeStatus();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}#app`,
        name: 'Grand Coulee Live',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web',
        isAccessibleForFree: true,
        description: 'Grand Coulee Dam operational and visitor intelligence with source-aware live conditions, Lake Roosevelt context, tours and laser-show timing.',
        url: SITE_URL,
        about: {
          '@type': 'TouristAttraction',
          name: 'Grand Coulee Dam',
          address: {
            '@type': 'PostalAddress',
            addressRegion: 'WA',
            addressCountry: 'US'
          }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ChrisIzworski.com', item: 'https://chrisizworski.com/' },
          { '@type': 'ListItem', position: 2, name: 'National Tools', item: 'https://chrisizworski.com/national-tools/' },
          { '@type': 'ListItem', position: 3, name: 'Grand Coulee Live', item: SITE_URL }
        ]
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GrandCouleeDashboard initialStatus={status} />
    </>
  );
}
