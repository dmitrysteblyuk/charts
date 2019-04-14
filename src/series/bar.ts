import {DrawSeries} from './';

export const drawBarSeries: DrawSeries = (
  context,
  x,
  [_ownYData, y1, y0],
  stacked,
  scaleX,
  scaleY,
  startIndex,
  endIndex,
  color,
  _lineWidth,
  visibility
) => {
  if (!stacked) {
    y1 = _ownYData;
  }
  context.fillStyle = color;
  context.globalAlpha = 0.7 * (stacked && (y1 || y0) ? 1 : visibility);
  context.beginPath();
  const stepX = scaleX(x[1]) - scaleX(x[0]);
  let lastX = scaleX(x[startIndex]);
  let lastY: number;

  if (y1) {
    context.moveTo(lastX, lastY = scaleY(y1[startIndex]));

    for (let index = startIndex + 1; index < endIndex; index++) {
      context.lineTo(lastX = scaleX(x[index]), lastY);
      context.lineTo(lastX, lastY = scaleY(y1[index]));
    }

    lastX += stepX;
    context.lineTo(lastX, lastY);
  } else {
    context.moveTo(lastX, lastY = scaleY(1));
    context.lineTo(lastX = scaleX(x[endIndex - 1]) + stepX, lastY);
  }

  if (y0) {
    for (let index = endIndex; index-- > startIndex; ) {
      context.lineTo(lastX, lastY = scaleY(y0[index]));
      context.lineTo(lastX = scaleX(x[index]), lastY);
    }
  } else {
    context.lineTo(lastX, lastY = scaleY(0));
    context.lineTo(scaleX(x[startIndex]), lastY);
  }

  context.closePath();
  context.fill();
};
