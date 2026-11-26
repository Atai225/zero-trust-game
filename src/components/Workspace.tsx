import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Code2,
  FileText,
  Loader2,
  MessageCircleQuestion,
  Paperclip,
  Send,
  ShieldAlert,
  User,
  ExternalLink,
} from 'lucide-react';
import type { Decision, TicketState } from '../types';
import { ChannelIcon, CHANNEL_META, PanelTitle, Waveform, fmtTime } from './ui';

interface Props {
  ticket: TicketState | undefined;
  escalations: number;
  aiEnabled: boolean;
  onOpenLink: (linkId: string) => void;
  onOpenFile: (fileId: string) => void;
  onHeaders: () => void;
  onAsk: (question: string, presetAnswer?: string) => Promise<void>;
  onDecide: (d: Exclude<Decision, 'expired'>) => void;
}

const AuthBadge = ({ v }: { v: string }) => (
  <span
    className={`rounded px-1.5 py-0.5 font-bold ${
      v === 'PASS' ? 'bg-safe/15 text-safe' : v === 'FAIL' ? 'bg-threat/15 text-threat' : 'bg-amber-neon/15 text-amber-neon'
    }`}
  >
    {v}
  </span>
);

export function Workspace({ ticket, escalations, aiEnabled, onOpenLink, onOpenFile, onHeaders, onAsk, onDecide }: Props) {
  const [showHeaders, setShowHeaders] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [typing, setTyping] = useState(false);
  const [custom, setCustom] = useState('');
  const [revealed, setRevealed] = useState(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  const sc = ticket?.scenario;
  const transcriptLen = sc?.transcript?.length ?? 0;

  // постепенная «расшифровка» звонка
  useEffect(() => {
    if (!transcriptLen) return;
    setRevealed(1);
    const t = setInterval(() => setRevealed((r) => (r >= transcriptLen ? r : r + 1)), 1300);
    return () => clearInterval(t);
  }, [transcriptLen]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [ticket?.chat.length, typing]);

  // горячие клавиши: A — одобрить, B — блок, E — эскалация
  useEffect(() => {
    if (!ticket) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'ф') onDecide('approve');
      else if (k === 'b' || k === 'и') onDecide('block');
      else if ((k === 'e' || k === 'у') && escalations > 0) onDecide('escalate');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [ticket, escalations, onDecide]);

  if (!ticket || !sc) {
    return (
      <section className="flex h-full min-h-0 flex-col bg-ink">
        <PanelTitle icon={<FileText className="h-3.5 w-3.5" />}>Рабочая область</PanelTitle>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-line" />
          <p className="font-mono text-sm text-slate-500">
            Выберите тикет из очереди<span className="animate-blink">_</span>
          </p>
          <p className="max-w-xs text-xs text-slate-600">Проверяйте заголовки, ссылки и справочник, прежде чем принимать решение. Горячие клавиши: A / B / E.</p>
        </div>
      </section>
    );
  }

  const ask = async (q: string, preset?: string) => {
    if (typing) return;
    setTyping(true);
    try {
      await onAsk(q, preset);
    } finally {
      setTyping(false);
    }
  };

  const renderText = (p: string, i: number) => {
    const parts = p.split(/(\{\{link:\w+\}\})/g);
    const isBlock = parts.filter(Boolean).length === 1 && /^\{\{link:\w+\}\}$/.test(p.trim());
    return (
      <p key={i} className={`whitespace-pre-line ${isBlock ? 'my-3' : ''}`}>
        {parts.map((part, j) => {
          const m = part.match(/^\{\{link:(\w+)\}\}$/);
          if (!m) return <Fragment key={j}>{part}</Fragment>;
          const l = sc.links.find((x) => x.id === m[1]);
          if (!l) return null;
          const checked = ticket.sandboxed.has(l.id);
          return (
            <button
              key={j}
              onClick={() => onOpenLink(l.id)}
              title={`${l.redirectChain[0]}\n(клик — отправить в песочницу)`}
              className={
                isBlock
                  ? 'inline-flex max-w-full items-center gap-2 rounded border border-sys/40 bg-sys/10 px-3 py-2 font-medium text-sys hover:bg-sys/20'
                  : 'text-sys underline decoration-sys/50 underline-offset-2 hover:decoration-sys'
              }
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{l.displayText}</span>
              {checked && <span className="rounded bg-safe/20 px-1 font-mono text-[9px] text-safe">SCAN</span>}
            </button>
          );
        })}
      </p>
    );
  };

  const urgent = ticket.remaining <= 30;
  const askedSet = new Set(ticket.asked);
  const askLabel = sc.channel === 'email' ? 'Ответить отправителю' : sc.channel === 'chat' ? 'Написать в чат' : 'Перезвонить на номер';

  return (
    <section className="flex h-full min-h-0 flex-col bg-ink">
      <PanelTitle
        icon={<ChannelIcon channel={sc.channel} className="h-3.5 w-3.5" />}
        right={
          <span className={`font-mono text-xs font-bold ${urgent ? 'animate-pulse text-threat' : 'text-amber-neon'}`}>⏱ {fmtTime(ticket.remaining)}</span>
        }
      >
        {CHANNEL_META[sc.channel].label} · тикет #{sc.id.toUpperCase()}
      </PanelTitle>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-3 sm:p-5">
          {/* ── Шапка ── */}
          <div className="rounded-lg border border-line bg-panel p-3 sm:p-4">
            <h1 className="mb-3 font-sans text-lg font-semibold leading-snug text-white sm:text-xl">{sc.subject}</h1>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-panel2">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <div className="min-w-0 text-sm">
                <div className="font-semibold text-slate-100">
                  {sc.sender.name}
                  {sc.sender.title && <span className="ml-2 text-xs font-normal text-slate-500">{sc.sender.title}</span>}
                </div>
                <div className="break-all font-mono text-xs text-sys">{sc.sender.address}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Кому: <span className="font-mono text-slate-400">{sc.recipient}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {sc.headers && (
                <button
                  onClick={() => {
                    setShowHeaders((v) => !v);
                    onHeaders();
                  }}
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                    showHeaders ? 'border-sys bg-sys/10 text-sys' : 'border-line text-slate-300 hover:border-sys hover:text-sys'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" /> Raw Headers
                  <ChevronDown className={`h-3 w-3 transition ${showHeaders ? 'rotate-180' : ''}`} />
                </button>
              )}
              <button
                onClick={() => setShowChat((v) => !v)}
                className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider ${
                  showChat ? 'border-amber-neon bg-amber-neon/10 text-amber-neon' : 'border-line text-slate-300 hover:border-amber-neon hover:text-amber-neon'
                }`}
              >
                <MessageCircleQuestion className="h-3.5 w-3.5" /> Задать вопрос (Допрос)
              </button>
            </div>

            {showHeaders && sc.headers && (
              <div className="mt-3 animate-slideIn overflow-x-auto rounded border border-line bg-ink p-3 font-mono text-[11px] leading-relaxed sm:text-xs">
                {(
                  [
                    ['From', sc.headers.from],
                    ['Reply-To', sc.headers.replyTo],
                    ['Return-Path', sc.headers.returnPath],
                    ['Received', sc.headers.received],
                    ['X-Origin-IP', sc.headers.ip],
                    ['Message-ID', sc.headers.messageId],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="w-24 shrink-0 text-slate-500">{k}:</span>
                    <span className="break-all text-slate-200">{v}</span>
                  </div>
                ))}
                <div className="mt-2 flex flex-wrap gap-3 border-t border-line pt-2">
                  <span className="text-slate-500">SPF: <AuthBadge v={sc.headers.spf} /></span>
                  <span className="text-slate-500">DKIM: <AuthBadge v={sc.headers.dkim} /></span>
                  <span className="text-slate-500">DMARC: <AuthBadge v={sc.headers.dmarc} /></span>
                </div>
              </div>
            )}
          </div>

          {/* ── Содержимое ── */}
          {sc.channel === 'call' ? (
            <div className="mt-3 rounded-lg border border-line bg-panel p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-3 rounded border border-amber-neon/30 bg-amber-neon/5 px-3 py-2">
                <Waveform active={revealed < transcriptLen} bars={34} />
                <span className="ml-auto shrink-0 font-mono text-[11px] uppercase text-amber-neon">
                  {revealed < transcriptLen ? '● Расшифровка…' : 'Запись завершена'}
                </span>
              </div>
              <div className="mb-3 space-y-2 font-sans text-sm text-slate-400">{sc.body.map(renderText)}</div>
              <div className="space-y-2">
                {sc.transcript?.slice(0, revealed).map((l, i) => (
                  <div key={i} className="flex animate-slideIn gap-2 text-[14px] leading-relaxed">
                    <span className={`w-20 shrink-0 font-mono text-[11px] uppercase ${l.speaker === 'caller' ? 'text-amber-neon' : 'text-sys'}`}>
                      {l.speaker === 'caller' ? 'Звонящий' : 'Сотрудник'}
                    </span>
                    <span className="text-slate-200">{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : sc.channel === 'chat' ? (
            <div className="mt-3 space-y-2 rounded-lg border border-line bg-panel p-3 sm:p-4">
              {sc.body.map((p, i) => (
                <div key={i} className="max-w-[90%] rounded-lg rounded-tl-none border border-violet-500/20 bg-violet-500/[0.07] px-3 py-2 font-sans text-[14px] leading-relaxed text-slate-200">
                  {renderText(p, i)}
                </div>
              ))}
              <div className="pt-1 font-mono text-[10px] text-slate-500">NordChat · доставлено · {sc.sender.address}</div>
            </div>
          ) : (
            <div className="mt-3 space-y-3 rounded-lg border border-line bg-panel p-4 font-sans text-[15px] leading-relaxed text-slate-200 sm:p-5">
              {sc.body.map(renderText)}
            </div>
          )}

          {/* ── Вложения ── */}
          {sc.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sc.attachments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpenFile(a.id)}
                  className="flex max-w-full items-center gap-2 rounded border border-line bg-panel px-3 py-2 text-left hover:border-sys"
                  title="Отправить в песочницу"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-200">{a.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">{a.size} · клик → песочница</span>
                  </span>
                  {ticket.sandboxed.has(a.id) && <span className="rounded bg-safe/20 px-1 font-mono text-[9px] text-safe">SCAN</span>}
                </button>
              ))}
            </div>
          )}

          {/* ── Допрос ── */}
          {showChat && (
            <div className="mt-3 animate-slideIn rounded-lg border border-amber-neon/30 bg-panel">
              <div className="border-b border-line px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-amber-neon">{askLabel}</div>
              <div className="max-h-64 space-y-2 overflow-y-auto p-3">
                {ticket.chat.length === 0 && <p className="text-xs text-slate-500">Задайте проверочный вопрос и оцените реакцию собеседника.</p>}
                {ticket.chat.map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] animate-slideIn rounded-lg px-3 py-2 text-sm ${
                        m.from === 'you' ? 'rounded-br-none bg-sys/15 text-sys' : 'rounded-bl-none border border-line bg-panel2 text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> {sc.sender.name} печатает…
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div className="space-y-1.5 border-t border-line p-2">
                {sc.interrogation.map((q) => (
                  <button
                    key={q.question}
                    disabled={askedSet.has(q.question) || typing}
                    onClick={() => ask(q.question, q.answer)}
                    className="block w-full rounded border border-line px-2.5 py-1.5 text-left text-[13px] text-slate-300 hover:border-amber-neon hover:text-amber-neon disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-slate-300"
                  >
                    › {q.question}
                  </button>
                ))}
                {aiEnabled ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = custom.trim();
                      if (!q) return;
                      setCustom('');
                      void ask(q);
                    }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="Свой вопрос (ИИ)…"
                      className="min-w-0 flex-1 rounded border border-line bg-ink px-2.5 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-neon"
                    />
                    <button disabled={typing || !custom.trim()} className="rounded border border-amber-neon/50 px-3 text-amber-neon hover:bg-amber-neon/10 disabled:opacity-40" aria-label="Отправить">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <p className="px-1 pt-1 text-[11px] text-slate-600">Свои вопросы доступны после подключения API-ключа в настройках.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Панель действий ── */}
      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-line bg-panel p-2 sm:gap-3 sm:p-3">
        <button
          onClick={() => onDecide('approve')}
          className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-safe/60 bg-safe/10 px-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-safe transition hover:bg-safe/20 active:scale-[0.98] sm:flex-row sm:gap-2 sm:py-3 sm:text-xs"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-center leading-tight">Одобрить<span className="hidden xl:inline"> / пропустить</span></span>
        </button>
        <button
          onClick={() => onDecide('block')}
          className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-threat/60 bg-threat/10 px-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-threat transition hover:bg-threat/20 active:scale-[0.98] sm:flex-row sm:gap-2 sm:py-3 sm:text-xs"
        >
          <Ban className="h-5 w-5 shrink-0" />
          <span className="text-center leading-tight">В карантин<span className="hidden xl:inline"> / блок</span></span>
        </button>
        <button
          onClick={() => onDecide('escalate')}
          disabled={escalations <= 0}
          className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-amber-neon/60 bg-amber-neon/10 px-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-neon transition hover:bg-amber-neon/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 sm:flex-row sm:gap-2 sm:py-3 sm:text-xs"
        >
          <ArrowUpCircle className="h-5 w-5 shrink-0" />
          <span className="text-center leading-tight">На L2 ({escalations})</span>
        </button>
      </div>
    </section>
  );
}
