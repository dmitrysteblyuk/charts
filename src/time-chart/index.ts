import {Chart} from '../chart';
import {Axis, AxisPosition, timePrecedence} from '../axis';
import {Brush} from '../brush';
import {Selection} from '../lib/selection';
import {setProps} from '../lib/utils';
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
import {roundAuto} from '../lib/decimal-scale-ticks';

export class TimeChart {
  chartOuterWidth = 0;
  chartOuterHeight = 0;
  helperHeight = 0;
  helperPadding = 10;
  tooltipContainer: Selection<HTMLElement> | undefined;
  paddings = [20, 20, 20, 20];

  readonly timeScale = new TimeScale();
  readonly fullTimeScale = new TimeScale();
  readonly valueScale = new ValueScale();
  readonly fullValueScale = new ValueScale();
  readonly brush = new Brush();
  readonly legend = new Legend([]);
  readonly tooltip = new Tooltip();
  readonly helperChart = new Chart([]);
  readonly mainChart = setProps(new Chart(
    [
      setProps(new Axis(AxisPosition.bottom, this.timeScale), {
        tickFormat: axisTimeFormat,
        displayGrid: false,
        tickPrecedence: timePrecedence
      }),
      setProps(new Axis(AxisPosition.left, this.valueScale), {
        tickFormat: roundAuto,
        displayScale: false
      })
    ]
  ), {
    paddings: [0, 0, 20, 0]
  });

  private isBrushing = false;
  private brushLeft = 0;
  private brushRight = 0;

  render(container: Selection) {
    const {
      chartOuterHeight,
      helperHeight,
      paddings,
      helperPadding
    } = this;

    const clipPath = container.renderOne('clipPath', 0);
    clipPath.renderOne('rect', 0).attr({
      x: paddings[3],
      y: 0,
      width: this.getChartWidth(),
      height: chartOuterHeight
    });
    if (clipPath.isNew()) {
      container.attr('clip-path', `url(#${clipPath.getId()})`);
    }

    this.renderLegend(container);

    const mainHeight = Math.max(
      1,
      chartOuterHeight -
      helperHeight -
      helperPadding -
      (this.legend.getSize() + 20) -
      paddings[0] -
      paddings[2]
    );

    const mainContainer = container.renderOne('g', 2).attr(
      'transform',
      `translate(${paddings[3]},${paddings[0]})`
    );
    setProps(this.mainChart, {
      chartOuterWidth: this.getChartWidth(),
      chartOuterHeight: mainHeight
    }).render(
      mainContainer
    );

    this.fullTimeScale.setMinDomain(this.timeScale.getDomain());

    const helperContainer = container.renderOne('g', 3);
    helperContainer.attr(
      'transform',
      `translate(${paddings[3]},${mainHeight + paddings[0] + helperPadding})`
    );
    setProps(this.helperChart, {
      chartOuterWidth: this.getChartWidth(),
      chartOuterHeight: helperHeight
    }).render(
      helperContainer
    );

    const helperChartContainer = helperContainer.selectOne(0) as Selection;
    const brushContainer = helperChartContainer.renderOne('g', 2);
    this.renderBrush(brushContainer, container);

    const mainChartContainer = mainContainer.selectOne(0) as Selection;
    const lineContainer = mainChartContainer.renderOne('g', 2);
    const rectSelection = mainChartContainer.renderOne('rect', 3);
    this.renderRectForDragging(rectSelection, container);

    this.renderTooltip(rectSelection, lineContainer);
  }

  addSeries(
    data: SeriesData,
    props: Partial<SeriesProps>,
    helperProps?: Partial<SeriesProps>
  ) {
    const mainSeries = setProps(new LineSeries(
      this.timeScale,
      this.valueScale,
      data
    ), props as LineSeries);

    const helperSeries = setProps(new LineSeries(
      this.fullTimeScale,
      this.fullValueScale,
      data
    ), {...props, ...helperProps} as LineSeries);

    this.mainChart.series.push(mainSeries);
    this.helperChart.series.push(helperSeries);
    this.legend.seriesGroups.push([mainSeries, helperSeries]);
  }

  setEnableTransitions(enableTransitions: boolean) {
    [this.mainChart, this.helperChart].forEach(({axes, series}) => {
      (axes as (BaseSeries | Axis)[])
        .concat(series)
        .forEach((item) => setProps(item, {enableTransitions}));
    });
  }

  private getChartWidth() {
    const {chartOuterWidth, paddings} = this;
    return Math.max(
      1, chartOuterWidth - paddings[1] - paddings[3]
    );
  }

  private getMainRect(rectSelection: Selection) {
    return rectSelection.getRect();
  }

  private renderLegend(container: Selection) {
    const legendContainer = container.renderOne('g', 1);
    const {legend} = this;
    setProps(legend, {
      maxWidth: this.getChartWidth()
    })
      .render(legendContainer);
    const yOffset = (
      this.chartOuterHeight -
      legend.getSize() -
      this.paddings[2]
    );
    legendContainer.attr(
      'transform',
      `translate(${this.paddings[3] + legend.getPadding()},${yOffset})`
    );

    if (!legendContainer.isNew()) {
      return;
    }
    legend.onClickEvent.on((seriesGroup) => {
      const hidden = !seriesGroup[0].isHidden();
      seriesGroup.forEach((series) => setProps(series, {hidden}));
      this.render(container);
    });
  }

  private renderTooltip(rectSelection: Selection, lineContainer: Selection) {
    const {tooltipContainer} = this;
    if (!rectSelection.isNew() || !tooltipContainer) {
      return;
    }
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
          pointX, series.getData(), series.xScale, 20
        );
        if (!nearestPoint) {
          return points;
        }
        const point = {series, ...nearestPoint};
        const lastPoint = points[0];

        if (!points.length || point.distance < lastPoint.distance) {
          return [point];
        }

        const nextTime = point.series.getData().x[point.index];
        const lastTime = lastPoint.series.getData().x[lastPoint.index];

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
      const time = firstSeries.getData().x[firstIndex];
      const lineX = firstSeries.xScale.scale(time);
      const lineY2 = this.mainChart.getInnerHeight();
      const left = Math.round(lineX + rect.left) - 20;

      setProps(tooltip, {
        time,
        left,
        hidden: false,
        series: results.map(({series}) => series),
        values: results.map(({series, index}) => series.getData().y[index]),
        top: rect.top,
        lineX,
        lineY1: 0,
        lineY2
      }).render(
        tooltipContainer,
        lineContainer
      );
    });

    function hideTooltip() {
      setProps(tooltip, {hidden: true}).render(
        tooltipContainer as Selection<HTMLElement>,
        lineContainer
      );
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

    setProps(this.brush, {
      height: brushHeight,
      ...brushExtent
    }).render(
      brushContainer
    );

    if (!brushContainer.isNew()) {
      return;
    }

    this.brush.activeEvent.on((isActive) => {
      this.isBrushing = isActive;
      if (isActive) {
        return;
      }
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
      return {width, left: 0, right: width};
    }

    let [left, right] = roundRange(
      (startTime - minTime) / dateSpan * width,
      (endTime - minTime) / dateSpan * width
    );
    left = Math.max(0, Math.min(left, width));
    right = Math.max(left, Math.min(right, width));

    return {width, left, right};
  }
}
