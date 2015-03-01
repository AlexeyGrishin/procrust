
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

    var tempVars = {}, nextVar = 1;

    function assignTemp(cmd, prefix) {
      var orig = typeof cmd == 'object' ? cmd.var : cmd;
      if (!tempVars[orig]) {
        tempVars[orig] = prefix + "$" + nextVar;
        nextVar++;
      }
      return tempVars[orig];
    }

    function varname(cmd) {
      var orig = typeof cmd == 'object' ? cmd.var : cmd;
      return tempVars[orig] || orig;
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
        //TODO: assign temp only if variable used more than once
        return assignTemp(cmd.newvar, cmd.prop) + " = " + varname(cmd) + "." + cmd.prop;
      }
      else if (cmd.item != null) {
        return assignTemp(cmd.newvar, "item"+cmd.item) + " = " + varname(cmd) + "[" + cmd.item + "]";
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
        return assignTemp(cmd.newvar, "tail") + " = " + varname(cmd) + ".slice(" + cmd.tail + ")";
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
    var declareVars = Object.keys(tempVars).length ? "var " + Object.keys(tempVars).map(function(i) { return tempVars[i];}).join(",") + ";\n" : "";
    try {
      var fn = new Function(firstArgName, secondArgName, declareVars+code);
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

