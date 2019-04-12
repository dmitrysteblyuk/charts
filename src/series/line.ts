export function drawLineSeries(
  context: CanvasRenderingContext2D,
  x: NumericData,
  [y]: MultipleData,
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  startIndex: number,
  endIndex: number,
  color: string,
  lineWidth: number,
  visibility: number
) {
  context.globalAlpha = visibility;
  context.strokeStyle = color;
  context.beginPath();
  context.lineWidth = lineWidth;
  context.moveTo(scaleX(x[startIndex]), scaleY(y[startIndex]));

  for (let index = startIndex + 1; index < endIndex; index++) {
    context.lineTo(scaleX(x[index]), scaleY(y[index]));
  }
  context.stroke();
}
