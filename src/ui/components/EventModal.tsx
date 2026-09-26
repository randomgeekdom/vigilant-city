import type { PendingEvent } from '../../engine/core/types';

interface Props {
  event: PendingEvent;
  onChoose: (index: number) => void;
}

export function EventModal({ event, onChoose }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">{event.title}</h2>
        <p className="modal-text">{event.text}</p>
        <div className="modal-choices">
          {event.choices.map((c, i) => (
            <button
              key={c.label}
              className="choice"
              disabled={!c.enabled}
              title={c.enabled ? c.hint : c.disabledReason}
              onClick={() => onChoose(i)}
            >
              <span className="choice-label">{c.label}</span>
              {c.hint && <span className="choice-hint">{c.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
