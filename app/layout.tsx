import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { profile } from "@/lib/profile";
const manrope = localFont({ src: "../public/fonts/manrope-variable.ttf", variable: "--font-manrope", display: "swap", weight: "200 800" });
const plex = localFont({ src: "../public/fonts/ibm-plex-mono-regular.ttf", variable: "--font-plex", display: "swap", weight: "400" });
const display = localFont({ src: "../public/fonts/archivo-black.ttf", variable: "--font-display", display: "swap", weight: "400" });
const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
export const metadata: Metadata = {
  ...(origin ? { metadataBase: new URL(origin), alternates: { canonical: "/" } } : {}),
  title: "Vishnu Chittampalli — Software Engineer | Kinetic Index", description: "Interfaces, APIs, and connected systems. Explore Vishnu Chittampalli’s enterprise engineering experience, published research, and thoughtful agentic-AI workflows.",
  authors: [{ name: profile.name }], creator: profile.name,
  openGraph: { title: "Vishnu Chittampalli — Engineering in motion", description: "Software Engineer · Hyderabad, India. Interfaces, APIs, and thoughtful agentic workflows.", type: "website", ...(origin ? { images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Vishnu Chittampalli — Engineering in motion" }] } : {}) },
  twitter: { card: "summary_large_image", title: "Vishnu Chittampalli — Engineering in motion", ...(origin ? { images: ["/opengraph-image"] } : {}) },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className={`${manrope.variable} ${plex.variable} ${display.variable}`}>{children}</body></html>; }
