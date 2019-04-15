const fs = require('fs');

global.window = {
  addEventListener() {},
  devicePixelRatio: 2
};

require('import-export');
require('../initial.data.jsonp');
require('./remove-css-imports');

const {
  getChartsRenderer,
  defaultPrerenderArgs
} = require('../built/initialize');

const {render, rootSelection} = getChartsRenderer(
  global.window.initialChartData
);

render(...defaultPrerenderArgs);

const markup = rootSelection.setAttrs({'id': 'root'}).getStaticMarkup();

const indexFile = './dist/index.html';
let indexContent = fs.readFileSync(indexFile).toString();

indexContent = indexContent.replace(
  /<div id="root">(\s|.)*?(<script\b|<\/body>)/,
  markup + '$2'
);

let mainScript;
indexContent = indexContent.replace(
  /(<script(\s+type="text\/javascript")?\s+src="main\-.*?\.js"><\/script>)/,
  (match) => {
    mainScript = match;
    return '';
  }
);

if (mainScript) {
  mainScript = mainScript
    .replace(/(<script\b)/, '$1 defer')
    .replace(/\bsrc="main\-/, 'src="./main-');

  indexContent = indexContent.replace(
    /(<script)(\s+type="text\/javascript")?(\s+src="\.\/initial.data.jsonp"><\/script>)/,
    '$1 defer$2$3' + mainScript
  );
}

fs.writeFileSync(indexFile, indexContent);
