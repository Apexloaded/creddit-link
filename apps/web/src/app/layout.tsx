import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ReduxProvider } from "@/providers/redux-provider";
import ReactQueryProvider from "@/providers/react-query.provider";
import { AppProvider } from "@/context/app.context";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Creddit Link",
  description: "Creddit Link",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(
      "h-full",
      "antialiased",
      fraunces.variable,
      inter.variable,
      ibmPlexMono.variable,
    )}>
      <body>
        <ReduxProvider>
          <AppProvider>
            <ReactQueryProvider>
              {children}
            </ReactQueryProvider>
          </AppProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
