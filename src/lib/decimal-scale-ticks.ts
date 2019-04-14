export function getDecimalScaleTicks(
  count: number,
  domain: NumberRange
) {
  let step = (domain[1] - domain[0]) / (count - 1);

  const product = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  step = Math.max(1, Math.floor(step / product)) * product;

  const ratio = step / product;
  step = (ratio > 7.5 ? 10 : ratio > 2.5 ? 5 : ratio > 1.5 ? 2 : 1) * product;
  return rangeTicks(step, domain);
}

export function rangeTicks(step: number, domain: NumberRange) {
  const ticks: number[] = [];
  if (!(step > 0 && isFinite(step))) {
    return {ticks};
  }

  const startIndex = Math.ceil(domain[0] / step);
  const endIndex = Math.floor(domain[1] / step) + 1;

  for (let index = startIndex; index < endIndex; ) {
    ticks.push(index * step);
    if (!(index < ++index)) {
      break;
    }
  }
  return {ticks, startIndex};
}
