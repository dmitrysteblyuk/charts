import {arrayIsEqual} from './utils';

export class Scale {
  private factor = 1;
  private offset = 0;
  private domain: NumberRange = [0, 1];
  private range: NumberRange = [0, 1]
  private inverted: Scale | undefined;

  scale(x: number) {
    return this.factor * x + this.offset;
  }

  invert() {
    let {inverted} = this;
    if (inverted) {
      return inverted;
    }
    inverted = this.inverted = new Scale();
    inverted.setDomain(this.range);
    inverted.setRange(this.domain);
    return inverted;
  }

  getFactor() {
    return this.factor;
  }

  getOffset() {
    return this.offset;
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

  private rescale() {
    const {domain, range} = this;
    this.factor = (range[1] - range[0]) / (domain[1] - domain[0]);
    this.offset = range[1] - domain[1] * this.factor;
    this.inverted = undefined;
  }
}
