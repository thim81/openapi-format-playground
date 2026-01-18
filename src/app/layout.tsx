import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "OpenAPI-Format Playground",
  description: "A playground to format & filter OpenAPI documents",
};

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
    <head>
        <link rel="icon" type="image/png" href="/openapi-format-icon.png" />
      </head>
    <body className={inter.className}>{children}</body>
    <script
      async
      defer
      data-domain="openapi-format-playground.vercel.app"
      src="https://cdn.inspectr.dev/script.js"
    ></script>
    </html>
  );
}
