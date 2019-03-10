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
    const gridContainer = renderOne(0, 'g', context);
    const axisContainer = renderOne<SVGGElement>(1, 'g', context);
    const seriesContainer = renderOne(2, 'g', context);

    renderAll(this.axes, 'g', axisContainer, (
      element: SVGGElement,
      datum
    ) => {
      datum.render(element);
    });

    renderAll(this.grids, 'g', gridContainer, (
      element: SVGGElement,
      datum
    ) => {

    });

    renderAll(this.series, 'g', seriesContainer, (
      element: SVGGElement,
      datum
    ) => {

    });
  };
}
