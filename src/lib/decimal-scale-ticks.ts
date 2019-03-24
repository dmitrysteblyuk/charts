import {isPositive} from './utils';

export function getDecimalScaleTicks(
  count: number,
  domain: NumberRange
): NumberRange {
  let step = (domain[1] - domain[0]) / (count - 1);
  if (!isPositive(step)) {
    return [];
  }

  const ticks: number[] = [];
  let product = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  if (!isPositive(product)) {
    return [];
  }
  step = Math.max(1, Math.floor(step / product)) * product;
  if (!isPositive(step)) {
    return [];
  }

  const startIndex = Math.ceil(domain[0] / step);
  const endIndex = Math.floor(domain[1] / step);

  for (let index = startIndex; index <= endIndex; ) {
    ticks.push(index * step);
    if (!(index < ++index)) {
      break;
    }
  }
  return ticks;
}
