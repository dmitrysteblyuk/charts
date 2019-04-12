export function drawStackedLineSeries(
  context: CanvasRenderingContext2D,
  x: NumericData,
  [_, y1, y0]: MultipleData,
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  startIndex: number,
  endIndex: number,
  color: string,
  _lineWidth: number,
  visibility: number
) {
  context.fillStyle = color;
  context.globalAlpha = 0.7 * (
    y1 || y0 ? 1 : visibility
  );
  context.beginPath();

  if (y1) {
    context.moveTo(scaleX(x[startIndex]), scaleY(y1[startIndex]));

    for (let index = startIndex + 1; index < endIndex; index++) {
      context.lineTo(scaleX(x[index]), scaleY(y1[index]));
    }
  } else {
    context.moveTo(scaleX(x[startIndex]), scaleY(1));
    context.lineTo(scaleX(x[endIndex - 1]), scaleY(1));
  }

  if (y0) {
    for (let index = endIndex; index-- > startIndex; ) {
      context.lineTo(scaleX(x[index]), scaleY(y0[index]));
    }
  } else {
    context.lineTo(scaleX(x[endIndex - 1]), scaleY(0));
    context.lineTo(scaleX(x[startIndex]), scaleY(0));
  }

  context.closePath();
  context.fill();
}
