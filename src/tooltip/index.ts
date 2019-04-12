import {Selection} from '../lib/selection';
import {AnySeries} from '../series';
import {roundAuto} from '../lib/decimal-scale-ticks';
import './index.css';

export type Tooltip = Readonly<ReturnType<typeof createTooltip>>;

export function createTooltip(chartPaddingTop: number) {
  let left = 0;
  let time = 0;
  let values: number[] = [];
  let series: (AnySeries | null)[] = [];
  let shouldShow = false;
  let lineX = 0;
  let lineY2 = 0;
  let pixelRatio = 1;

  const lineY1 = 0;
  const timeFormat = (dateTime: number) => {
    const date = new Date(dateTime);
    if (date.getUTCSeconds() || date.getUTCMinutes() || date.getUTCHours()) {
      return date.toUTCString();
    }
    return date.toDateString();
  };

  function render(lineContainer: Selection, container: Selection) {
    container.toggle(shouldShow);
    lineContainer.toggle(shouldShow);
    if (!shouldShow) {
      return;
    }

    container.renderOne<HTMLElement>('div', 0).text(
      timeFormat(time)
    );

    const valueSelection = container.renderOne('div', 1, (selection) => {
      selection.setAttrs({'class': 'chart-tooltip-values'});
    });

    values.forEach((value, index) => {
      const selection = valueSelection.renderOne('div', index);
      const item = series[index];
      if (!item) {
        selection.setStyles({'display': 'none'});
        return;
      }

      selection.setStyles({
        'color': item.getColor(),
        display: null
      });

      selection.renderOne<HTMLElement>('div', 0).text(
        roundAuto(value)
      );
      selection.renderOne('div', 1).text(item.getLabel());
    });

    const rect = container.getRect();
    lineContainer.renderOne('line', 0).setAttrs({
      'stroke': '#ddd',
      'x1': lineX,
      'x2': lineX,
      'y1': lineY1 + (rect ? rect.height : 0) + 20 - chartPaddingTop,
      'y2': lineY2
    });

    const circlesContainer = lineContainer.renderOne('g', 1);
    values.forEach((value, index) => {
      const selection = circlesContainer.renderOne(
        'circle',
        index,
        (circleSelection) => circleSelection.setAttrs({
          'stroke-width': 2,
          'r': 5,
          'fill': 'white'
        })
      );

      const item = series[index];
      if (!item) {
        selection.setStyles({'display': 'none'});
        return;
      }

      selection.setStyles({
        display: null
      }).setAttrs({
        'stroke': item.getColor(),
        'cx': lineX,
        'cy': item.yScale.getScale()(value) / pixelRatio
      });
    });

    const leftPosition = Math.min(
      left,
      window.innerWidth - (rect ? rect.width : 0) - 5
    );
    container.setStyles({
      'left': `${leftPosition}px`
    });
  }

  const instance = {
    render,
    setLeft: (_: typeof left) => (left = _, instance),
    setTime: (_: typeof time) => (time = _, instance),
    setValues: (_: typeof values) => (values = _, instance),
    setSeries: (_: typeof series) => (series = _, instance),
    show: (_: typeof shouldShow) => (shouldShow = _, instance),
    setLineX: (_: typeof lineX) => (lineX = _, instance),
    setLineY2: (_: typeof lineY2) => (lineY2 = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
  };
  return instance;
}
