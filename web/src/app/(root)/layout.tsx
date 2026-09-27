import "../globals.css";

export const metadata = { title: "Atlas Kedah" };

export default function RootRedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
