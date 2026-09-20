import type { Session, StoryEvent, TimeContext } from './types';

/** 不依赖宿主机器时区，也不要求小程序环境提供 Intl。 */
export function getTimeContext(date: Date): TimeContext {
  if (!Number.isFinite(date.getTime())) throw new Error('时间无效');
  const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hours = local.getUTCHours();
  const minutes = local.getUTCMinutes();
  return {
    minute: hours * 60 + minutes,
    weekday: local.getUTCDay(),
    label: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    day: local.toISOString().slice(0, 10),
    period: hours >= 6 && hours < 17 ? 'day' : hours >= 17 && hours < 20 ? 'dusk' : 'night',
  };
}

export function matchesEvent(event: StoryEvent, sceneId: string, time: TimeContext): boolean {
  const inTime = event.startMinute <= event.endMinute
    ? time.minute >= event.startMinute && time.minute < event.endMinute
    : time.minute >= event.startMinute || time.minute < event.endMinute;
  return event.enabled && event.weight > 0 && event.sceneIds.includes(sceneId) && inTime
    && (!event.weekdays || event.weekdays.includes(time.weekday));
}

export function pickEvent(events: StoryEvent[], sceneId: string, now: Date, history: Session[], random = Math.random): StoryEvent {
  const time = getTimeContext(now);
  const eligible = events.filter(event => matchesEvent(event, sceneId, time));
  if (!eligible.length) throw new Error('当前地点缺少通用事件配置');
  const last = history[history.length - 1]?.eventId;
  const cooled = eligible.filter(event => event.id !== last && !history.some(session =>
    session.eventId === event.id && now.getTime() - Date.parse(session.startedAt) < event.cooldownMinutes * 60_000));
  const specific = cooled.filter(event => !event.fallback);
  // 优先情境事件，再通用事件；全部冷却时放宽冷却，但有其他候选就不连续重复。
  const pool = specific.length ? specific : cooled.length ? cooled
    : eligible.some(event => event.id !== last) ? eligible.filter(event => event.id !== last) : eligible;
  const total = pool.reduce((sum, event) => sum + event.weight, 0);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('随机数应位于 [0, 1)');
  let cursor = value * total;
  for (const event of pool) {
    cursor -= event.weight;
    if (cursor < 0) return event;
  }
  return pool[pool.length - 1]!;
}
