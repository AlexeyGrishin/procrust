function ObjectMatcher(klass, props) {
  this.klass = klass;
  this.props = props;
}

function pluginObjectOf() {

  return {
    parse: function(part, f) {
      if (part instanceof ObjectMatcher) {
        f.yieldNext(part.klass);
        if (part.props) {
          f.yieldNext(part.props);
        }
        return true;
      }
      return false;
    }
  };
}

function isGlobal(g) {
  return g === glob;
}


pluginObjectOf.ObjectOf = function objectOf(globOrFunc, funcOrProps, args) {

  function createMatcher(props) {
    return new ObjectMatcher(globOrFunc, props);
  }

  if (isGlobal(globOrFunc)) {
    //constructor called as function, matching case
    return new ObjectMatcher(funcOrProps, args[0]);
  }
  if (typeof globOrFunc === 'function') {
    return funcOrProps === undefined ? createMatcher : createMatcher(funcOrProps);
  }
  //this is normally created object, ignore
  return false;
};