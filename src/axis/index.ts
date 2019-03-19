import {Scale} from '../lib/scale';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
// import './index.css';

const axisTransformMatrix = [
  ['1,0,0,-1,0,0', '1,0,0,-1,0,0'],
  ['0,1,1,0,0,0', '0,1,1,0,0,0'],
  null,
  ['0,1,-1,0,0,0', '0,-1,1,0,0,0']
];

export const enum AxisPosition {top, right, bottom, left};

export class Axis {
  private readonly transitionScale = new Scale();
  private readonly transitioningTicks: Selection[] = [];

  private displayLabels = true;
  private displayLines = true;
  private displayScale = true;
  private tickCount = 5;
  private tickPadding = 5;
  private tickSize = 5;
  private color = '#444';
  private tickFormat: (tick: number) => string = String;
  private animated = true;

  constructor (
    private position: AxisPosition,
    readonly scale: Scale
  ) {}

  setProps(props: {
    tickSize?: number,
    color?: string,
    displayLabels?: boolean,
    displayLines?: boolean,
    displayScale?: boolean,
    animated?: boolean,
    tickFormat?: (value: number) => string
  }): this {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
    return this;
  }

  render(container: Selection) {
    const {tickSize, position, scale, color, displayScale} = this;
    const range = scale.getRange();
    const matrix = axisTransformMatrix[position];

    const axisContainer = container.renderOne('g', 0);
    axisContainer.attr('transform', matrix ? `matrix(${matrix[0]})` : null);

    axisContainer.renderOne('path', 'axisScale', (selection) => {
      const pathAttr = `M${range[0]},${tickSize}V0H${range[1]}V${tickSize}`;
      selection
        .attr('d', pathAttr)
        .attr('fill', 'none')
        .attr('stroke', color);
    }, !displayScale);

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
      tickSize,
      tickFormat,
      animated,
      transitioningTicks
    } = this;
    const range = scale.getRange();

    const {changes, previous} = axisContainer.getDataChanges({
      domain: scale.getDomain(),
      range,
      tickCount,
      tickPadding,
      displayLabels,
      displayLines,
      position,
      color,
      tickSize
    });
    if (!changes) {
      return;
    }

    const {transitionScale} = this;
    const vertical = this.isVertical();
    const fromDomain = previous.domain;
    const matrix = axisTransformMatrix[position];

    transitionScale.setRange(range);
    const ticksContainer = axisContainer.renderOne('g', 'axisTicks');

    if (!changes.domain && !changes.tickCount) {
      ticksContainer.updateAll(updateTick);
    } else {
      const ticksData = scale.getTicks(tickCount, false);
      ticksContainer.renderAll('g', ticksData, updateTick, (
        selection,
        tick,
        removeCallback
      ) => {
        updateTick(selection, tick, undefined, undefined, removeCallback);
      }, String);
    }

    const toFlush = transitioningTicks.length - tickCount * 2;
    if (toFlush > 0) {
      transitioningTicks.splice(0, toFlush).forEach((selection) => {
        selection.flushAttrTransition('transform')
          .flushAttrTransition('style');
      });
    }

    function updateTick(
      tickSelection: Selection,
      tick: number,
      isNew?: boolean,
      _previousTick?: number,
      removeCallback?: () => void
    ) {
      if (!animated && removeCallback) {
        removeCallback();
        return;
      }

      tickSelection.renderOne('line', 'tickLine', (selection) => {
        selection
          .attr('y2', tickSize)
          .attr('stroke', color);
      }, !displayLines);

      tickSelection.renderOne('text', 'tickLabel', (selection) => {
        const textAnchor = (
          position === AxisPosition.left ? 'end'
            : position === AxisPosition.right ? null
            : 'middle'
        );
        const dominantBaseline = (
          position === AxisPosition.top ? null
            : position === AxisPosition.bottom ? 'hanging'
            : 'central'
        );
        const indent = (tickPadding + tickSize) * (
          position === AxisPosition.left ||
          position === AxisPosition.bottom
            ? 1 : -1
        );

        selection
          .attr('transform', matrix ? `matrix(${matrix[1]})` : null)
          .attr('text-anchor', textAnchor)
          .attr('dominant-baseline', dominantBaseline)
          .attr('x', vertical ? -indent : 0)
          .attr('y', vertical ? 0 : indent)
          .text(tickFormat(tick));
      }, !displayLabels);

      const isTransitioning = tickSelection.isTransitioning('transform');
      if (!animated || !fromDomain) {
        if (!isTransitioning) {
          tickSelection.attr('transform', `translate(${scale.scale(tick)})`);
        }
        return;
      }

      if (isNew || removeCallback) {
        // tickSelection.attr('class', isNew ? 'appear' : 'fade');
        tickSelection.attrTransition('style', (progress: number) => {
          const opacity = isNew ? progress : 1 - progress;
          return `opacity: ${opacity}`;
        });
      }

      tickSelection.attrTransition('transform', (progress: number) => {
        switch (progress) {
          case 0:
            if (!isTransitioning) {
              transitioningTicks.push(tickSelection);
            }
            break;
          case 1:
            const index = transitioningTicks.findIndex(
              (selection) => tickSelection.isEqual(selection)
            );
            if (index !== -1) {
              transitioningTicks.splice(index, 1);
            }
            if (removeCallback) {
              removeCallback();
            }
        }

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
