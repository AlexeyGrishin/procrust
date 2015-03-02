var Preprocessor = require('preprocessor')
  , fs = require('fs');

function preprocess(from, using) {
  var p = new Preprocessor(fs.readFileSync(from), using);
  p.baseDir = './src';
  return p.process();
}

function preprocessTo(from, to, using) {
  fs.writeFileSync(to, preprocess(from, using));
}

preprocessTo("./src/main.js", "./procrust.js", {
  'compiler.js': preprocess('./src/compiler.js')
});
console.log("Done!");
