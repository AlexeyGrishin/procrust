(function(exports){

  // #include "common.js"
  // #include "compiler.js"

  // #include "plugins/plugins.js"
  // #include "plugins/array.js"
  // #include "plugins/bitregistry.js"
  // #include "plugins/class.js"
  // #include "plugins/done.js"
  // #include "plugins/headtail.js"
  // #include "plugins/object.js"
  // #include "plugins/objectof.js"
  // #include "plugins/plugins.js"
  // #include "plugins/primitive.js"
  // #include "plugins/reference.js"

  // #include "matcher.js"
  var pluginsFactory = new PluginsFactory()
    .add(pluginBitregistry)
    .add(pluginHeadTail)
    .add(pluginArray)
    .add(pluginPrimitive)
    .add(pluginObjectOf)
    .add(pluginObject)
    .add(pluginReference)
    .add(pluginConstructor);
  exports.plugins = {
    array: pluginArray,
    bitRegistry: pluginBitregistry,
    headTail: pluginHeadTail,
    object: pluginObject,
    objectOf: pluginObjectOf,
    primitive: pluginPrimitive,
    reference: pluginReference,
    constructor: pluginConstructor,

    add: function(p) {
      pluginsFactory.add(p);
    },
    addFirst: function(p) {
      pluginsFactory.addFirst(p);
    },
    erase: function() {
      pluginsFactory.erase();
    }
  };
  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = pluginHeadTail.createTail;
  exports.ObjectOf = pluginObjectOf.ObjectOf;
  exports.debug = {
    functions: false,
    parsed: false,
    matching: false
  };

})(typeof exports === 'undefined'? this['procrust']={}: exports);