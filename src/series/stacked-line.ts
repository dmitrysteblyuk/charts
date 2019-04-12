import {DrawSeries} from './';

export const drawStackedLineSeries: DrawSeries = (
  context,
  x,
  [_ownYData, y1, y0],
  scaleX,
  scaleY,
  startIndex,
  endIndex,
  color,
  _lineWidth,
  visibility
) => {
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
};
