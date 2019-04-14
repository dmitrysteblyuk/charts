import {getChartsRenderer, ChartConfig} from './initialize';

(window as any)['bootstrapCharts'] = bootstrapCharts;
(window as any)['bootstrapIfReady']();

function bootstrapCharts(json: ChartConfig[], rootElement: HTMLElement) {
  const isPrerendered = rootElement.children.length > 0;

  const {charts, render, rootSelection} = getChartsRenderer(
    json,
    isPrerendered ? undefined : rootElement
  );

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
