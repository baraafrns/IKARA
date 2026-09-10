import type {Metadata} from 'next';
import { Lexend, DM_Sans } from 'next/font/google';
import './globals.css';

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IKARA FESTIVAL DATA CENTER',
  description: 'Sistem Registrasi Ulang & Penjemputan Peserta Lomba Anak Masjid - IKARA Festival Data Center',
  openGraph: {
    title: 'IKARA FESTIVAL DATA CENTER',
    description: 'Sistem Registrasi Ulang & Penjemputan Peserta Lomba Anak Masjid - IKARA Festival Data Center',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IKARA FESTIVAL DATA CENTER',
    description: 'Sistem Registrasi Ulang & Penjemputan Peserta Lomba Anak Masjid - IKARA Festival Data Center',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="id" className={`${lexend.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-slate-50 text-gray-900 min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

