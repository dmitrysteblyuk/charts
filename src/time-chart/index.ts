import {Chart} from '../chart';
import {Axis, AxisPosition} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {Scale} from '../lib/scale';
import {TimeScale} from '../lib/time-scale';
import {LineSeries} from '../series/line-series';
import {SeriesData} from '../lib/series-data';

export class TimeChart {
  readonly timeScale = new TimeScale();
  readonly helperTimeScale = new TimeScale();
  readonly valueScale = new Scale();
  readonly helperValueScale = new Scale();
  readonly brush = new Brush();

  readonly mainChart = new Chart(
    [
      new Axis(AxisPosition.bottom, this.timeScale),
      new Axis(AxisPosition.left, this.valueScale)
    ],
    [
      new Axis(AxisPosition.bottom, this.timeScale),
      new Axis(AxisPosition.left, this.valueScale)
    ]
  );
  readonly helperChart = new Chart(
    [
      new Axis(AxisPosition.top, this.helperTimeScale),
      new Axis(AxisPosition.right, this.helperValueScale)
    ],
    [
      new Axis(AxisPosition.top, this.helperTimeScale),
      new Axis(AxisPosition.right, this.helperValueScale)
    ]
  );
  private isBrushing = false;
  private actionTimerId: number | null = null;
  private brushLeft = 0;
  private brushRight = 0;

  private chartOuterWidth = 0;
  private chartOuterHeight = 0;
  private helperHeight = 0;

  constructor() {
    (
      this.mainChart.grids.concat(this.helperChart.grids)
    ).forEach((grid) => grid.setProps({
      displayLabels: false,
      displayScale: false,
      color: '#aaa'
    }));
  }

  setProps(props: {
    chartOuterWidth: number,
    chartOuterHeight: number,
    helperHeight: number
  }) {
    forEach(props, (value, key) => this[key] = value);
  }

  render(container: Selection) {
    const {
      chartOuterWidth,
      chartOuterHeight,
      helperHeight,
      brushLeft,
      brushRight
    } = this;

    container.renderOne('g', 0, (selection) => {
      this.mainChart.setProps({
        chartOuterWidth,
        chartOuterHeight: chartOuterHeight - helperHeight
      });
      this.mainChart.render(selection);
    });

    const helperContainer = container.renderOne('g', 1, (selection) => {
      selection.attr(
        'transform',
        `translate(0,${chartOuterHeight - helperHeight})`
      );
      this.helperChart.setProps({
        chartOuterWidth,
        chartOuterHeight: helperHeight,
        fixedPaddings: [, , , this.mainChart.getPaddings()[3]]
      });
      this.helperChart.render(selection);
    });

    const helperChartContainer = helperContainer.selectOne(0) as Selection;
    helperChartContainer.renderOne('g', 3, (selection, isNew) => {
      const brushWidth = this.helperChart.getInnerWidth();
      const brushHeight = this.helperChart.getInnerHeight();
      const brushExtent = (
        this.isBrushing && this.brush.getWidth() === brushWidth
          ? {width: brushWidth, left: brushLeft, right: brushRight}
          : this.getBrushExtentFromTimeScale()
      );

      this.brush.setProps({
        height: brushHeight,
        ...brushExtent
      });
      this.brush.render(selection, isNew);

      if (!isNew) {
        return;
      }

      this.brush.activeEvent.on((isActive) => {
        this.isBrushing = isActive;
        if (isActive) {
          return;
        }
        this.setInAction(false, container);
        this.render(container);
      });

      this.brush.changeEvent.on(({left, right}) => {
        this.brushLeft = left;
        this.brushRight = right;
        const reset = this.brush.isReset();
        this.timeScale.setFixed(!reset);
        if (!reset) {
          this.setBrushExtentToTimeScale(left, right);
        }
        this.setInAction(!reset, container, null);
        this.render(container);
      });
    });
  }

  addSeries(data: SeriesData) {
    this.mainChart.series.push(new LineSeries(
      this.timeScale,
      this.valueScale,
      data
    ));

    this.helperChart.series.push(new LineSeries(
      this.helperTimeScale,
      this.helperValueScale,
      data
    ));
  }

  private setBrushExtentToTimeScale(left: number, right: number) {
    if (!(left < right)) {
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

  private setInAction(
    inAction: boolean,
    container: Selection,
    timeout: number | null = 500
  ) {
    if (this.actionTimerId !== null) {
      clearTimeout(this.actionTimerId);
    }

    if (this.mainChart.isInAction() !== inAction) {
      this.mainChart.setProps({inAction});
      this.helperChart.setProps({inAction});

      if (!inAction) {
        this.render(container);
        return;
      }
    }

    if (timeout === null) {
      return;
    }

    this.actionTimerId = setTimeout(() => {
      this.mainChart.setProps({inAction: false});
      this.helperChart.setProps({inAction: false});
      this.render(container);
    }, timeout);
  }
}
