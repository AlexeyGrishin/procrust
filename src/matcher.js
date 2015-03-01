var _ = new Placeholder("_");
_.meet = function() {
  return this;
};

//Global context - used to pass data from Match to Whens
var context = {
  vars: [],
  kvars: {},
  metvars: {},
  placeholderId: 1,
  onNew: function() {
    this.placeholderId = 1;
    this.metvars = {};
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
  toString: function() {
    if (this.__id == undefined) {
      this.__id = context.nextPlaceholderId();
    }
    return this.__id;
  },
  clone: function() { return new Placeholder(this.__key, this.__id); },
  meet: function() {
    var specific = context.metvars[this.__key];
    if (specific == null) {
      specific = new Placeholder(this.__key);
      context.metvars[this.__key] = specific;
    }
    return specific;
  }
};

function createPlaceholder(name) {
  var placeholder = name === "_" ? _ : new Placeholder(name);

  Object.defineProperty(context.kvars, name, {
    configurable: true,
    get: function() {
      return placeholder.meet();
    },
    set: function(vl) {
      if (vl.__key) throw new Error("Cannot assign pattern variables to each other!");
      if (typeof vl == "object") {
        Object.defineProperty(vl, "__reference", {
          enumerable: false,
          writable: false,
          value: placeholder.meet()
        });
      }
      else if (vl != null) {
        throw new Error("Cannot assign pattern variable to constant num (well, why do you need it for?)");
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
  var value, patternsAndFns, patterns, whenFns, compiled;
  var resultsHolder = {result: null};
  if (arguments.length == 2) {
    if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
      value = arguments[0];
      whensFactories = arguments[1];
    }
  }
  getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
  context.onNew();
  patternsAndFns = whensFactories.call(context.kvars);
  patterns = patternsAndFns.map(function(p) { return p.pattern;});
  whenFns = patternsAndFns.map(function(p) { return p.produceWhenFn(resultsHolder);});
  try {
    compiled = doCompilePatterns(patterns, context.metvars);
  }
  catch (e) {
    if (compiled && exports.debug) console.error(compiled.toString());
    console.error(e, e.stack);
    throw e;
  }
  match.matchFn = compiled;
  if (typeof value !== 'undefined') return match(value);
  return match;

  function match(value) {
    var ok = compiled(value, whenFns);
    if (ok) return resultsHolder.result;
    throw new Error("Value is not matched by any condition: '" + value + "'");
  }
}

function doCompilePatterns(patterns, allVarsDict) {
  var allVars = [];
  for (var k in allVarsDict) {
    if (allVarsDict.hasOwnProperty(k)) allVars.push(allVarsDict[k]);
  }
  return compilePattern(patterns, {
    getResultRef: function(o) {
      if (o === _) return null;
      if (o.__reference) return o.__reference.__key;
      if (o.__key) return o.__key;
    },
    isResultVar: function(o) {return o instanceof Placeholder;},
    isWildcard: function(i) { return i === _;},
    renderOptions: {
      debug: exports.debug,
      printParsed: exports.printParsed,
      printFunctions: exports.printFunctions
    },
    resolveTail: function(array) {
      if (!array.length) return [array];
      array = bitwiseOrDetector(array, allVars);
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
  return {pattern: pattern, produceWhenFn: function produceWhenFn(resultHolder) {
    return function(ctx) {
      var result = execute.call(ctx);
      if (ctx.__rejected) return false;
      resultHolder.result = result;
      return true;
    }
  }};

}

function Having(guardFn) {
  return function(execute) {
    return function() {
      if (!guardFn.call(this)) {
        return this.__rejected = true;
      }
      return execute.call(this);
    }
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

function bitwiseOrDetector(list, myVars) {
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
      var headId = ids[0];
      var tailId = ids[1];
      var append = [null, null];
      for (var i = 0; i < myVars.length; i++) {
        var vr = myVars[i];
        if (vr.__id == headId) append[0] = vr;
        if (vr.__id == tailId) {
          append[1] = vr;
          vr.__tail = true;
        }
      }
      if (append[0] == null || append[1] == null) {
        console.warn("Head/Tail detector seems to be broken");
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