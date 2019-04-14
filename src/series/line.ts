import {DrawSeries} from './';

export const drawLineSeries: DrawSeries = (
  context,
  x,
  [_ownYData, y1],
  stacked,
  scaleX,
  scaleY,
  startIndex,
  endIndex,
  color,
  lineWidth,
  visibility
) => {
  if (!stacked) {
    y1 = _ownYData;
  }
  context.globalAlpha = visibility;
  context.strokeStyle = color;
  context.beginPath();
  context.lineWidth = lineWidth;

  context.moveTo(scaleX(x[startIndex]), scaleY(y1[startIndex]));

  for (let index = startIndex + 1; index < endIndex; index++) {
    context.lineTo(scaleX(x[index]), scaleY(y1[index]));
  }
  context.stroke();
};
