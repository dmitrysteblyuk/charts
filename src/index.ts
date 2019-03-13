import * as d3 from 'd3';
import {data as chartData} from './data';
import {TimeChart} from './time-chart';
import {Selection} from './lib/selection';
import {LinearScale} from './lib/linear-scale';
import {TimeScale} from './lib/time-scale';
import {binarySearch} from './lib/binary-search';

interface Datum {
  date: Date;
  price: number;
}

(window as any).LinearScale = LinearScale;
(window as any).TimeScale = TimeScale;
(window as any).binarySearch = binarySearch;

const svg = d3.select('#root')
  .append('svg')
  .attr('width', Math.min(500, window.innerWidth - 100))
  .attr('height', '500');

const margin = {top: 20, right: 20, bottom: 110, left: 40};
const margin2 = {top: 430, right: 20, bottom: 30, left: 40};
const width = +svg.attr('width') - margin.left - margin.right;
const height = +svg.attr('height') - margin.top - margin.bottom;
const height2 = +svg.attr('height') - margin2.top - margin2.bottom;

const timeChart = new TimeChart();
timeChart.setProps({width, helperHeight: height2});

const x = timeChart.timeScale.range([0, width]);
const x2 = timeChart.helperTimeScale.range([0, width]);
const y = timeChart.valueScale.range([height, 0]);
const y2 = timeChart.helperValueScale.range([height2, 0]);

const brush = d3.brushX()
  .extent([[0, 0], [width, height2]])
  .on('brush end', brushed);

const zoom = d3.zoom<SVGRectElement, {}>()
  .scaleExtent([1, Infinity])
  .translateExtent([[0, 0], [width, height]])
  .extent([[0, 0], [width, height]])
  .on('zoom', zoomed);

const line = d3.line<Datum>()
  .curve(d3.curveMonotoneX)
  .x((d) => x(d.date))
  .y((d) => y(d.price));

const line2 = d3.line<Datum>()
  .curve(d3.curveMonotoneX)
  .x((d) => x2(d.date))
  .y((d) => y2(d.price));

svg.append('defs').append('clipPath')
  .attr('id', 'clip')
  .append('rect')
  .attr('width', width)
  .attr('height', height);

const focus = svg.append('g')
  .attr('class', 'focus')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

const context = svg.append('g')
  .attr('class', 'context')
  .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');

const chartElement = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
  .node() as Element;
const chartSelection = new Selection(chartElement);
timeChart.render(chartSelection);

loadData(chartData);

function loadData(data: Datum[]) {
  x.domain(d3.extent(data, (d) => d.date) as [Date, Date]);
  y.domain([0, d3.max(data, (d) => d.price) as number]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  focus.append('path')
    .datum(data)
    .attr('class', 'line')
    .attr('d', line);

  context.append('path')
    .datum(data)
    .attr('class', 'line')
    .attr('d', line2);

  timeChart.render(chartSelection);

  d3.select(chartElement.children[0])
    .select('g:nth-child(2) > g:first-child')
    .attr('transform', 'translate(0,' + height + ')')
    .attr('class', 'axis axis--x');

  d3.select(chartElement.children[1])
    .select('g:nth-child(2) > g:first-child')
    .attr('transform', 'translate(0,' + (margin2.top + margin.top) + ')')
    .attr('class', 'axis axis--x');

  d3.select(chartElement.children[2])
    .attr('transform', 'translate(0,' + (height + margin.top) + ')');

  context.append('g')
    .attr('class', 'brush')
    .call(brush)
    .call(brush.move, x.range());

  svg.append('rect')
    .attr('class', 'zoom')
    .attr('width', width)
    .attr('height', height)
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .call(zoom);
}

function brushed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') {
    return;
  }
  const s = d3.event.selection || x2.range();
  x.domain(s.map(x2.invert, x2));
  focus.select('.line').attr('d', line as any);

  timeChart.render(chartSelection);

  svg.select('.zoom').call(zoom.transform as any, d3.zoomIdentity
    .scale(width / (s[1] - s[0]))
    .translate(-s[0], 0));
}

function zoomed() {
  if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') {
    return;
  }
  const t = d3.event.transform;
  x.domain(t.rescaleX(x2).domain());
  focus.select('.line').attr('d', line as any);

  timeChart.render(chartSelection);

  context.select('.brush').call(brush.move as any, x.range().map(t.invertX, t));
}
