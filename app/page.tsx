import { GrandCouleeDashboard } from '@/components/GrandCouleeDashboard';
import { OperationsHistory } from '@/components/OperationsHistory';
import { getGrandCouleeStatus } from '@/lib/status';

export const revalidate = 600;

export default async function HomePage() {
  const status = await getGrandCouleeStatus();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Grand Coulee Live',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    description: 'Live Grand Coulee Dam operational and visitor intelligence.',
    url: 'https://grandcoulee.chrisizworski.com/'
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GrandCouleeDashboard initialStatus={status} />
      <OperationsHistory />
    </>
  );
}
