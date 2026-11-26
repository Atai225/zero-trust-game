import { useEffect, useMemo, useReducer, useRef } from 'react';
import type { Day, Decision, FlagSource, ResolvedCase, Scenario, TicketState } from '../types';

export const ESCALATIONS_PER_SHIFT = 2;
const WARN_AT = 20;

export interface CareerStats {
  security: number;
  productivity: number;
  score: number;
}

export type ShiftEvent =
  | { id: number; type: 'arrived'; scenario: Scenario }
  | { id: number; type: 'expired'; scenario: Scenario }
  | { id: number; type: 'warn'; scenario: Scenario }
  | { id: number; type: 'decided'; result: ResolvedCase };

export type EndReason = 'cleared' | 'time' | 'breach' | 'fired';

export interface ShiftState {
  day: Day;
  duration: number;
  elapsed: number;
  pending: Scenario[];
  active: TicketState[];
  resolved: ResolvedCase[];
  security: number;
  productivity: number;
  score: number;
  escalations: number;
  selectedId: string | null;
  aiPending: number;
  ended: EndReason | null;
  events: ShiftEvent[];
  eventSeq: number;
}

type Action =
  | { type: 'tick' }
  | { type: 'select'; id: string | null }
  | { type: 'mark'; id: string; tool: 'headers' | 'rules' }
  | { type: 'sandbox'; id: string; itemId: string }
  | { type: 'directory'; id: string; employeeId: string }
  | { type: 'ask'; id: string; question: string }
  | { type: 'reply'; id: string; text: string }
  | { type: 'decide'; id: string; decision: Exclude<Decision, 'expired'> }
  | { type: 'aiStart' }
  | { type: 'aiDone'; scenario: Scenario | null };

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** Какие инструменты игрок реально использовал на этом тикете */
export const usedTools = (t: TicketState): Set<FlagSource> => {
  const s = new Set<FlagSource>(['content']);
  if (t.viewedHeaders) s.add('headers');
  if (t.sandboxed.size > 0) s.add('sandbox');
  const claimed = t.scenario.claimsToBe;
  if (claimed ? t.directoryViewed.has(claimed) : t.directoryViewed.size > 0) s.add('directory');
  if (t.rulesViewed) s.add('rules');
  if (t.asked.length > 0) s.add('interrogation');
  return s;
};

function evaluate(t: TicketState, decision: Decision, elapsed: number) {
  const sc = t.scenario;
  const tools = usedTools(t);
  const investigation = Math.min(30, (tools.size - 1) * 10);
  const timeBonus = Math.round((50 * t.remaining) / sc.ttl);
  let correct = false;
  let score = 0;
  let dSec = 0;
  let dProd = 0;

  switch (decision) {
    case 'escalate':
      correct = true;
      score = 40;
      break;
    case 'expired':
      score = -40;
      dProd = -10;
      if (sc.isMalicious) dSec = -6 * sc.severity;
      break;
    case 'approve':
      correct = !sc.isMalicious;
      if (correct) {
        score = 100 + timeBonus + investigation;
        dProd = 4;
      } else {
        score = -80;
        dSec = -12 * sc.severity;
      }
      break;
    case 'block':
      correct = sc.isMalicious;
      if (correct) {
        score = 100 + timeBonus + investigation;
        dSec = 3;
      } else {
        score = -40;
        dProd = -18;
      }
      break;
  }

  const result: ResolvedCase = {
    scenario: sc,
    decision,
    correct,
    scoreDelta: score,
    timeSpent: Math.max(0, elapsed - t.arrivedAt),
    usedTools: tools,
  };
  return { result, dSec, dProd };
}

type EventInput = ShiftEvent extends infer E ? (E extends ShiftEvent ? Omit<E, 'id'> : never) : never;

function pushEvent(s: ShiftState, ev: EventInput): ShiftState {
  const id = s.eventSeq + 1;
  return { ...s, eventSeq: id, events: [...s.events.slice(-20), { ...ev, id } as ShiftEvent] };
}

function newTicket(sc: Scenario, at: number): TicketState {
  return {
    scenario: sc,
    arrivedAt: at,
    remaining: sc.ttl,
    read: false,
    viewedHeaders: false,
    sandboxed: new Set(),
    directoryViewed: new Set(),
    rulesViewed: false,
    asked: [],
    chat: [],
  };
}

function checkEnd(s: ShiftState): ShiftState {
  if (s.ended) return s;
  if (s.security <= 0) return { ...s, ended: 'breach' };
  if (s.productivity <= 0) return { ...s, ended: 'fired' };
  if (s.pending.length === 0 && s.active.length === 0 && s.aiPending === 0) return { ...s, ended: 'cleared' };
  if (s.elapsed >= s.duration) {
    // всё, что не успели разобрать, — просрочено
    let st = s;
    [...s.active, ...s.pending.map((p) => newTicket(p, s.elapsed))].forEach((t) => {
      const { result, dSec, dProd } = evaluate({ ...t, remaining: 0 }, 'expired', s.elapsed);
      st = {
        ...st,
        resolved: [...st.resolved, result],
        security: clamp(st.security + dSec),
        productivity: clamp(st.productivity + dProd),
        score: st.score + result.scoreDelta,
      };
    });
    return { ...st, active: [], pending: [], ended: 'time' };
  }
  return s;
}

function updateTicket(s: ShiftState, id: string, fn: (t: TicketState) => TicketState): ShiftState {
  return { ...s, active: s.active.map((t) => (t.scenario.id === id ? fn(t) : t)) };
}

function reducer(s: ShiftState, a: Action): ShiftState {
  if (s.ended && a.type !== 'select') return s;
  switch (a.type) {
    case 'tick': {
      let st: ShiftState = { ...s, elapsed: s.elapsed + 1 };
      // поступление новых тикетов
      const arriving = st.pending.filter((p) => p.arrivesAt <= st.elapsed);
      if (arriving.length) {
        st = {
          ...st,
          pending: st.pending.filter((p) => p.arrivesAt > st.elapsed),
          active: [...st.active, ...arriving.map((p) => newTicket(p, st.elapsed))],
        };
        arriving.forEach((p) => (st = pushEvent(st, { type: 'arrived', scenario: p })));
      }
      // таймеры тикетов
      const expired: TicketState[] = [];
      const ticked = st.active.map((t) => ({ ...t, remaining: t.remaining - 1 }));
      const alive = ticked.filter((t) => {
        if (t.remaining <= 0) {
          expired.push(t);
          return false;
        }
        return true;
      });
      st = { ...st, active: alive };
      alive.forEach((t) => {
        if (t.remaining === WARN_AT) st = pushEvent(st, { type: 'warn', scenario: t.scenario });
      });
      expired.forEach((t) => {
        const { result, dSec, dProd } = evaluate(t, 'expired', st.elapsed);
        st = {
          ...st,
          resolved: [...st.resolved, result],
          security: clamp(st.security + dSec),
          productivity: clamp(st.productivity + dProd),
          score: st.score + result.scoreDelta,
          selectedId: st.selectedId === t.scenario.id ? null : st.selectedId,
        };
        st = pushEvent(st, { type: 'expired', scenario: t.scenario });
      });
      return checkEnd(st);
    }
    case 'select':
      return { ...updateTicket(s, a.id ?? '', (t) => ({ ...t, read: true })), selectedId: a.id };
    case 'mark': {
      const t = s.active.find((x) => x.scenario.id === a.id);
      if (!t || (a.tool === 'headers' ? t.viewedHeaders : t.rulesViewed)) return s;
      return updateTicket(s, a.id, (x) => (a.tool === 'headers' ? { ...x, viewedHeaders: true } : { ...x, rulesViewed: true }));
    }
    case 'sandbox':
      return updateTicket(s, a.id, (t) => ({ ...t, sandboxed: new Set(t.sandboxed).add(a.itemId) }));
    case 'directory':
      return updateTicket(s, a.id, (t) => ({ ...t, directoryViewed: new Set(t.directoryViewed).add(a.employeeId) }));
    case 'ask':
      return updateTicket(s, a.id, (t) => ({ ...t, asked: [...t.asked, a.question], chat: [...t.chat, { from: 'you', text: a.question }] }));
    case 'reply':
      return updateTicket(s, a.id, (t) => ({ ...t, chat: [...t.chat, { from: 'them', text: a.text }] }));
    case 'decide': {
      const t = s.active.find((x) => x.scenario.id === a.id);
      if (!t) return s;
      if (a.decision === 'escalate' && s.escalations <= 0) return s;
      const { result, dSec, dProd } = evaluate(t, a.decision, s.elapsed);
      let st: ShiftState = {
        ...s,
        active: s.active.filter((x) => x.scenario.id !== a.id),
        resolved: [...s.resolved, result],
        security: clamp(s.security + dSec),
        productivity: clamp(s.productivity + dProd),
        score: s.score + result.scoreDelta,
        escalations: a.decision === 'escalate' ? s.escalations - 1 : s.escalations,
        selectedId: null,
      };
      st = pushEvent(st, { type: 'decided', result });
      return checkEnd(st);
    }
    case 'aiStart':
      return { ...s, aiPending: s.aiPending + 1 };
    case 'aiDone': {
      const st = { ...s, aiPending: Math.max(0, s.aiPending - 1) };
      if (!a.scenario) return checkEnd(st);
      return { ...st, pending: [...st.pending, { ...a.scenario, arrivesAt: Math.max(st.elapsed + 4, 50) }] };
    }
    default:
      return s;
  }
}

export function initShift(day: Day, duration: number, scenarios: Scenario[], career: CareerStats): ShiftState {
  return {
    day,
    duration,
    elapsed: 0,
    pending: scenarios.filter((s) => s.arrivesAt > 0),
    active: scenarios.filter((s) => s.arrivesAt <= 0).map((s) => newTicket(s, 0)),
    resolved: [],
    security: career.security,
    productivity: career.productivity,
    score: career.score,
    escalations: ESCALATIONS_PER_SHIFT,
    selectedId: null,
    aiPending: 0,
    ended: null,
    events: [],
    eventSeq: 0,
  };
}

export function useShift(init: () => ShiftState, paused: boolean, onEvent: (e: ShiftEvent) => void) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const lastEvent = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (paused || state.ended) return;
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, [paused, state.ended]);

  useEffect(() => {
    state.events.forEach((e) => {
      if (e.id > lastEvent.current) {
        lastEvent.current = e.id;
        onEventRef.current(e);
      }
    });
  }, [state.events]);

  const api = useMemo(
    () => ({
      select: (id: string | null) => dispatch({ type: 'select', id }),
      mark: (id: string, tool: 'headers' | 'rules') => dispatch({ type: 'mark', id, tool }),
      sandbox: (id: string, itemId: string) => dispatch({ type: 'sandbox', id, itemId }),
      directory: (id: string, employeeId: string) => dispatch({ type: 'directory', id, employeeId }),
      ask: (id: string, question: string) => dispatch({ type: 'ask', id, question }),
      reply: (id: string, text: string) => dispatch({ type: 'reply', id, text }),
      decide: (id: string, decision: Exclude<Decision, 'expired'>) => dispatch({ type: 'decide', id, decision }),
      aiStart: () => dispatch({ type: 'aiStart' }),
      aiDone: (scenario: Scenario | null) => dispatch({ type: 'aiDone', scenario }),
    }),
    [],
  );
  return [state, api] as const;
}
