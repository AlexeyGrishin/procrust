function pluginObject() {

  return {
    parse_object: function(part, f) {
      var keys = Object.keys(part);
      keys.sort();
      for (var i = 0; i < keys.length; i++) {
        f.yieldSubitem("prop", keys[i], part[keys[i]]);
      }
    },

    render_prop: function(command, varname, createVar) {
      return "(" + createVar(command.value) + " = " + varname + "." + command.value + ") != null";
    }
  }
}
