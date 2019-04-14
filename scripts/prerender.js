const fs = require('fs');

let initialChartData;
global.onChartDataLoad = (_) => (initialChartData = _);
global.window = {
  addEventListener() {},
  devicePixelRatio: 2
};

require('import-export');
require('../initial.data.jsonp');
require('./remove-css-imports');

const {getChartsRenderer} = require('../built/initialize');

const {render, rootSelection} = getChartsRenderer(initialChartData);

render(500);

const markup = rootSelection.setAttrs({'id': 'root'}).getStaticMarkup();

const indexFile = './dist/index.html';
let indexContent = fs.readFileSync(indexFile).toString();

indexContent = indexContent.replace(
  /<div id="root">(\s|.)*?(<script\b|<\/body>)/,
  markup + '$2'
);

let mainScript;
indexContent = indexContent.replace(
  /(<script(\s+type="text\/javascript")?\s+src="main-.*?\.js"><\/script>)/,
  (match) => {
    mainScript = match;
    return '';
  }
);

if (mainScript) {
  mainScript = mainScript.replace(/(<script)/, '$1 async');
  indexContent = indexContent.replace(
    /(\.data\.jsonp"><\/script>)/,
    '$1' + mainScript
  );
}

fs.writeFileSync(indexFile, indexContent);
