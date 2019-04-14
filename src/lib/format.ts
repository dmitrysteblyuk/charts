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
  const milliseconds = date.getUTCMilliseconds();
  if (milliseconds) {
    const fraction = time % 1 && String(time).split('.')[1] || '';
    return `.${padding(milliseconds, 3)}${fraction}`;
  }

  const seconds = date.getUTCSeconds();
  if (seconds) {
    return `:${padding(seconds)}`;
  }

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

function padding(value: number, count = 2) {
  const result = String(value);
  if (result.length >= count) {
    return result;
  }
  return new Array(count - result.length).fill(0).join('') + result;
}
