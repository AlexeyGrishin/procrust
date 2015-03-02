function createParser(firstArgName) {

  function _key(key) { return {key: key}}
  function _fakekey(key) { return {key: key, fake: true}}

  var _value = _create(['var', _key('value')]);
  var _typeof = _create(['var', _key('typeof')]);
  var _array = _create(['var', _fakekey('array')]);
  var _prop = _create(['var', _key('prop'), 'newvar']);
  var _item = _create(['var', _key('item'), 'newvar']);
  var _tail = _create(['var', _key('tail'), 'newvar']);
  var _constructor = _create(['var', _key('ctor')]);
  var _ref = _create(['var', _key('ref')]);
  var _length = _create(['var', _key('length'), 'compare'], function(ex) {
    return this.length === ex.length && this.compare === ex.compare;
  });
  var _done = _create([_key('done'), 'result']);
  var _any = _create(['var', _fakekey('any')]);


  return function parse(pattern, idx, helper) {
    var cmds = [];
    var refs = {};
    function addCmd(c) { cmds.push(c); }
    function addRef(varname, ref) {
      if (refs[ref]) {
        addCmd(_ref(varname, refs[ref]));
      }
      refs[ref] = varname;
    }

    function parse(varname, part, cannotBeNull) {
      var tv, i, key;
      var ref = helper.getResultRef(part);
      if (ref) {
        addRef(varname, ref);
      }
      if (helper.isWildcard(part) || helper.isResultVar(part)) {
        if (!cannotBeNull) {
          addCmd(_any(varname));
        }
        return;
      }

      if (Array.isArray(part)) {
        addCmd(_array(varname));
        var splitted = helper.resolveTail(part);
        var enumerated = splitted[0];
        var tail = splitted[1];
        addCmd(_length(varname, enumerated.length, tail ? '>=' : '=='));
        for (i = 0; i < enumerated.length; i++) {
          tv = varname + "[" + i + "]";
          addCmd(_item(varname, i, tv));
          parse(tv, enumerated[i]);
        }
        if (tail) {
          tv = varname + ".slice(" + enumerated.length + ")";
          addCmd(_tail(varname, enumerated.length, tv));
          parse(tv, tail, true);
        }
      }
      else if (typeof part === 'object') {
        addCmd(_typeof(varname, 'object'));
        if (part instanceof ObjectMatcher) {
          addCmd(_constructor(varname, part.klass));
          part = part.props;
        }
        var keys = Object.keys(part);
        keys.sort();
        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          tv = varname + "." + key;
          addCmd(_prop(varname, key, tv));
          parse(tv, part[key]);
        }
      }
      else if (typeof part === 'function') {
        addCmd(_constructor(varname, part.name));
      }
      else {
        addCmd(_value(varname, part));
      }
    }

    parse(firstArgName, pattern);
    addCmd(_done(idx, refs));
    return _parsedPattern(cmds);
  };


  function _eq(prop) {
    return function(ex) {
      return ex.var === this.var && this[prop] === ex[prop];
    }
  }

  function _create(args, customeq) {
    return function() {
      var o = {};
      for (var i = 0; i < args.length; i++) {
        var k = args[i], value = arguments[i];
        if (k.key) {
          if (k.fake) value = true;
          k = k.key;
          o.eq = _eq(k)
        }
        o[k] = value;
      }
      if (customeq) o.eq = customeq;
      return o;
    }
  }
}