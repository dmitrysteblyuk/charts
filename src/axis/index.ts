import {Scale} from '../lib/scale';
import {ChartScale} from '../chart/chart-scale';
import {
  Selection,
  DEFAULT_ANIMATION_DURATION,
  DataType
} from '../lib/selection';
import {forEach} from '../lib/utils';
import './index.css';

const axisTransformMatrix = [
  ['1,0,0,-1,0,0', '1,0,0,-1,0,0'],
  ['0,1,1,0,0,0', '0,1,1,0,0,0'],
  undefined,
  ['0,1,-1,0,0,0', '0,-1,1,0,0,0']
];

export const enum AxisPosition {top, right, bottom, left};

export class Axis {
  private readonly transitionScale = new Scale();
  private readonly transitioningTicks: Selection[] = [];

  private displayLabels = true;
  private displayGrid = true;
  private displayLines = true;
  private displayScale = true;
  private tickCount = 5;
  private tickPadding = 5;
  private tickSize = 5;
  private gridSize = 0;
  private color = '#444';
  private gridColor = '#aaa';
  private tickFormat: (tick: number) => string = String;
  private animated = false;
  private enableTransitions = true;
  private hideOverlappingTicks = false;
  private outsideSize = 0;

  constructor (
    private position: AxisPosition,
    readonly scale: ChartScale
  ) {}

  setProps(props: Partial<{
    tickSize: number,
    color: string,
    gridColor: string,
    displayLabels: boolean,
    displayLines: boolean,
    displayScale: boolean,
    displayGrid: boolean,
    gridSize: number,
    animated: boolean,
    enableTransitions: boolean,
    hideOverlappingTicks: boolean,
    tickFormat: (value: number) => string
  }>): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  getOutsideSize() {
    return this.outsideSize;
  }

  render(container: Selection) {
    const {
      tickSize,
      position,
      scale,
      color,
      displayScale,
      hideOverlappingTicks
    } = this;
    const range = scale.getRange();
    const matrix = axisTransformMatrix[position];

    const axisContainer = container.renderOne('g', 0);
    axisContainer.attr('transform', matrix && `matrix(${matrix[0]})`);

    axisContainer.renderOne('path', 'axisScale', (selection) => {
      const pathAttr = `M${range[0]},${tickSize}V0H${range[1]}V${tickSize}`;
      selection.attr({
        'd': pathAttr,
        'fill': 'none',
        'stroke': color
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
      displayLines,
      position,
      color,
      gridColor,
      tickSize,
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
    const toAnimate = !hideOverlappingTicks && animated;

    const currentDomain = scale.getDomain();
    const fromDomain = axisContainer.getPreviousData({
      domain: currentDomain
    }).domain as NumberRange;
    const useTransitions = fromDomain && toAnimate && enableTransitions;

    const checkTicksForOverlapping = Boolean(
      (
        axisContainer.getDataChanges({range: scale.getRange()}) ||
        currentDomain !== fromDomain
      ) &&
      hideOverlappingTicks &&
      displayLabels
    );

    transitionScale.setRange(range);

    if (checkTicksForOverlapping) {
      scale.resetTicks();
    }
    const tickData = scale.getTicks(tickCount);
    const ticksContainer = axisContainer.renderOne('g', 'axisTicks');

    ticksContainer.renderAll('g', tickData, (tickSelection, tick) => {
      tickSelection.renderOne('line', 'tickLine', (selection) => {
        selection.attr({
          'y2': tickSize,
          'stroke': color
        });
      }, hideOverlappingTicks || !displayLines);

      tickSelection.renderOne('line', 'tickGrid', (selection) => {
        selection.attr({
          'y2': -gridSize,
          'stroke': gridColor
        });
      }, hideOverlappingTicks || !displayGrid);

      tickSelection.renderOne('text', 'tickLabel', (selection) => {
        const textAnchor = (
          position === AxisPosition.left ? 'end'
            : position === AxisPosition.right ? undefined
            : 'middle'
        );
        const dominantBaseline = (
          position === AxisPosition.top ? undefined
            : position === AxisPosition.bottom ? 'hanging'
            : 'central'
        );
        const indent = (tickPadding + tickSize) * (
          position === AxisPosition.left ||
          position === AxisPosition.bottom
            ? 1 : -1
        );

        selection.text(tickFormat(tick)).attr({
          'transform': matrix && `matrix(${matrix[1]})`,
          'text-anchor': textAnchor,
          'dominant-baseline': dominantBaseline,
          'x': vertical ? -indent : 0,
          'y': vertical ? 0 : indent
        });
      }, !displayLabels);

      if (toAnimate && tickSelection.isNew()) {
        tickSelection.attr('class', 'appear');
      }

      if (tickSelection.isAttrTransitioning('transform')) {
        return;
      }
      if (useTransitions) {
        transitionTick(tickSelection, tick);
        return;
      }
      tickSelection.attr('transform', `translate(${scale.scale(tick)})`);
    }, (tickSelection, tick, removeCallback) => {
      if (!toAnimate) {
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
    const tickSpace = vertical ? 3 : 10;
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
        selection.destroy();
        isSomeRemoved = true;
        return;
      }
      visibleRects.push(rect);
      nextTickData.push(tick);
    });

    const maxTickSize = visibleRects.reduce((maxSize, rect) => {
      return Math.max(maxSize, vertical ? rect.width : rect.height);
    }, 0);
    this.outsideSize = maxTickSize + tickPadding + tickSize;

    if (!isSomeRemoved) {
      return;
    }
    scale.resetTicks(nextTickData, tickCount);
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
        return `translate(${transitionScale.scale(tick)})`;
      });
    }
  }
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
