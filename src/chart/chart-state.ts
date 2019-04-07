import {ChartScale} from './chart-scale';
import {easeOutCubic, isArrayEqual, every} from '../lib/utils';
import {SeriesData} from '../lib/series-data';

export type State = Readonly<{
  yScales: ChartScale[];
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  seriesData: (SeriesData | null)[]
}>;

export function isStateEqual(a: State, b: State) {
  return every(a, (value, key) => isArrayEqual(value as any[], b[key]));
}

export function isTransitionStateEqual(a: State, b: State) {
  return isArrayEqual(a.yDomains, b.yDomains);
}

export function getIntermediateState(
  a: State,
  b: State,
  progress: number
): State {
  const yDomains = (
    progress === 1
      ? b.yDomains
      : b.yDomains.map((domain, index) => domain.map((y, j) => {
        const y0 = a.yDomains[index][j];
        return y0 + easeOutCubic(progress) * (y - y0);
      }))
  );
  return {
    ...a,
    yDomains
  };
}
