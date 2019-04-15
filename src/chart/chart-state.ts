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
  xScaleFixed: boolean[];
  xDomains: NumberRange[];
  yDomains: NumberRange[];
  xRanges: NumberRange[];
  yRanges: NumberRange[];
  visibilities: number[];
  displayed: number[];
  yData: MultipleData[];
  ownYData: NumericData[];
  byXScale: ItemGroup<AnySeries, ChartScale>[];
  byYScale: ItemGroup<AnySeries, ChartScale>[];
  focusFactors: number[];
  scaleY: (((y: number) => number) | null)[];
  themes: Theme[];
}>;

type TransitionTriggersMutable = Partial<{
  yDomainChange: boolean,
  xDomainChange: boolean,
  xScaleFixedChange: boolean,
  displayChange: boolean,
  stackChange: boolean,
  pieChange: boolean,
  visibilityChange: boolean,
  focusChange: boolean
}>;
export type TransitionTriggers = Readonly<TransitionTriggersMutable>;

export function getFinalTransitionState(
  series: AnySeries[],
  themes: Theme[]
): State {
  const byXScale = groupBy(series, ({xScale}) => xScale);
  const byYScale = groupBy(series, ({yScale}) => yScale);

  const xScaleFixed = byXScale.map(({key}) => key.isFixed());
  const xDomains = byXScale.map(({key}) => key.getDomain());
  const xRanges = byXScale.map(({key}) => key.getRange());
  const yDomains = byYScale.map(({key}) => key.getDomain());
  const yRanges = byYScale.map(({key}) => key.getRange());

  const visibilities = series.map(({toDraw}) => +toDraw());
  const displayed = series.map(({isDisplayed}) => +isDisplayed());
  const yData = series.map(({getYData}) => getYData());
  const ownYData = yData.map(([data]) => data);
  const focusFactors = series.map(({getFocused}) => +getFocused());
  const scaleY = series.map(({yScale}) => yScale.getScale());

  const state = {
    xScaleFixed,
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
    focusFactors,
    scaleY,
    themes
  };
  return state;
}

const skipEqualityChecks = {
  series: true,
  yData: true,
  scaleY: true,
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
  refillPreviousState(from.visibilities, to.visibilities, 0);
  refillPreviousState(from.displayed, to.displayed, 0);
  refillPreviousState(from.focusFactors, to.focusFactors, 0);

  if (
    to.visibilities.some((visibilities, index) => (
      visibilities !== from.visibilities[index] && (
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

  const displayChange = !isArrayEqual(from.displayed, to.displayed);
  if (
    from.xDomains.some((xDomains, index) => (
      xDomains !== to.xDomains[index] && (
        to.byXScale[index].items.some(
          ({pie, toDraw}) => pie && toDraw()
        ) && (
          triggers.pieChange = true
        ) ||
        displayChange ||
        to.xScaleFixed[index] !== from.xScaleFixed[index] && (
          triggers.xScaleFixedChange = true
        )
      )
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
    triggers.displayChange = displayChange;
    return triggers;
  }
  return null;

  function refillPreviousState<T>(
    fromArray: T[],
    {length}: T[],
    defaultValue: T
  ) {
    while (fromArray.length < length) {
      fromArray.push(defaultValue);
    }
  }
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
      next.displayed = transitionValues(
        from.displayed,
        to.displayed,
        eased
      );
    }

    if (triggers.xDomainChange) {
      next.xDomains = transitionDomains(from.xDomains, to.xDomains);
    } else {
      next.xDomains = to.xDomains;
    }

    if (triggers.yDomainChange) {
      next.yDomains = transitionDomains(from.yDomains, to.yDomains);
    }

    next.scaleY = to.scaleY.map((toScaleY, index) => {
      if (to.displayed[index] === from.displayed[index]) {
        return null;
      }
      return !to.displayed[index] ? from.scaleY[index] : toScaleY;
    });

    if (triggers.stackChange || triggers.pieChange) {
      next.yData = getSeriesData(
        to.series,
        next.visibilities,
        next.displayed,
        getStackedData,
        getPercentageData,
        getXExtent,
        [to.xDomains[0], from.xDomains[0]],
        eased
      );
    } else {
      next.yData = to.yData;
    }

    return next;

    function transitionValues(
      fromValues: number[],
      toValues: number[],
      factor: number
    ) {
      return fromValues.map((v0, index) => {
        return v0 + (toValues[index] - v0) * factor;
      });
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
