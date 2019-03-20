import {arrayIsEqual} from './utils';

export class Scale {
  private factor = 1;
  private offset = 0;
  // private inverted: Scale | undefined;

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

  setDomain(domain: NumberRange) {
    if (arrayIsEqual(this.domain, domain)) {
      return false;
    }
    this.domain = domain;
    this.rescale();
    return true;
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

  private rescale() {
    const {domain, range} = this;
    this.factor = (range[1] - range[0]) / (domain[1] - domain[0]);
    this.offset = range[1] - domain[1] * this.factor;
    // this.inverted = undefined;
  }
}
