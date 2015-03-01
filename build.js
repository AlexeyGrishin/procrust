var Preprocessor = require('preprocessor')
  , fs = require('fs');

var p = new Preprocessor(fs.readFileSync('./src/main.js'), './src');
fs.writeFileSync('./procrust.js', p.process());
console.log("Done!");
