var compilePattern = (function() {

  var firstArgName = "val";
  var secondArgName = "when";
  var guardArgName = "guard";

  //for unit tests
  if (typeof exports !== 'undefined') exports.createRegrouper = createRegrouper;

  return function compilePattern(patterns, plugins, helper) {
    var parse = createParser(firstArgName, plugins);
    var regroup = createRegrouper();
    var createFn = createRenderer(firstArgName, secondArgName, guardArgName, plugins);

    return createFn(regroup(patterns.map(function(pattern, idx) {
      return parse(pattern, idx, helper);
    })), helper.renderOptions);
  };

  // #include "parser.js"
  // #include "regrouper.js"
  // #include "renderer.js"

})();

