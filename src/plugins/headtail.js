function Tail(obj) {
  this.obj = obj;
}


function pluginHeadTail() {

  return {
    bitRegistry: "require",
    ignoreLengthFor: "require",

    parse_object: function(part, f, defn) {
      if (!(part instanceof ArgumentsPattern)) {
        return false;
      }
      var splitted = this._splitHeadTail(part.args), beforeTail = splitted[0], tail = splitted[1], argi;
      if (!tail) {
        return false;
      }
      for (argi = 0; argi < beforeTail.length; argi++) {
        f.yieldNext(beforeTail[argi], defn.varname + argi);
      }
      f.yieldNext(tail, f.addVariable("argTail", beforeTail.length, "arguments"));
    },

    parse_array: function(part, f) {
      return this._parse_arrayLike(part, f, "lengthGeAndType");
    },

    _splitHeadTail: function(part) {
      if (part.length === 0) {
        return [part];
      }
      var last = part[part.length - 1], beforeTail, tail = null, ht;
      beforeTail = Array.prototype.slice.call(part, 0, part.length - 1);
      if (typeof last === "number") {
        ht = this.bitRegistry.find(last);
        if (ht) {
          beforeTail.push(ht[0]);
          tail = ht[1];
        }
      }
      else if (last instanceof Tail) {
        tail = last.obj;
      }
      if (tail === null) {
        return [part];
      }
      return [beforeTail, tail];
    },

    _parse_arrayLike: function(part, f, lengthCmpCommand) {
      if (part.length === 0) {
        return false;
      }
      var splitted = this._splitHeadTail(part), beforeTail = splitted[0], tail = splitted[1];
      if (!tail) {
        return false;
      }
      f.addCheck("any");
      f.addCheck(lengthCmpCommand, beforeTail.length);
      this.ignoreLengthFor(beforeTail);
      f.yieldNext(beforeTail);
      f.yieldNext(tail, f.addVariable("tail", beforeTail.length));
    },

    render_lengthGe: function (command, varname) {
      return varname + ".length >= " + command.value;
    },

    render_lengthGeAndType: function (command, varname) {
      return "Array.isArray(" + varname + ") && " + varname + ".length >= " + command.value;
    },

    render_tail: function (command, varname, subitemVar) {
      return {noIf: subitemVar + " = Array.prototype.slice.call(" + varname + ", " + command.value + ")"};
    },

    render_argTail: function (command, varname, subitemVar) {
      return {noIf: [
        subitemVar + " = Array.prototype.slice.call(" + varname + ", " + (2/*guard and when args*/ + command.value) + ")",
        "while (" + subitemVar + ".length && " + subitemVar + "[" + subitemVar + ".length-1] === undefined) " + subitemVar + ".pop();"
      ]};
    }
  };
}
pluginHeadTail.createTail = function createTail(o) { return new Tail(o);};

