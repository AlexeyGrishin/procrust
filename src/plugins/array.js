function pluginArray() {

  return {
    ignoreLengthFor: "export",

    before_parse: function(doExport) {
      doExport("ignoreLengthFor", function(ar) {
        ar.___ignore_length = true;
      });
    },

    //specially for arguments.
    parse_object: function(part, f, defn) {
      var argi;
      if (!(part instanceof ArgumentsPattern)) {
        return false;
      }
      for (argi = 0; argi < part.args.length; argi++) {
        f.yieldNext(part.args[argi], defn.varname + argi);
      }
      f.addCheck("isUndefined", null, defn.varname + part.args.length);
    },

    parse_array: function(part, f) {
      return this._parse_arrayLike(part, f, "lengthEqAndType");
    },

    _parse_arrayLike: function(part, f, lengthCmpCommand) {
      var i;
      if (part.___ignore_length) {
        delete part.___ignore_length;
      }
      else {
        f.addCheck("any");
        f.addCheck(lengthCmpCommand, part.length);
      }
      for (i = 0; i < part.length; i++) {
        f.yieldNext(part[i], f.addVariable("item", i));
      }

    },

    render_isUndefined: function (command, varname) {
      return varname + " === undefined";
    },

    render_lengthEqAndType: function (command, varname) {
      return "Array.isArray(" + varname + ") && " + varname + ".length === " + command.value;
    },

    render_lengthEq: function (command, varname) {
      return varname + ".length === " + command.value;
    },

    render_item: function (command, varname, subitemVar) {
      return {noIf: subitemVar + " = " + varname + "[" + command.value + "];"};
    }
  };
}
