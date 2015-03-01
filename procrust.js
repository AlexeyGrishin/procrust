(function(exports){

  
  var compilePattern = (function() {
  
    var firstArgName = "val";
    var secondArgName = "when";
  
    function _eq(prop) {
      return function(ex) {
        return ex.var === this.var && this[prop] === ex[prop];
      }
    }
  
    function _create(args, customeq) {
      return function() {
        var o = {};
        for (var i = 0; i < args.length; i++) {
          var k = args[i], value = arguments[i];
          if (k.key) {
            if (k.fake) value = true;
            k = k.key;
            o.eq = _eq(k)
          }
          o[k] = value;
        }
        if (customeq) o.eq = customeq;
        return o;
      }
    }
    function _key(key) { return {key: key}}
    function _fakekey(key) { return {key: key, fake: true}}
  
    var _value = _create(['var', _key('value')]);
    var _typeof = _create(['var', _key('typeof')]);
    var _array = _create(['var', _fakekey('array')]);
    var _prop = _create(['var', _key('prop'), 'newvar']);
    var _item = _create(['var', _key('item'), 'newvar']);
    var _tail = _create(['var', _key('tail'), 'newvar']);
    var _constructor = _create(['var', _key('ctor')]);
    var _ref = _create(['var', _key('ref')]);
    var _length = _create(['var', _key('length'), 'compare'], function(ex) {
      return this.length == ex.length && this.compare == ex.compare;
    });
    var _done = _create([_key('done'), 'result']);
    var _any = _create(['var', _fakekey('any')]);
  
    function _toString(ex) {
      if (ex.cmds) {
        return ex.vars.join(',') + "\n\n" + ex.cmds.map(_toString).join('\n')
      }
      var txt = '';
      if (ex.newvar) {
        txt = ex.newvar + " = " + txt;
      }
      if (ex.if) {
        txt = "if (" + _toString(ex.if) + ")\n  " + ex.then.map(_toString).join('\n  ') + "\nendif\n";
      }
      if (ex.fork) {
        txt = ex.fork.map(_toString).join('\n');
      }
      if (ex.var) {
        txt += ex.var;
        ['array', 'ctor', 'item', 'tail', 'typeof', 'length', 'prop', 'any', 'value', 'ref'].forEach(function(k) {
          if (typeof ex[k] != "undefined") {
            txt += "(" + k;
            if (ex[k] !== true) {
              txt += " " + ex[k];
            }
            txt += ")";
          }
        })
      }
      if (typeof ex.done != 'undefined') {
        txt = "done(" + [ex.done].concat(JSON.stringify(ex.result)).join(',') + ")";
      }
      return txt;
    }
  
    function _parsedPattern(cmds, vars) {
      return {cmds: cmds, vars: vars};
    }
  
    function parse(pattern, idx, helper) {
  
      var cmds = [];
      var refs = {};
      var vars = [];
      function cmd(c) { cmds.push(c); }
      function addRef(varname, ref) {
        if (refs[ref]) {
          cmd(_ref(varname, refs[ref]));
        }
        refs[ref] = varname;
      }
  
      function parse(varname, part, cannotBeNull) {
        var tv, i, key;
        vars.push(varname);
        var ref = helper.getResultRef(part);
        if (ref) {
          addRef(varname, ref);
        }
        if (helper.isWildcard(part) || helper.isResultVar(part)) {
          if (!cannotBeNull) {
            cmd(_any(varname));
          }
          return;
        }
  
        if (Array.isArray(part)) {
          cmd(_array(varname));
          var splitted = helper.resolveTail(part);
          var enumerated = splitted[0];
          var tail = splitted[1];
          cmd(_length(varname, enumerated.length, tail ? '>=' : '=='));
          for (i = 0; i < enumerated.length; i++) {
            tv = varname + "[" + i + "]";
            cmd(_item(varname, i, tv));
            parse(tv, enumerated[i]);
          }
          if (tail) {
            tv = varname + ".slice(" + enumerated.length + ")";
            cmd(_tail(varname, enumerated.length, tv));
            parse(tv, tail, true);
          }
        }
        else if (typeof part === 'object') {
          cmd(_typeof(varname, 'object'));
          var keys = Object.keys(part);
          keys.sort();
          for (i = 0; i < keys.length; i++) {
            key = keys[i];
            tv = varname + "." + key;
            cmd(_prop(varname, key, tv));
            parse(tv, part[key]);
          }
        }
        else if (typeof part === 'function') {
          cmd(_constructor(varname, part.name));
        }
        else {
          cmd(_value(varname, part));
        }
      }
  
      parse(firstArgName, pattern);
      cmd(_done(idx, refs));
      return _parsedPattern(cmds, vars);
    }
  
  
    function regroup(patterns) {
  
  
      function flow(patterns, idx) {
        var cmds = [], i;
        while (patterns.length > 0) {
          patterns = patterns.filter(function(p){ return p.cmds[idx]; });
          if (patterns.length == 0) break;
          var forks = [{cmd: patterns[0].cmds[idx], patterns: [patterns[0]]}];
          for (i = 1; i < patterns.length; i++) {
            var found = false;
            for (var f = 0; f < forks.length; f++) {
              if (patterns[i].cmds[idx].eq(forks[f].cmd)) {
                forks[f].patterns.push(patterns[i]);
                found = true;
                break;
              }
            }
            if (!found) {
              forks.push({cmd: patterns[i].cmds[idx], patterns: [patterns[i]]});
            }
          }
          if (forks.length == 1) {
            cmds.push(forks[0].cmd);
          }
          else {
            cmds.push({fork: forks.map(function(f) {
              return {
                if: f.cmd,
                then: flow(f.patterns, idx + 1)
              }
            })
            });
            break;
          }
          idx++;
        }
        return cmds;
      }
  
      return _parsedPattern(flow(patterns, 0), []);
  
    }
  
  
  
    function createFn(grouped, options) {
      options = options || {};
      if (options.printParsed) {
        console.log(_toString(grouped));
      }
  
      function addPad(pad, item) {
        return new Array(pad + 1).join(" ") + item;
      }
  
      function varname(cmd) {
        return typeof cmd == 'object' ? cmd.var : cmd;
      }
  
      function notNull(cmd) {
        return varname(cmd) + " != null";
      }
  
      function renderCondition(cmd) {
        if (cmd.typeof != null) {
          return notNull(cmd) + " && typeof " + varname(cmd) + " === '" + cmd.typeof + "'";
        }
        else if (cmd.ctor != null) {
          return notNull(cmd) + " && " + varname(cmd) + ".constructor.name === " + JSON.stringify(cmd.ctor)
        }
        else if (cmd.ref != null) {
          return varname(cmd) + " === " + varname({var: cmd.ref});
        }
        else if (cmd.array != null) {
          return "Array.isArray(" + varname(cmd) + ")";
        }
        else if (cmd.value != null) {
          return varname(cmd) + " === " + JSON.stringify(cmd.value);
        }
        else if (cmd.length != null) {
          return varname(cmd) + ".length " + cmd.compare + " " + cmd.length;
        }
        else if (cmd.any) {
          return notNull(cmd);
        }
        return null;
      }
  
      function renderDebug(condition) {
        if (options.debug && condition != null) {
          return "if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"
        }
        return "";
      }
  
      function renderFork(pad, fork) {
        var cond = renderCondition(fork.if);
        var ifExpr = cond == null ? "" : "if (" + cond + ") ";
        return renderDebug(cond) + [
          addPad(pad, ifExpr + "do {")
        ].concat(renderExpressions("break", pad + 2, fork.then)).concat([
            addPad(pad, "} while (false);")
          ]).join("\n");
      }
  
      function renderExpressions(ret, pad, cmds) {
        return cmds.map(renderExpression.bind(null, ret, pad)).filter(function(i) {return i;}).map(addPad.bind(null, pad));
      }
  
      function renderConditionCheck(cond, ret) {
        return renderDebug(cond) + "if (!(" + cond + ")) " + ret + ";";
      }
  
      function renderExpression(ret, pad, cmd) {
        //if (cmd.any) return undefined;
        var cond = renderCondition(cmd);
        if (cond) {
          return renderConditionCheck(cond, ret);
        }
        else if (cmd.prop != null) {
          //TODO: assign temp var
          //return renderConditionCheck(notNull(cmd.var + "." + cmd.prop), ret);
        }
        else if (cmd.item != null) {
          //TODO: assign temp var
          //return renderConditionCheck(notNull(cmd.var + "[" + cmd.item + "]"), ret);
        }
        else if (cmd.done != null) {
          var result = [];
          for (var ref in cmd.result) {
            if (!cmd.result.hasOwnProperty(ref)) continue;
            result.push("'" + ref + "': " + varname(cmd.result[ref]));
          }
          return "if (" + secondArgName + "[" + cmd.done + "]({" + result.join(', ') + "})) return true;"
        }
        else if (cmd.tail) {
          //TODO: assign temp var
        }
        else if (cmd.fork) {
  
          return "//fork\n" + cmd.fork.map(function(fork) {
              if (fork.if.done != null)
                return renderExpression(ret, pad, fork.if); //TODO: fix pad
              return renderFork(pad, fork);
            }).join("\n");
        }
        else {
          throw new Error("Unexpected expression: " + JSON.stringify(cmd));
        }
  
      }
  
      var code =
        renderExpressions("return false", 2, grouped.cmds).join("\n");
      try {
        var fn = new Function(firstArgName, secondArgName, code);
        if (options.printFunctions) {
          console.log(fn.toString());
        }
        return fn;
      }
      catch (e) {
        if (options.debug) console.error(code);
        console.error(e);
        throw e;
      }
    }
  
    return function compilePattern(patterns, helper) {
      return createFn(regroup(patterns.map(function(pattern, idx) {
        return parse(pattern, idx, helper);
      })), helper.renderOptions);
    }
  
  })();
  
    
    var _ = {__key: "_", __everything__matching__placeholder: true};
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
  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = Tail;
  exports.debug = false;
  exports.printFunctions = false;
  exports.printParsed = false;

})(typeof exports === 'undefined'? this['pattern-matching']={}: exports);