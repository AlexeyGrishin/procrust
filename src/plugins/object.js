function pluginObject() {

  return {
    parse_object: function(addCmd, part, yieldNext) {
      var keys = Object.keys(part);
      keys.sort();
      for (var i = 0; i < keys.length; i++) {
        var nname = "." + keys[i];
        addCmd("prop", keys[i], nname);
        yieldNext(part[keys[i]], nname);
      }
    },

    render_prop: function(command, varname, createVar) {
      return "(" + createVar(command.value) + " = " + varname + "." + command.value + ") != null";
    }
  }
}
