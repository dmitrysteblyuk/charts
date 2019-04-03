import {Scale} from '../lib/scale';
import {ChartScale} from '../chart/chart-scale';
import {
  Selection,
  DEFAULT_ANIMATION_DURATION,
  DataType
} from '../lib/selection';
import './index.css';
import {dateUnits} from '../lib/time-scale-ticks';

const axisTransformMatrix = [
  ['1,0,0,-1,0,0', '1,0,0,-1,0,0'],
  ['0,1,1,0,0,0', '0,1,1,0,0,0'],
  undefined,
  ['0,1,-1,0,0,0', '0,-1,1,0,0,0']
];

export const enum AxisPosition {top, right, bottom, left};

export class Axis {
  displayLabels = true;
  displayGrid = true;
  displayScale = true;
  tickCount = 5;
  tickPadding = 10;
  gridSize = 0;
  color = '#777';
  gridColor = '#ddd';
  tickFormat: (tick: number) => string | number = String;
  animated = false;
  enableTransitions = true;
  hideOverlappingTicks = false;
  outsideSize = 0;
  tickPrecedence: (a: number, b: number) => number = () => 0;
  tickData: NumberRange | null = null;

  private readonly transitionScale = new Scale();
  private readonly transitioningTicks: Selection[] = [];

  constructor (
    private position: AxisPosition,
    readonly scale: ChartScale
  ) {}

  getOutsideSize() {
    return this.outsideSize;
  }

  render(container: Selection) {
    const {
      position,
      scale,
      gridColor,
      displayScale,
      hideOverlappingTicks
    } = this;
    const range = scale.getRange();
    const matrix = axisTransformMatrix[position];

    const axisContainer = container.renderOne('g', 0);
    axisContainer.attr('transform', matrix && `matrix(${matrix[0]})`);

    axisContainer.renderOne('path', 'axisScale', (selection) => {
      const pathAttr = `M${range[0]},0H${range[1]}`;
      selection.attr({
        'd': pathAttr,
        'fill': 'none',
        'stroke': gridColor
      });
    }, hideOverlappingTicks || !displayScale);

    this.renderTicks(axisContainer);
  }

  isVertical() {
    return (
      this.position === AxisPosition.left ||
      this.position === AxisPosition.right
    );
  }

  getPosition() {
    return this.position;
  }

  private renderTicks(axisContainer: Selection) {
    const {
      scale,
      tickCount,
      tickPadding,
      displayLabels,
      position,
      color,
      gridColor,
      gridSize,
      tickFormat,
      animated,
      enableTransitions,
      transitioningTicks,
      displayGrid
    } = this;
    const range = scale.getRange();
    const {transitionScale, hideOverlappingTicks} = this;
    const vertical = this.isVertical();
    const matrix = axisTransformMatrix[position];
    const shouldAnimate = !hideOverlappingTicks && animated;

    const currentDomain = scale.getDomain();
    const fromDomain = axisContainer.getPreviousData({
      domain: currentDomain
    }).domain as NumberRange;
    const useTransitions = fromDomain && shouldAnimate && enableTransitions;
    const checkTicksForOverlapping = Boolean(
      (
        axisContainer.getDataChanges({range: scale.getRange()}) ||
        currentDomain !== fromDomain
      ) &&
      hideOverlappingTicks &&
      displayLabels
    );

    transitionScale.setRange(range);

    if (!this.tickData || checkTicksForOverlapping) {
      this.tickData = scale.getTicks(tickCount);
    }
    const ticksContainer = axisContainer.renderOne('g', 'axisTicks');

    ticksContainer.renderAll('g', this.tickData, (tickSelection, tick) => {
      tickSelection.renderOne('line', 'tickGrid', (selection) => {
        selection.attr({
          'y2': -gridSize,
          'stroke': gridColor
        });
      }, hideOverlappingTicks || !displayGrid);

      tickSelection.renderOne('text', 'tickLabel', (selection) => {
        const textAnchor = (
          position === AxisPosition.left ? 'start'
            : position === AxisPosition.right ? 'end'
            : 'middle'
        );
        const dominantBaseline = (
          position === AxisPosition.top ? undefined
            : position === AxisPosition.bottom ? 'hanging'
            : 'text-after-edge'
        );
        const indent = tickPadding * (
          position === AxisPosition.left ||
          position === AxisPosition.bottom
            ? 1 : -1
        );

        selection.text(tickFormat(tick)).attr({
          'font-family': 'monospace',
          'fill': color,
          'font-size': '12px',
          'transform': matrix && `matrix(${matrix[1]})`,
          'text-anchor': textAnchor,
          'dominant-baseline': dominantBaseline,
          'x': vertical ? indent : 0,
          'y': vertical ? 0 : indent
        });
      }, !displayLabels);

      if (shouldAnimate && tickSelection.isNew()) {
        tickSelection.attr('class', 'appear');
      }

      if (tickSelection.isAttrTransitioning('transform')) {
        return;
      }
      if (useTransitions) {
        transitionTick(tickSelection, tick);
        return;
      }
      tickSelection.attr('transform', `translate(${
        Math.round(scale.scale(tick))
      })`);
    }, (tickSelection, tick, removeCallback) => {
      if (!shouldAnimate) {
        removeCallback();
        return;
      }
      tickSelection.attr('class', 'fade');
      if (!useTransitions) {
        setTimeout(removeCallback, DEFAULT_ANIMATION_DURATION);
        return;
      }
      transitionTick(tickSelection, tick, removeCallback);
    }, String);

    if (useTransitions) {
      const toFlush = transitioningTicks.length - tickCount * 2;
      if (toFlush > 0) {
        transitioningTicks.splice(0, toFlush).forEach((selection) => {
          selection.flushAttrTransition('transform');
        });
      }
    }

    if (!checkTicksForOverlapping) {
      return;
    }

    const visibleRects: Rect[] = [];
    const nextTickData: number[] = [];
    const tickSpace = vertical ? 0 : 10;
    let lastVisibleSelection: Selection;
    let isSomeRemoved: boolean | undefined;

    ticksContainer.updateAll((selection, tick: number) => {
      const labelSelection = selection.selectOne('tickLabel');
      if (!labelSelection) {
        return;
      }
      const rect = labelSelection.getRoundedRect();
      const previousRect = (
        visibleRects.length &&
        visibleRects[visibleRects.length - 1]
      );

      if (previousRect && doRectsOverlap(rect, previousRect, tickSpace)) {
        isSomeRemoved = true;
        const precedence = this.tickPrecedence(
          tick,
          nextTickData[nextTickData.length - 1]
        );

        if (!(precedence > 0)) {
          selection.destroy();
          return;
        }

        visibleRects.pop();
        nextTickData.pop();
        lastVisibleSelection.destroy();
      }

      visibleRects.push(rect);
      nextTickData.push(tick);
      lastVisibleSelection = selection;
    });

    if (vertical) {
      this.outsideSize = 0;
    } else {
      const maxTickSize = visibleRects.reduce((maxSize, rect) => {
        return Math.max(maxSize, vertical ? rect.width : rect.height);
      }, 0);
      this.outsideSize = maxTickSize + tickPadding;
    }

    if (!isSomeRemoved) {
      return;
    }
    this.tickData = nextTickData;

    ticksContainer.getDataChanges({
      children: nextTickData
    }, DataType.attributes);

    function transitionTick(
      tickSelection: Selection,
      tick: number,
      removeCallback?: () => void
    ) {
      tickSelection.attrTransition('transform', (progress: number) => {
        switch (progress) {
          case 0:
            transitioningTicks.push(tickSelection);
            break;
          case 1:
            const index = transitioningTicks.findIndex(
              (selection) => selection.isSame(selection)
            );
            if (index !== -1) {
              transitioningTicks.splice(index, 1);
            }
            if (removeCallback) {
              removeCallback();
            }
        }

        // if (tickSelection.isNew() || removeCallback) {
        //   const opacity = tickSelection.isNew() ? progress : 1 - progress;
        //   tickSelection.attr('style', `opacity: ${opacity}`);
        // }

        const domain = scale.getDomain();
        transitionScale.setDomain([
          fromDomain[0] + (domain[0] - fromDomain[0]) * progress,
          fromDomain[1] + (domain[1] - fromDomain[1]) * progress
        ]);
        return `translate(${
          Math.round(transitionScale.scale(tick))
        })`;
      });
    }
  }
}

export function timePrecedence(a: number, b: number): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  let valueA: number | undefined;
  let valueB: number | undefined;
  const unit = dateUnits.find(({get}) => {
    valueA = get.call(dateA);
    valueB = get.call(dateB);
    return valueA !== 0 || valueB !== 0;
  });

  if (!unit) {
    return 0;
  }
  if (valueA === 0) {
    return 1;
  }
  if (valueB === 0) {
    return -1;
  }
  return 0;
}

function doRectsOverlap(a: Rect, b: Rect, space: number): boolean {
  const ax0 = a.left - space;
  const ax1 = ax0 + a.width + 2 * space;
  const ay0 = a.top - space;
  const ay1 = ay0 + a.height + 2 * space;
  const bx0 = b.left;
  const bx1 = bx0 + b.width;
  const by0 = b.top;
  const by1 = by0 + b.height;
  return ax1 > bx0 && bx1 > ax0 && ay1 > by0 && by1 > ay0;
}
