export class Scale {
  private factor = 1;
  private offset = 0;
  private fixed = false;
  private extendableOnly = false;
  // private inverted: Scale | null = null;

  constructor(
    private domain: NumberRange = [0, 1],
    private range: NumberRange = [0, 1]
  ) {
    this.rescale();
  }

  scale(x: number) {
    return this.factor * x + this.offset;
  }

  // copy() {
  //   return new Scale(this.domain, this.range);
  // }

  // invert() {
  //   if (!this.inverted) {
  //     this.inverted = new Scale(this.range, this.domain);
  //   }
  //   return this.inverted;
  // }

  getFactor() {
    return this.factor;
  }

  getTicks(count: number, extended: boolean) {
    return getDecimalTicks(count, this.domain, extended);
  }

  setDomain(domain: NumberRange) {
    if (arrayIsEqual(this.domain, domain)) {
      return;
    }
    this.domain = domain;
    this.rescale();
  }
  getDomain() {
    return this.domain;
  }

  setRange(range: NumberRange) {
    if (arrayIsEqual(this.range, range)) {
      return;
    }
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

  isExtendableOnly() {
    return this.extendableOnly;
  }
  setExtendableOnly(extendableOnly: boolean) {
    this.extendableOnly = extendableOnly;
  }

  private rescale() {
    const {domain, range} = this;
    this.factor = (range[1] - range[0]) / (domain[1] - domain[0]);
    this.offset = range[1] - domain[1] * this.factor;
    // this.inverted = null;
  }
}

export function arrayIsEqual<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>
): boolean {
  return (
    a === b ||
    a.length === b.length &&
    a.every((item, index) => item === b[index])
  );
}

export function getDecimalTicks(
  count: number,
  domain: NumberRange,
  extended: boolean
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
