function ObjectMatcher(klass, props) {
  this.klass = klass;
  this.props = props;
}

function pluginObjectOf() {

  return {
    parse: function(part, f) {
      if (part instanceof ObjectMatcher) {
        f.yieldAs(part.klass);
        f.yieldAs(part.props);
        return true;
      }
      return false;
    }
  }
}

var global = (function() { return this;})();


pluginObjectOf.ObjectOf = function ObjectOf() {
  if (arguments[0] === global) {
    //constructor called as function, matching case
    return new ObjectMatcher(arguments[1], arguments[2][0]);
  } else if (typeof arguments[0] === 'function') {
    return new ObjectMatcher(arguments[0], arguments[1]);
  } else {
    //this is normally created object, ignore
    return false;
  }
};