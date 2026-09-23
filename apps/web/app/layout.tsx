import "./globals.css";

export const metadata = {
  title: "Football Recruitment Platform — Aarón Expósito",
  description:
    "Reproducible football research: real player profiles, explainable role fit and evidence-aware recruitment analysis by Aarón Expósito.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
