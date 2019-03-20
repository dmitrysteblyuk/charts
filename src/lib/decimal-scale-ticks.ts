export function getDecimalScaleTicks(
  count: number,
  domain: NumberRange
): NumberRange {
  function isPositive(x: number) {
    return x > 0 && isFinite(x);
  }

  let step = (domain[1] - domain[0]) / (count - 1);
  if (!isPositive(step)) {
    return [];
  }

  const ticks: number[] = [];
  let product = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  if (!isPositive(product)) {
    return [];
  }
  step = Math.max(1, Math.floor(step / product));
  while (product % 1) {
    product *= 10;
    step /= 10;
  }
  step *= product;
  if (!isPositive(step)) {
    return [];
  }

  const startIndex = Math.ceil(domain[0] / step);
  const endIndex = Math.floor(domain[1] / step);

  let precision = 1;
  while (step % 1) {
    precision *= 10;
    step *= 10;
  }

  for (let index = startIndex; index <= endIndex; index++) {
    ticks.push(index * step / precision);
  }
  return ticks;
}
