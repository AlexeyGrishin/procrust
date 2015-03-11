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

    function parse(varname, part, delegatedReference) {
      var defn = {};
      defn.varname = varname;
      defn.type = getTypeName(part);
      defn.reference = helper.getResultRef(part) || delegatedReference;//TODO: shall process both references, but it shall be very rare case
      var refDelegated = false;

      var parsingFlow = {
        addCheck: function(command, value) {
          cmds.push(new Command(command, varname, value));
        },
        addSubitem: function(command, value, patternSubitem, delegateRef) {
          var newname = "$" + vidx++;
          cmds.push(new Command(command, varname, value, newname));
          refDelegated = delegateRef;
          if (typeof patternSubitem != "undefined") {
            parse(newname, patternSubitem, delegateRef ? defn.reference : undefined);
          }
          else if (delegateRef) {
            refDelegated = true;
            addRef(newname, defn.reference);
          }
        },
        yieldSubitem: function(command, value, patternSubitem, delegateRef) {
          this.addSubitem(command, value, patternSubitem, delegateRef);
        },
        yieldAs: function(pattern) {
          parse(varname, pattern);
        }
      };

      if (plugins.parse(part, parsingFlow, defn) === false) {
        throw new Error("Do not know how to parse: " + JSON.stringify(part) );
      }
      if (!refDelegated) addRef(varname, defn.reference);

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
