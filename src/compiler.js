compilePattern = (function() {

  // #include "parser.js"
  // #include "renderer.js"
  // #include "regrouper.js"

  var firstArgName = "val", secondArgName = "when", guardArgName = "guard";

  //for unit tests
  if (exports !== 'undefined') {
    exports.createRegrouper = createRegrouper;
  }

  return function compilePattern(patterns, plugins, helper) {
    var parse = createParser(firstArgName, plugins), regroup = createRegrouper(), createFn = createRenderer(firstArgName, secondArgName, guardArgName, plugins);

    return createFn(regroup(patterns.map(function(pattern, idx) {
      return parse(pattern, idx, helper);
    })), helper.renderOptions);
  };

}());

