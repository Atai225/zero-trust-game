import { AlertTriangle, CheckCircle2, Info, XOctagon } from 'lucide-react';
import type { ToastMsg } from '../types';

const STYLE = {
  success: { Icon: CheckCircle2, cls: 'border-safe/60 text-safe' },
  error: { Icon: XOctagon, cls: 'border-threat/60 text-threat' },
  warn: { Icon: AlertTriangle, cls: 'border-amber-neon/60 text-amber-neon' },
  info: { Icon: Info, cls: 'border-sys/60 text-sys' },
};

export function Toasts({ items, onClose }: { items: ToastMsg[]; onClose: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-40 flex w-[min(360px,calc(100vw-24px))] flex-col gap-2" aria-live="polite">
      {items.map((t) => {
        const { Icon, cls } = STYLE[t.kind];
        return (
          <button
            key={t.id}
            onClick={() => onClose(t.id)}
            className={`pointer-events-auto flex animate-slideIn items-start gap-3 rounded-md border bg-panel/95 px-3 py-2.5 text-left shadow-2xl shadow-black/60 backdrop-blur ${cls}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold uppercase tracking-wider">{t.title}</div>
              {t.text && <div className="mt-0.5 text-[13px] leading-snug text-slate-300">{t.text}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
