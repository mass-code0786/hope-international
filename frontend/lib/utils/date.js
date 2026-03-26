export function getWeekRange(date = new Date()) {
  const target = new Date(date);
  const day = target.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(target);
  start.setDate(target.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    cycleStart: toIsoDate(start),
    cycleEnd: toIsoDate(end)
  };
}

export function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    monthStart: toIsoDate(start),
    monthEnd: toIsoDate(end)
  };
}

export function toIsoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}
