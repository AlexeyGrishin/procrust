function Tail(obj) {
  this.obj = obj;
}


function pluginHeadTail() {

    return {
      bitRegistry: "require",
      ignoreLengthFor: "require",

      parse_object: function(part, f) {
        if (!(part instanceof ArgumentsPattern)) return false;
        return this._parse_arrayLike(part.args, f, "lengthGe");
      },

      parse_array: function(part, f) {
        return this._parse_arrayLike(part, f, "lengthGeAndType");
      },

      _parse_arrayLike: function(part, f, lengthCmpCommand) {
        if (part.length == 0) return false;
        var last = part[part.length - 1];
        var beforeTail, tail = null;
        beforeTail = Array.prototype.slice.call(part, 0, part.length - 1);
        if (typeof last === "number") {
          var ht = this.bitRegistry.find(last);
          if (ht) {
            beforeTail.push(ht[0]);
            tail = ht[1];
          }
        }
        else if (last instanceof Tail) {
          tail = last.obj;
        }
        if (tail == null) {
          return false;
        }

        f.addCheck(lengthCmpCommand, beforeTail.length);
        this.ignoreLengthFor(beforeTail);
        f.yieldNext(beforeTail);
        f.yieldNext(tail, f.addVariable("tail", beforeTail.length));
      },

      render_lengthGe: function(command, varname) {
        return varname + ".length >= " + command.value;
      },

      render_lengthGeAndType: function(command, varname) {
        return "Array.isArray(" + varname + ") && " + varname + ".length >= " + command.value;
      },

      render_tail: function(command, varname, subitemVar) {
        return {noIf: subitemVar + " = Array.prototype.slice.call(" + varname + ", " + command.value + ")"};
      }

  }
}
pluginHeadTail.createTail = function createTail(o) { return new Tail(o);};

