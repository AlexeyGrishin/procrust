function PluginsFactory() {
  this.plugins = [];
}

PluginsFactory.prototype.add = function(pluginFactory) {
  this.plugins.push(pluginFactory);
  return this;
};

PluginsFactory.prototype.addFirst = function(pluginFactory) {
  this.plugins.unshift(pluginFactory);
  return this;
};

PluginsFactory.prototype.erase = function() {
  this.plugins = [];
};

PluginsFactory.prototype.create = function() {
  return new Plugins(this.plugins.map(function(p) { return new p;}));
};

function Plugins(plugins) {
  this.plugins = plugins;
}
Plugins.prototype.before_parse = function() {
  for (var i = 0; i < this.plugins.length; i++) {
    if (this.plugins[i].before_parse) this.plugins[i].before_parse(function(k, v) {
      for (var pp = 0; pp < this.plugins.length; pp++) {
        if (this.plugins[pp][k]) this.plugins[pp][k] = v;
      }
    }.bind(this));
  }
};

function firstNonFalse(items, calls, arguments, skipResult) {
  for (var i = 0; i < items.length; i++) {
    for (var c = 0; c < calls.length; c++) {
      var call = calls[c];
      if (!(typeof items[i][call] === "function")) continue;
      var res = items[i][call].apply(items[i], arguments);
      if (!skipResult(res)) return res;
    }
  }
  return false;
}
function skipAll() { return true; }
function skipFalse(res) { return res === false;}


Plugins.prototype.parse = function doParse() {
  var defn = arguments[3];
  var methods = ["parse_" + defn.type, "parse"];
  return firstNonFalse(this.plugins, methods, arguments, skipFalse);
};

Plugins.prototype.render = function doRender() {
  var command = arguments[0];
  return firstNonFalse(this.plugins, ["render_" + command.command], arguments, skipFalse);
};

Plugins.prototype.after_parse = function doAfterParse() {
  return firstNonFalse(this.plugins, ["after_parse"], arguments, skipAll);
};
Plugins.prototype.addFirst = function(p) {
  this.plugins.unshift(p);
};
