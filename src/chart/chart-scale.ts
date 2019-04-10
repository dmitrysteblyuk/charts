import {createScale} from '../lib/scale';

export type ChartScale = ReturnType<typeof createChartScale>;

export function createChartScale() {
  const scale = createScale();
  let fixed = false;
  let extendableOnly = false;
  let minDomain: NumberRange = [Infinity, -Infinity];

  const instance = {
    ...scale,
    isExtendableOnly: () => extendableOnly,
    getMinDomain: () => minDomain,
    isFixed: () => fixed,
    setFixed: (_: typeof fixed) => (fixed = _, instance),
    setExtendableOnly: (
      (_: typeof extendableOnly) => (extendableOnly = _, instance)
    ),
    setMinDomain: (_: typeof minDomain) => (minDomain = _, instance)
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
