import {getLinearScale, isArrayEqual} from '../lib/utils';

export type ChartScale = Readonly<ReturnType<typeof createScale>>;

export function createScale(initialFixed: boolean) {
  let domain: NumberRange = [0, 1];
  let range: NumberRange = [0, 1];
  let scale: (x: number) => number;
  let fixed = initialFixed;

  resetScale();

  function setDomain(_domain: NumberRange) {
    if (isArrayEqual(domain, _domain)) {
      return;
    }
    domain = _domain;
    resetScale();
  }

  function setRange(_range: NumberRange) {
    if (isArrayEqual(range, _range)) {
      return;
    }
    range = _range;
    resetScale();
  }

  function resetScale() {
    scale = getLinearScale(domain, range);
  }

  return {
    setDomain,
    setRange,
    getScale: () => scale,
    getInvertedScale: () => getLinearScale(range, domain),
    getDomain: () => domain,
    getRange: () => range,
    isFixed: () => fixed,
    setFixed: (_: typeof fixed) => (fixed = _)
  };
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

export function fitDomain(domain: NumberRange, boundaries: NumberRange) {
  const [b0, b1] = boundaries;
  let [x0, x1] = domain;
  if (x0 < b0) {
    x1 += -x0 + (x0 = b0);
  }
  if (x1 > b1) {
    x0 = Math.max(x0 - x1 + (x1 = b1), b0);
  }
  return [x0, x1]
}
