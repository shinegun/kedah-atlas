import Link from "next/link";

// Static export has no server redirects; send visitors to the Malay (default) site.
export default function RootPage() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/ms/" />
      <main className="wrap">
        <p>
          <Link href="/ms/">KedahKu — Bahasa Melayu</Link> · <Link href="/en/">English</Link>
        </p>
      </main>
    </>
  );
}
