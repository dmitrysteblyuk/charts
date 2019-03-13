import {LinearScale} from '../lib/linear-scale';
import {Selection} from '../lib/selection';

const axisMatrixTransform = [
  ['1,0,0,-1,0,0', '1,0,0,-1,0,0'],
  ['0,1,1,0,0,0', '0,1,1,0,0,0'],
  null,
  ['0,1,-1,0,0,0', '0,-1,1,0,0,0']
];

export enum AxisOrient {
  top,
  right,
  bottom,
  left
};

export class Axis {
  constructor (
    private orient: AxisOrient,
    private scale: LinearScale
  ) {}

  private tickCount = 5;
  private tickPadding = 5;
  private rotateTicks = 0;
  private tickSize = 5;
  private color = '#444';

  render(parent: Selection) {
    const {
      tickSize,
      orient,
      scale,
      tickCount,
      color,
      rotateTicks,
      tickPadding
    } = this;
    const range = scale.getRange();
    const matrix = axisMatrixTransform[orient];

    parent.attr('transform', matrix ? `matrix(${matrix[0]})` : null);

    const pathAttr = `M${range[0]},${tickSize}V0H${range[1]}V${tickSize}`;
    parent.renderOne(0, 'path')
      .attr('d', pathAttr)
      .attr('fill', 'none')
      .attr('stroke', color);

    const ticksContainer = parent.renderOne(1, 'g');
    const ticksData = scale.getTicks(tickCount, false);
    ticksContainer.renderAll(ticksData, 'g', (selection, tick, isNew) => {
      selection.attr('transform', `translate(${scale.scale(tick)})`)
      selection.renderOne(0, 'line')
        .attr('y2', tickSize)
        .attr('stroke', color);

      const textAnchor = (
        rotateTicks
          ? (orient === AxisOrient.top ? 'start' : 'end')
          : null
      );
      selection.renderOne(1, 'text')
        .attr('text-anchor', textAnchor)
        .attr('dy', '1em')
        .attr('y', tickPadding)
        .text(tick);
    });
  }
}
