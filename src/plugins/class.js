function pluginConstructor() {

  return {
    parse_function: function(part, f) {
      f.addCheck("constructor", part.name);
    },

    render_constructor: function(command, varname) {
        return varname + ".constructor.name === " + JSON.stringify(command.value);
    }
  }
}
