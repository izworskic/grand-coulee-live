import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import './operations-history.css';
import './photographic-dam.css';
import './river-context.css';
import './visit-planner.css';
import './return-visit.css';
import './light-theme.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chrisizworski.com'),
  title: 'Grand Coulee Dam Today | Tours, Laser Show & Conditions',
  description: 'Plan a Grand Coulee Dam visit today with visitor center status, next tour, laser show time, weather, Lake Roosevelt context and a live visit planner.',
  alternates: { canonical: '/national-tools/grand-coulee/' },
  openGraph: {
    title: 'Grand Coulee Dam Today | Tours, Laser Show & Conditions',
    description: 'See what is open today, the next plant tour, laser show timing, weather and live Grand Coulee visitor conditions.',
    type: 'website',
    url: '/national-tools/grand-coulee/'
  },
  twitter: { card: 'summary', title: 'Grand Coulee Dam Today', description: 'Tour times, laser show timing, weather and live visitor conditions.' },
  other: { 'google-adsense-account': 'ca-pub-8222782620788075' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
      <Script async strategy="afterInteractive" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075" crossOrigin="anonymous" />
    </html>
  );
}
