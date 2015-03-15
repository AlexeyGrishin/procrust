function pluginDone(resVarName, secondArgName, guardArgName) {

  return {
    render_done: function(command) {
      var result = [], ref;
      for (ref in command.value) {
        if (command.value.hasOwnProperty(ref)) {
          result.push("'" + ref + "': " + command.value[ref]);
        }
      }
      return {noIf: [
        resVarName + " = {" + result.join(', ') + "};",
        "if (" + guardArgName + "[" + command.index + "] && " + guardArgName + "[" + command.index + "](" + resVarName + ")) return {ok: " + secondArgName + "[" + command.index + "](" + resVarName + ")};"
      ]};
    },

    render_ref: function(command, varname) {
      return varname + " === " + command.value;
    }
  };
}
