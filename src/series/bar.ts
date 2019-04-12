import {DrawSeries} from './';

export const drawBarSeries: DrawSeries = (
  context,
  x,
  [y],
  scaleX,
  scaleY,
  startIndex,
  endIndex,
  color,
  _lineWidth,
  visibility
) => {
  context.fillStyle = color;
  context.globalAlpha = 0.7 * visibility;
  context.beginPath();
  let lastX = scaleX(x[startIndex]);
  let lastY = scaleY(y[startIndex]);
  context.moveTo(lastX, lastY);

  for (let index = startIndex + 1; index < endIndex; index++) {
    lastX = scaleX(x[index]);
    context.lineTo(lastX, lastY);
    context.lineTo(lastX, lastY = scaleY(y[index]));
  }

  lastX += scaleX(x[1]) - scaleX(x[0]);
  context.lineTo(lastX, lastY);
  context.lineTo(lastX, scaleY(0));
  context.lineTo(scaleX(x[startIndex]), scaleY(0));
  context.closePath();
  context.fill();
};
