function createParser(firstArgName, plugins) {

  function Done(index, refs) {
    this.command = "done";
    this.value = refs;
    this.index = index;
  }

  Done.prototype.eq = function(ad) {
    return ad.command === this.command && ad.index === this.index;
  };

  return function parse(pattern, idx, helper) {
    var cmds = [], refs = [], vidx = 1;

    function addRef(varname, ref) {
      if (!ref) {
        return;
      }
      if (refs[ref]) {
        cmds.push(new Command("ref", varname, refs[ref]));
      }
      refs[ref] = varname;
    }

    function getTypeName(part) {
      if (part === undefined || part === null) {
        return "undefined";
      }
      if (helper.isResultVar(part)) {
        return helper.isWildcard(part) ? "wildcard": "var";
      }
      if (Array.isArray(part)) {
        return "array";
      }
      if (typeof part === "object") {
        return "object";
      }
      if (typeof part === "function") {
        return "function";
      }
      return "primitive";
    }

    function parsePart(varname, part) {
      var refFromVariable = varname, defn = {}, parsingFlow;
      defn.varname = varname;
      defn.type = getTypeName(part);
      defn.reference = helper.getResultRef(part);

      parsingFlow = {
        addCheck: function(command, value) {
          cmds.push(new Command(command, varname, value));
        },
        addVariable: function(command, value, applyTo) {
          var newname = "$" + vidx++;
          cmds.push(new Command(command, applyTo || varname, value, newname));
          return newname;
        },
        delegateReference: function(varname) {
          refFromVariable = varname;
          return varname;
        },
        yieldNext: function(patternSubitem, variableName) {
          if (variableName === undefined) {
            variableName = varname;
          }
          parsePart(variableName, patternSubitem);
        }
      };

      if (plugins.parse(part, parsingFlow, defn) === false) {
        throw new Error("Do not know how to parse: " + JSON.stringify(part) );
      }
      addRef(refFromVariable, defn.reference);

    }
    parsePart(firstArgName, pattern);
    cmds.push(new Done(idx, refs));
    return cmds;


  };



}
