function pluginArray() {

  return {
    ignoreLengthFor: "export",

    before_parse: function(doExport) {
      doExport("ignoreLengthFor", function(ar) {
        ar.___ignore_length = true;
      });
    },

    parse_array: function(addCmd, part, yieldNext) {
      if (part.___ignore_length) {
        delete part.___ignore_length;
      }
      else {
        addCmd("lengthEq", part.length);
      }
      for (var i = 0; i < part.length; i++) {
        var suffix = "[" + i + "]";
        addCmd("item", i, suffix);
        yieldNext(part[i], suffix);
      }
    },

    render_lengthEq: function(command, varname) {
      return varname + ".length === " + command.value;
    },

    render_item: function(command, varname, createVar) {
      return "(" + createVar("item" + command.value) + " = " + varname + "[" + command.value + "]) != null";
    }
  }
}
