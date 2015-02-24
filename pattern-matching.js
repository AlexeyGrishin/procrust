(function(exports){

  var _ = {__key: "_", __everything__matching__placeholder: true};
  var context = {
    vars: [],
    kvars: {},
    when: {},
    nextWhen: function() {
      this.vars.forEach(function(vr) { vr.reset(); });
      this.when = {usedVars: [], usedKeys: {}, placeholderId: 1};
    }
  };

  function createPlaceholder(name) {
    var val = {
      __key: name,
      __id: NaN,
      toString: function() { return this.__id; },
      reset: function() { this.__id = NaN; delete this.__tail;},
      replace: function() {
        delete context.when.usedKeys[this.__key];
        meet();
      },
      clone: function() {
        return {
          __key: this.__key,
          __whole: this.__whole,
          __tail: this.__tail,
          __value: undefined,
          __id: this.__id
        }
      }
    };

    function meet() {
      var cw = context.when;
      if (cw.usedKeys[val.__key]) return;
      val.__id = cw.placeholderId;
      cw.placeholderId = cw.placeholderId << 1;
      cw.usedKeys[val.__key] = true;
      cw.usedVars.push(val.clone());
    }
    Object.defineProperty(context.kvars, name, {
      configurable: true,
      get: function() {
        meet();
        return val;
      },
      set: function(vl) {
        val.__whole = true;
        val.__value = vl;
        meet();
      }
    });
    return val;
  }

  function getAll(regexp, text) {
    var vals = {};
    var val = regexp.exec(text);
    while (val) {
      vals[val[1]] = 1;
      val = regexp.exec(text);
    }
    return Object.keys(vals);
  }


  function Match(whensFactories) {
    var value;
    if (arguments.length == 2) {
      if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
        value = arguments[0];
        whensFactories = arguments[1];
      }
    }
    context.vars = getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
    context.nextWhen();
    var whenFns = whensFactories.call(context.kvars);
    if (typeof value !== 'undefined') return match(value);
    return match;

    function match(value) {
      for (var i = 0; i < whenFns.length; i++) {
        var next = false;
        var res = whenFns[i](value, function() {next = true;}) ;
        if (!next) return res;
      }
      throw "Value is not matched by any condition: '" + value + "'";
    }
  }

  function When(pattern, execute) {
    if (context.multipleParamsInWhen) {
      var args = [].slice.call(arguments);
      execute = args.pop();
      pattern = args;
    }
    var myVars = context.when.usedVars;
    var myVarsDict = {};
    var wholeVar = "__value";
    myVars.forEach(function(mv) {
      myVarsDict[mv.__key] = mv;
      if (mv.__whole) wholeVar = mv.__key;
    });
    myVarsDict["_"] = _;
    pattern = updatePattern(pattern, myVarsDict);
    var compiled = compilePattern(pattern);
    context.nextWhen();
    return function(value, next) {
      var res = compiled(value);
      if (typeof res === "object") {
        var ctx = res;
        ctx[wholeVar] = value;
        ctx.__rejected = false;
        res = execute.call(ctx);
        if (ctx.__rejected) return next();
        return res;
      }
      else {
        if (exports.debug) console.log(res);
        return next();
      }

    }
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
    vr.replace();
    return vr;
  }

  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = Tail;
  exports.debug = false;

  function print(o) {
    if (o && o.__key) return "<@" + o.__key + ">";
    var a =  JSON.stringify(o);
    if (a && a.length > 40) {
      return a.slice(0, 20) + "..." + a.slice(a.length - 20);
    }
    return a;
  }


  function compilePattern(pattern) {
    var code = [print.toString().replace(/[\n\r]/g, '')];
    var varIdx = 1;
    function add(c) { code.push(c + ";"); }
    var vars = [];
    var props = {};
    function assignVar(ex) {
      var vname = "__" + varIdx++;
      vars.push(vname);
      add(vname + " = " + ex);
      return vname;
    }

    function compilePart(p, varName) {
      var i;
      if (typeof p == 'undefined') {
        add("return " + varName + " == null ? true : 'Expected undefined but got ' + print(" + varName + ");");
        return;
      }
      add("if (" + varName + " == null) return 'Got undefined, but expected " + print(p) + "';");
      if (p == _) {
        return;
      }
      if (p.__key) {
        if (!props[p.__key]) {
          props[p.__key] = varName;
        }
        else {
          add("if (" + varName + " !== " + props[p.__key] + ") return 'Previous time " + print(p) + " was set to ' + print(" + props[p.__key] + ") + ' but this time it is ' + print(" + varName + ");")
        }

      }
      else if (typeof p == 'function') {
        add("if (" + varName + ".constructor.name !== '" + p.name + "') return 'Expected object of type " + p.name + " but got ' + " + varName + ".constructor;");
      }
      else if (Array.isArray(p)) {
        var last = p[p.length - 1];
        if (p.length == 0 || !last.__tail) {
          add("if (" + varName + ".length != " + p.length + ") return 'Expected array of size " + p.length + " but got ' + print(" +varName + "); ");
          for (i = 0; i < p.length; i++) {
            compilePart(p[i], assignVar(varName + "[" + i + "]"));
          }
        }
        else {
          add("if (" + varName + ".length < " + (p.length-1) + ") return 'Expected array of size at least " + (p.length-1) + " but got ' + print(" +varName + "); ");
          for (i = 0; i < p.length-1; i++) {
            compilePart(p[i], assignVar(varName + "[" + i + "]"));
          }
          compilePart(p[p.length-1], assignVar(varName + ".slice(" + (p.length-1) + ")"))
        }
      }
      else if (typeof p == "object") {
        for (var k in p) {
          if (!p.hasOwnProperty(k)) continue;
          compilePart(p[k], assignVar(varName + "." + k));
        }
      }
      else {
        add("if (" + varName + " !== " + JSON.stringify(p) + ") return 'Expected " + print(p) + " but value is ' + print(" + varName + ");")
      }
    }

    compilePart(pattern, "value");
    var pairs = [];
    for (var p in props) {
      if (!props.hasOwnProperty(p)) continue;
      pairs.push(p + ": " + props[p]);
    }
    add("return {" + pairs.join(',') + "}");
    if (vars.length > 0) code.unshift("var " + vars.join(',') + ";");
    var fbody = code.join("\n");
    try {
      var fn = new Function("value", fbody);
      if (exports.debug) console.log(fbody);
      return fn;
    }
    catch (e) {
      console.error(fbody);
      throw e;
    }
  }

  function updatePattern(pattern, myVarsDict) {
    if (pattern.__key) {
      return myVarsDict[pattern.__key];
    }
    else if (Array.isArray(pattern)) {
      for (var i = 0; i < pattern.length; i++) {
        if (pattern[i] && pattern[i].__key) {
          pattern[i] = myVarsDict[pattern[i].__key];
        }
        else {
          updatePattern(pattern[i], myVarsDict);
        }
      }
      var last = pattern[pattern.length - 1];
      if (typeof last == "number") {
        //try to find by id
        var ids = [];
        var id = 1;
        while (last != 0) {
          if (last & 1 == 1) {
            ids.push(id);
          }
          last = last >> 1;
          id = id << 1 ;
        }
        if (ids.length == 2) {
          var headId = ids[0];
          var tailId = ids[1];
          var append = [null, null];
          for (var k in myVarsDict) {
            if (!myVarsDict.hasOwnProperty(k)) continue;
            var vr = myVarsDict[k];
            if (vr.__id == headId) append[0] = vr;
            if (vr.__id == tailId) {append[1] = vr; vr.__tail = true;}
          }
          if (append[0] == null || append[1] == null) {
            console.warn("Head/Tail detector seems to be broken");
          }
          else {
            pattern.pop();
            pattern.push(append[0]);
            pattern.push(append[1]);
          }
        }
      }
    }
    else if (typeof pattern == "object") {
      for (var k in pattern) {
        if (!pattern.hasOwnProperty(k)) continue;
        if (pattern[k] && pattern[k].__key) {
          pattern[k] = myVarsDict[pattern[k].__key];
        }
        else {
          updatePattern(pattern[k], myVarsDict);
        }
      }
    }
    return pattern;
    //ignore other
  }


})(typeof exports === 'undefined'? this['pattern-matching']={}: exports);