function pluginDone(resVarName, secondArgName, guardArgName) {

  return {
    render_done: function(command, varname, createVar, getVar) {
      var result = [];
      for (var ref in command.value) {
        if (!command.value.hasOwnProperty(ref)) continue;
        result.push("'" + ref + "': " + getVar(command.value[ref]));
      }
      return {noIf: [
        resVarName + " = {" + result.join(', ') + "};",
        "if (" + guardArgName + "[" + command.index + "] && " + guardArgName + "[" + command.index + "](" + resVarName + ")) return {ok: " + secondArgName + "[" + command.index + "](" + resVarName + ")};"
      ]}
    },

    render_ref: function(command, varname, createVar, getVar) {
      return varname + " === " + getVar(command.value);
    }
  }
}
