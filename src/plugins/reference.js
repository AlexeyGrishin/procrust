function pluginReference() {

  return {
    parse_var: function(part, f) {
      f.addCheck("any")
    },

    parse_wildcard: function(part, f) {
      f.addCheck("any")
    },

    render_any: function() {
      return {noIf: []};
    }
  }
}
