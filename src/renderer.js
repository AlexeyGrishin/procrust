function createRenderer(firstArgName, secondArgName, guardArgName) {

  var padStep = "  ";
  var resVarName = "res";

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

    function renderConditionForFork(cmd) {
      var cond = renderCondition(cmd);
      if (cond == null) {
        if (cmd.item != null || cmd.prop != null) {
          cond = "(" + renderAssign(cmd) + ") != null";
        }
      }
      return cond;
    }

    function renderDebug(condition) {
      if (options.debug.matching && condition != null) {
        return ["if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"]
      }
      return [];
    }

    function renderFork(pad, fork) {
      var cond = renderConditionForFork(fork.if);
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

    function renderAssign(cmd) {
      if (cmd.prop != null) {
        //TODO: assign temp only if variable used more than once
        return assignTemp(cmd.newvar, cmd.prop) + " = " + varname(cmd) + "." + cmd.prop;
      }
      else if (cmd.item != null) {
        return assignTemp(cmd.newvar, "item" + cmd.item) + " = " + varname(cmd) + "[" + cmd.item + "]";
      }
      throw new Error("Cannot render command as assignment: " + cmd);

    }

    function renderExpression(ret, pad, cmd) {
      var cond = renderCondition(cmd);
      if (cond) {
        return renderConditionCheck(cond, ret);
      }
      else if (cmd.prop != null || cmd.item != null) {
        return renderAssign(cmd) + ";";
        //TODO: assign temp only if variable used more than once
      }
      else if (cmd.done != null) {
        var result = [];
        for (var ref in cmd.result) {
          if (!cmd.result.hasOwnProperty(ref)) continue;
          result.push("'" + ref + "': " + varname(cmd.result[ref]));
        }
        return [
          resVarName + " = {" + result.join(', ') + "};",
          "if (" + guardArgName + "[" + cmd.done + "] && " + guardArgName + "[" + cmd.done + "](" + resVarName + ")) return {ok: " + secondArgName + "[" + cmd.done + "](" + resVarName + ")};"
          ]
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
    code.unshift(padStep + "var " + [resVarName].concat(temp.all).join(", ") + ";");
    try {
      var fn = new Function(firstArgName, secondArgName, guardArgName, code.join("\n"));
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