import {DrawSeries} from './';

export const drawPieSeries: DrawSeries = (
  context,
  _x,
  [_ownYData, angles],
  scaleX,
  scaleY,
  _startIndex,
  _endIndex,
  color,
  _lineWidth,
  _visibility,
  chartXScale
) => {
  context.fillStyle = color;

  const [d0, d1] = chartXScale.getDomain();
  const centerX = scaleX((d0 + d1) / 2);
  const centerY = scaleY(0.5);
  const radius = Math.min(centerX, centerY) * .9;
  context.translate(centerX, centerY);

  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(radius * Math.cos(angles[1]), radius * Math.sin(angles[1]));
  context.arc(0, 0, radius, angles[1], angles[0]);
  context.closePath();
  context.fill();

  context.translate(-centerX, -centerY);
};
