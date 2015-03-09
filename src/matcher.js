//Global context - used to pass data from Match to Whens
var context = {
  kvars: {}
};

//Represents placeholder variable (i.e. @x, @y, etc.) that will be filled with value during destruction
//@param key - is a variable name
function Placeholder(key) {
  this.__key = key;
}
Placeholder.prototype = {
  meet: function() {
    return new Placeholder(this.__key);
  }
};
var _ = new Placeholder("_");
_.meet = function() {
  return this;
};

function isPrimitive(obj) {
  var type = typeof obj;
  return type === "string" || type === "number" || type === "boolean";
}

function createPlaceholder(name) {
  var placeholder = name === "_" ? _ : new Placeholder(name);

  Object.defineProperty(context.kvars, name, {
    configurable: true,
    get: function() {
      return placeholder.meet();
    },
    set: function(vl) {
      if (vl === null) return;
      if (vl.__key) throw new Error("Cannot assign pattern variables to each other!");
      if (isPrimitive(vl)) {
        throw new Error("Cannot assign pattern variable to constant num (well, why do you need it for?)");
      }
      else {
        if (!vl.hasOwnProperty("__reference")) {
          var allRefs = [];
          Object.defineProperty(vl, "__reference", {
            configurable: false,
            enumerable: false,
            get: function() {
              return allRefs.shift();
            },
            set: function(vl) {
              allRefs.push(vl);
            }
          });
        }
        vl.__reference = placeholder.meet();
      }
    }
  });
  return placeholder;
}

function getAll(regexp, text) {
  var vals = {};
  var val = regexp.exec(text);
  while (val) {
    vals[val[1]] = true;
    val = regexp.exec(text);
  }
  return Object.keys(vals);
}


function Match(whensFactories) {
  var value, patternsAndFns, patterns, whenFns, guards, compiled, plugins;
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
      value = arguments[0];
      whensFactories = arguments[1];
    }
  }
  getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
  plugins = pluginsFactory.create();
  plugins.before_parse();
  try {
    patternsAndFns = whensFactories.call(context.kvars);
  }
  finally {
    plugins.after_parse();  //TODO: rename
  }
  patterns = _puck("pattern", patternsAndFns);
  guards = _puck("guard", patternsAndFns);
  whenFns = _puck("execute", patternsAndFns);
  try {
    compiled = doCompilePatterns(patterns, plugins);
  }
  catch (e) {
    console.error(e, e.stack);
    throw e;
  }
  match.matchFn = compiled;
  if (typeof value !== 'undefined') return match(value);
  return match;

  function match(value) {
    var res = compiled(value, whenFns, guards);
    if (res) return res.ok;
    throw new Error("Value is not matched by any condition: '" + value + "'");
  }
}

function doCompilePatterns(patterns, plugins) {
  return compilePattern(patterns, plugins, {
    getResultRef: function(o) {
      if (o === _) return null;
      var lastRef = o.__reference;
      if (lastRef) return lastRef.__key;
      if (o.__key) return o.__key;
    },
    isResultVar: function(o) {return o instanceof Placeholder;},
    isWildcard: function(i) { return i === _;},
    renderOptions: {
      debug: exports.debug
    }
  })
}

function When(pattern, execute) {
  if (context.multipleParamsInWhen) {
    var args = [].slice.call(arguments);
    execute = args.pop();
    pattern = args;
  }
  var guards = [];
  var guardSucceeded = function() { return true;};
  if (Array.isArray(execute)) {
    guards = execute;
    execute = guards.pop();
    guardSucceeded = function(ctx) {
      return !guards.some(function(g) { return !g.call(ctx); })
    }
  }
  return {pattern: pattern, guard: guardSucceeded, execute: function(ctx) { return execute.call(ctx); }};

}

function Having(guardFn) {
  return function(execute) {
    return [guardFn, execute]
  }
}

function functionMatch() {
  context.multipleParamsInWhen = true;
  var fn = Match.apply(this, arguments);
  context.multipleParamsInWhen = false;
  return function() {
    var args = [].slice.call(arguments);
    return fn(args);
  }
}
