function pluginReference() {

  return {
    parse_var: function (part, f) {
      /*jslint unparam: true*/
      f.addCheck("any");
    },

    parse_wildcard: function (part, f) {
      /*jslint unparam: true*/
      f.addCheck("any");
    },

    render_any: function () {
      return undefined;
    }
  };
}
