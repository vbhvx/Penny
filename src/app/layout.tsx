import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Penny | Unified Personal Expense Intelligence",
  description: "Consolidated personal financial intelligence, deterministic analytics, and grounded AI forecasting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}

