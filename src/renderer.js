function createRenderer(firstArgNameBase, secondArgName, guardArgName, plugins) {

  var padStep = "  ", resVarName = "res", argi = 0;

  /*global pluginDone*/
  plugins.addFirst(pluginDone(resVarName, secondArgName, guardArgName));

  return function createFn(commands, options) {
    options = options || {debug: {}};

    var usedVars = {}, forkId, code, fn;

    function addPad(pad, item) {
      return pad + item;
    }

    function renderDebug(condition) {
      if (options.debug.matching && condition !== null) {
        return ["if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"];
      }
      return [];
    }

    function renderConditionCheck(cond, ret) {
      return renderDebug(cond) + "if (!(" + cond + ")) " + ret + ";";
    }

    forkId = 0;

    function renderFork(pad, fork) {
      /*global renderExpression*/
      /*global renderExpressions*/
      if (fork.if.command === "done" && fork.then.length === 0) {
        return renderExpression("break", pad, fork.if);
      }
      return ["fork" + (++forkId) + ": {"]
        .concat(renderExpressions("break fork" + forkId, pad, [fork.if].concat(fork.then)))
        .concat(["}"]);
    }

    function renderExpression(ret, pad, command) {

      if (command.fork) {
        return command.fork.map(function(f) {
          return renderFork(pad, f);
        });
      }

      function addVar(name) {
        if (name === undefined || name.indexOf(firstArgNameBase) === 0) {
          return name;
        }
        usedVars[name] = name;
        return name;
      }

      var rendered = plugins.render(command, addVar(command.var), addVar(command.newvar));
      if (rendered === false) {
        throw new Error("Do not know how to render this: " + JSON.stringify(command));
      }
      if (rendered === undefined) {
        return [];
      }
      if (rendered.noIf) {
        return rendered.noIf;
      }
      return renderConditionCheck(rendered, ret);

    }

    function renderExpressions(ret, pad, cmds) {
      return _flat(cmds.map(renderExpression.bind(null, ret, pad)).filter(_notEmpty)).map(addPad.bind(null, pad));
    }

    function createFunction(code) {
      function nextArg() {
        return firstArgNameBase + argi++;
      }
      /*jslint evil: true */
      return new Function(secondArgName, guardArgName,
          nextArg(), nextArg(), nextArg(), nextArg(), nextArg(),
          nextArg(), nextArg(), nextArg(), nextArg(), nextArg(),
          code
        );
    }

    code = renderExpressions("return false", padStep, commands);
    code.unshift(padStep + "var " + [resVarName].concat(Object.keys(usedVars)).join(", ") + ";");
    try {
      fn = createFunction(code.join("\n"));
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
  };
}

