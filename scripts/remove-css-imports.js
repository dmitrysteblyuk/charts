const fs = require('fs');

const filesWithCSSImports = [
  './built/lib/selection.js',
  './built/legend/index.js',
  './built/tooltip/index.js',
  './built/time-chart/index.js',
  './built/initialize.js'
];

filesWithCSSImports.forEach((fileName) => {
  fs.writeFileSync(
    fileName,
    fs.readFileSync(fileName).toString().replace(/\bimport\s+'.*?\.css';/g, '')
  );
});
