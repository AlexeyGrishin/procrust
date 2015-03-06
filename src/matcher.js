var _ = new Placeholder("_");
_.meet = function() {
  return this;
};

//Global context - used to pass data from Match to Whens
var context = {
  kvars: {},
  idvars: {},
  placeholderId: 1,
  waitingForHead: true,
  onNew: function() {
    this.placeholderId = 1;
    this.idvars = {};
  },
  nextPlaceholderId: function() {
    var id = this.placeholderId;
    this.placeholderId = this.placeholderId << 1;
    return id;
  }
};

//Represents placeholder variable (i.e. @x, @y, etc.) that will be filled with value during destruction
//@param key - is a variable name
//@param id - is a numeric id which shall be power of 2 and used to detect @head | @tail construction
function Placeholder(key, id) {
  this.__key = key;
  this.__id = id;
}
Placeholder.prototype = {
  valueOf: function() {
    this.__id = context.nextPlaceholderId();
    context.idvars[this.__id] = this;
    if (context.waitingForHead)
      this.__head = true;
    else
      this.__tail = true;
    context.waitingForHead = !context.waitingForHead;
    return this.__id;
  },
  meet: function() {
    return new Placeholder(this.__key);
  }
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
  var value, patternsAndFns, patterns, whenFns, guards, compiled;
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
      value = arguments[0];
      whensFactories = arguments[1];
    }
  }
  getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
  context.onNew();
  patternsAndFns = whensFactories.call(context.kvars);
  patterns = _puck("pattern", patternsAndFns);
  guards = _puck("guard", patternsAndFns);
  whenFns = _puck("execute", patternsAndFns);
  try {
    compiled = doCompilePatterns(patterns, context.idvars);
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

function doCompilePatterns(patterns, varsById) {
  return compilePattern(patterns, {
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
    },
    resolveTail: function(array) {
      if (!array.length) return [array];
      array = bitwiseOrDetector(array, varsById);
      var last = array[array.length-1];
      if (last.__tail) {
        array.pop();
        return [array, last]
      }
      else {
        return [array];
      }
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

function Tail(vr) {
  vr.__tail = true;
  return vr;
}

var global = (function() { return this;})();
function ObjectOf() {
  if (arguments[0] === global) {
    //constructor called as function, matching case
    return new ObjectMatcher(arguments[1], arguments[2][0]);
  } else if (typeof arguments[0] === 'function') {
    return new ObjectMatcher(arguments[0], arguments[1]);
  } else {
    //this is normally created object, ignore
    return false;
  }
}

function bitwiseOrDetector(list, varsById) {
  var last = list[list.length - 1];
  if (typeof last == "number") {
    //try to find by id
    var ids = [];
    var id = 1;
    while (last != 0) {
      if (last & 1 == 1) {
        ids.push(id);
      }
      last = last >> 1;
      id = id << 1;
    }
    if (ids.length == 2) {
      var append = [varsById[ids[0]], varsById[ids[1]]];
      if (append[0] == null || append[1] == null || !append[0].__head || !append[1].__tail) {
        console.warn("Head/Tail detector seems to be broken", "Head=", append[0], "Tail=", append[1]);
      }
      else {
        list.pop();
        list.push(append[0]);
        list.push(append[1]);
      }
    }
  }
  return list;
}