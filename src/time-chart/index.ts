import {Chart} from '../chart';
import {Axis, AxisPosition, timePrecedence} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {forEach} from '../lib/utils';
import {ValueScale, TimeScale, getExtendedDomain} from '../chart/chart-scale';
import {BaseSeries, SeriesProps} from '../series';
import {LineSeries} from '../series/line-series';
import {Legend} from '../legend';
import {SeriesData} from '../lib/series-data';
import {onZoomEvents, ZoomMode, ZoomPositions} from '../lib/zoom';
import {roundRange} from '../lib/utils';
import {getZoomFactorAndOffset} from './zoom-transform';
import {axisTimeFormat} from '../lib/time-format';
import {Tooltip} from '../tooltip';
import {getNearestPoint} from './get-nearest-point';

export class TimeChart {
  private readonly timeScale = new TimeScale();
  private readonly fullTimeScale = new TimeScale();
  private readonly valueScale = new ValueScale();
  private readonly fullValueScale = new ValueScale();
  private readonly brush = new Brush();

  private readonly mainChart = new Chart(
    [
      new Axis(AxisPosition.bottom, this.timeScale).setProps({
        tickFormat: axisTimeFormat,
        tickPrecedence: timePrecedence
      }),
      new Axis(AxisPosition.left, this.valueScale)
    ]
  );
  private readonly legend = new Legend([]);
  private readonly helperChart = new Chart(
    [
      new Axis(AxisPosition.top, this.fullTimeScale).setProps({
        tickFormat: axisTimeFormat,
        tickPrecedence: timePrecedence
      }),
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
  private bodyContainer = new Selection(document.body);
  private tooltip = new Tooltip();

  setProps(props: {
    chartOuterWidth: number,
    chartOuterHeight: number,
    helperHeight: number
  }): this {
    forEach(props, (value, key) => this[key] = value);
    return this;
  }

  render(container: Selection) {
    const {
      chartOuterWidth,
      chartOuterHeight,
      helperHeight
    } = this;

    this.renderLegend(container);

    const mainHeight = (
      chartOuterHeight -
      helperHeight -
      (this.legend.getSize() + 20)
    );

    const mainContainer = container.renderOne('g', 1);
    this.mainChart.setProps({
      chartOuterWidth,
      chartOuterHeight: mainHeight
    })
      .render(mainContainer);

    this.fullTimeScale.setMinDomain(this.timeScale.getDomain());

    const helperContainer = container.renderOne('g', 2);
    helperContainer.attr('transform', `translate(0,${mainHeight})`);
    this.helperChart.setProps({
      chartOuterWidth,
      chartOuterHeight: helperHeight,
      fixedPaddings: [, , , this.mainChart.getPaddings()[3]]
    })
      .render(helperContainer);

    const helperChartContainer = helperContainer.selectOne(0) as Selection;
    const brushContainer = helperChartContainer.renderOne('g', 2);
    this.renderBrush(brushContainer, container);

    const mainChartContainer = mainContainer.selectOne(0) as Selection;
    const lineContainer = mainChartContainer.renderOne('g', 2);
    const rectSelection = mainChartContainer.renderOne('rect', 3);
    this.renderRectForDragging(rectSelection, container);

    this.renderTooltip(rectSelection, lineContainer);
  }

  addSeries(data: SeriesData, props: SeriesProps) {
    const mainSeries = new LineSeries(
      this.timeScale,
      this.valueScale,
      data
    ).setProps(props);
    const helperSeries = new LineSeries(
      this.fullTimeScale,
      this.fullValueScale,
      data
    ).setProps(props);

    this.mainChart.series.push(mainSeries);
    this.helperChart.series.push(helperSeries);
    this.legend.seriesGroups.push([mainSeries, helperSeries]);
  }

  setEnableTransitions(enableTransitions: boolean) {
    [this.mainChart, this.helperChart].forEach(({axes, series}) => {
      (axes as (BaseSeries | Axis)[])
        .concat(series)
        .forEach((item) => item.setProps({enableTransitions}));
    });
  }

  private getMainRect(rectSelection: Selection) {
    return rectSelection.getRect();
  }

  private renderLegend(container: Selection) {
    const legendContainer = container.renderOne('g', 0);
    this.legend.setProps({
      maxWidth: this.chartOuterWidth
    })
      .render(legendContainer);
    const yOffset = this.chartOuterHeight - this.legend.getSize();
    legendContainer.attr('transform', `translate(0,${yOffset})`);

    if (!legendContainer.isNew()) {
      return;
    }
    this.legend.onClickEvent.on((seriesGroup) => {
      const hidden = !seriesGroup[0].isHidden();
      seriesGroup.forEach((series) => series.setProps({hidden}));
      this.render(container);
    });
  }

  private renderTooltip(rectSelection: Selection, lineContainer: Selection) {
    if (!rectSelection.isNew()) {
      return;
    }
    const tooltipContainer = this.bodyContainer.renderOne<HTMLElement>(
      'div',
      'tooltipContainer'
    );
    const {tooltip} = this;
    tooltipContainer.on('mouseleave', (event: MouseEvent) => {
      const relatedSelection = new Selection(event.relatedTarget as any);
      if (relatedSelection.isSame(rectSelection)) {
        return;
      }
      hideTooltip();
    });

    rectSelection.on('mouseleave', (event: MouseEvent) => {
      const relatedSelection = new Selection(event.relatedTarget as any);
      if (relatedSelection.isDescendant(tooltipContainer)) {
        return;
      }
      hideTooltip();
    }).on('mousemove', ({clientX}: MouseEvent) => {
      const rect = this.getMainRect(rectSelection);
      const pointX = clientX - rect.left;
      const results = this.mainChart.series.reduce((points, series) => {
        if (series.isHidden()) {
          return points;
        }
        const nearestPoint = getNearestPoint(
          pointX, series.data, series.xScale, 20
        );
        if (!nearestPoint) {
          return points;
        }
        const point = {series, ...nearestPoint};
        const lastPoint = points[0];

        if (!points.length || point.distance < lastPoint.distance) {
          return [point];
        }

        const nextTime = point.series.data.x[point.index];
        const lastTime = lastPoint.series.data.x[lastPoint.index];

        if (nextTime !== lastTime) {
          return points;
        }
        return points.concat(point);
      }, [] as {distance: number, index: number, series: BaseSeries}[]);

      if (!results.length) {
        hideTooltip();
        return;
      }

      const {series: firstSeries, index: firstIndex} = results[0];
      const time = firstSeries.data.x[firstIndex];
      const lineX = firstSeries.xScale.scale(time);
      const lineY1 = 20;
      const lineY2 = this.mainChart.getInnerHeight();
      const left = Math.round(lineX + rect.left) - 20;

      tooltip.setProps({
        time,
        left,
        hidden: false,
        series: results.map(({series}) => series),
        values: results.map(({series, index}) => series.data.y[index]),
        top: rect.top + lineY1,
        lineX,
        lineY1,
        lineY2
      })
        .render(tooltipContainer, lineContainer);
    });

    function hideTooltip() {
      tooltip.setProps({hidden: true})
        .render(tooltipContainer, lineContainer);
    }
  }

  private renderRectForDragging(
    rectSelection: Selection,
    container: Selection
  ) {
    rectSelection.attr({
      'width': this.mainChart.getInnerWidth(),
      'height': this.mainChart.getInnerHeight()
    });

    if (!rectSelection.isNew()) {
      return;
    }

    rectSelection.attr({
      'x': 0,
      'y': 0,
      'fill': 'transparent'
    });

    let startWidth: number;
    let startDomain: NumberRange;
    let startPositions: ZoomPositions;
    let hasChanged: boolean;

    onZoomEvents(rectSelection, (positions, mode) => {
      if (!hasChanged) {
        hasChanged = true;
        this.setInAction(true, container, mode === ZoomMode.Wheel);
      }
      const [factor, offset] = getZoomFactorAndOffset(
        startPositions,
        positions,
        mode,
        startDomain,
        startWidth,
        (clientX) => this.timeScale.invert().scale(
          clientX - this.getMainRect(rectSelection).left
        )
      );
      this.zoomMainChart(startDomain, factor, offset, container);
    }, (positions) => {
      startDomain = this.timeScale.getDomain();
      startPositions = positions;
      startWidth = this.mainChart.getInnerWidth();
    }, (mode) => {
      if (!hasChanged) {
        return;
      }
      hasChanged = false;
      if (mode === ZoomMode.Wheel) {
        return;
      }
      this.setInAction(false, container);
    });
  }

  private zoomMainChart(
    [startTime, endTime]: NumberRange,
    factor: number,
    offset: number,
    container: Selection
  ) {
    if (factor === 1 && offset === 0) {
      return;
    }
    const nextStartTime = factor * startTime + offset;
    const nextEndTime = factor * endTime + offset;

    this.timeScale.setFixed(true);
    this.timeScale.setDomain([nextStartTime, nextEndTime]);

    const currentFullDomain = this.fullTimeScale.getDomain();
    const extendedFullDomain = getExtendedDomain(
      currentFullDomain,
      [nextStartTime, nextEndTime]
    );

    if (extendedFullDomain !== currentFullDomain) {
      this.fullTimeScale.setExtendableOnly(true);
      this.fullTimeScale.setDomain(extendedFullDomain);
    }
    this.render(container);
  }

  private renderBrush(
    brushContainer: Selection,
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
    })
      .render(brushContainer);

    if (!brushContainer.isNew()) {
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

      this.setInAction(!reset, timeChartContainer);
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
    timeout?: boolean
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

    if (!timeout) {
      return;
    }

    this.actionTimerId = setTimeout(() => {
      this.mainChart.setProps({inAction: false});
      this.helperChart.setProps({inAction: false});
      this.render(container);
    }, 500);
  }
}
