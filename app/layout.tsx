import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import './operations-history.css';
import './current-conditions.css';
import './interpretive-depth.css';
import './photographic-dam.css';
import './river-context.css';
import './visit-planner.css';
import './light-theme.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://chrisizworski.com'),
  title: 'Grand Coulee Dam Live: Lake Roosevelt Level, Spillway, Tours & Laser Show',
  description: "See Grand Coulee Dam live operating conditions, Lake Roosevelt level, spillway flow, estimated power generation, plant tours, laser-show times and today's visitor conditions.",
  alternates: { canonical: '/national-tools/grand-coulee/' },
  openGraph: {
    title: 'Grand Coulee Dam Live',
    description: 'Live operations, Lake Roosevelt, tours and tonight’s visitor window.',
    type: 'website',
    url: '/national-tools/grand-coulee/'
  },
  twitter: { card: 'summary_large_image', title: 'Grand Coulee Dam Live', description: 'Live operations, Lake Roosevelt, tours and tonight’s visitor window.' },
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
