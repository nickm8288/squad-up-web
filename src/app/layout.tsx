import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NavBar from '../components/NavBar';

// Configure the Inter font and expose the CSS variable.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Squad Up',
  description: 'Find and organize clay target shooting squads with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-gray-50 min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
