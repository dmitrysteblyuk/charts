import {createScale} from '../lib/scale';
import {getDecimalScaleTicks} from '../lib/decimal-scale-ticks';
import {getTimeScaleTicks} from '../lib/time-scale-ticks';
import {memoizeOne} from '../lib/utils';

export type ChartScale = ReturnType<typeof createChartScale>;

export function createChartScale(
  calculateTicks: (count: number, domain: NumberRange) => {
    ticks: number[],
    startIndex?: number
  }
) {
  const scale = createScale();
  let fixed = false;
  let extendableOnly = false;
  let minDomain: NumberRange = [Infinity, -Infinity];
  const getTicks = memoizeOne(
    (count: number) => calculateTicks(count, scale.getDomain())
  );

  function setDomain(domain: NumberRange) {
    const previousDomain = scale.getDomain();
    scale.setDomain(domain);
    if (previousDomain === scale.getDomain()) {
      return;
    }
    getTicks.clearCache();
  }

  const instance = {
    ...scale,
    getTicks,
    setDomain,
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

export const createValueScale = () => createChartScale(getDecimalScaleTicks);
export const createTimeScale = () => createChartScale(getTimeScaleTicks);

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
