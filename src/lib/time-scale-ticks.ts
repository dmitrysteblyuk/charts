import {getDecimalScaleTicks} from './decimal-scale-ticks';
import {binarySearch} from './binary-search';
import {isPositive} from './utils';

interface DateUnit {
  duration: number;
  periods: NumberRange;
  get: (this: Date) => number;
  set: (this: Date, value: number, ...rest: number[]) => number;
  // getUTC: (this: Date) => number;
  // setUTC: (this: Date, value: number, ...rest: number[]) => number;
}

const millisecond: DateUnit = {
  duration: 1,
  periods: [1],
  get: Date.prototype.getMilliseconds,
  set: Date.prototype.setMilliseconds,
  // getUTC: Date.prototype.getUTCMilliseconds,
  // setUTC: Date.prototype.setUTCMilliseconds
};
const second: DateUnit = {
  duration: 1000,
  periods: [1, 5, 15, 30],
  get: Date.prototype.getSeconds,
  set: Date.prototype.setSeconds,
  // getUTC: Date.prototype.getUTCSeconds,
  // setUTC: Date.prototype.setUTCSeconds
};
const minute: DateUnit = {
  duration: second.duration * 60,
  periods: [1, 5, 15, 30],
  get: Date.prototype.getMinutes,
  set: Date.prototype.setMinutes,
  // getUTC: Date.prototype.getUTCMinutes,
  // setUTC: Date.prototype.setUTCMinutes
};
const hour: DateUnit = {
  duration: minute.duration * 60,
  periods: [1, 3, 6, 12],
  get: Date.prototype.getHours,
  set: Date.prototype.setHours,
  // getUTC: Date.prototype.getUTCHours,
  // setUTC: Date.prototype.setUTCHours
};
const day: DateUnit = {
  duration: hour.duration * 24,
  periods: [1, 2, 7],
  get(this: Date) {
    return this.getDate() - 1;
  },
  set(this: Date, date: number) {
    return this.setDate(date + 1);
  },
  // getUTC(this: Date) {
  //   return this.getUTCDate() - 1;
  // },
  // setUTC(this: Date, date: number) {
  //   return this.setUTCDate(date + 1);
  // }
};
const month: DateUnit = {
  duration: day.duration * 30,
  periods: [1, 3],
  get: Date.prototype.getMonth,
  set: Date.prototype.setMonth,
  // getUTC: Date.prototype.getUTCMonth,
  // setUTC: Date.prototype.setUTCMonth
};
const year: DateUnit = {
  duration: day.duration * 365,
  periods: [1],
  get: Date.prototype.getFullYear,
  set: Date.prototype.setFullYear,
  // getUTC: Date.prototype.getUTCFullYear,
  // setUTC: Date.prototype.setUTCFullYear
};

export const dateUnits = [millisecond, second, minute, hour, day, month, year];

const intervals = dateUnits.reduce((result, unit, index) => {
  return result.concat(unit.periods.map((period) => {
    const value = period * unit.duration;
    return {unit, index, period, value};
  }));
}, [] as {unit: DateUnit, index: number, period: number, value: number}[]);

export function getTimeScaleTicks(
  count: number,
  domain: NumberRange,
  // utc: boolean
): NumberRange {
  const step = (domain[1] - domain[0]) / (count - 1);
  if (!isPositive(step)) {
    return [];
  }
  const ticks: number[] = [];
  const intervalIndex = binarySearch(
    0,
    intervals.length,
    (index) => step < intervals[index].value
  ) - 1;

  if (intervalIndex < 1) {
    return getDecimalScaleTicks(count, domain);
  }

  const intervalData = intervals[intervalIndex];
  const {unit, index: unitIndex} = intervalData;
  const date = new Date(domain[0]);

  for (let index = 0; index < unitIndex; index++) {
    const {/*setUTC, */set} = dateUnits[index];
    (/*utc ? setUTC : */set).call(date, 0);
  }

  let {period} = intervalData;
  if (unit === year) {
    const yearStep = step / year.duration;
    const power = Math.floor(Math.log(yearStep) / Math.LN10);
    const product = Math.pow(10, power);
    period = Math.max(1, Math.floor(yearStep / product)) * product;
  }

  floorDate();

  const firstTick = date.getTime();
  if (firstTick >= domain[0]) {
    ticks.push(firstTick);
  }

  for (;;) {
    (/*utc ? unit.setUTC : */unit.set).call(
      date,
      (/*utc ? unit.getUTC : */unit.get).call(date) + period
    );

    if (unit !== year) {
      floorDate();
    }

    const nextTick = date.getTime();
    if (
      nextTick > domain[1] ||
      ticks.length &&
      !(nextTick > ticks[ticks.length - 1])
    ) {
      break;
    }
    ticks.push(nextTick);
  }

  return ticks;

  function floorDate() {
    if (period === 1) {
      return;
    }
    const value = (/*utc ? unit.getUTC : */unit.get).call(date);
    const diff = value % period;
    if (diff === 0) {
      return;
    }
    (/*utc ? unit.setUTC : */unit.set).call(date, value - diff);
  }
}
