function pluginObject() {

  return {
    parse_object: function(part, f) {
      f.addCheck("any");
      var keys = Object.keys(part), i;
      keys.sort();
      for (i = 0; i < keys.length; i++) {
        f.yieldNext(part[keys[i]], f.addVariable("prop", keys[i]));
      }
    },

    render_prop: function(command, varname, subitemVar) {
      return {noIf: subitemVar + " = " + varname + "." + command.value + ";"};
    }
  };
}
