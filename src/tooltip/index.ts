import {Selection} from '../lib/selection';
import {isArrayEqual} from '../lib/utils';
import {AnySeries} from '../series';
import {EventEmitter} from '../lib/event-emitter';
import {dateTimeFormat} from '../lib/format';
import './index.css';

export type Tooltip = Readonly<ReturnType<typeof createTooltip>>;

export function createTooltip(
  offsets: number[],
  getAllSeries: () => AnySeries[]
) {
  let zoomedIn = false;
  let top = 0;
  let left = 0;
  let time = 0;
  let dataIndex = 0;
  let shouldShow = false;
  let lineY2 = 0;
  let pixelRatio = 1;
  let pieSeries: AnySeries | null = null;
  let theme: Theme;

  const seriesFocusEvent = new EventEmitter<void>();
  const zoomSeriesEvent = new EventEmitter<number>();

  const lineY1 = 0;
  let lastVisibleSeries: AnySeries[] = [];
  let lineContainer: Selection;
  let container: Selection;
  let parentContainer: Selection;

  function render(
    _lineContainer: Selection,
    _container: Selection,
    _parentContainer: Selection
  ) {
    container = _container;
    lineContainer = _lineContainer;
    parentContainer = _parentContainer;

    container.setStyles({
      backgroundColor: theme.tooltipBackground,
      borderColor: theme.tooltipBorderColor
    });

    toggleTooltip(shouldShow);

    if (!shouldShow) {
      return;
    }
    renderPieTooltip();
    renderLineTooltip();
    positionTooltip();
  }

  function renderPieTooltip() {
    const pieDiv = container.renderOne('div', 'pie').setStyles({
      'display': pieSeries ? null : 'none'
    });
    if (!pieSeries) {
      return;
    }
    const yData = pieSeries.getYData();
    const value = yData[1][2];

    pieDiv.renderOne('div', 0).text(pieSeries.getLabel());
    pieDiv.renderOne('div', 1).text(value);
  }

  function renderLineTooltip() {
    const lineDiv = container.renderOne('div', 'line').setStyles({
      'display': pieSeries ? 'none' : null
    });
    if (pieSeries) {
      return;
    }

    lineDiv.renderOne<HTMLElement>('div', 0, (selection) => {
      selection.on('click', () => {
        if (zoomedIn) {
          return;
        }
        zoomSeriesEvent.emit(time);
      });
    }).text(dateTimeFormat(time));

    const valueSelection = lineDiv.renderOne('div', 1, (selection) => {
      selection.setAttrs({'class': 'chart-tooltip-values'});
    });
    const allSeries = getAllSeries();

    allSeries.forEach((series, index) => {
      const selection = valueSelection.renderOne('div', index);
      if (!series.toDraw()) {
        selection.setStyles({'display': 'none'});
        return;
      }

      selection.setStyles({
        'color': series.getColor(),
        display: null
      });

      const value = series.getOwnYData()[dataIndex];

      selection.renderOne<HTMLElement>('div', 0).text(value);
      selection.renderOne('div', 1).text(series.getLabel());
    });

    lastVisibleSeries = getVisibleSeries();
    setLinePosition();

    lineContainer.renderOne('line', 0).setAttrs({
      'stroke': theme.tooltipBorderColor,
      'y1': lineY1,
      'y2': lineY2
    });

    const circlesContainer = lineContainer.renderOne('g', 1);
    allSeries.forEach((series, index) => {
      const selection = circlesContainer.renderOne(
        'circle',
        index,
        (circleSelection) => circleSelection.setAttrs({
          'stroke-width': 2,
          'r': 5
        })
      );

      if (!series.toDraw()) {
        selection.setStyles({'display': 'none'});
        return;
      }

      const yData = series.getDisplayedYData();
      const yCoordinate = yData ? yData[dataIndex] : 1;

      selection.setStyles({
        display: null
      }).setAttrs({
        'stroke': series.getColor(),
        'cy': series.yScale.getScale()(yCoordinate) / pixelRatio,
        'fill': theme.maskColor
      });
    });
  }

  function update() {
    if (!shouldShow) {
      return;
    }

    if (pieSeries) {
      if (!pieSeries.toDraw()) {
        pieSeries = null;
        toggleTooltip(shouldShow = false);
      }
      return;
    }

    const visibleSeries = getVisibleSeries();
    if (!isArrayEqual(visibleSeries, lastVisibleSeries)) {
      toggleTooltip(shouldShow = false);
      return;
    }

    const insideView = setLinePosition();
    positionTooltip();
    toggleTooltip(insideView);
  }

  function setLinePosition() {
    const {xScale} = lastVisibleSeries[0];
    const x = xScale.getScale()(time);
    const [r0, r1] = xScale.getRange();
    const insideView = x >= r0 && x <= r1;

    left = Math.round(x / pixelRatio);

    lineContainer.setAttrs({
      'transform': `translate(${left},0)`
    });
    return insideView;
  }

  function toggleTooltip(visible: boolean) {
    container.toggle(visible);
    lineContainer.toggle(visible && !pieSeries);
  }

  function positionTooltip() {
    const {width, height} = container.getRect()!;
    const rect = parentContainer.getRect()!;

    let leftPosition = (
      left -
      (pieSeries ? width + 5 : width / 2) +
      offsets[3]
    );
    let topPosition = top - (pieSeries ? height + 5 : 0) + offsets[0];

    leftPosition = Math.max(
      2,
      Math.min(leftPosition + rect.left, window.innerWidth - width - 2)
    ) - rect.left;

    topPosition = Math.max(
      2,
      Math.min(topPosition + rect.top, window.innerHeight - height - 2)
    ) - rect.top;

    container.setStyles({
      'transform': `translate(${leftPosition}px,${topPosition}px)`
    });
  }

  function getVisibleSeries() {
    return getAllSeries().filter(({toDraw}) => toDraw());
  }

  function setPieSeries(
    nextPieSeries: AnySeries | null,
    focus?: boolean
  ) {
    if (pieSeries === nextPieSeries) {
      return;
    }
    if (pieSeries) {
      pieSeries.setFocused(false);
    }
    if (focus && nextPieSeries) {
      nextPieSeries.setFocused(true);
    }
    seriesFocusEvent.emit();
    pieSeries = nextPieSeries;
  }

  function show(_shouldShow: boolean) {
    if ((shouldShow = _shouldShow) || !pieSeries) {
      return;
    }
    pieSeries.setFocused(false);
    pieSeries = null;
    seriesFocusEvent.emit();
  }

  const instance = {
    render,
    show,
    setPieSeries,
    seriesFocusEvent,
    zoomSeriesEvent,
    update,
    setZoomedIn: (_: typeof zoomedIn) => (zoomedIn = _),
    setTheme: (_: typeof theme) => (theme = _, instance),
    setTop: (_: typeof top) => (top = _, instance),
    setLeft: (_: typeof left) => (left = _, instance),
    setTime: (_: typeof time) => (time = _, instance),
    setDataIndex: (_: typeof dataIndex) => (dataIndex = _, instance),
    setLineY2: (_: typeof lineY2) => (lineY2 = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
  };
  return instance;
}
