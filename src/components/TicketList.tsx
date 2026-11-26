import { Inbox, Loader2, Paperclip, Link2 } from 'lucide-react';
import type { TicketState } from '../types';
import { ChannelIcon, CHANNEL_META, PanelTitle, Waveform, fmtTime } from './ui';

interface Props {
  tickets: TicketState[];
  selectedId: string | null;
  upcoming: number;
  aiPending: number;
  onSelect: (id: string) => void;
}

export function TicketList({ tickets, selectedId, upcoming, aiPending, onSelect }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-panel">
      <PanelTitle icon={<Inbox className="h-3.5 w-3.5" />} right={<span className="font-mono text-[11px] text-sys">{tickets.length} акт.</span>}>
        Входящий поток
      </PanelTitle>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {tickets.length === 0 && (
          <div className="mt-10 px-4 text-center font-mono text-xs leading-relaxed text-slate-500">
            Очередь пуста.
            <br />
            {upcoming > 0 || aiPending > 0 ? 'Ожидаем новые тикеты…' : 'Все тикеты разобраны.'}
          </div>
        )}

        {tickets.map((t) => {
          const sc = t.scenario;
          const pct = (t.remaining / sc.ttl) * 100;
          const urgent = t.remaining <= 30;
          const mid = t.remaining <= 70;
          const selected = selectedId === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onSelect(sc.id)}
              className={`group relative block w-full animate-slideIn overflow-hidden rounded-md border text-left transition ${
                selected ? 'border-sys bg-sys/[0.07] shadow-[0_0_0_1px_rgba(6,182,212,0.3)]' : 'border-line bg-panel2 hover:border-slate-600'
              }`}
            >
              {!t.read && <span className="absolute left-0 top-0 h-full w-0.5 bg-sys" />}
              <div className="flex items-start gap-2.5 p-2.5 pl-3">
                <div className="mt-0.5 rounded border border-line bg-ink p-1.5">
                  <ChannelIcon channel={sc.channel} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${t.read ? 'text-slate-300' : 'font-semibold text-white'}`}>{sc.sender.name}</span>
                    <span className={`shrink-0 font-mono text-[11px] font-bold ${urgent ? 'animate-pulse text-threat' : mid ? 'text-amber-neon' : 'text-slate-400'}`}>
                      {fmtTime(t.remaining)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-400">{sc.channel === 'chat' ? sc.body[0] : sc.subject}</div>
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <span>{CHANNEL_META[sc.channel].label}</span>
                    {sc.attachments.length > 0 && <Paperclip className="h-3 w-3" />}
                    {sc.links.length > 0 && <Link2 className="h-3 w-3" />}
                    {sc.generated && <span className="rounded bg-violet-500/15 px-1 text-violet-300">AI</span>}
                    {sc.channel === 'call' && (
                      <span className="ml-auto scale-75 origin-right">
                        <Waveform bars={10} active={selected} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-0.5 bg-line">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${urgent ? 'bg-threat' : mid ? 'bg-amber-neon' : 'bg-sys'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}

        {aiPending > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-violet-500/40 p-2.5 font-mono text-[11px] text-violet-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> ИИ формирует новый кейс…
          </div>
        )}
      </div>

      <div className="border-t border-line px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        В очереди фильтра: <span className="text-slate-300">{upcoming}</span>
      </div>
    </section>
  );
}
