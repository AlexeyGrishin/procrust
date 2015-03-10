function createRenderer(firstArgName, secondArgName, guardArgName, plugins) {

  var padStep = "  ";
  var resVarName = "res";

  plugins.addFirst(pluginDone(resVarName, secondArgName, guardArgName));

  return function createFn(commands, options) {
    options = options || {debug: {}};

    var temp = {
      vars: {},
      next: 1,
      all: []
    };
    temp.vars[firstArgName] = firstArgName;

    function addPad(pad, item) {
      return pad + item;
    }

    function renderExpressions(ret, pad, cmds) {
      return _flat(cmds.map(renderExpression.bind(null, ret, pad)).filter(_notEmpty)).map(addPad.bind(null, pad));
    }

    function renderDebug(condition) {
      if (options.debug.matching && condition != null) {
        return ["if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"]
      }
      return [];
    }

    function renderConditionCheck(cond, ret) {
      return renderDebug(cond) + "if (!(" + cond + ")) " + ret + ";";
    }

    function renderFork(pad, fork) {
      if (fork.if.command === "done" && fork.then.length == 0) {
        return renderExpression("break", pad, fork.if);
      }
      return ["do {"]
        .concat(renderExpressions("break", pad, [fork.if].concat(fork.then)))
        .concat(["} while(false);"]);
    }

    function renderExpression(ret, pad, command) {

      if (command.fork) {
        return command.fork.map(function(f) {
          return renderFork(pad, f);
        });
      }

      var rendered = plugins.render(command, getVar(command.var), createVar, getVar);
      if (rendered === false) {
        throw new Error("Do not know how to render this: " + JSON.stringify(command))
      }
      else if (rendered.noIf) {
        return rendered.noIf;
      }
      else {
        return renderConditionCheck(rendered, ret);
      }

      function createVar(prefix) {
        var newvar;
        temp.all.push(temp.vars[command.newvar] = newvar = (prefix ? prefix : "var") + "$" + temp.next);
        temp.next++;
        return newvar;
      }

      function getVar(name) {
        return temp.vars[name];
      }
    }

    var code = renderExpressions("return false", padStep, commands);
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

