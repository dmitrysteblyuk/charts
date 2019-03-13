import * as d3 from 'd3';
import {Chart} from '../chart';
import {Axis, AxisOrient} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/forEach';

export class TimeChart {
  readonly timeScale = d3.scaleTime();
  readonly helperTimeScale = d3.scaleTime();
  readonly valueScale = d3.scaleLinear();
  readonly helperValueScale = d3.scaleLinear();
  readonly brush = new Brush();

  readonly mainChart = new Chart(
    [
      new Axis(AxisOrient.bottom, this.timeScale),
      new Axis(AxisOrient.left, this.valueScale)
    ]
  );
  readonly helperChart = new Chart(
    [
      new Axis(AxisOrient.bottom, this.helperTimeScale)
    ]
  );

  private isBrushing = false;
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
      const brushExtent = (
        this.isBrushing
          ? {width, left: brushLeft, right: brushRight}
          : this.getBrushExtentFromTimeScale()
      );

      this.brush.setProps({
        width,
        height: helperHeight,
        ...brushExtent
      });
      this.brush.render(selection, isNew);

      if (!isNew) {
        return;
      }

      this.brush.activeEvent.on((isActive) => {
        this.isBrushing = isActive;
      });

      this.brush.changeEvent.on(({left, right}) => {
        this.brushLeft = left;
        this.brushRight = right;
        this.setBrushExtentToTimeScale(left, right);

        this.render(parent);
      });
    });
  }

  setBrushExtentToTimeScale(left: number, right: number) {
    if (!(left < right)) {
      return;
    }
    if (this.brush.isCleared()) {
      this.timeScale.domain(this.helperTimeScale.domain());
      return;
    }

    const [minDate, maxDate] = this.helperTimeScale.domain().map(Number);
    const [minX, maxX] = this.helperTimeScale.range();
    const width = maxX - minX;
    const dateSpan = maxDate - minDate;

    const startDate = minDate + dateSpan * left / width;
    const endDate = minDate + dateSpan * right / width;

    this.timeScale.domain([new Date(startDate), new Date(endDate)]);
  }

  getBrushExtentFromTimeScale() {
    const [startDate, endDate] = this.timeScale.domain().map(Number);
    const [minDate, maxDate] = this.helperTimeScale.domain().map(Number);
    const [minX, maxX] = this.helperTimeScale.range();
    const width = maxX - minX;
    const dateSpan = maxDate - minDate;

    if (!(dateSpan > 0)) {
      return {width, left: 0, right: 0};
    }

    const left = Math.max(0, Math.min(
      Math.round(width * (startDate - minDate) / dateSpan),
      width
    ));
    const right = Math.max(left, Math.min(
      Math.round(width * (endDate - minDate) / dateSpan),
      width
    ));

    return {width, left, right};
  }
}
