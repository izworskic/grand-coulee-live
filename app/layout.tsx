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
  title: 'Grand Coulee Dam Live: Lake Roosevelt, River Flow, Tours & Visitor Planner',
  description: "See Grand Coulee Dam conditions now: Lake Roosevelt elevation and change, Columbia River flow, daily inflow, tours, visitor hours, weather and a time-aware visit planner.",
  alternates: { canonical: '/national-tools/grand-coulee/' },
  openGraph: {
    title: 'Grand Coulee Dam Live',
    description: 'Lake Roosevelt, river flow and a smarter way to time a Grand Coulee visit.',
    type: 'website',
    url: '/national-tools/grand-coulee/'
  },
  twitter: { card: 'summary_large_image', title: 'Grand Coulee Dam Live', description: 'Lake Roosevelt, river flow and a smarter way to time a Grand Coulee visit.' },
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
