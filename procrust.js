(function(exports){

  
  function _parsedPattern(cmds) {
    return {cmds: cmds};
  }
  
  function _notEmpty(item) {
    return item != null;
  }
  
  function _flat(array) {
    for (var i = array.length-1; i >=0; i--) {
      if (Array.isArray(array[i])) {
        array.splice.apply(array, [i, 1].concat(_flat(array[i])));
      }
    }
    return array;
  }
  
  function _toString(ex) {
    if (ex.cmds) {
      return ex.cmds.map(_toString).join('\n')
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
  
  
  function ObjectMatcher(klass, props) {
    this.klass = klass.name;
    this.props = props;
  }
    
    var compilePattern = (function() {
    
      var firstArgName = "val";
      var secondArgName = "when";
    
      var parse = createParser(firstArgName);
      var regroup = createRegrouper();
      var createFn = createRenderer(firstArgName, secondArgName);
    
    
      return function compilePattern(patterns, helper) {
        return createFn(regroup(patterns.map(function(pattern, idx) {
          return parse(pattern, idx, helper);
        })), helper.renderOptions);
      };
    
      function createParser(firstArgName) {
      
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
          return this.length === ex.length && this.compare === ex.compare;
        });
        var _done = _create([_key('done'), 'result']);
        var _any = _create(['var', _fakekey('any')]);
      
      
        return function parse(pattern, idx, helper) {
          var cmds = [];
          var refs = {};
          function addCmd(c) { cmds.push(c); }
          function addRef(varname, ref) {
            if (refs[ref]) {
              addCmd(_ref(varname, refs[ref]));
            }
            refs[ref] = varname;
          }
      
          function parse(varname, part, cannotBeNull) {
            var tv, i, key;
            var ref = helper.getResultRef(part);
            if (ref) {
              addRef(varname, ref);
            }
            if (helper.isWildcard(part) || helper.isResultVar(part)) {
              if (!cannotBeNull) {
                addCmd(_any(varname));
              }
              return;
            }
      
            if (Array.isArray(part)) {
              addCmd(_array(varname));
              var splitted = helper.resolveTail(part);
              var enumerated = splitted[0];
              var tail = splitted[1];
              addCmd(_length(varname, enumerated.length, tail ? '>=' : '=='));
              for (i = 0; i < enumerated.length; i++) {
                tv = varname + "[" + i + "]";
                addCmd(_item(varname, i, tv));
                parse(tv, enumerated[i]);
              }
              if (tail) {
                tv = varname + ".slice(" + enumerated.length + ")";
                addCmd(_tail(varname, enumerated.length, tv));
                parse(tv, tail, true);
              }
            }
            else if (typeof part === 'object') {
              addCmd(_typeof(varname, 'object'));
              if (part instanceof ObjectMatcher) {
                addCmd(_constructor(varname, part.klass));
                part = part.props;
              }
              var keys = Object.keys(part);
              keys.sort();
              for (i = 0; i < keys.length; i++) {
                key = keys[i];
                tv = varname + "." + key;
                addCmd(_prop(varname, key, tv));
                parse(tv, part[key]);
              }
            }
            else if (typeof part === 'function') {
              addCmd(_constructor(varname, part.name));
            }
            else {
              addCmd(_value(varname, part));
            }
          }
      
          parse(firstArgName, pattern);
          addCmd(_done(idx, refs));
          return _parsedPattern(cmds);
        };
      
      
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
      }  function createRegrouper() {
      
        function flow(patterns, idx) {
          if (patterns.length == 1) return patterns[0].cmds.slice(idx);
          var cmds = [], i;
          while (patterns.length > 0) {
            patterns = patterns.filter(_notEmpty);
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
              cmds.push({
                fork: forks.map(function (f) {
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
      
      
        return function regroup(patterns) {
          return _parsedPattern(flow(patterns, 0));
        };
      
      }  function createRenderer(firstArgName, secondArgName) {
      
        var padStep = "  ";
      
        return function createFn(grouped, options) {
          options = options || {};
          if (options.debug.parsed) {
            console.log(_toString(grouped));
          }
      
          function addPad(pad, item) {
            return pad + item;
          }
      
          var temp = {
            vars: {},
            next: 1,
            isEmpty: function() { return this.next == 1; },
            all: []
          };
      
          function assignTemp(cmd, prefix) {
            var orig = typeof cmd == 'object' ? cmd.var : cmd;
            if (!temp.vars[orig]) {
              temp.all.push(temp.vars[orig] = prefix + "$" + temp.next);
              temp.next++;
            }
            return temp.vars[orig];
          }
      
          function varname(cmd) {
            var orig = typeof cmd == 'object' ? cmd.var : cmd;
            return temp.vars[orig] || orig;
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
            if (options.debug.matching && condition != null) {
              return ["if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"]
            }
            return [];
          }
      
          function renderFork(pad, fork) {
            var cond = renderCondition(fork.if);
            var ifExpr = cond == null ? "" : "if (" + cond + ") ";
            return renderDebug(cond)
              .concat([ifExpr + "do {"])
              .concat(renderExpressions("break", pad, fork.then))
              .concat(["} while(false);"]);
          }
      
          function renderExpressions(ret, pad, cmds) {
            return _flat(cmds.map(renderExpression.bind(null, ret, pad)).filter(_notEmpty)).map(addPad.bind(null, pad));
          }
      
          function renderConditionCheck(cond, ret) {
            return renderDebug(cond) + "if (!(" + cond + ")) " + ret + ";";
          }
      
          function renderExpression(ret, pad, cmd) {
            var cond = renderCondition(cmd);
            if (cond) {
              return renderConditionCheck(cond, ret);
            }
            else if (cmd.prop != null) {
              //TODO: assign temp only if variable used more than once
              return assignTemp(cmd.newvar, cmd.prop) + " = " + varname(cmd) + "." + cmd.prop + ";";
            }
            else if (cmd.item != null) {
              return assignTemp(cmd.newvar, "item" + cmd.item) + " = " + varname(cmd) + "[" + cmd.item + "];";
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
              return assignTemp(cmd.newvar, "tail") + " = " + varname(cmd) + ".slice(" + cmd.tail + ");";
            }
            else if (cmd.fork) {
              return cmd.fork.map(function (fork) {
                  if (fork.if.done != null)
                    return renderExpression(ret, pad, fork.if);
                  return renderFork(pad, fork);
                })
            }
            else {
              throw new Error("Unexpected expression: " + JSON.stringify(cmd));
            }
      
          }
      
          var code = renderExpressions("return false", padStep, grouped.cmds);
          if (!temp.isEmpty()) {
            code.unshift(padStep + "var " + temp.all.join(", ") + ";")
          }
          try {
            var fn = new Function(firstArgName, secondArgName, code.join("\n"));
            if (options.debug.functions) {
              console.log(fn.toString());
            }
            return fn;
          }
          catch (e) {
            console.error("Cannot parse generated function code:\n" + code.join("\n"));
            console.error();
            console.error(e);
            throw e;
          }
        }
      }
    })();
    
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
        valueOf: function() {
          if (this.__id == undefined) {
            this.__id = context.nextPlaceholderId();
          }
          return this.__id;
        },
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
            if (vl === null) return;
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
            debug: exports.debug
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
            var rejected = false;
            var result = execute.call(ctx, function rejector() {
              rejected = true;
            });
            if (rejected) return false;
            resultHolder.result = result;
            return true;
          }
        }};
      
      }
      
      function Having(guardFn) {
        return function(execute) {
          return function(rejector) {
            if (!guardFn.call(this)) {
              return rejector();
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
      
      var global = (function() { return this;})();
      function ObjectOf() {
        if (arguments[0] === global) {
          //constructor called as function, matching case
          return new ObjectMatcher(arguments[1], arguments[2][0]);
        } else if (typeof arguments[0] === 'function') {
          return new ObjectMatcher(arguments[0], arguments[1]);
        } else {
          //this is normally created object, ignore
          return null;
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
  exports.ObjectOf = ObjectOf;
  exports.debug = {
    functions: false,
    parsed: false,
    matching: false
  };

})(typeof exports === 'undefined'? this['pattern-matching']={}: exports);