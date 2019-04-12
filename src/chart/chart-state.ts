import {isArrayEqual, every, groupBy, ItemGroup} from '../lib/utils';
import {easeOutCubic} from '../lib/animation';
import {
  XExtentCalculator,
  PercentageDataCalculator,
  StackedDataCalculator,
  getSeriesData
} from './series-data';
import {AnySeries} from '../series';
import {ChartScale} from './chart-scale';

export type State = Readonly<{
  series: AnySeries[];
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  visibilities: number[];
  displayed: boolean[];
  yData: MultipleData[];
  ownYData: NumericData[];
  byXScale: ItemGroup<AnySeries, ChartScale>[];
  byYScale: ItemGroup<AnySeries, ChartScale>[];
}>;

type TransitionTriggersMutable = Partial<{
  yDomainChange: boolean,
  xDomainChange: boolean,
  stackChange: boolean,
  pieChange: boolean,
  visibilityChange: boolean
}>;
export type TransitionTriggers = Readonly<TransitionTriggersMutable>;

export function getFinalTransitionState(series: AnySeries[]): State {
  const byXScale = groupBy(series, ({xScale}) => xScale);
  const byYScale = groupBy(series, ({yScale}) => yScale);

  const xDomains = byXScale.map(({key}) => key.getDomain());
  const xRanges = byXScale.map(({key}) => key.getRange());
  const yDomains = byYScale.map(({key}) => key.getDomain());
  const yRanges = byYScale.map(({key}) => key.getRange());

  const visibilities = series.map(({toDraw}) => +toDraw());
  const displayed = series.map(({isDisplayed}) => isDisplayed());
  const yData = series.map(({getYData}) => getYData());
  const ownYData = yData.map(([data]) => data);

  const state = {
    xDomains,
    xRanges,
    yDomains,
    yRanges,
    visibilities,
    displayed,
    ownYData,
    // skip from equality checks
    series,
    yData,
    byXScale,
    byYScale
  };
  return state;
}

const skipEqualityChecks = {
  series: true,
  yData: true,
  byXScale: true,
  byYScale: true
} as Dictionary<boolean, keyof State>;

export function isStateEqual(from: State, to: State) {
  return every(from, (items: any[], key) => {
    return skipEqualityChecks[key] || isArrayEqual(items, to[key]);
  });
}

export function getTransitionTriggers(
  from: State,
  to: State
): TransitionTriggers | null {
  const triggers: TransitionTriggersMutable = {};
  let isChanged = false;

  if (
    from.visibilities.some((visibilities, index) => (
      visibilities !== to.visibilities[index] && (
        !to.series[index].stacked ||
        (triggers.stackChange = true)
      ) && (
        !to.series[index].pie ||
        (triggers.pieChange = true)
      )
    ))
  ) {
    triggers.visibilityChange = isChanged = true;
  }

  if (
    from.xDomains.some((xDomains, index) => (
      xDomains !== to.xDomains[index] &&
      to.byXScale[index].items.some(({pie}) => pie) &&
      (triggers.pieChange = true)
    ))
  ) {
    triggers.xDomainChange = isChanged = true;
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
  getStackedData: StackedDataCalculator,
  getPercentageData: PercentageDataCalculator,
  getXExtent: XExtentCalculator
) {
  return getIntermediateState;

  function getIntermediateState(
    from: State,
    to: State,
    progress: number,
    triggers: TransitionTriggers
  ): State {
    const next = {...from};
    const eased = easeOutCubic(progress);

    if (triggers.visibilityChange) {
      next.visibilities = from.visibilities.map((v0, index) => {
        const v1 = to.visibilities[index]
        return v0 + (v1 - v0) * eased;
      });
    }

    ([next.xDomains, next.yDomains] = (
      [
        [from.xDomains, to.xDomains, triggers.xDomainChange],
        [from.yDomains, to.yDomains, triggers.yDomainChange]
      ] as [NumberRange[], NumberRange[], boolean][]
    ).map(([fromDomains, toDomains, hasTriggered]) => {
      if (!hasTriggered) {
        return fromDomains;
      }

      return fromDomains.map((domain, domainIndex) => {
        const toDomain = toDomains[domainIndex];
        if (domain === toDomain) {
          return domain;
        }
        return domain.map((y0, index) => {
          return y0 + (toDomain[index] - y0) * eased;
        });
      });
    }));

    if (triggers.stackChange || triggers.pieChange) {
      next.yData = getSeriesData(
        to.series,
        next.visibilities,
        getStackedData,
        getPercentageData,
        getXExtent,
        [to.xDomains[0], from.xDomains[0]],
        eased
      );
    }

    return next;
  }
}
