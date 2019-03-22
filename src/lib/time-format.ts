import {newArray} from './utils';

export function axisTimeFormat(
  time: number
): string {
  const date = new Date(time);
  const milliseconds = date.getMilliseconds();
  if (milliseconds) {
    const fraction = time % 1 && String(time).split('.')[1] || '';
    return `.${padding(milliseconds, 3)}${fraction}`;
  }

  const seconds = date.getSeconds();
  if (seconds) {
    return `:${padding(seconds)}`;
  }

  const minutes = date.getMinutes();
  const hours = date.getHours();
  if (hours || minutes) {
    return `${padding(hours)}:${padding(minutes)}`;
  }

  const day = date.getDate();
  const month = date.getMonth();
  if (day > 1 || month) {
    return `${date.getFullYear()}-${padding(month + 1)}-${padding(day)}`;
  }

  return String(date.getFullYear());
}

function padding(value: number, count = 2) {
  const result = String(value);
  if (result.length >= count) {
    return result;
  }
  return newArray(count - result.length, () => 0).join('') + result;
}
