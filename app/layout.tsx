import type { Metadata } from 'next';
import './globals.css';
import './landing.css';

export const metadata: Metadata = {
  title: { default: 'BugPilot AI', template: '%s — BugPilot AI' },
  description: 'Autonomous QA agents that explore, reproduce, diagnose, and help verify bugs in your web application.',
  keywords: ['QA', 'autonomous testing', 'bug detection', 'evidence-driven', 'playwright'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
