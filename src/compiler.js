var compilePattern = (function() {

  var firstArgName = "val";
  var secondArgName = "when";
  var guardArgName = "guard";

  var parse = createParser(firstArgName);
  var regroup = createRegrouper();
  var createFn = createRenderer(firstArgName, secondArgName, guardArgName);

  //for unit tests
  if (typeof exports !== 'undefined') exports.createRegrouper = createRegrouper;

  return function compilePattern(patterns, helper) {
    return createFn(regroup(patterns.map(function(pattern, idx) {
      return parse(pattern, idx, helper);
    })), helper.renderOptions);
  };

  // #include "parser.js"
  // #include "regrouper.js"
  // #include "renderer.js"

})();

