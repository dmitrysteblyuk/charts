import {getLinearScale, isArrayEqual} from '../lib/utils';

export type ChartScale = Readonly<ReturnType<typeof createScale>>;

export function createScale() {
  let domain: NumberRange = [0, 1];
  let range: NumberRange = [0, 1]
  let minDomain: NumberRange = [Infinity, -Infinity];
  let fixed = false;
  let extendableOnly = false;
  let scale: (x: number) => number;

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

  const instance = {
    setDomain,
    setRange,
    getScale: () => scale,
    getInvertedScale: () => getLinearScale(range, domain),
    getDomain: () => domain,
    getRange: () => range,
    getMinDomain: () => minDomain,
    isFixed: () => fixed,
    isExtendableOnly: () => extendableOnly,
    setFixed: (_: typeof fixed) => (fixed = _, instance),
    setMinDomain: (_: typeof minDomain) => (minDomain = _, instance),
    setExtendableOnly: (
      (_: typeof extendableOnly) => (extendableOnly = _, instance)
    )
  };
  return instance;
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
