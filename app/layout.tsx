import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reserva | AI-Powered Dining Reservations",
  description: "Discover and book the perfect restaurant with intelligent recommendations powered by Google",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
