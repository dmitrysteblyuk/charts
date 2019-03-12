import * as d3 from 'd3';
import {Chart} from '../chart';
import {Axis, AxisOrient} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';

interface Props {
  width: number;
  helperHeight: number;
}

export class TimeChart {
  readonly mainTimeScale = d3.scaleTime();
  readonly helperTimeScale = d3.scaleTime();
  readonly mainValueScale = d3.scaleLinear();
  readonly helperValueScale = d3.scaleLinear();
  readonly brush = new Brush();

  readonly mainChart = new Chart(
    [
      new Axis(AxisOrient.bottom, this.mainTimeScale),
      new Axis(AxisOrient.left, this.mainValueScale)
    ]
  );
  readonly helperChart = new Chart(
    [
      new Axis(AxisOrient.bottom, this.helperTimeScale)
    ]
  );

  render(parent: Selection, props: Props) {
    const {width, helperHeight} = props;
    parent.renderOne(0, 'g', (selection) => {
      this.mainChart.render(selection);
    });

    parent.renderOne(1, 'g', (selection) => {
      this.helperChart.render(selection);
    });

    parent.renderOne(2, 'g', (selection, isNew) => {
      this.brush.render(selection, {
        width,
        height: helperHeight,
        left: width / 2,
        right: width * 2 / 3
      }, isNew);
    });
  }
}
