function pluginPrimitive() {

  return {
    parse_primitive: function(part, f) {
      f.addCheck("value", part);
    },

    render_value: function(command, varname, createVar) {
      return varname + " === " + JSON.stringify(command.value);
    }
  }
}
