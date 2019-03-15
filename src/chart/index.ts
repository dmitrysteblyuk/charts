import {Axis, AxisPosition} from '../axis';
import {Selection} from '../lib/selection';
import {forEach, newArray} from '../lib/utils';
import {TimeSeries} from '../time-series';

export class Chart {
  private outerWidth = 0;
  private outerHeight = 0;
  private innerWidth = 0;
  private innerHeight = 0;
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
    forcedPaddings?: (number | undefined)[]
  }) {
    forEach(props, (value, key) => value !== undefined && (this[key] = value));
  }

  render(container: Selection) {
    const chartContainer = container.renderOne('g', 0);
    const gridsContainer = chartContainer.renderOne('g', 0);
    const axesContainer = chartContainer.renderOne('g', 1);
    const seriesContainer = chartContainer.renderOne('g', 2);

    this.renderAxes(axesContainer);
    this.positionContainer(chartContainer);
    this.renderGrids(gridsContainer);

    seriesContainer.renderAll('g', this.series, (selection, series) => {
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

  private renderGrids(gridsContainer: Selection) {
    gridsContainer.renderAll('g', this.grids, (selection, grid) => {
      selection.attr('transform', this.getAxisTransform(grid));
      grid.setProps({
        tickSize: -(grid.isVertical() ? this.innerWidth : this.innerHeight)
      });
      grid.render(selection);
    });
  }

  private renderAxes(axesContainer: Selection) {
    const {outerWidth, outerHeight, forcedPaddings} = this;
    const paddings = newArray(4, (index) => forcedPaddings[index] || 0);
    let innerWidth = outerWidth - paddings[1] - paddings[3];
    let innerHeight = outerHeight - paddings[0] - paddings[2];
    let shouldRerender = false;

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      renderAxis(selection, axis);

      const size = axis.getSize();
      const position = axis.getPosition();
      if (
        forcedPaddings[position] !== undefined ||
        paddings[position] >= size
      ) {
        return;
      }
      paddings[position] = size;
      shouldRerender = true;
    });

    this.paddings = paddings;
    this.innerWidth = innerWidth = outerWidth - paddings[1] - paddings[3];
    this.innerHeight = innerHeight = outerHeight - paddings[0] - paddings[2];

    axesContainer.renderAll('g', this.axes, (selection, axis) => {
      selection.attr('transform', this.getAxisTransform(axis));
      if (!shouldRerender) {
        return;
      }
      renderAxis(selection, axis);
    });

    function renderAxis(selection: Selection, axis: Axis) {
      axis.scale.setRange(
        axis.isVertical() ? [innerHeight, 0] : [0, innerWidth]
      );
      axis.render(selection);
    }
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

  private positionContainer(chartContainer: Selection) {
    chartContainer.attr(
      'transform',
      `translate(${this.paddings[3]}, ${this.paddings[0]})`
    );
  }
}
