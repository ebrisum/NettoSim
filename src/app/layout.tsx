import type { Metadata } from "next";
import "@/index.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { TenantBranding } from "@/components/tenant/TenantBranding";

const FURL =
  "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&display=swap";

export const metadata: Metadata = {
  title: "NettoSim — Dutch Tax & Benefits Calculator",
  description:
    "Calculate your net salary, tax breakdown, toeslagen, and employer costs in the Netherlands.",
  openGraph: {
    title: "NettoSim",
    description: "Free Dutch tax calculator with real-time breakdown",
    url: "https://nettosim.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <head>
        <link href={FURL} rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
        <SessionProvider>
          <TenantBranding>{children}</TenantBranding>
        </SessionProvider>
      </body>
    </html>
  );
}
