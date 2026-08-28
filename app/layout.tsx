import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caricamento Basi",
  description: "Gestione basi musicali degli allievi della Nuova Accademia Toscanini, che studiano con il M° Carfora.",
  openGraph: {
    title: "Caricamento Basi",
    description: "Gestione basi musicali degli allievi della Nuova Accademia Toscanini, che studiano con il M° Carfora.",
    url: 'https://basimcarfora.vercel.app', // Sostituisci con il tuo link Vercel definitivo
    siteName: 'Nuova Accademia Toscanini',
    images: [
      {
        url: '/logo-2.png', // L'immagine che comparirà nell'anteprima di WhatsApp
        width: 1200,
        height: 630,
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  icons: {
    icon: '/logo-2.png', // L'icona nella linguetta del browser
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}