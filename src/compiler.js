var compilePattern = (function() {

  var firstArgName = "val";
  var secondArgName = "when";

  var parse = createParser(firstArgName);
  var regroup = createRegrouper();
  var createFn = createRenderer(firstArgName, secondArgName);


  return function compilePattern(patterns, helper) {
    return createFn(regroup(patterns.map(function(pattern, idx) {
      return parse(pattern, idx, helper);
    })), helper.renderOptions);
  };

  // #include "parser.js"
  // #include "regrouper.js"
  // #include "renderer.js"

})();

