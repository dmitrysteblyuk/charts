import * as d3 from 'd3';
import {Chart} from '../chart';
import {Axis, AxisOrient} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/forEach';

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

  private width = 0;
  private brushLeft = 0;
  private brushRight = 0;
  private helperHeight = 0;

  setProps(props: {
    width: number;
    helperHeight: number;
  }) {
    forEach(props, (value, key) => this[key] = value);
  }

  render(parent: Selection) {
    const {width, helperHeight, brushLeft, brushRight} = this;
    parent.renderOne(0, 'g', (selection) => {
      this.mainChart.render(selection);
    });

    parent.renderOne(1, 'g', (selection) => {
      this.helperChart.render(selection);
    });

    parent.renderOne(2, 'g', (selection, isNew) => {
      this.brush.setProps({
        width,
        height: helperHeight,
        left: brushLeft,
        right: brushRight
      });
      this.brush.render(selection, isNew);

      if (!isNew) {
        return;
      }
      this.brush.changeEvent.on(({left, right}) => {
        this.brushLeft = left;
        this.brushRight = right;
        this.render(parent);
      });
    });
  }
}
