import {isArrayEqual} from './utils';

export type Scale = ReturnType<typeof createScale>;

export function createScale() {
  let factor = 1;
  let offset = 0;
  let domain: NumberRange = [0, 1];
  let range: NumberRange = [0, 1]
  let inverted: Scale | undefined;

  function scale(x: number) {
    return factor * x + offset;
  }

  function invert() {
    if (inverted) {
      return inverted;
    }
    inverted = inverted = createScale();
    inverted.setDomain(range);
    inverted.setRange(domain);
    return inverted;
  }

  function setDomain(_domain: NumberRange) {
    if (isArrayEqual(domain, _domain)) {
      return;
    }
    domain = _domain;
    rescale();
  }

  function setRange(_range: NumberRange) {
    if (isArrayEqual(range, _range)) {
      return;
    }
    range = _range;
    rescale();
  }

  function rescale() {
    factor = (range[1] - range[0]) / (domain[1] - domain[0]);
    offset = range[1] - domain[1] * factor;
    inverted = undefined;
  }

  return {
    scale,
    invert,
    setDomain,
    setRange,
    getFactor: () => factor,
    getOffset: () => offset,
    getDomain: () => domain,
    getRange: () => range
  };
}
