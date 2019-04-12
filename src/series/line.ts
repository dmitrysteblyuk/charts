import {DrawSeries} from './';

export const drawLineSeries: DrawSeries = (
  context,
  x,
  [y],
  scaleX,
  scaleY,
  startIndex,
  endIndex,
  color,
  lineWidth,
  visibility
) => {
  context.globalAlpha = visibility;
  context.strokeStyle = color;
  context.beginPath();
  context.lineWidth = lineWidth;
  context.moveTo(scaleX(x[startIndex]), scaleY(y[startIndex]));

  for (let index = startIndex + 1; index < endIndex; index++) {
    context.lineTo(scaleX(x[index]), scaleY(y[index]));
  }
  context.stroke();
};
