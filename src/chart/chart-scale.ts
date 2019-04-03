import {Scale} from '../lib/scale';
import {getDecimalScaleTicks} from '../lib/decimal-scale-ticks';
import {getTimeScaleTicks} from '../lib/time-scale-ticks';
import {memoizeOne} from '../lib/utils';

export abstract class ChartScale extends Scale {
  private fixed = false;
  private extendableOnly = false;
  private minDomain: NumberRange = [Infinity, -Infinity];

  setDomain(domain: NumberRange) {
    const previousDomain = this.getDomain();
    super.setDomain(domain);
    if (previousDomain === this.getDomain()) {
      return;
    }
    this.getTicks.clearCache();
  }

  readonly getTicks = memoizeOne(this.calculateTicks, this);

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

  setMinDomain(minDomain: NumberRange) {
    this.minDomain = minDomain;
  }

  getMinDomain() {
    return this.minDomain;
  }

  protected abstract calculateTicks(count: number): NumberRange;
}

export class ValueScale extends ChartScale {
  calculateTicks(count: number) {
    return getDecimalScaleTicks(count, this.getDomain());
  }
}

export class TimeScale extends ChartScale {
  calculateTicks(count: number) {
    return getTimeScaleTicks(count, this.getDomain());
  }
}

export function getExtendedDomain(
  domain: NumberRange,
  [extendMin, extendMax]: NumberRange
): NumberRange {
  let [min, max] = domain;
  let isExtended: boolean | undefined;

  if (min > extendMin) {
    min = extendMin;
    isExtended = true;
  }

  if (max < extendMax) {
    max = extendMax;
    isExtended = true;
  }

  if (!isExtended) {
    return domain;
  }
  return [min, max];
}
