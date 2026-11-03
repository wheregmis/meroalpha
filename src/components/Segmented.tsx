// The app's Segmented control as tabs: one panel of screenshots shown at a time, arrow keys move between tabs.
import { useRef, useState } from 'react';
import Screenshot from './Screenshot';

type Tab = { id: string; label: string; caption: string; image: string; alt: string };

export default function Segmented({ label, tabs }: { label: string; tabs: Tab[] }) {
  const [current, setCurrent] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    setCurrent(next);
    buttons.current[next]?.focus();
  };
  return (
    <div className="switch">
      <div className="seg" role="tablist" aria-label={label}>
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { buttons.current[i] = el; }} role="tab" id={`t-${t.id}`}
            aria-controls={`p-${t.id}`} aria-selected={i === current} tabIndex={i === current ? 0 : -1}
            onClick={() => setCurrent(i)}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') move(i + 1); else if (e.key === 'ArrowLeft') move(i - 1); }}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <section key={t.id} className="panel" role="tabpanel" id={`p-${t.id}`} aria-labelledby={`t-${t.id}`} hidden={i !== current}>
          <p className="panel__caption">{t.caption}</p>
          <Screenshot name={t.image} alt={t.alt} />
        </section>
      ))}
    </div>
  );
}
