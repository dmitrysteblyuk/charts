import {getChartsRenderer, ChartConfig} from './initialize';

bootstrapCharts(
  (window as any)['initialChartData'],
  document.getElementById('root')!
);

function bootstrapCharts(json: ChartConfig[], rootElement: HTMLElement) {
  const isPrerendered = rootElement.children.length > 0;

  const {charts, render, rootSelection} = getChartsRenderer(
    json,
    isPrerendered ? undefined : rootElement,
    document.body
  );

  (window as any)['json'] = json;
  (window as any)['charts'] = charts;

  render(500);

  // window.onresize = () => {
  //   render();
  // };

  if (!isPrerendered) {
    return;
  }

  rootSelection.connectToElement(rootElement);
  charts.forEach(({redraw}) => redraw());
}
