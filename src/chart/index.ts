import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {forEach, newArray} from '../lib/utils';
import {TimeSeries} from '../time-series';

export class Chart {
  private outerWidth = 0;
  private outerHeight = 0;
  private innerWidth = 0;
  private innerHeight = 0;
  private transform: string | null = null;
  private forcedPaddings: (number | undefined)[] = [];
  private paddings: number[] = [0, 0, 0, 0];

  constructor(
    readonly axes: Axis[],
    readonly grids: Axis[] = [],
    readonly series: TimeSeries[] = []
  ) {}

  setProps(props: {
    outerWidth: number,
    outerHeight: number,
    transform: string | null,
    forcedPaddings?: (number | undefined)[]
  }) {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
  }

  render(container: Selection) {
    const gridContainer = container.renderOne(0, 'g');
    const axisContainer = container.renderOne(1, 'g');
    const seriesContainer = container.renderOne(2, 'g');

    this.renderAxes(axisContainer);
    this.positionContainer(container);
    this.renderGrids(gridContainer);

    seriesContainer.renderAll(this.series, 'g', (selection, series) => {
      series.render(selection);
    });
  }

  getInnerWidth() {
    return this.innerWidth;
  }

  getInnerHeight() {
    return this.innerHeight;
  }

  getPaddings() {
    return this.paddings;
  }

  private renderGrids(gridContainer: Selection) {
    gridContainer.renderAll(this.grids, 'g', (selection, grid) => {
      grid.setProps({
        transform: this.getAxisTransform(grid),
        tickSize: -(grid.isVertical() ? this.innerWidth : this.innerHeight)
      });
      grid.render(selection);
    });
  }

  private renderAxes(axisContainer: Selection) {
    const {outerWidth, outerHeight, forcedPaddings} = this;
    const initialPaddings = newArray(4, (index) => forcedPaddings[index] || 0);
    let paddings = initialPaddings;
    let {innerWidth, innerHeight} = this;
    const numberOfIterations = 2;

    for (let iteration = 0; iteration < numberOfIterations + 1; iteration++) {
      innerWidth = outerWidth - paddings[1] - paddings[3];
      innerHeight = outerHeight - paddings[0] - paddings[2];
      if (iteration === numberOfIterations) {
        break;
      }
      paddings = initialPaddings;
      let shouldRedraw = false;

      axisContainer.renderAll(this.axes, 'g', (selection, axis) => {
        axis.scale.setRange(
          axis.isVertical() ? [innerHeight, 0] : [0, innerWidth]
        );
        axis.setProps({
          transform: this.getAxisTransform(axis, innerWidth, innerHeight)
        });
        axis.render(selection);

        const size = axis.getSize();
        const position = axis.getPosition();
        if (
          forcedPaddings[position] !== undefined ||
          paddings[position] >= size
        ) {
          return;
        }
        paddings[position] = size;
        shouldRedraw = true;
      });

      if (!shouldRedraw) {
        break;
      }
    }

    this.paddings = paddings;
    this.innerWidth = innerWidth;
    this.innerHeight = innerHeight;
  }

  private getAxisTransform(
    axis: Axis,
    horizontalOffset = this.innerWidth,
    verticalOffset = this.innerHeight
  ) {
    const position = axis.getPosition();
    const translate = (
      position === AxisPosition.right ? [horizontalOffset, 0]
        : position === AxisPosition.bottom ? [0, verticalOffset]
        : null
    );
    return translate && `translate(${translate})`;
  }

  private positionContainer(container: Selection) {
    const {paddings} = this;
    container.attr('transform', (
      `${(this.transform || '')}translate(${paddings[3]}, ${paddings[0]})`
    ));
  }
}
