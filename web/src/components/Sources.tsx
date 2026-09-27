import { sourceById } from "@/lib/atlas";
import { t, type Locale } from "@/lib/i18n";

/** Lists the upstream datasets a page draws on, with licence and retrieval date. */
export default function Sources({ lang, ids }: { lang: Locale; ids: string[] }) {
  const items = ids.map(sourceById).filter((s) => s !== undefined);
  return (
    <details>
      <summary>
        {t(lang).sources} ({items.length})
      </summary>
      <ul className="small secondary">
        {items.map((s) => (
          <li key={s.id}>
            <a href={s.catalogue}>{s.title}</a> — {s.publisher}, {s.years}. {s.licence}.
            {s.note ? ` ${s.note}` : ""} {lang === "ms" ? "Dimuat turun" : "Retrieved"} {s.retrieved}.
          </li>
        ))}
      </ul>
    </details>
  );
}
