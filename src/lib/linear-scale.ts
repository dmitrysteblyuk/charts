export class LinearScale {
  private factor = 1;
  private offset = 0;
  private invertFactor = 1;
  private invertOffset = 0;
  private range: ReadonlyArray<number> = [0, 1];
  private domain: ReadonlyArray<number> = [0, 1];

  scale(x: number) {
    return this.factor * x + this.offset;
  }

  invertScale(x: number) {
    return this.invertFactor * x + this.invertOffset;
  }

  getDomain() {
    return this.domain;
  }

  setDomain(domain: number[]) {
    this.domain = domain;
    this.rescale();
  }

  setRange(range: number[]) {
    this.range = range;
    this.rescale();
  }

  getTicks(count: number, extended: boolean) {
    return getDecimalTicks(count, this.domain, extended);
  }

  private rescale() {
    const {range, domain} = this;
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
  domain: ReadonlyArray<number>,
  extended: boolean
): number[] {
  const step = (domain[1] - domain[0]) / (count - 1);
  if (!(step > 0) || !isFinite(step)) {
    return [];
  }

  const ticks: number[] = [];
  const product = Math.pow(10, Math.floor(Math.log(step) / Math.LN10));
  const roundedStep = Math.max(1, Math.floor(step / product)) * product;
  const startIndex = (extended ? Math.floor : Math.ceil)(
    domain[0] / roundedStep
  );
  const endIndex = (extended ? Math.ceil : Math.floor)(
    domain[1] / roundedStep
  );

  const stepPower = Math.floor(Math.log(roundedStep) / Math.LN10);
  let precision = 1;
  let finalStep = roundedStep;

  if (stepPower < 0) {
    precision = Math.pow(10, -stepPower);
    finalStep *= precision;
  }

  for (let index = startIndex; index <= endIndex; index++) {
    ticks.push(index * finalStep / precision);
  }
  return ticks;
}
