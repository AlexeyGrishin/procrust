
function Plugins(plugins) {
  this.plugins = plugins;
}
Plugins.prototype.before_parse = function() {
  var i;
  for (i = 0; i < this.plugins.length; i++) {
    if (this.plugins[i].before_parse) {
      this.plugins[i].before_parse(this._export.bind(this));
    }
  }
};

Plugins.prototype._export = function(key, value) {
  var pp;
  for (pp = 0; pp < this.plugins.length; pp++) {
    if (this.plugins[pp][key]) {
      this.plugins[pp][key] = value;
    }
  }
};

function firstNonFalse(items, calls, args, skipResult) {
  var i, c, call, res;
  for (i = 0; i < items.length; i++) {
    for (c = 0; c < calls.length; c++) {
      call = calls[c];
      if (typeof items[i][call] === "function") {
        res = items[i][call].apply(items[i], args);
        if (!skipResult(res)) {
          return res;
        }
      }
    }
  }
  return false;
}
function skipAll() { return true; }
function skipFalse(res) { return res === false;}


Plugins.prototype.parse = function doParse(unused1, unused2, defn) {
  /*jslint unparam: true */
  var methods = ["parse_" + defn.type, "parse"];
  return firstNonFalse(this.plugins, methods, arguments, skipFalse);
};

Plugins.prototype.render = function doRender(command) {
  return firstNonFalse(this.plugins, ["render_" + command.command], arguments, skipFalse);
};

Plugins.prototype.after_parse = function doAfterParse() {
  return firstNonFalse(this.plugins, ["after_parse"], arguments, skipAll);
};
Plugins.prototype.addFirst = function(p) {
  this.plugins.unshift(p);
};


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
  return new Plugins(this.plugins.map(function(P) { return new P();}));
};
