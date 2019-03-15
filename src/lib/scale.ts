export class Scale {
  private factor = 1;
  private offset = 0;
  private invertFactor = 1;
  private invertOffset = 0;
  private domain = [0, 1];
  private range = [0, 1];
  private fixed = false;

  scale(x: number) {
    return this.factor * x + this.offset;
  }

  invertScale(x: number) {
    return this.invertFactor * x + this.invertOffset;
  }

  getTicks(count: number, extended: boolean) {
    return getDecimalTicks(count, this.domain, extended);
  }

  setDomain(domain: number[]) {
    this.domain = domain;
    this.rescale();
  }
  getDomain() {
    return this.domain;
  }

  setRange(range: number[]) {
    this.range = range;
    this.rescale();
  }
  getRange() {
    return this.range;
  }

  isFixed() {
    return this.fixed;
  }
  setFixed(fixed: boolean) {
    this.fixed = fixed;
  }

  private rescale() {
    const {domain, range} = this;
    this.factor = (range[1] - range[0]) / (domain[1] - domain[0]);
    this.offset = range[1] - domain[1] * this.factor;

    this.invertFactor = (domain[1] - domain[0]) / (range[1] - range[0]);
    this.invertOffset = domain[1] - range[1] * this.invertFactor;
  }
}

export function arrayIsEqual<T>(a: T[], b: T[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => item === b[index])
  );
}

export function getDecimalTicks(
  count: number,
  domain: number[],
  extended: boolean
): number[] {
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

  const startIndex = (extended ? Math.floor : Math.ceil)(domain[0] / step);
  const endIndex = (extended ? Math.ceil : Math.floor)(domain[1] / step);

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
