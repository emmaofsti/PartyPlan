import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Party-plan Storo - Vaktplan',
  description: 'Vaktplan for Party-plan Storo',
  icons: {
    icon: '/icon-192-v1.png',
    apple: '/apple-icon-v1.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="page-container">
            <Navbar />
            {children}
            <footer className="site-footer">
              <p>Tekniske feil eller kritiske tilbakemeldinger? Kontakt <a href="mailto:ewoldofsti@gmail.com">ewoldofsti@gmail.com</a></p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
