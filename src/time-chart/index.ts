import {Chart} from '../chart';
import {Axis, AxisPosition} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {LinearScale} from '../lib/linear-scale';
import {TimeScale} from '../lib/time-scale';

export class TimeChart {
  readonly timeScale = new TimeScale();
  readonly helperTimeScale = new TimeScale();
  readonly valueScale = new LinearScale();
  readonly helperValueScale = new LinearScale();
  readonly brush = new Brush();

  readonly mainChart = new Chart(
    [
      new Axis(AxisPosition.bottom, this.timeScale),
      new Axis(AxisPosition.left, this.valueScale)
    ]
  );
  readonly helperChart = new Chart(
    [
      new Axis(AxisPosition.bottom, this.helperTimeScale)
    ]
  );
  private isBrushing = false;
  private brushLeft = 0;
  private brushRight = 0;

  private outerWidth = 0;
  private outerHeight = 0;
  private helperHeight = 0;

  setProps(props: {
    outerWidth: number,
    outerHeight: number,
    helperHeight: number
  }) {
    forEach(props, (value, key) => this[key] = value);
  }

  render(container: Selection) {
    const {
      outerWidth,
      outerHeight,
      helperHeight,
      brushLeft,
      brushRight
    } = this;

    container.renderOne(0, 'g', (selection) => {
      this.mainChart.setProps({
        outerWidth,
        outerHeight: outerHeight - helperHeight,
        transform: null
      });
      this.mainChart.render(selection);
    });

    const helperContainer = container.renderOne(1, 'g', (selection) => {
      this.helperChart.setProps({
        outerWidth,
        outerHeight: helperHeight,
        transform: `translate(0,${outerHeight - helperHeight})`,
        forcedPaddings: [, , , this.mainChart.getPaddings()[3]]
      });
      this.helperChart.render(selection);
    });

    helperContainer.renderOne(3, 'g', (selection, isNew) => {
      const brushWidth = this.helperChart.getInnerWidth();
      const brushHeight = this.helperChart.getInnerHeight();
      const brushExtent = (
        this.isBrushing
          ? {width: brushWidth, left: brushLeft, right: brushRight}
          : this.getBrushExtentFromTimeScale()
      );

      this.brush.setProps({
        width: brushWidth,
        height: brushHeight,
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
        this.render(container);
      });
    });
  }

  private setBrushExtentToTimeScale(left: number, right: number) {
    if (!(left < right)) {
      return;
    }
    if (this.brush.isCleared()) {
      this.timeScale.setDomain(this.helperTimeScale.getDomain());
      return;
    }

    const [minDate, maxDate] = this.helperTimeScale.getDomain();
    const width = this.helperChart.getInnerWidth();
    const dateSpan = maxDate - minDate;

    const startDate = minDate + dateSpan * left / width;
    const endDate = minDate + dateSpan * right / width;

    this.timeScale.setDomain([startDate, endDate]);
  }

  private getBrushExtentFromTimeScale() {
    const [startDate, endDate] = this.timeScale.getDomain();
    const [minDate, maxDate] = this.helperTimeScale.getDomain();
    const width = this.helperChart.getInnerWidth();
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
