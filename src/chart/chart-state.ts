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
  focusFactors: number[];
}>;

type TransitionTriggersMutable = Partial<{
  yDomainChange: boolean,
  xDomainChange: boolean,
  stackChange: boolean,
  pieChange: boolean,
  visibilityChange: boolean,
  focusChange: boolean
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
  const focusFactors = series.map(({getFocused}) => +getFocused());

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
    byYScale,
    focusFactors
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

  if (!isArrayEqual(from.focusFactors, to.focusFactors)) {
    triggers.focusChange = isChanged = true;
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

    if (triggers.focusChange) {
      next.focusFactors = transitionValues(
        from.focusFactors,
        to.focusFactors,
        eased
      );
    }

    if (triggers.visibilityChange) {
      next.visibilities = transitionValues(
        from.visibilities,
        to.visibilities,
        eased
      );
    }

    if (triggers.xDomainChange) {
      next.xDomains = transitionDomains(from.xDomains, to.xDomains);
    }

    if (triggers.yDomainChange) {
      next.yDomains = transitionDomains(from.yDomains, to.yDomains);
    }

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

    function transitionValues(
      fromValues: number[],
      toValues: number[],
      factor: number
    ) {
      return fromValues.map(
        (v0, index) => v0 + (toValues[index] - v0) * factor
      );
    }

    function transitionDomains(
      fromDomains: NumberRange[],
      toDomains: NumberRange[]
    ) {
      return fromDomains.map((domain, domainIndex) => {
        const toDomain = toDomains[domainIndex];
        if (domain === toDomain) {
          return domain;
        }
        return domain.map((y0, index) => {
          return y0 + (toDomain[index] - y0) * eased;
        });
      });
    }
  }
}
