import {isPositive} from './utils';

export function getDecimalScaleTicks(
  count: number,
  domain: NumberRange
): {ticks: number[]} {
  const ticks: number[] = [];
  const result = {ticks};
  let step = (domain[1] - domain[0]) / (count - 1);
  const product = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  step = Math.max(1, Math.floor(step / product)) * product;

  if (!isPositive(step)) {
    return result;
  }

  const ratio = step / product;
  step = (ratio > 7.5 ? 10 : ratio > 2.5 ? 5 : ratio > 1.5 ? 2 : 1) * product;

  const startIndex = Math.ceil(domain[0] / step);
  const endIndex = Math.floor(domain[1] / step);

  for (let index = startIndex; index <= endIndex; ) {
    ticks.push(index * step);
    if (!(index < ++index)) {
      break;
    }
  }
  return result;
}

export function roundAuto(x: number): string {
  if (x === 0) {
    return String(x);
  }
  const n = x > 99 && x < 100 || x > 0 && x < 1 ? 2 : 1;
  const d = Math.round(Math.log(Math.abs(x)) / Math.LN10);
  const degree = d > n ? 0 : d < 0 ? n - d : n;
  const power = Math.pow(10, degree);
  return String(Math.round(x * power) / power);
}
