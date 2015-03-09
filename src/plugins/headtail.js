function Tail(obj) {
  this.obj = obj;
}


function pluginHeadTail() {

    return {
      bitRegistry: "require",
      ignoreLengthFor: "require",

      parse_array: function(addCmd, part, yieldNext) {
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

        addCmd("lengthGe", beforeTail.length);
        this.ignoreLengthFor(beforeTail);
        yieldNext(beforeTail);
        var nname = ".slice(" + beforeTail.length + ")";
        addCmd("tail", beforeTail.length, nname);
        yieldNext(tail, nname);
      },

      render_lengthGe: function(command, varname) {
        return varname + ".length >= " + command.value;
      },

      render_tail: function(command, varname, createVar) {
        return {noIf: createVar("tail") + " = " + varname + ".slice(" + command.value + ")"};
      }

  }
}
pluginHeadTail.createTail = function createTail(o) { return new Tail(o);};

