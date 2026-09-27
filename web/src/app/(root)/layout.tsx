import "../globals.css";

export const metadata = { title: "KedahKu" };

export default function RootRedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms">
      <body>{children}</body>
    </html>
  );
}
