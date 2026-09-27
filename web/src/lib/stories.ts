import type { Locale } from "@/lib/i18n";

type Text = Record<Locale, string>;
export type Story = { slug: string; kicker: Text; title: Text; blurb: Text; /** path under /[lang]/ when not a /cerita story */ path?: string };

export const storyHref = (lang: Locale, s: Story) => `/${lang}/${s.path ?? `cerita/${s.slug}/`}`;

/** Story index (newest first). Used by /cerita and the home page. */
export const STORIES: Story[] = [
  {
    slug: "kedah-pinang",
    path: "kedah-pinang/",
    kicker: { ms: "Perbandingan utama", en: "Head to head" },
    title: { ms: "Kedah lawan Pulau Pinang", en: "Kedah vs Penang" },
    blurb: {
      ms: "Sektor demi sektor: bidang yang Kedah sudah unggul, bidang yang Pulau Pinang jauh di hadapan, dan empat peluang untuk Kedah menang seterusnya.",
      en: "Sector by sector: where Kedah already leads, where Penang is far ahead, and four chances for Kedah to win next.",
    },
  },
  {
    slug: "shenzhen",
    kicker: { ms: "Kedah dan dunia", en: "Kedah and the world" },
    title: { ms: "Bolehkah Kedah bergerak sepantas Shenzhen?", en: "Can Kedah move at Shenzhen's speed?" },
    blurb: {
      ms: "Shenzhen, Pulau Pinang dan Bac Ninh mengubah ekonomi mereka dalam satu generasi. Apa yang boleh ditiru oleh Kedah — dan berapa pantas Kedah perlu tumbuh untuk mengejar purata Malaysia?",
      en: "Shenzhen, Penang and Bac Ninh transformed their economies within a generation. What can Kedah copy — and how fast would it need to grow to catch the Malaysian average?",
    },
  },
  {
    slug: "baling",
    kicker: { ms: "Daerah Baling", en: "Baling district" },
    title: { ms: "Rakyat Baling bekerja keras. Kenapa masih miskin?", en: "Baling works hard. Why is it still poor?" },
    blurb: {
      ms: "Satu daripada tujuh isi rumah di Baling hidup di bawah garis kemiskinan. Kami meneliti data untuk memahami puncanya dan mengenal pasti pilihan yang paling berpotensi.",
      en: "One in seven Baling households lives below the poverty line. We dig into the data to understand why, and which options look most promising.",
    },
  },
];
