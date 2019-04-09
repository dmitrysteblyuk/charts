import {binarySearch} from '../lib/binary-search';
// import {Scale} from '../lib/scale';
import {SeriesData} from '../lib/series-data';
import {createBaseSeries} from './index';
import {ChartScale} from '../chart/chart-scale';

export type LineSeries = ReturnType<typeof createLineSeries>;

export function createLineSeries(
  xScale: ChartScale,
  yScale: ChartScale,
  data: SeriesData
) {
  let strokeWidth = 2;

  const baseSeries = createBaseSeries(xScale, yScale, data, draw);

  function draw(context: CanvasRenderingContext2D) {
    const [x0, x1] = xScale.getDomain();
    let startIndex = binarySearch(
      0,
      data.size,
      (index) => x0 < data.x[index]
    ) - 1;
    let endIndex = binarySearch(
      startIndex + 1,
      data.size,
      (index) => x1 <= data.x[index]
    ) + 1;
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(data.size, endIndex);

    return drawLine(
      context,
      data,
      xScale.scale,
      yScale.scale,
      startIndex,
      endIndex,
      baseSeries.getColor(),
      strokeWidth * baseSeries.getPixelRatio()
    );
  }

  const instance = {
    ...baseSeries,
    setStrokeWidth: (_: typeof strokeWidth) => (strokeWidth = _, instance)
  };
  return instance;
}

function drawLine(
  context: CanvasRenderingContext2D,
  {x, y}: SeriesData,
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  startIndex: number,
  endIndex: number,
  strokeStyle: string,
  lineWidth: number
): void {
  context.beginPath();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.moveTo(scaleX(x[startIndex]), scaleY(y[startIndex]));

  for (let index = startIndex + 1; index < endIndex; index++) {
    context.lineTo(scaleX(x[index]), scaleY(y[index]));
  }
  context.stroke();
}
