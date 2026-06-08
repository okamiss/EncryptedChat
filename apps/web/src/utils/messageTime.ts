export function formatMessageTime(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = startOfDay(now);
  const messageDay = startOfDay(date);
  const dayDiff = Math.round((today.getTime() - messageDay.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }
  if (dayDiff === 1) {
    return `昨天${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}-${date.getDate()} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${twoDigits(date.getHours())}:${twoDigits(
    date.getMinutes()
  )}:${twoDigits(date.getSeconds())}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
