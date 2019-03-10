import * as d3 from 'd3';

export enum AxisOrient {
  top,
  right,
  bottom,
  left
};

export class Axis<
  D extends d3.AxisDomain = d3.AxisDomain,
  S extends d3.AxisScale<any> = d3.AxisScale<D>
> {
  private axis: d3.Axis<D>;

  constructor (
    orient: AxisOrient,
    scale: S
  ) {
    const axisMethod = (
      orient === AxisOrient.bottom ? d3.axisBottom
        : orient === AxisOrient.top ? d3.axisTop
        : orient === AxisOrient.left ? d3.axisLeft
        : orient === AxisOrient.right ? d3.axisRight
        : (() => { throw new Error(`Invaid orient: "${orient}".`); })()
    );
    this.axis = axisMethod(scale);
  }

  readonly render = (
    selection: d3.Selection<SVGGElement, any, d3.BaseType, any> | SVGGElement
  ) => {
    if (selection instanceof Element) {
      selection = d3.select(selection);
    }
    return selection.call(this.axis);
  };
}
