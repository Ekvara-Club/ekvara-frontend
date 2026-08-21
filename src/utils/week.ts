export interface WeekRange {
  monday: Date;
  sunday: Date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// La semaine commence le lundi. getDay() renvoie 0 = dimanche, 1 = lundi, ...
// -> pour un dimanche, il faut reculer de 6 jours pour trouver le lundi.
export function getWeekRange(anchor: Date): WeekRange {
  const day = anchor.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = startOfLocalDay(
    new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diffToMonday),
  );
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

  return { monday, sunday };
}

export function addWeeks(anchor: Date, weeks: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + weeks * 7);
}

export function getDaysOfWeek(monday: Date): Date[] {
  return Array.from(
    { length: 7 },
    (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index),
  );
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatWeekLabel(monday: Date, sunday: Date): string {
  const sameMonth = monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear();

  if (sameMonth) {
    const monthYear = sunday.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `${monday.getDate()} — ${sunday.getDate()} ${monthYear}`;
  }

  const start = monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const end = sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${start} — ${end}`;
}

export function formatDayHeader(date: Date): string {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase();
  return `${weekday} ${date.getDate()}`;
}

export function formatDayLong(date: Date): string {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`;
}
