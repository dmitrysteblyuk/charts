import {Chart} from '../chart';
import {Axis, AxisPosition} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {Scale} from '../lib/scale';
import {TimeScale} from '../lib/time-scale';
import {LineSeries} from '../series/line-series';
import {SeriesData} from '../lib/series-data';
import {onDragEvents} from '../lib/drag';
import {roundRange} from '../lib/utils';

export class TimeChart {
  readonly timeScale = new TimeScale();
  readonly fullTimeScale = new TimeScale();
  readonly valueScale = new Scale();
  readonly fullValueScale = new Scale();
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
      new Axis(AxisPosition.top, this.fullTimeScale),
      new Axis(AxisPosition.right, this.fullValueScale)
    ],
    [
      new Axis(AxisPosition.top, this.fullTimeScale),
      new Axis(AxisPosition.right, this.fullValueScale)
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
      helperHeight
    } = this;

    const mainContainer = container.renderOne('g', 0, (selection) => {
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
      this.renderBrush(selection, isNew, container);
    });

    const mainChartContainer = mainContainer.selectOne(0) as Selection;
    mainChartContainer.renderOne('rect', 3, (selection, isNew) => {
      this.renderRectForDragging(selection, isNew, container);
    });
  }

  addSeries(data: SeriesData) {
    this.mainChart.series.push(new LineSeries(
      this.timeScale,
      this.valueScale,
      data
    ));

    this.helperChart.series.push(new LineSeries(
      this.fullTimeScale,
      this.fullValueScale,
      data
    ));
  }

  private renderRectForDragging(
    rectSelection: Selection,
    isFirstRender: boolean,
    container: Selection
  ) {
    rectSelection
      .attr('width', this.mainChart.getInnerWidth())
      .attr('height', this.mainChart.getInnerHeight());

    if (!isFirstRender) {
      return;
    }

    rectSelection
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', 'transparent');
    this.initializeDragEvents(rectSelection, container);
  }

  private initializeDragEvents(
    rectSelection: Selection,
    container: Selection
  ) {
    onDragEvents(rectSelection, (diffX) => {
      if (diffX === 0) {
        return;
      }

      const width = this.mainChart.getInnerWidth();
      let [startTime, endTime] = this.timeScale.getDomain();
      let [minTime, maxTime] = this.fullTimeScale.getDomain();
      const diffTime = (startTime - endTime) * diffX / width;

      startTime += diffTime;
      endTime += diffTime;

      const fullTimeScaleExtended = (
        minTime > startTime && (minTime = startTime, true) ||
        maxTime < endTime && (maxTime = endTime, true)
      );

      this.timeScale.setFixed(true);
      this.timeScale.setDomain([startTime, endTime]);

      if (fullTimeScaleExtended) {
        this.fullTimeScale.setExtendableOnly(true);
        this.fullTimeScale.setDomain([minTime, maxTime]);
      }
      this.render(container);
    });
  }

  private renderBrush(
    brushContainer: Selection,
    isFirstRender: boolean,
    timeChartContainer: Selection
  ) {
    const {brushLeft, brushRight} = this;
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
    this.brush.render(brushContainer, isFirstRender);

    if (!isFirstRender) {
      return;
    }

    this.brush.activeEvent.on((isActive) => {
      this.isBrushing = isActive;
      if (isActive) {
        return;
      }
      this.setInAction(false, timeChartContainer);
      this.render(timeChartContainer);
    });

    this.brush.changeEvent.on(({left, right}) => {
      this.brushLeft = left;
      this.brushRight = right;
      const reset = this.brush.isReset();
      this.timeScale.setFixed(!reset);

      if (reset) {
        this.fullTimeScale.setExtendableOnly(false);
      } else {
        this.setBrushExtentToTimeScale(left, right);
      }

      this.setInAction(!reset, timeChartContainer, null);
      this.render(timeChartContainer);
    });
  }

  private setBrushExtentToTimeScale(left: number, right: number) {
    if (!(left < right)) {
      return;
    }
    const [minTime, maxTime] = this.fullTimeScale.getDomain();
    const width = this.helperChart.getInnerWidth();
    const dateSpan = maxTime - minTime;

    const startTime = minTime + dateSpan * left / width;
    const endTime = minTime + dateSpan * right / width;

    this.timeScale.setDomain([startTime, endTime]);
  }

  private getBrushExtentFromTimeScale() {
    const [startTime, endTime] = this.timeScale.getDomain();
    const [minTime, maxTime] = this.fullTimeScale.getDomain();
    const width = this.helperChart.getInnerWidth();
    const dateSpan = maxTime - minTime;

    if (!(dateSpan > 0)) {
      return {width, left: 0, right: 0};
    }

    let [left, right] = roundRange(
      width * (startTime - minTime) / dateSpan,
      width * (endTime - minTime) / dateSpan
    );
    left = Math.max(0, Math.min(left, width));
    right = Math.max(left, Math.min(right, width));

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
