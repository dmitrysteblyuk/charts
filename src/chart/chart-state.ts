import {isArrayEqual, every, map} from '../lib/utils';
import {easeOutCubic} from '../lib/animation';
import {AnySeries, getSeriesData} from '../series';

export type State = Readonly<{
  series: AnySeries[];
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  visibility: number[];
  yData: MultipleData[];
  ownYData: NumericData[];
}>;

export const enum TransitionReason {
  YDomainChange,
  StackChange
};

export function getFinalTransitionState(series: AnySeries[]): State {
  const xDomains = series.map(({xScale}) => xScale.getDomain());
  const xRanges = series.map(({xScale}) => xScale.getRange());
  const yDomains = series.map(({yScale}) => yScale.getDomain());
  const yRanges = series.map(({yScale}) => yScale.getRange());
  const visibility = series.map((item) => item.isHidden() ? 0 : 1);
  const yData = series.map((item) => item.getYData());
  const ownYData = yData.map(([data]) => data);

  return {
    series,
    xDomains,
    xRanges,
    yDomains,
    yRanges,
    visibility,
    yData,
    ownYData
  };
}

export function isStateEqual(from: State, to: State) {
  return every(from, (items: any[], key) => {
    return key === 'yData' || isArrayEqual(items, to[key]);
  });
}

export function getTransitionReason(from: State, to: State) {
  if (
    from.visibility.some((visibility, index) => (
      visibility !== to.visibility[index] && from.series[index].stacked
    ))
  ) {
    return TransitionReason.StackChange;
  }

  if (!isArrayEqual(from.yDomains, to.yDomains)) {
    return TransitionReason.YDomainChange;
  }
  return -1;
}

export function getIntermediateStateFactory(
  getStackedData: (a: NumericData, b: NumericData) => NumericData
) {
  return getIntermediateState;

  function getIntermediateState(
    from: State,
    to: State,
    progress: number,
    reason: TransitionReason
  ): State {
    let {yDomains, yData, visibility} = from;
    const eased = easeOutCubic(progress);

    if (reason === TransitionReason.StackChange) {
      visibility = visibility.map((v0, index) => {
        const v1 = to.visibility[index]
        return v0 + (v1 - v0) * eased;
      });

      yData = getSeriesData(from.series, getStackedData, (_, index) => {
        const data = from.ownYData[index];
        const toShow = to.visibility[index];

        if (toShow === from.visibility[index]) {
          return toShow ? data : null;
        }
        return map(data, (value) => value * visibility[index]);
      });
    }

    if (
      reason === TransitionReason.StackChange ||
      reason === TransitionReason.YDomainChange
    ) {
      yDomains = yDomains.map((domain, domainIndex) => {
        return domain.map((y0, index) => {
          const y1 = to.yDomains[domainIndex][index];
          return y0 + (y1 - y0) * eased;
        });
      });
    }

    return {
      ...from,
      visibility,
      yData,
      yDomains
    };
  }
}
