function pluginPrimitive() {

  return {
    parse_primitive: function(addCmd, part, yieldNext) {
      addCmd("value", part);
    },

    render_value: function(command, varname, createVar) {
      return varname + " === " + JSON.stringify(command.value);
    }
  }
}
