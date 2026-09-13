import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "MenuPlanik - Planificador de Menús Intel·ligent amb IA",
  description: "Planifica els teus àpats setmanals, genera receptes delicioses amb IA, gestiona la llista de la compra i redueix el malbaratament a la cuina amb MenuPlanik.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="antialiased selection:bg-primary-500/20 selection:text-primary-700 min-h-screen flex flex-col pb-24 lg:pb-0"
      >
        <Toaster position="top-right" richColors closeButton />
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}
