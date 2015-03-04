
function _parsedPattern(cmds) {
  return {cmds: cmds};
}

function _notEmpty(item) {
  return item != null;
}

function _puck(name, ar) {
  return ar.map(function(item) { return item[name];});
}

function _flat(array) {
  for (var i = array.length-1; i >=0; i--) {
    if (Array.isArray(array[i])) {
      array.splice.apply(array, [i, 1].concat(_flat(array[i])));
    }
  }
  return array;
}

function _toString(ex) {
  if (ex.cmds) {
    return ex.cmds.map(_toString).join('\n')
  }
  var txt = '';
  if (ex.newvar) {
    txt = ex.newvar + " = " + txt;
  }
  if (ex.if) {
    txt = "if (" + _toString(ex.if) + ")\n  " + ex.then.map(_toString).join('\n  ') + "\nendif\n";
  }
  if (ex.fork) {
    txt = ex.fork.map(_toString).join('\n');
  }
  if (ex.var) {
    txt += ex.var;
    ['array', 'ctor', 'item', 'tail', 'typeof', 'length', 'prop', 'any', 'value', 'ref'].forEach(function(k) {
      if (typeof ex[k] != "undefined") {
        txt += "(" + k;
        if (ex[k] !== true) {
          txt += " " + ex[k];
        }
        txt += ")";
      }
    })
  }
  if (typeof ex.done != 'undefined') {
    txt = "done(" + [ex.done].concat(JSON.stringify(ex.result)).join(',') + ")";
  }
  return txt;
}


function ObjectMatcher(klass, props) {
  this.klass = klass.name;
  this.props = props;
}
