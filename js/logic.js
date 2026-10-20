// Уровень логики: «мозг» приложения — даты, списки, напоминания, статистика.
const Logic = (() => {
  const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

  // Срок по быстрой кнопке: "завтра", "послезавтра", "неделя" или номер дня недели (1 = пн … 5 = пт)
  function quickDue(kind, from = today()) {
    if (kind === "завтра") return addDays(from, 1);
    if (kind === "послезавтра") return addDays(from, 2);
    if (kind === "неделя") return addDays(from, 7);
    const wd = Number(kind), cur = parse(from).getDay();
    return addDays(from, ((wd - cur + 7) % 7) || 7);
  }

  function dueLabel(due, now = today()) {
    const delta = daysBetween(now, due);
    const d = parse(due);
    const word = delta < 0 ? "просрочено" : ({ 0: "сегодня", 1: "завтра", 2: "послезавтра" }[delta] ?? `через ${delta} дн.`);
    return { text: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${WD[d.getDay()]} — ${word}`, overdue: delta < 0, soon: delta >= 0 && delta <= 1 };
  }

  const open = (tasks) => tasks.filter((t) => !t.doneAt).sort((a, b) => a.due.localeCompare(b.due));
  const forTomorrow = (tasks, now = today()) => open(tasks).filter((t) => t.due <= addDays(now, 1));
  const done = (tasks) => tasks.filter((t) => t.doneAt).sort((a, b) => b.doneAt.localeCompare(a.doneAt));

  // Итоги недели (пн–вс): задания со сроком на этой неделе
  function weekStats(tasks, now = today()) {
    const shift = (parse(now).getDay() + 6) % 7;
    const start = addDays(now, -shift), end = addDays(start, 6);
    const week = tasks.filter((t) => t.due >= start && t.due <= end);
    const onTime = week.filter((t) => t.doneAt && t.doneAt <= t.due).length;
    const late = week.filter((t) => t.doneAt && t.doneAt > t.due).length;
    const missed = week.filter((t) => !t.doneAt && t.due < now).length;  // срок прошёл, а не сделано
    return { start, end, total: week.length, onTime, late, missed };
  }

  // Напоминание нужно, если уже наступило выбранное время и сегодня ещё не напоминали
  function reminderDue(settings, date = new Date()) {
    const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return hhmm >= settings.remindTime && settings.lastReminded !== iso(date);
  }

  const STEP_TEMPLATE = ["Найти материал", "Составить план", "Сделать основную часть", "Проверить и оформить"];

  return { today, addDays, daysBetween, quickDue, dueLabel, open, forTomorrow, done, weekStats, reminderDue, STEP_TEMPLATE, fmt: (s) => { const d = parse(s); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`; } };
})();
