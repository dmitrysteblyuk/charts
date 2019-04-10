export function drawLineSeries(
  context: CanvasRenderingContext2D,
  x: NumericData,
  [y]: NumericData[],
  scaleX: (x: number) => number,
  scaleY: (y: number) => number,
  startIndex: number,
  endIndex: number,
  color: string,
  lineWidth: number
) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.moveTo(scaleX(x[startIndex]), scaleY(y[startIndex]));

  for (let index = startIndex + 1; index < endIndex; index++) {
    context.lineTo(scaleX(x[index]), scaleY(y[index]));
  }
  context.stroke();
}
