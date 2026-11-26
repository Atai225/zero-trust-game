import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, FileWarning, Fingerprint, Globe, Loader2, Mail, Phone, ScanSearch, Search, UserSearch, Users, AtSign } from 'lucide-react';
import type { Day, SandboxFileReport, SandboxLinkReport, TicketState } from '../types';
import { EMPLOYEES, STATUS_COLOR, STATUS_SHORT } from '../data/employees';
import { RULES } from '../data/rules';
import { PanelTitle, Verdict } from './ui';

export type OsintTab = 'directory' | 'sandbox' | 'rules';

export interface SandboxItem {
  key: string;
  ticketId: string;
  ticketLabel: string;
  link?: SandboxLinkReport;
  file?: SandboxFileReport;
}

interface Props {
  day: Day;
  tab: OsintTab;
  onTab: (t: OsintTab) => void;
  ticket: TicketState | undefined;
  sandbox: SandboxItem[];
  sandboxIndex: number;
  onSandboxIndex: (i: number) => void;
  onDirectoryView: (employeeId: string) => void;
}

const TABS: { id: OsintTab; label: string; Icon: typeof Users }[] = [
  { id: 'directory', label: 'Сотрудники', Icon: Users },
  { id: 'sandbox', label: 'Sandbox', Icon: ScanSearch },
  { id: 'rules', label: 'Памятка', Icon: BookOpen },
];

const Row = ({ k, v, danger }: { k: string; v: React.ReactNode; danger?: boolean }) => (
  <div className="grid grid-cols-[96px_1fr] gap-2 border-b border-line/60 py-1.5 text-xs last:border-0">
    <span className="font-mono text-slate-500">{k}</span>
    <span className={`break-all font-mono ${danger ? 'font-bold text-threat' : 'text-slate-200'}`}>{v}</span>
  </div>
);

function Directory({ ticket, onView }: { ticket?: TicketState; onView: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^@/, '');
    if (!s) return EMPLOYEES;
    return EMPLOYEES.filter((e) =>
      [e.name, e.title, e.department, e.email, e.messenger, e.phone].some((f) => f.toLowerCase().includes(s)),
    );
  }, [q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-line p-2">
        <div className="flex items-center gap-2 rounded border border-line bg-ink px-2 focus-within:border-sys">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя, должность, email…"
            className="w-full bg-transparent py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
        {ticket && (
          <button
            onClick={() => setQ(ticket.scenario.sender.name.split(' ').slice(-1)[0])}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-line py-1.5 font-mono text-[11px] text-slate-400 hover:border-sys hover:text-sys"
          >
            <UserSearch className="h-3.5 w-3.5" /> Найти отправителя тикета
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {list.length === 0 && (
          <div className="rounded border border-threat/40 bg-threat/5 p-3 text-center font-mono text-xs text-threat">
            Совпадений в справочнике нет.
            <div className="mt-1 text-slate-400">Такого сотрудника в компании не существует.</div>
          </div>
        )}
        {list.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} className={`rounded border ${isOpen ? 'border-sys/60 bg-sys/[0.04]' : 'border-line bg-panel2'}`}>
              <button
                className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
                onClick={() => {
                  setOpen(isOpen ? null : e.id);
                  if (!isOpen) onView(e.id);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-slate-100">{e.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{e.title}</span>
                </span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase ${STATUS_COLOR[e.status]}`}>
                  {STATUS_SHORT[e.status]}
                </span>
              </button>
              {isOpen && (
                <div className="animate-slideIn space-y-1 border-t border-line px-2.5 py-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300"><Building2 className="h-3.5 w-3.5 text-slate-500" /> {e.department}</div>
                  <div className="flex items-center gap-2 break-all font-mono text-sys"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" /> {e.email}</div>
                  <div className="flex items-center gap-2 font-mono text-slate-300"><Phone className="h-3.5 w-3.5 text-slate-500" /> {e.phone}</div>
                  <div className="flex items-center gap-2 font-mono text-slate-300"><AtSign className="h-3.5 w-3.5 text-slate-500" /> {e.messenger}</div>
                  <div className={`mt-1 rounded border px-2 py-1 ${STATUS_COLOR[e.status]}`}>Статус: {e.statusText}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sandbox({ items, index, onIndex }: { items: SandboxItem[]; index: number; onIndex: (i: number) => void }) {
  const item = items[index];
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());

  const key = item?.key;
  useEffect(() => {
    if (!key || done.has(key)) return;
    setScanning(true);
    setProgress(0);
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 9)), 90);
    const end = setTimeout(() => {
      setScanning(false);
      setDone((d) => new Set(d).add(key));
    }, 1100);
    return () => {
      clearInterval(t);
      clearTimeout(end);
    };
  }, [key, done]);

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ScanSearch className="h-10 w-10 text-line" />
        <p className="font-mono text-xs text-slate-500">Кликните по ссылке или вложению в сообщении — объект будет автоматически отправлен на анализ.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {items.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-line p-2">
          {items.map((it, i) => (
            <button
              key={it.key}
              onClick={() => onIndex(i)}
              className={`shrink-0 rounded border px-2 py-1 font-mono text-[10px] ${i === index ? 'border-sys text-sys' : 'border-line text-slate-500 hover:text-slate-300'}`}
            >
              {it.link ? '🔗' : '📎'} {(it.link?.domain ?? it.file?.name ?? '').slice(0, 18)}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">Тикет: {item.ticketLabel}</div>
        {scanning ? (
          <div className="rounded border border-sys/40 bg-sys/5 p-4">
            <div className="mb-2 flex items-center gap-2 font-mono text-xs text-sys">
              <Loader2 className="h-4 w-4 animate-spin" /> Детонация в изолированной среде…
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-line">
              <div className="h-full bg-sys transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 font-mono text-[10px] text-slate-500">
              {progress < 40 ? '› резолвинг DNS / WHOIS' : progress < 80 ? '› отслеживание редиректов' : '› поведенческий анализ'}
            </div>
          </div>
        ) : item.link ? (
          <div className="animate-slideIn">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-xs text-slate-300"><Globe className="h-4 w-4 text-sys" /> URL-отчёт</span>
              <Verdict v={item.link.verdict} />
            </div>
            <div className="rounded border border-line bg-ink p-2.5">
              <Row k="Текст" v={item.link.displayText} />
              <Row k="Показан" v={item.link.shownUrl} />
              <Row k="Реальный URL" v={item.link.realUrl} danger={item.link.verdict !== 'clean'} />
              <Row k="Домен" v={item.link.domain} />
              <Row k="Возраст" v={item.link.domainAge} danger={item.link.domainAgeDays < 30} />
              <Row k="Регистратор" v={item.link.registrar} />
              <Row k="SSL" v={item.link.ssl} />
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Цепочка редиректов</div>
            <ol className="mt-1 space-y-1">
              {item.link.redirectChain.map((u, i) => (
                <li key={i} className="flex gap-2 break-all font-mono text-[11px] text-slate-300">
                  <span className="text-sys">{i + 1}.</span> {u}
                </li>
              ))}
            </ol>
            <p className={`mt-3 rounded border p-2 text-xs leading-snug ${item.link.verdict === 'clean' ? 'border-safe/30 text-safe' : 'border-threat/30 text-threat'}`}>
              {item.link.notes}
            </p>
          </div>
        ) : item.file ? (
          <div className="animate-slideIn">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-mono text-xs text-slate-300"><FileWarning className="h-4 w-4 text-sys" /> Файл-отчёт</span>
              <Verdict v={item.file.verdict} />
            </div>
            <div className="rounded border border-line bg-ink p-2.5">
              <Row k="Имя" v={item.file.name} />
              <Row k="Тип" v={item.file.type} danger={/macro|exe/i.test(item.file.type + item.file.name)} />
              <Row k="Размер" v={item.file.size} />
              <Row k="SHA-256" v={<span className="flex items-start gap-1"><Fingerprint className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />{item.file.sha256}</span>} />
            </div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Поведение в песочнице</div>
            <ul className="mt-1 space-y-1">
              {item.file.behavior.map((b, i) => (
                <li key={i} className={`font-mono text-[11px] ${item.file?.verdict === 'clean' ? 'text-safe' : 'text-threat'}`}>› {b}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Rules({ day }: { day: Day }) {
  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">Регламент SOC · смена {day}</div>
      <ol className="space-y-2">
        {RULES.filter((r) => r.day <= day).map((r, i) => (
          <li key={r.id} className={`rounded border p-2.5 text-[13px] leading-snug ${r.day === day && day > 1 ? 'border-amber-neon/50 bg-amber-neon/5 text-slate-100' : 'border-line bg-panel2 text-slate-300'}`}>
            <span className="mr-1.5 font-mono text-xs text-sys">{String(i + 1).padStart(2, '0')}</span>
            {r.text}
            {r.day === day && day > 1 && <span className="ml-2 rounded bg-amber-neon/20 px-1 font-mono text-[9px] font-bold text-amber-neon">NEW</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OsintTools({ day, tab, onTab, ticket, sandbox, sandboxIndex, onSandboxIndex, onDirectoryView }: Props) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-panel">
      <PanelTitle icon={<ScanSearch className="h-3.5 w-3.5" />}>Инструменты OSINT</PanelTitle>
      <div className="grid grid-cols-3 border-b border-line">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            className={`flex items-center justify-center gap-1.5 border-b-2 py-2 font-mono text-[11px] uppercase tracking-wide ${
              tab === id ? 'border-sys text-sys' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === 'sandbox' && sandbox.length > 0 && <span className="rounded bg-sys/20 px-1 text-[9px]">{sandbox.length}</span>}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'directory' && <Directory ticket={ticket} onView={onDirectoryView} />}
        {tab === 'sandbox' && <Sandbox items={sandbox} index={sandboxIndex} onIndex={onSandboxIndex} />}
        {tab === 'rules' && <Rules day={day} />}
      </div>
    </section>
  );
}
