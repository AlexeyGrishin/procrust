function pluginReference() {

  return {
    parse_var: function(addCmd, part, yieldNext) {
      addCmd("any")
    },

    parse_wildcard: function(addCmd, part, yieldNext) {
      addCmd("any")
    },

    render_any: function() {
      return {noIf: []};
    }
  }
}
