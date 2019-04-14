import {DrawSeries} from './';
import {percentageFormat} from '../lib/format';

export const drawPieSeries: DrawSeries = (
  context,
  _x,
  [_ownYData, yData],
  _scaleX,
  _scaleY,
  _startIndex,
  _endIndex,
  color,
  _lineWidth,
  _visibility,
  focusFactor,
  centerX,
  centerY
) => {
  context.fillStyle = color;
  const radius = getPieRadius(centerX, centerY);
  const endAngle = yData[0];
  const startAngle = yData[1];
  const middleAngle = (startAngle + endAngle) / 2;
  const middleX = radius * Math.cos(middleAngle);
  const middleY = radius * Math.sin(middleAngle);

  if (focusFactor) {
    centerX += middleX * 0.1 * focusFactor;
    centerY += middleY * 0.1 * focusFactor;
  }

  context.translate(centerX, centerY);

  context.beginPath();

  context.moveTo(0, 0);
  context.lineTo(radius * Math.cos(startAngle), radius * Math.sin(startAngle));
  context.arc(0, 0, radius, startAngle, endAngle);
  context.closePath();
  context.fill();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#fff';
  context.fillText(percentageFormat(yData[3]), middleX * 0.55, middleY * 0.55);

  context.translate(-centerX, -centerY);
};

export function getPieRadius(centerX: number, centerY: number) {
  return Math.min(centerX, centerY) * 0.9;
}
