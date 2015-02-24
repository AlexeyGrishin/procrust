(function(exports){

  var _ = {__key: "_", __everything__matching__placeholder: true};
  //Global context - used to pass data from Match to Whens
  var context = {
    vars: [],
    kvars: {},
    when: {},
    nextWhen: function() {
      this.when = {usedVars: [], usedKeys: {}, placeholderId: 1};
    },
    nextPlaceholderId: function() {
      var id = this.when.placeholderId;
      this.when.placeholderId = this.when.placeholderId << 1;
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
    toString: function() { return this.__id; },
    clone: function() { return new Placeholder(this.__key, this.__id); },
    __is_placeholder: true,
    meet: function() {
      var cw = context.when;
      var whenSpecific = cw.usedKeys[this.__key];
      if (whenSpecific == null) {
        whenSpecific = new Placeholder(this.__key, context.nextPlaceholderId());
        cw.usedKeys[this.__key] = whenSpecific;
        cw.usedVars.push(whenSpecific);
      }
      return whenSpecific;
    }
  };

  function createPlaceholder(name) {
    var placeholder = new Placeholder(name);

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
    var value, whenFns;
    if (arguments.length == 2) {
      if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
        value = arguments[0];
        whensFactories = arguments[1];
      }
    }
    getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
    context.nextWhen();
    whenFns = whensFactories.call(context.kvars);
    if (typeof value !== 'undefined') return match(value);
    return match;

    function match(value) {
      var i, next, res;
      for (i = 0; i < whenFns.length; i++) {
        next = false;
        res = whenFns[i](value, function() {next = true;}) ;
        if (!next) return res;
      }
      throw new Error("Value is not matched by any condition: '" + value + "'");
    }
  }

  function When(pattern, execute) {
    if (context.multipleParamsInWhen) {
      var args = [].slice.call(arguments);
      execute = args.pop();
      pattern = args;
    }
    var myVars = context.when.usedVars;
    var compiled = compilePattern(pattern, myVars);
    context.nextWhen();
    return function(value, next) {
      var res = compiled(value);
      if (typeof res === "object") {
        var ctx = res;
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
    return vr;
  }

  function print(o) {
    if (o && o.__key) return "<@" + o.__key + ">";
    var a =  JSON.stringify(o);
    if (a && a.length > 40) {
      return a.slice(0, 20) + "..." + a.slice(a.length - 20);
    }
    return a;
  }


  function compilePattern(pattern, myVars) {
    var code = [print.toString().replace(/[\n\r]/g, '')];
    var varIdx = 1;
    function add(c, error) {
      code.push(c + " " + err(error) + ";");
    }
    var vars = [];
    var props = {};
    function assignVar(ex) {
      var vname = ex.replace(/[^a-zA-Z0-9]+/gi, '_') + '$' + varIdx++;
      vars.push(vname);
      add(vname + " = " + ex);
      return vname;
    }

    function err(err) {
      if (!err) return "";
      if (exports.debug) return err; else return 'false';
    }

    function compilePart(p, varName) {
      var i;
      if (typeof p == 'undefined') {
        add("return " + varName + " == null ? true : ", "Expected undefined but got ' + print(" + varName + ")");
        return;
      }
      add("if (" + varName + " == null) return", "'Got undefined, but expected " + print(p) + "'");

      if (p == _) {
        return;
      }

      function assign(key) {
        if (!props[key]) {
          props[key] = varName;
        }
        else {
          add("if (" + varName + " !== " + props[key] + ") return", "'Previous time " + print(p) + " was set to ' + print(" + props[key] + ") + ' but this time it is ' + print(" + varName + ")")
        }
      }

      if (p.__reference) {
        assign(p.__reference.__key);
      }
      if (p.__key) {
        assign(p.__key);
      }
      else if (typeof p == 'function') {
        add("if (" + varName + ".constructor.name !== '" + p.name + "') return", "'Expected object of type " + p.name + " but got ' + " + varName + ".constructor");
      }
      else if (Array.isArray(p)) {
        p = bitwiseOrDetector(p, myVars);
        var last = p[p.length - 1];
        if (p.length == 0 || !last.__tail) {
          add("if (" + varName + ".length != " + p.length + ") return", " 'Expected array of size " + p.length + " but got ' + print(" +varName + ") ");
          for (i = 0; i < p.length; i++) {
            compilePart(p[i], assignVar(varName + "[" + i + "]"));
          }
        }
        else {
          add("if (" + varName + ".length < " + (p.length-1) + ") return ", " 'Expected array of size at least " + (p.length-1) + " but got ' + print(" +varName + ")");
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
        add("if (" + varName + " !== " + JSON.stringify(p) + ") return", " 'Expected " + print(p) + " but value is ' + print(" + varName + ")")
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
      if (exports.debug) console.log("\n---\n" + fbody + "\n");
      return fn;
    }
    catch (e) {
      console.error(fbody);
      throw e;
    }
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


  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = Tail;
  exports.debug = false;



})(typeof exports === 'undefined'? this['pattern-matching']={}: exports);