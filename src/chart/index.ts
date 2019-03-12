import {Axis} from '../axis';
import {Selection} from '../lib/selection';

export class Chart {
  constructor(
    private axes: Axis[],
    private grids = [],
    private series = []
  ) {}

  render(parent: Selection) {
    const gridContainer = parent.renderOne(0, 'g');
    const axisContainer = parent.renderOne(1, 'g');
    const seriesContainer = parent.renderOne(2, 'g');

    axisContainer.renderAll(this.axes, 'g', (selection, axis) => {
      axis.render(selection);
    });

    gridContainer.renderAll(this.grids, 'g', (selection, grid) => {

    });

    seriesContainer.renderAll(this.series, 'g', (selection, series) => {

    });
  }
}
