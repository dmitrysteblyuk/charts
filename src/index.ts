import {
  getChartsRenderer,
  ChartConfig,
  defaultPrerenderArgs
} from './initialize';
import {memoize} from './lib/memoize';
import {isArrayEqual} from './lib/utils';

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
  const memoizedRender = memoize(render, 1);

  (window as any)['json'] = json;
  (window as any)['charts'] = charts;

  if (isPrerendered) {
    memoizedRender(...defaultPrerenderArgs);
  } else {
    renderCharts();
  }

  window.onresize = renderCharts;

  if (!isPrerendered) {
    return;
  }

  rootSelection.connectToElement(rootElement);

  if (isArrayEqual(defaultPrerenderArgs, getRenderArgs())) {
    charts.forEach(({redraw}) => redraw());
  } else {
    renderCharts();
  }

  const supportsTouch = 'ontouchstart' in window;

  function getRenderArgs(): typeof defaultPrerenderArgs {
    return [
      Math.min(
        500,
        (supportsTouch ? window.outerWidth : window.innerWidth) - 50
      ),
      window.devicePixelRatio || 1
    ];
  }

  function renderCharts() {
    memoizedRender(...getRenderArgs());
  }
}
