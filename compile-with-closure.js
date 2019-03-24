const ClosureCompiler = require('google-closure-compiler').compiler;
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const emitEmptyFiles = [
  './built/axis/index.css',
  './built/index.css'
];
emitEmptyFiles.forEach((fileName) => {
  if (!fs.existsSync(fileName)) {
    fs.closeSync(fs.openSync(fileName, 'w'));
  }
});

const distDirectory = './dist';
const distFiles = fs.readdirSync(distDirectory);
const mainFile = distFiles.find((name) => /^main(-.*?)?\.js$/.test(name));
if (!mainFile) {
  throw new Error(`No main find found in: ${distFiles}.`);
}
const outputFile = path.join(distDirectory, mainFile);

const closureCompiler = new ClosureCompiler({
  compilation_level: 'ADVANCED_OPTIMIZATIONS',
  language_in: 'ES6_STRICT',
  language_out: 'ES6',
  variable_renaming_report: './built/app-variable_renaming_report',
  property_renaming_report: './built/app-property_renaming_report',
  warning_level: 'QUIET',
  rewrite_polyfills: false,
  // process_common_js_modules: true,
  module_resolution: 'node',
  dependency_mode: 'STRICT',
  entry_point: ['./built/index.js'],
  js: ['built/**.*'],
  js_output_file: [outputFile],
  externs: ['./closure-externs.js']
});

const compilerProcess = closureCompiler.run((exitCode, stdOut, stdErr) => {
  if (stdErr) {
    console.error(stdErr);
    return;
  }
  console.log(stdOut);
  compress();
});

function compress() {
  const gzip = zlib.createGzip();
  const inputStream = fs.createReadStream(outputFile);
  const outputStream = fs.createWriteStream(`${outputFile}.gz`);

  inputStream.pipe(gzip).pipe(outputStream);
}
