function pluginArray() {

  return {
    ignoreLengthFor: "export",

    before_parse: function(doExport) {
      doExport("ignoreLengthFor", function(ar) {
        ar.___ignore_length = true;
      });
    },

    //specially for arguments.
    parse_object: function(part, f) {
      if (!(part instanceof ArgumentsPattern)) {
        return false;
      }
      return this._parse_arrayLike(part.args, f, "lengthEq");
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
        f.addCheck(lengthCmpCommand, part.length);
      }
      for (i = 0; i < part.length; i++) {
        f.yieldNext(part[i], f.addVariable("item", i));
      }

    },

    render_lengthEqAndType: function(command, varname) {
      return "Array.isArray(" + varname + ") && " + varname + ".length === " + command.value;
    },

    render_lengthEq: function(command, varname) {
      return varname + ".length === " + command.value;
    },

    render_item: function(command, varname, subitemVar) {
      return "(" + subitemVar + " = " + varname + "[" + command.value + "]) != null";
    }
  };
}
