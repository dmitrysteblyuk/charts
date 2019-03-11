import {Axis} from '../axis';
import {renderOne, renderAll} from '../select';

export class Chart {
  constructor(
    private axes: Axis[],
    private grids = [],
    private series = []
  ) {

  }

  readonly render = (context: Element) => {
    const gridContainer = renderOne(context, 0, 'g');
    const axisContainer = renderOne(context, 1, 'g');
    const seriesContainer = renderOne(context, 2, 'g');

    renderAll(axisContainer, this.axes, 'g', (element: SVGGElement, axis) => {
      axis.render(element);
    });

    renderAll(gridContainer, this.grids, 'g', (element, grid) => {

    });

    renderAll(seriesContainer, this.series, 'g', (element, series) => {

    });
  };
}
