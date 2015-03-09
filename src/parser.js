function createParser(firstArgName, plugins) {


  return function parse(pattern, idx, helper) {
    var cmds = [];
    var refs = [];

    function addRef(varname, ref) {
      if (!ref) return;
      if (refs[ref]) {
        cmds.push(new Command("ref", varname, refs[ref]));
      }
      refs[ref] = varname;
    }

    function parse(varname, part) {
      var defn = {};
      defn.varname = varname;
      defn.type = getTypeName(part);
      defn.reference = helper.getResultRef(part);
      addRef(varname, defn.reference);

      function addCommand(command, value, suffix) {
        cmds.push(new Command(command, varname, value, suffix ? varname + suffix : undefined));
      }
      function next(part, suffix) {
        var newname = varname + (suffix || "");
        return parse(newname, part);
      }
      if (plugins.parse(addCommand, part, next, defn) === false) {
        throw new Error("Do not know how to parse: " + JSON.stringify(part) );
      }
    }
    parse(firstArgName, pattern);
    cmds.push({command: "done", value: refs, index: idx, eq: function(c) {
      return this.command === c.command && this.index === c.index;
    }});
    return cmds;

    function getTypeName(part) {
      if (typeof part == "undefined" || part == null) {
        return "undefined";
      }
      if (helper.isResultVar(part)) {
        return helper.isWildcard(part) ? "wildcard": "var";
      }
      if (Array.isArray(part)) {
        return "array";
      }
      if (typeof part == "object") {
        return "object";
      }
      if (typeof part == "function") {
        return "function";
      }
      else {
        return "primitive";
      }
    }

  };

}
