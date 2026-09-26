import type { ChronicleEntry } from '../../engine/core/HeroFactory';

interface Props {
  entries: ChronicleEntry[];
}

export function ChronicleView({ entries }: Props) {
  return (
    <aside className="chronicle">
      <h2>Chronicle</h2>
      <ol className="chronicle-list">
        {entries.map((e, i) => (
          <li key={`${e.turn}-${i}`} className={`entry ${e.kind}`}>
            <span className="entry-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
