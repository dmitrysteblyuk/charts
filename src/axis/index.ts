import {ChartScale} from '../chart/chart-scale';
import './index.css';
import {dateUnits} from '../lib/time-scale-ticks';

const axisTransformMatrix: (
  [
    [number, number, number, number, number, number],
    [number, number, number, number, number, number]
  ] | undefined
)[] = [
  [[1, 0, 0, -1, 0, 0], [1, 0, 0, -1, 0, 0]],
  [[0, 1, 1, 0, 0, 0], [0, 1, 1, 0, 0, 0]],
  undefined,
  [[0, 1, -1, 0, 0, 0], [0, -1, 1, 0, 0, 0]]
];

export const enum AxisPosition {top, right, bottom, left};

export type Axis = ReturnType<typeof createAxis>;

export function createAxis(scale: ChartScale) {
  let position: AxisPosition = AxisPosition.bottom;
  let displayLabels = true;
  let displayGrid = true;
  let displayScale = true;
  let tickCount = 5;
  let tickPadding = 10;
  let gridSize = 0;
  let textColor = '#777';
  let textSize = 11;
  let textFont = 'px verdana, sans-serif';
  let gridColor = '#ddd';
  let tickFormat: (tick: number) => string = String;
  let animated = false;
  let enableTransitions = true;
  let hideOverlappingTicks = false;
  let outsideSize = 0;
  let tickPrecedence: (a: number, b: number) => number = () => 0;
  let tickData: NumberRange | null = null;
  let pixelRatio = 1;

  function draw(context: CanvasRenderingContext2D) {
    const matrix = axisTransformMatrix[position];

    if (matrix) {
      context.transform(...matrix[0]);
    }
    context.lineWidth = pixelRatio;
    context.strokeStyle = gridColor;
    drawScale(context);
    drawTicks(context);
  }

  function drawScale(context: CanvasRenderingContext2D) {
    if (!displayScale) {
      return;
    }
    const range = scale.getRange();

    context.beginPath();
    context.moveTo(range[0], 0);
    context.lineTo(range[1], 0);
    context.stroke();
  }

  function isVertical() {
    return (
      position === AxisPosition.left ||
      position === AxisPosition.right
    );
  }

  function getPosition() {
    return position;
  }

  function drawTicks(context: CanvasRenderingContext2D) {
    const vertical = isVertical();
    const matrix = axisTransformMatrix[position];
    const ticks = scale.getTicks(tickCount);
    const tickOffsets = ticks.map((tick) => {
      return Math.round(scale.scale(tick));
    });

    if (displayGrid) {
      tickOffsets.forEach((offset) => {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, -gridSize);
        context.stroke();
      });
    }

    if (!displayLabels) {
      return;
    }

    context.fillStyle = textColor;
    context.font = textSize * pixelRatio + textFont;

    ticks.forEach((tick, index) => {
      const indent = tickPadding * (
        position === AxisPosition.left ||
        position === AxisPosition.bottom
          ? 1 : -1
      );
      context.textAlign = (
        position === AxisPosition.left ? 'start'
          : position === AxisPosition.right ? 'end'
          : 'center'
      );
      context.textBaseline = (
        position === AxisPosition.bottom
          ? 'hanging'
          : 'bottom'
      );
      const x = vertical ? indent : 0;
      const y = vertical ? 0 : indent;

      const offset = tickOffsets[index];
      context.translate(offset, 0);
      if (matrix) {
        context.transform(...matrix[1]);
      }
      context.fillText(tickFormat(tick), x, y);
      if (matrix) {
        context.transform(...matrix[0]);
      }
      context.translate(-offset, 0);
    });
  }

  const instance = {
    draw,
    scale,
    isVertical,
    getPosition,
    // tslint:disable max-line-length
    setPosition: (_: typeof position) => (position = _, instance),
    setDisplayLabels: (_: typeof displayLabels) => (displayLabels = _, instance),
    setDisplayGrid: (_: typeof displayGrid) => (displayGrid = _, instance),
    setDisplayScale: (_: typeof displayScale) => (displayScale = _, instance),
    setTickCount: (_: typeof tickCount) => (tickCount = _, instance),
    setTickPadding: (_: typeof tickPadding) => (tickPadding = _, instance),
    setGridSize: (_: typeof gridSize) => (gridSize = _, instance),
    setTextColor: (_: typeof textColor) => (textColor = _, instance),
    setTextSize: (_: typeof textSize) => (textSize = _, instance),
    setTextFont: (_: typeof textFont) => (textFont = _, instance),
    setGridColor: (_: typeof gridColor) => (gridColor = _, instance),
    setTickFormat: (_: typeof tickFormat) => (tickFormat = _, instance),
    setAnimated: (_: typeof animated) => (animated = _, instance),
    setEnableTransitions: (_: typeof enableTransitions) => (enableTransitions = _, instance),
    setHideOverlappingTicks: (_: typeof hideOverlappingTicks) => (hideOverlappingTicks = _, instance),
    setOutsideSize: (_: typeof outsideSize) => (outsideSize = _, instance),
    setTickPrecedence: (_: typeof tickPrecedence) => (tickPrecedence = _, instance),
    setTickData: (_: typeof tickData) => (tickData = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
    // tslint:enable max-line-length
  };
  return instance;
}

export function timePrecedence(a: number, b: number): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  let valueA: number | undefined;
  let valueB: number | undefined;
  const unit = dateUnits.find(({get}) => {
    valueA = get.call(dateA);
    valueB = get.call(dateB);
    return valueA !== 0 || valueB !== 0;
  });

  if (!unit) {
    return 0;
  }
  if (valueA === 0) {
    return 1;
  }
  if (valueB === 0) {
    return -1;
  }
  return 0;
}

// function doRectsOverlap(a: Rect, b: Rect, space: number): boolean {
//   const ax0 = a.left - space;
//   const ax1 = ax0 + a.width + 2 * space;
//   const ay0 = a.top - space;
//   const ay1 = ay0 + a.height + 2 * space;
//   const bx0 = b.left;
//   const bx1 = bx0 + b.width;
//   const by0 = b.top;
//   const by1 = by0 + b.height;
//   return ax1 > bx0 && bx1 > ax0 && ay1 > by0 && by1 > ay0;
// }
