import { useCallback, useEffect, useRef, useState } from 'react';
import { Inbox, FileText, ScanSearch } from 'lucide-react';
import type { Day, Decision, Settings, ToastMsg } from '../types';
import { getDayScenarios } from '../data/scenarios';
import { DAY_INFO } from '../data/rules';
import { initShift, useShift, type CareerStats, type ShiftEvent, type ShiftState } from '../hooks/useShift';
import { askSender, generateScenario, hasAi } from '../services/aiGenerator';
import { sound } from '../utils/sound';
import { Hud } from './Hud';
import { TicketList } from './TicketList';
import { Workspace } from './Workspace';
import { OsintTools, type OsintTab, type SandboxItem } from './OsintTools';

type MobileTab = 'queue' | 'work' | 'osint';

interface Props {
  day: Day;
  career: CareerStats;
  settings: Settings;
  paused: boolean;
  onOpenSettings: () => void;
  onEnd: (s: ShiftState) => void;
  toast: (t: Omit<ToastMsg, 'id'>) => void;
}

const DECISION_TOAST: Record<Exclude<Decision, 'expired'>, string> = {
  approve: 'Сообщение доставлено',
  block: 'Отправлено в карантин',
  escalate: 'Передано на L2',
};

export function ShiftScreen({ day, career, settings, paused, onOpenSettings, onEnd, toast }: Props) {
  const aiOn = hasAi(settings);

  const onEvent = useCallback(
    (e: ShiftEvent) => {
      switch (e.type) {
        case 'arrived':
          sound.incoming();
          toast({ kind: 'info', title: 'Новый тикет', text: `${e.scenario.sender.name}: ${e.scenario.channel === 'chat' ? e.scenario.body[0] : e.scenario.subject}` });
          break;
        case 'warn':
          sound.warn();
          toast({ kind: 'warn', title: 'Осталось 20 секунд', text: e.scenario.subject });
          break;
        case 'expired':
          sound.error();
          toast({ kind: 'error', title: 'Тикет просрочен', text: e.scenario.isMalicious ? 'Атака не остановлена вовремя.' : 'Сотрудник не получил важное сообщение.' });
          break;
        case 'decided': {
          const r = e.result;
          const d = r.decision as Exclude<Decision, 'expired'>;
          if (d === 'escalate') {
            sound.escalate();
            toast({ kind: 'warn', title: 'Эскалация на L2', text: `L2: ${r.scenario.isMalicious ? 'это атака — ' + r.scenario.category : 'письмо легитимное'}. +${r.scoreDelta}` });
          } else if (r.correct) {
            sound.success();
            toast({ kind: 'success', title: `${DECISION_TOAST[d]} · верно`, text: `+${r.scoreDelta} очков` });
          } else {
            sound.error();
            toast({
              kind: 'error',
              title: `${DECISION_TOAST[d]} · ошибка`,
              text: r.scenario.isMalicious ? `Пропущена атака: ${r.scenario.category}.` : 'Заблокировано легитимное сообщение — бизнес теряет время.',
            });
          }
          break;
        }
      }
    },
    [toast],
  );

  const [state, api] = useShift(
    () => initShift(day, DAY_INFO[day].duration, getDayScenarios(day), career),
    paused,
    onEvent,
  );

  const [osintTab, setOsintTab] = useState<OsintTab>('directory');
  const [mobileTab, setMobileTab] = useState<MobileTab>('queue');
  const [sandbox, setSandbox] = useState<SandboxItem[]>([]);
  const [sandboxIndex, setSandboxIndex] = useState(0);

  const selected = state.active.find((t) => t.scenario.id === state.selectedId);

  /* ── ИИ: один дополнительный кейс за смену ── */
  const aiRequested = useRef(false);
  useEffect(() => {
    if (!aiOn || aiRequested.current) return;
    aiRequested.current = true;
    api.aiStart();
    generateScenario(settings, day)
      .then((sc) => api.aiDone(sc))
      .catch((err) => {
        console.warn('[aiGenerator]', err);
        api.aiDone(null);
        toast({ kind: 'warn', title: 'ИИ недоступен', text: 'Продолжаем на локальной базе сценариев.' });
      });
  }, [aiOn, api, settings, day, toast]);

  /* ── конец смены ── */
  const endedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  useEffect(() => {
    if (state.ended && !endedRef.current) {
      endedRef.current = true;
      setTimeout(() => onEndRef.current(stateRef.current), 900);
    }
  }, [state.ended]);

  /* ── памятка открыта при выбранном тикете = правило проверено ── */
  useEffect(() => {
    if (osintTab === 'rules' && state.selectedId) api.mark(state.selectedId, 'rules');
  }, [osintTab, state.selectedId, api]);

  const select = (id: string) => {
    sound.click();
    api.select(id);
    setMobileTab('work');
  };

  const pushSandbox = (item: SandboxItem) => {
    const existing = sandbox.findIndex((s) => s.key === item.key);
    if (existing >= 0) setSandboxIndex(existing);
    else {
      setSandbox((s) => [...s, item]);
      setSandboxIndex(sandbox.length);
    }
    setOsintTab('sandbox');
    setMobileTab('osint');
  };

  const openLink = (linkId: string) => {
    if (!selected) return;
    const l = selected.scenario.links.find((x) => x.id === linkId);
    if (!l) return;
    sound.click();
    api.sandbox(selected.scenario.id, linkId);
    pushSandbox({ key: `${selected.scenario.id}:${linkId}`, ticketId: selected.scenario.id, ticketLabel: selected.scenario.subject, link: l });
  };

  const openFile = (fileId: string) => {
    if (!selected) return;
    const f = selected.scenario.attachments.find((x) => x.id === fileId);
    if (!f) return;
    sound.click();
    api.sandbox(selected.scenario.id, fileId);
    pushSandbox({ key: `${selected.scenario.id}:${fileId}`, ticketId: selected.scenario.id, ticketLabel: selected.scenario.subject, file: f });
  };

  const ask = async (question: string, preset?: string) => {
    if (!selected) return;
    const id = selected.scenario.id;
    const sc = selected.scenario;
    const history = selected.chat;
    sound.click();
    api.ask(id, question);
    if (preset) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 700));
      api.reply(id, preset);
      return;
    }
    try {
      const answer = await askSender(settings, sc, question, history);
      api.reply(id, answer);
    } catch (e) {
      console.warn('[askSender]', e);
      api.reply(id, '(нет ответа — ошибка подключения к ИИ)');
    }
  };

  const decide = (d: Exclude<Decision, 'expired'>) => {
    if (!selected || paused || state.ended) return;
    api.decide(selected.scenario.id, d);
    setMobileTab('queue');
  };

  const columnCls = (tab: MobileTab) => `${mobileTab === tab ? 'flex' : 'hidden'} h-full min-h-0 flex-col lg:flex`;

  return (
    <div className="flex h-full flex-col">
      <Hud
        day={day}
        timeLeft={state.duration - state.elapsed}
        security={state.security}
        productivity={state.productivity}
        score={state.score}
        escalations={state.escalations}
        aiActive={aiOn}
        onSettings={onOpenSettings}
      />

      <main className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(300px,370px)]">
        <div className={`${columnCls('queue')} lg:border-r lg:border-line`}>
          <TicketList tickets={state.active} selectedId={state.selectedId} upcoming={state.pending.length} aiPending={state.aiPending} onSelect={select} />
        </div>
        <div className={columnCls('work')}>
          <Workspace
            key={state.selectedId ?? 'empty'}
            ticket={selected}
            escalations={state.escalations}
            aiEnabled={aiOn}
            onOpenLink={openLink}
            onOpenFile={openFile}
            onHeaders={() => selected && api.mark(selected.scenario.id, 'headers')}
            onAsk={ask}
            onDecide={decide}
          />
        </div>
        <div className={`${columnCls('osint')} lg:border-l lg:border-line`}>
          <OsintTools
            day={day}
            tab={osintTab}
            onTab={(t) => {
              sound.click();
              setOsintTab(t);
            }}
            ticket={selected}
            sandbox={sandbox}
            sandboxIndex={sandboxIndex}
            onSandboxIndex={setSandboxIndex}
            onDirectoryView={(eid) => selected && api.directory(selected.scenario.id, eid)}
          />
        </div>
      </main>

      {/* мобильная навигация между колонками */}
      <nav className="grid shrink-0 grid-cols-3 border-t border-line bg-panel lg:hidden">
        {(
          [
            ['queue', 'Очередь', Inbox, state.active.length],
            ['work', 'Тикет', FileText, 0],
            ['osint', 'OSINT', ScanSearch, sandbox.length],
          ] as const
        ).map(([id, label, Icon, badge]) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`relative flex flex-col items-center gap-0.5 py-2 font-mono text-[10px] uppercase tracking-wider ${mobileTab === id ? 'text-sys' : 'text-slate-500'}`}
          >
            <Icon className="h-5 w-5" />
            {label}
            {badge > 0 && <span className="absolute right-[28%] top-1 rounded-full bg-sys px-1.5 text-[9px] font-bold text-ink">{badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
