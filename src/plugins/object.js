function pluginObject() {

  return {
    parse_object: function(part, f) {
      var keys = Object.keys(part), i;
      keys.sort();
      for (i = 0; i < keys.length; i++) {
        f.yieldNext(part[keys[i]], f.addVariable("prop", keys[i]));
      }
    },

    render_prop: function(command, varname, subitemVar) {
      return "(" + subitemVar + " = " + varname + "." + command.value + ") != null";
    }
  };
}
