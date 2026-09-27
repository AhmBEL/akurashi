import type { Metadata, Viewport } from "next";
import { Figtree, Kaisei_Decol } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/shared/ui/ServiceWorkerRegister";

const heading = Kaisei_Decol({
  variable: "--font-heading",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akurashi",
  description: "L'organisation familiale au quotidien.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3c5742",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${heading.variable} ${body.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
