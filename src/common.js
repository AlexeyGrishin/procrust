//some useful functions. I do not want to include underscore.js or lodash just for these ones.
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

function Command(command, varname, arg, newvar) {
  this.command = command;
  this.var = varname;
  this.value = arg;
  if (newvar) this.newvar = newvar;
}

Command.prototype.eq = function(c) {
  if (c.command != this.command) return false;
  return c.var == this.var && this.value === c.value;
};

function ArgumentsPattern(args) {
  this.args = args;
}