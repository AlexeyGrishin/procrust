function pluginConstructor() {

  return {
    parse_function: function(addCmd, part, yieldNext) {
      addCmd("constructor", part.name);
    },

    render_constructor: function(command, varname) {
        return varname + ".constructor.name === " + JSON.stringify(command.value);
    }
  }
}
