function createParser(firstArgName, plugins) {

  function Done(index, refs) {
    this.command = "done";
    this.value = refs;
    this.index = index;
  }

  Done.prototype.eq = function(ad) {
    return ad.command == this.command && ad.index == this.index;
  };

  //TODO: use same variable names in parser and renderer
  //TODO: use addCheck(name, arg) and addVariable(name, arg, subitem, delegate). probably yieldNext(subitem, addVariable(name, arg, delegate))
  //TODO: for regexp - make possible to write like:
  //    regexpResult = f.addVariable('regexp', source, true)
  //    for vr,i in vars
  //      f.yieldNext(vr, f.addVariable('regexp_item', i+1, regexpResult))
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
    var vidx = 1;

    function parse(varname, part) {
      var defn = {};
      defn.varname = varname;
      defn.type = getTypeName(part);
      defn.reference = helper.getResultRef(part);
      var refFromVariable = varname;

      var parsingFlow = {
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
          if (typeof variableName == 'undefined') {
            variableName = varname;
          }
          parse(variableName, patternSubitem)
        }
      };

      if (plugins.parse(part, parsingFlow, defn) === false) {
        throw new Error("Do not know how to parse: " + JSON.stringify(part) );
      }
      addRef(refFromVariable, defn.reference);

    }
    parse(firstArgName, pattern);
    cmds.push(new Done(idx, refs));
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
