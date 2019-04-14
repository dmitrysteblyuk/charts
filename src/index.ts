import {getChartsRenderer, ChartConfig} from './initialize';

(window as any)['bootstrapCharts'] = bootstrapCharts;
(window as any)['bootstrapIfReady']();

function bootstrapCharts(json: ChartConfig[], rootElement: HTMLElement) {
  const {charts, render, rootSelection} = getChartsRenderer(json);

  (window as any)['charts'] = charts;

  render(500);

  // console.log(rootSelection.getHTML());
  // rootSelection.connectToElement(rootElement);
  rootSelection.bootstrap(rootElement);
  charts.forEach(({redraw}) => redraw());

  // window.onresize = () => {
  //   render();
  // };
}
