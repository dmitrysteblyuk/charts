import {Scale} from '../lib/scale';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';

const axisTransformMatrix = [
  ['1,0,0,-1,0,0', '1,0,0,-1,0,0'],
  ['0,1,1,0,0,0', '0,1,1,0,0,0'],
  null,
  ['0,1,-1,0,0,0', '0,-1,1,0,0,0']
];

export enum AxisPosition {top, right, bottom, left};

export class Axis {
  constructor (
    private position: AxisPosition,
    readonly scale: Scale
  ) {}

  private displayLabels = true;
  private displayLines = true;
  private displayScale = true;
  private tickCount = 5;
  private tickPadding = 5;
  private tickSize = 5;
  private color = '#444';
  private resultWidth = 0;
  private resultHeight = 0;

  setProps(props: {
    tickSize?: number,
    color?: string,
    displayLabels?: boolean,
    displayLines?: boolean,
    displayScale?: boolean
  }) {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
  }

  render(container: Selection) {
    const {
      tickSize,
      position,
      scale,
      tickCount,
      color,
      tickPadding,
      displayLabels,
      displayLines,
      displayScale
    } = this;
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

    const ticksData = scale.getTicks(tickCount, false);
    const ticksContainer = axisContainer.renderOne('g', 'axisTicks');

    ticksContainer.renderAll('g', ticksData, (tickSelection, tick) => {
      tickSelection.attr('transform', `translate(${scale.scale(tick)})`);

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
          .attr('x', this.isVertical() ? -indent : 0)
          .attr('y', this.isVertical() ? 0 : indent)
          .text(tick);
      }, !displayLabels);
    });

    const {width, height} = container.getRoundedRect();
    this.resultWidth = width;
    this.resultHeight = height;
  }

  isVertical() {
    return (
      this.position === AxisPosition.left ||
      this.position === AxisPosition.right
    );
  }

  getSize() {
    if (this.isVertical()) {
      return this.resultWidth;
    }
    return this.resultHeight;
  }

  getPosition() {
    return this.position;
  }
}
