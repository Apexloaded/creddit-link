import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { ReduxProvider } from "@/providers/redux-provider";
import { CredditProvider } from "@/context/creddit.context";
import ReactQueryProvider from "@/providers/react-query.provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WagmiProvider } from "@/providers/wagmi.provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base URL for resolving absolute paths for OG/Twitter images
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://creddit.xyz",
  ),

  // Primary Metadata
  title: {
    default: "Creddit | Borrow Against Your Stock Portfolio & Tokens",
    template: "%s | Creddit",
  },
  description:
    "Draw a unified credit line from your stock portfolio using your tokens as collateral. Decentralized, secure, and non-custodial.",
  keywords: [
    "Creddit",
    "DeFi",
    "Credit Line",
    "Crypto Collateral",
    "Token Collateral",
    "Stock Portfolio Lending",
    "Web3 Borrowing",
  ],
  authors: [{ name: "Creddit Team" }],
  creator: "Creddit",

  // Open Graph (Facebook, Discord, Telegram, LinkedIn)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://creddit.xyz",
    title: "Creddit | Draw a Unified Credit Line",
    description:
      "Draw a unified credit line from your stock portfolio using your tokens as collateral.",
    siteName: "Creddit",
    images: [
      {
        url: "/og-image.jpeg", // Recommended size: 1200 x 630 px inside public/og-image.jpeg
        width: 1200,
        height: 630,
        alt: "Creddit - Unified Credit Line",
      },
    ],
  },

  // Twitter / X Card
  twitter: {
    card: "summary_large_image",
    title: "Creddit | Draw a Unified Credit Line",
    description:
      "Draw a unified credit line from your stock portfolio using your tokens as collateral.",
    site: "@creddit", // Your Twitter handle
    creator: "@creddit",
    images: ["/og-image.jpeg"],
  },

  // Favicons & App Icons
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  // Web App / PWA details
  applicationName: "Creddit",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Creddit",
  },

  // Robots / Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      suppressHydrationWarning={true}
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ReduxProvider>
          <WagmiProvider>
            <ReactQueryProvider>
              <TooltipProvider>
                <CredditProvider>
                  {children}
                  <Toaster richColors position={"bottom-center"} closeButton />
                </CredditProvider>
              </TooltipProvider>
            </ReactQueryProvider>
          </WagmiProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
