import type { Locale } from "@/lib/i18n";

/** One line under each district's name on its cover slide and card. Plain facts
 *  about place, not claims that need a statistic. */
export const TAGLINE: Record<string, Record<Locale, string>> = {
  baling: { ms: "Getah, dusun buah-buahan dan sempadan Thailand", en: "Rubber, fruit orchards and the Thai border" },
  "bandar-baharu": { ms: "Daerah pertanian kecil di sempadan Pulau Pinang dan Perak", en: "A small farming district on the Penang and Perak borders" },
  "kota-setar": { ms: "Ibu negeri dan pusat perkhidmatan Kedah", en: "The state capital and Kedah's services hub" },
  "kuala-muda": { ms: "Sungai Petani dan ekonomi terbesar di Kedah", en: "Sungai Petani and Kedah's largest economy" },
  "kubang-pasu": { ms: "Pintu sempadan ke Thailand di Bukit Kayu Hitam", en: "The gateway to Thailand at Bukit Kayu Hitam" },
  kulim: { ms: "Enjin perindustrian Kedah, di sebelah Pulau Pinang", en: "Kedah's industrial engine, next door to Penang" },
  langkawi: { ms: "Pulau pelancongan bebas cukai", en: "A duty-free tourist island" },
  "padang-terap": { ms: "Hutan, getah dan Bandar Getah Kedah", en: "Forest, rubber and Kedah Rubber City" },
  pendang: { ms: "Sawah padi di tengah-tengah Kedah", en: "Rice fields in the heart of Kedah" },
  "pokok-sena": { ms: "Daerah yang paling bergantung pada pertanian", en: "The district that relies most on farming" },
  sik: { ms: "Hutan dan tasik di pedalaman Kedah", en: "Forests and lakes in Kedah's interior" },
  yan: { ms: "Gunung Jerai, sawah dan pantai", en: "Gunung Jerai, rice fields and the coast" },
};
