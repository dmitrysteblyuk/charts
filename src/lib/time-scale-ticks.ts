import {isPositive} from './utils';

const oneHour = 86400000;

export function getTimeScaleTicks(
  count: number,
  domain: NumberRange,
  // utc: boolean
): {ticks: number[], startIndex?: number} {
  const ticks: number[] = [];
  let step = (domain[1] - domain[0]) / (count - 1);
  const power = Math.round(Math.log(step / oneHour) / Math.LN2);
  step = oneHour * Math.pow(2, power);

  if (!isPositive(step)) {
    return {ticks};
  }

  const startIndex = Math.ceil(domain[0] / step);
  const endIndex = Math.floor(domain[1] / step);

  for (let index = startIndex; index <= endIndex; ) {
    ticks.push(index * step);
    if (!(index < ++index)) {
      break;
    }
  }
  return {ticks, startIndex};
}
