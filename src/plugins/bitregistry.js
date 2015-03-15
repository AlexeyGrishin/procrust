
function pluginBitregistry() {

  var bitRegistry = {
    idx: 1,
    head: true,
    objs: {},
    pairs: {},
    assign: function(obj) {
      var idx = this.idx, headIdx;
      this.objs[idx] = obj;
      /*jslint bitwise: true*/
      if (!this.head) {
        headIdx = idx >> 1;
        this.pairs[headIdx | idx] = [this.objs[headIdx], obj];
      }
      this.idx = this.idx << 1;
      this.head = !this.head;
      return idx;
    },
    find: function(pairIdx) {
      return this.pairs[pairIdx];
    }
  };

  return {
    "bitRegistry": "export",

    before_parse: function(doExport) {
      doExport("bitRegistry", bitRegistry);
      this.oldValueOf = Object.prototype.valueOf;
      Object.prototype.valueOf = function() {
        return bitRegistry.assign(this);
      };
    },

    after_parse: function() {
      Object.prototype.valueOf = this.oldValueOf;
    }
  };
}
