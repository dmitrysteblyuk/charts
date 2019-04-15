import {rangeTicks} from './decimal-scale-ticks';

const oneHour = 86400000;

export function getTimeScaleTicks(count: number, domain: NumberRange) {
  let step = (domain[1] - domain[0]) / (count - 1);

  const power = Math.round(Math.log(step / oneHour) / Math.LN2);
  step = oneHour * Math.pow(2, power);

  return rangeTicks(step, domain);
}
