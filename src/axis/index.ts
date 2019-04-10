import {ChartScale} from '../chart/chart-scale';
import './index.css';

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

export function createAxis(
  position: AxisPosition,
  scale: ChartScale,
  getTicks: (count: number, domain: NumberRange) => {
    ticks: number[],
    startIndex?: number
  },
  tickFormat: (tick: number) => string,
  displayScale?: boolean,
  displayGrid?: boolean
) {
  let gridSize = 0;
  let pixelRatio = 1;

  const textColor = '#777';
  const textSize = 11;
  const textFont = 'px verdana, sans-serif';
  const gridColor = '#ddd';
  const tickPadding = 10;
  const tickCount = 5;
  const vertical = (
    position === AxisPosition.left ||
    position === AxisPosition.right
  );

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

  function drawTicks(context: CanvasRenderingContext2D) {
    const matrix = axisTransformMatrix[position];
    const {ticks, getOpacity} = getTickData();
    const tickOffsets = ticks.map(scale.scale);

    if (displayGrid) {
      tickOffsets.forEach((offset) => {
        context.beginPath();
        context.moveTo(offset, 0);
        context.lineTo(offset, -gridSize);
        context.stroke();
      });
    }

    context.fillStyle = textColor;
    context.font = textSize * pixelRatio + textFont;

    ticks.forEach((tick, index) => {
      const offset = tickOffsets[index];
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

      context.translate(offset, 0);
      if (matrix) {
        context.transform(...matrix[1]);
      }
      if (getOpacity) {
        context.globalAlpha = getOpacity(index);
      }
      context.fillText(tickFormat(tick), x, y);
      if (matrix) {
        context.transform(...matrix[0]);
      }
      context.translate(-offset, 0);
    });
  }

  function getTickData() {
    let count: number;
    const range = scale.getRange();
    const size = range[1] - range[0];
    if (vertical) {
      count = tickCount;
    } else {
      count = Math.round(size / 45 / pixelRatio);
    }

    const {ticks, startIndex} = getTicks(count, scale.getDomain());
    if (vertical) {
      return {
        ticks
      };
    }

    const space = size / ticks.length / pixelRatio;
    const opacity = Math.max(0, Math.min((space - 45) / 20, 1));

    return {
      ticks,
      getOpacity
    };

    function getOpacity(index: number) {
      return (startIndex! + index) % 2 ? opacity : 1;
    }
  }

  const instance = {
    draw,
    scale,
    isVertical: () => vertical,
    getPosition: () => position,
    setGridSize: (_: typeof gridSize) => (gridSize = _, instance),
    setPixelRatio: (_: typeof pixelRatio) => (pixelRatio = _, instance)
  };
  return instance;
}
