import {isArrayEqual, every} from '../lib/utils';
import {easeOutCubic} from '../lib/animation';
import {AnySeries, getSeriesData} from '../series';

export type State = Readonly<{
  series: AnySeries[];
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  visibilities: number[];
  yData: MultipleData[];
  ownYData: NumericData[];
}>;

type TransitionTriggersMutable = Partial<{
  yDomainChange: boolean,
  stackChange: boolean,
  visibilityChange: boolean
}>;
export type TransitionTriggers = Readonly<TransitionTriggersMutable>;

export function getFinalTransitionState(series: AnySeries[]): State {
  const xDomains = series.map(({xScale}) => xScale.getDomain());
  const xRanges = series.map(({xScale}) => xScale.getRange());
  const yDomains = series.map(({yScale}) => yScale.getDomain());
  const yRanges = series.map(({yScale}) => yScale.getRange());
  const visibilities = series.map((item) => +item.toDraw());
  const yData = series.map((item) => item.getYData());
  const ownYData = yData.map(([data]) => data);

  const state = {
    series,
    xDomains,
    xRanges,
    yDomains,
    yRanges,
    visibilities,
    yData,
    ownYData
  };
  return state;
}

const skipChecks = {yData: true} as Dictionary<boolean, keyof State>;
export function isStateEqual(from: State, to: State) {
  return every(from, (items: any[], key) => {
    return skipChecks[key] || isArrayEqual(items, to[key]);
  });
}

export function getTransitionTriggers(
  from: State,
  to: State
): TransitionTriggers | null {
  const triggers: TransitionTriggersMutable = {};
  let isChanged = false;
  let stackChange: boolean | undefined;

  if (
    from.visibilities.some((visibilities, index) => (
      visibilities !== to.visibilities[index] && (
        !from.series[index].stacked ||
        (stackChange = true)
      )
    ))
  ) {
    triggers.visibilityChange = isChanged = true;
    triggers.stackChange = stackChange;
  }

  if (!isArrayEqual(from.yDomains, to.yDomains)) {
    triggers.yDomainChange = isChanged = true;
  }

  if (isChanged) {
    return triggers;
  }
  return null;
}

export function getIntermediateStateFactory(
  getStackedData: (a: NumericData, b: NumericData) => NumericData,
  getPercentageData: (...stackedData: NumericData[]) => NumericData[]
) {
  return getIntermediateState;

  function getIntermediateState(
    from: State,
    to: State,
    progress: number,
    triggers: TransitionTriggers
  ): State {
    let {yDomains, yData, visibilities} = from;
    const eased = easeOutCubic(progress);

    if (triggers.visibilityChange) {
      visibilities = visibilities.map((v0, index) => {
        const v1 = to.visibilities[index]
        return v0 + (v1 - v0) * eased;
      });
    }

    if (triggers.stackChange) {
      yData = getSeriesData(
        from.series,
        getStackedData,
        getPercentageData,
        (_, index) => {
          const data = from.ownYData[index];
          const toShow = to.visibilities[index];

          if (toShow === from.visibilities[index]) {
            return toShow ? data : null;
          }
          return data.map((value) => value * visibilities[index]);
        }
      );
    }

    if (triggers.yDomainChange) {
      yDomains = yDomains.map((domain, domainIndex) => {
        return domain.map((y0, index) => {
          const y1 = to.yDomains[domainIndex][index];
          return y0 + (y1 - y0) * eased;
        });
      });
    }

    return {
      ...from,
      visibilities,
      yData,
      yDomains
    };
  }
}
