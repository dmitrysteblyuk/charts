import {LinearScale} from '../lib/linear-scale';
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
    readonly scale: LinearScale
  ) {}

  private transform: string | null = null;
  private tickCount = 5;
  private tickPadding = 5;
  private rotateTicks = 0;
  private tickSize = 5;
  private color = '#444';
  private resultWidth = 0;
  private resultHeight = 0;

  setProps(props: {
    transform: string | null
  }) {
    forEach(props, (value, key) => this[key] = value);
  }

  render(container: Selection) {
    const {
      tickSize,
      position,
      scale,
      tickCount,
      color,
      rotateTicks,
      tickPadding,
      transform
    } = this;
    const range = scale.getRange();
    const matrix = axisTransformMatrix[position];

    container.attr('transform', (
      (transform || '') +
      (matrix ? `matrix(${matrix[0]})` : '')
    ) || null);

    const pathAttr = `M${range[0]},${tickSize}V0H${range[1]}V${tickSize}`;
    container.renderOne(0, 'path')
      .attr('d', pathAttr)
      .attr('fill', 'none')
      .attr('stroke', color);

    const ticksContainer = container.renderOne(1, 'g');
    const ticksData = scale.getTicks(tickCount, false);
    ticksContainer.renderAll(ticksData, 'g', (selection, tick) => {
      selection.attr('transform', `translate(${scale.scale(tick)})`)
      selection.renderOne(0, 'line')
        .attr('y2', tickSize)
        .attr('stroke', color);

      const textAnchor = (
        rotateTicks
          ? (position === AxisPosition.top ? 'start' : 'end')
          : null
      );
      selection.renderOne(1, 'text')
        .attr('text-anchor', textAnchor)
        .attr('dy', '1em')
        .attr('y', tickPadding)
        .text(tick);
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
