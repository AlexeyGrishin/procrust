function Tail(obj) {
  this.obj = obj;
}


function pluginHeadTail() {

    return {
      bitRegistry: "require",
      ignoreLengthFor: "require",

      parse_array: function(part, f) {
        if (part.length == 0) return false;
        var last = part[part.length - 1];
        var beforeTail, tail = null;
        beforeTail = part.slice(0, part.length - 1);
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

        f.addCheck("lengthGe", beforeTail.length);
        this.ignoreLengthFor(beforeTail);
        f.yieldNext(beforeTail);
        f.yieldNext(tail, f.addVariable("tail", beforeTail.length));
      },

      render_lengthGe: function(command, varname) {
        return "Array.isArray(" + varname + ") && " + varname + ".length >= " + command.value;
      },

      render_tail: function(command, varname, subitemVar) {
        return {noIf: subitemVar + " = " + varname + ".slice(" + command.value + ")"};
      }

  }
}
pluginHeadTail.createTail = function createTail(o) { return new Tail(o);};

