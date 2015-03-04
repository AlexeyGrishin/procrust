(function(exports){

  // #include "common.js"
  // #include "compiler.js"
  // #include "matcher.js"

  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = Tail;
  exports.ObjectOf = ObjectOf;
  exports.debug = {
    functions: false,
    parsed: false,
    matching: false
  };

})(typeof exports === 'undefined'? this['procrust']={}: exports);