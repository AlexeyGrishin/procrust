//Represents placeholder variable (i.e. @x, @y, etc.) that will be filled with value during destruction
//@param key - is a variable name
function Placeholder(key) {
  this.__key = key;
}
Placeholder.prototype = {
  length: 1,
  meet: function() {
    return new Placeholder(this.__key);
  }
};

//this is for [@head, @tail...] syntax
Object.defineProperty(Placeholder.prototype, 0, {
  get: function() { return pluginHeadTail.createTail(this); }
});


//special 'wildcard' variable which matches anything
_ = new Placeholder("_");
_.meet = function() {
  return this;
};

function isPrimitive(obj) {
  var type = typeof obj;
  return type === "string" || type === "number" || type === "boolean";
}

//Here we define getter/setter for each variable like @x (== this.x)
//We cannot just assign Placeholder object because we need to catch assignment.
function createPlaceholder(context, name) {
  var placeholder = name === "_" ? _ : new Placeholder(name);

  Object.defineProperty(context, name, {
    //allow redefinition
    configurable: true,

    //just return placeholder copy
    get: function() {
      return placeholder.meet();
    },

    //in expression like `When @x = {a:1}` the right part ({a:1}) will be returned, so we'll miss the knowledge about variable
    //so here in setter we add reference to @x to the assigned object
    //it does not work with primitives, but I do not think it is a problem (why do we need to write `When @x = 5` ?)
    set: function(vl) {
      if (vl === null) {
        return;
      }
      if (vl.__key) {
        throw new Error("Cannot assign pattern variables to each other!");
      }
      if (isPrimitive(vl)) {
        throw new Error("Cannot assign pattern variable to constant num (well, why do you need it for?)");
      }
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
  });
  return placeholder;
}

function getAll(regexp, text) {
  var vals = {}, val = regexp.exec(text);
  while (val) {
    vals[val[1]] = true;
    val = regexp.exec(text);
  }
  return Object.keys(vals);
}


function doCompilePatterns(patterns, plugins) {
  return compilePattern(patterns, plugins, {
    getResultRef: function(o) {
      if (o === null || o === _) {
        return null;
      }
      var lastRef = o.__reference;
      if (lastRef) {
        return lastRef.__key;
      }
      if (o.__key) {
        return o.__key;
      }
    },
    isResultVar: function(o) {return o instanceof Placeholder;},
    isWildcard: function(i) { return i === _;},
    renderOptions: {
      debug: exports.debug
    }
  });
}

function Match(value, whensFactories) {
  var patternsAndFns, patterns, whenFns, guards, compiled, plugins, context;
  if (arguments.length === 1) {
    whensFactories = value;
    value = undefined;
  }
  context = {};
  getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder.bind(null, context));
  plugins = pluginsFactory.create();
  plugins.before_parse();
  try {
    patternsAndFns = whensFactories.call(context);
  }
  finally {
    plugins.after_parse();
  }
  patterns = _puck("pattern", patternsAndFns);
  guards = _puck("guard", patternsAndFns);
  whenFns = _puck("execute", patternsAndFns);
  try {
    compiled = doCompilePatterns(patterns, plugins);
  }
  catch (e) {
    console.error(e, e.stack, whensFactories.toString());
    throw e;
  }


  function match(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
    var res = compiled(whenFns, guards, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    if (res) {
      return res.ok;
    }
    throw new Error("Arguments are not matched by any condition: " + [].slice.call(arguments).join(","));
  }


  match.matchFn = compiled;
  if (value !== undefined) {
    return match(value);
  }
  return match;
}



function When(pattern, execute) {
  var args = [].slice.call(arguments), guards = [], guardSucceeded;
  execute = args.pop();
  pattern = new ArgumentsPattern(args);
  guardSucceeded = function() { return true;};
  if (Array.isArray(execute)) {
    guards = execute;
    execute = guards.pop();
    guardSucceeded = function(ctx) {
      return !guards.some(function(g) { return !g.call(ctx); });
    };
  }
  return {pattern: pattern, guard: guardSucceeded, execute: function(ctx) { return execute.call(ctx); }};

}

function Having(guardFn) {
  return function(execute) {
    return [guardFn, execute];
  };
}