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
      var rest = whenFns.slice();
      function next() {
        var n = rest.shift();
        if (n) return n(value, next);
        throw "Value is not matched by any condition: '" + value + "'";
      }
      return next();
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
    var wholeVar = {};
    myVars.forEach(function(mv) {
      myVarsDict[mv.__key] = mv;
      if (mv.__whole) wholeVar = mv;
    });
    myVarsDict["_"] = _;
    pattern = updatePattern(pattern, myVarsDict);
    context.nextWhen();
    return function(value, next) {
      myVars.forEach(function(mv) { mv.__value = undefined; });
      var res = doMatch(value, pattern, function(er) { return er;});
      if (res === true) {
        wholeVar.__value = value;
        var ctx = {};
        myVars.forEach(function(mv) { ctx[mv.__key] = mv.__value; });
        ctx.__rejected = false;
        res = execute.call(ctx);
        if (ctx.__rejected) return next();
        return res;
      }
      else {
        //console.log(res);
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

  function print(o) {
    if (o && o.__key) return "<@" + o.__key + ">";
    var a =  JSON.stringify(o);
    if (a && a.length > 40) {
      return a.slice(0, 20) + "..." + a.slice(a.length - 20);
    }
    return a;
  }


  function doMatch(value, pattern, err) {
    var undefVal = typeof value == 'undefined';
    var undefPattern = typeof pattern == 'undefined';
    if (undefVal && undefPattern) return true;
    if (undefVal || undefPattern) return err(undefVal ? "value is undefined when pattern has '" + print(pattern) + "'" : "pattern is undefined when value is '" + print(value) + "'");
    if (pattern == _) return true;

    if (typeof pattern == 'function') {
      return value.constructor == pattern ? true : err("Expected value to be '" + print(pattern) + "' but it is '" + value.constructor + "'");
    }
    else if (Array.isArray(pattern)) {
      if (!Array.isArray(value)) return err("Pattern is array, value is '" + print(value) + "'");
      if (pattern.length == 0) {
        return value.length == 0 ? true : err("Pattern is empty array, but value is '" + print(value) + "'");
      }
      var last = pattern[pattern.length - 1];
      var i,res;
      if (last.__tail) {
        for (i = 0; i < pattern.length - 1; i++) {
          res = doMatch(value[i], pattern[i], err);
          if (res !== true) return res;
        }
        last.__value = value.slice(pattern.length - 1);
      }
      else {
        if (pattern.length != value.length) return err("Patetrn length does not match value length");
        for (i = 0; i < pattern.length; i++) {
          res = doMatch(value[i], pattern[i], err);
          if (res !== true) return res;
        }
      }
      return true;
    }
    else if (pattern.__key) {
      if (typeof pattern.__value !== "undefined") {
        return pattern.__value === value ? true : err("Previous time " + print(pattern) + " was set to '" + print(pattern.__value) + "' but now it is '" + print(value) + "'");
      }
      pattern.__value = value;
      return true;
    }
    else if (typeof pattern == "object") {
      for (var k in pattern) {
        if (!pattern.hasOwnProperty(k)) continue;
        res = doMatch(value[k], pattern[k], err);
        if (res !== true) return res;
      }
      return true;
    }
    else {
      return pattern === value ? true : err("Pattern is '" + print(pattern) + "' but value is '" + print(value) + "'")
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