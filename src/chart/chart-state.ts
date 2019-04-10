import {isArrayEqual, every} from '../lib/utils';
import {easeOutCubic} from '../lib/animation';
import {AnySeries} from '../series';

export type State = Readonly<{
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  hidden: boolean[];
}>;

export function getFinalTransitionState(series: AnySeries[]): State {
  const xDomains = series.map(({xScale}) => xScale.getDomain());
  const xRanges = series.map(({xScale}) => xScale.getRange());
  const yDomains = series.map(({yScale}) => yScale.getDomain());
  const yRanges = series.map(({yScale}) => yScale.getRange());
  const hidden = series.map((item) => item.isHidden());

  return {
    xDomains,
    xRanges,
    yDomains,
    yRanges,
    hidden
  };
}

export function isStateEqual(a: State, b: State) {
  return every(a, (value, key) => isArrayEqual(value as any[], b[key]));
}

export function shouldTransition(a: State, b: State) {
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
      : b.yDomains.map((domain, domainIndex) => domain.map((y, index) => {
        const y0 = a.yDomains[domainIndex][index];
        return y0 + easeOutCubic(progress) * (y - y0);
      }))
  );
  return {
    ...a,
    yDomains
  };
}
