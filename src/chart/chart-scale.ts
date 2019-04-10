import {getLinearScale, isArrayEqual} from '../lib/utils';

export type ChartScale = Readonly<ReturnType<typeof createChartScale>>;

export function createChartScale() {
  let domain: NumberRange = [0, 1];
  let range: NumberRange = [0, 1]
  let minDomain: NumberRange = [Infinity, -Infinity];
  let fixed = false;
  let extendableOnly = false;
  let scale = getLinearScale(domain, range);

  function setDomain(_domain: NumberRange) {
    if (isArrayEqual(domain, _domain)) {
      return;
    }
    domain = _domain;
  }

  function setRange(_range: NumberRange) {
    if (isArrayEqual(range, _range)) {
      return;
    }
    range = _range;
  }

  return {
    setDomain,
    setRange,
    getScale: () => scale,
    getInvertedScale: () => getLinearScale(range, domain),
    getDomain: () => domain,
    getRange: () => range,
    getMinDomain: () => minDomain,
    isFixed: () => fixed,
    isExtendableOnly: () => extendableOnly,
    setScale: (_: typeof scale) => (scale = _),
    setFixed: (_: typeof fixed) => (fixed = _),
    setMinDomain: (_: typeof minDomain) => (minDomain = _),
    setExtendableOnly: (
      (_: typeof extendableOnly) => (extendableOnly = _)
    )
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
