export function percentageFormat(x: number): string {
  return `${roundAuto(x * 100)}%`;
}

export function roundAuto(x: number): number {
  if (x === 0) {
    return x;
  }
  const n = x > 99 && x < 100 || x > 0 && x < 1 ? 2 : 1;
  const d = Math.round(Math.log(Math.abs(x)) / Math.LN10);
  const degree = d > n ? 0 : d < 0 ? n - d : n;
  const power = Math.pow(10, degree);
  return Math.round(x * power) / power;
}

const monthShortNames = (
  'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
);

export function axisTimeFormat(
  time: number
): string {
  const date = new Date(time);
  const minutes = date.getUTCMinutes();
  const hours = date.getUTCHours();
  if (hours || minutes) {
    return `${padding(hours)}:${padding(minutes)}`;
  }

  const day = date.getUTCDate();
  const month = date.getUTCMonth();

  if (day > 1 || month) {
    return `${monthShortNames[month]} ${day}`;
  }
  return String(date.getUTCFullYear());
}

export function padding(value: number) {
  const count = 2;
  const result = String(value);
  if (result.length >= count) {
    return result;
  }
  return new Array(count - result.length).fill(0).join('') + result;
}

export function dateTimeFormat(dateTime: number) {
  const date = new Date(dateTime);

  if (date.getUTCSeconds() || date.getUTCMinutes() || date.getUTCHours()) {
    return date.toUTCString();
  }
  return date.toDateString();
}

export function dateFormat(dateTime: number) {
  return new Date(dateTime).toDateString();
}

export function timeFormat(dateTime: number) {
  return new Date(dateTime).toUTCString();
}
