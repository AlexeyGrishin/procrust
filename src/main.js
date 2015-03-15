
(function (exports, glob) {
  'use strict';
  /*jslint white:true, nomen:true, plusplus:true*/

  var compilePattern, pluginsFactory, _;

  // #include "common.js"
  // #include "plugins/plugins.js"
  // #include "plugins/array.js"
  // #include "plugins/bitregistry.js"
  // #include "plugins/class.js"
  // #include "plugins/done.js"
  // #include "plugins/headtail.js"
  // #include "plugins/object.js"
  // #include "plugins/objectof.js"
  // #include "plugins/primitive.js"
  // #include "plugins/reference.js"

  // #include "compiler.js"


  pluginsFactory = new PluginsFactory()
    .add(pluginBitregistry)
    .add(pluginHeadTail)
    .add(pluginArray)
    .add(pluginPrimitive)
    .add(pluginObjectOf)
    .add(pluginObject)
    .add(pluginReference)
    .add(pluginConstructor);

  // #include "matcher.js"

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
  exports.When = When;
  exports.Having = Having;
  exports.Tail = pluginHeadTail.createTail;
  exports.ObjectOf = pluginObjectOf.ObjectOf;
  exports.debug = {
    functions: false,
    parsed: false,
    matching: false
  };

}(typeof exports === 'undefined'? this['procrust']={}: exports, typeof window === 'undefined' ? global : window));