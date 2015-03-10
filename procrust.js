(function(exports){

  
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
    return c.var == this.var && this.value == c.value;
  };
  
    var compilePattern = (function() {
    
      var firstArgName = "val";
      var secondArgName = "when";
      var guardArgName = "guard";
    
      //for unit tests
      if (typeof exports !== 'undefined') exports.createRegrouper = createRegrouper;
    
      return function compilePattern(patterns, plugins, helper) {
        var parse = createParser(firstArgName, plugins);
        var regroup = createRegrouper();
        var createFn = createRenderer(firstArgName, secondArgName, guardArgName, plugins);
    
        return createFn(regroup(patterns.map(function(pattern, idx) {
          return parse(pattern, idx, helper);
        })), helper.renderOptions);
      };
    
      function createParser(firstArgName, plugins) {
      
        function Done(index, refs) {
          this.command = "done";
          this.value = refs;
          this.index = index;
        }
      
        Done.prototype.eq = function(ad) {
          return ad.command == this.command && ad.index == this.index;
        };
      
        return function parse(pattern, idx, helper) {
          var cmds = [];
          var refs = [];
      
          function addRef(varname, ref) {
            if (!ref) return;
            if (refs[ref]) {
              cmds.push(new Command("ref", varname, refs[ref]));
            }
            refs[ref] = varname;
          }
          var vidx = 1;
      
          function parse(varname, part, delegatedReference) {
            var defn = {};
            defn.varname = varname;
            defn.type = getTypeName(part);
            defn.reference = helper.getResultRef(part) || delegatedReference;//TODO: shall process both references, but it shall be very rare case
            var refDelegated = false;
      
            var parsingFlow = {
              addCheck: function(command, value) {
                cmds.push(new Command(command, varname, value));
              },
              addSubitem: function(command, value, patternSubitem, delegateRef) {
                var newname = "$" + vidx++;
                cmds.push(new Command(command, varname, value, newname));
                refDelegated = delegateRef;
                if (patternSubitem === true) {
                  //subitem omited, no parse, but delegate reference if needed
                  refDelegated = true;
                  addRef(newname, defn.reference);
                }
                else if (patternSubitem) {
                  parse(newname, patternSubitem, delegateRef ? defn.reference : undefined);
                }
              },
              yieldSubitem: function(command, value, patternSubitem, delegateRef) {
                this.addSubitem(command, value, patternSubitem, delegateRef);
              },
              yieldAs: function(pattern) {
                parse(varname, pattern);
              }
            };
      
            if (plugins.parse(part, parsingFlow, defn) === false) {
              throw new Error("Do not know how to parse: " + JSON.stringify(part) );
            }
            if (!refDelegated) addRef(varname, defn.reference);
      
          }
          parse(firstArgName, pattern);
          cmds.push(new Done(idx, refs));
          return cmds;
      
          function getTypeName(part) {
            if (typeof part == "undefined" || part == null) {
              return "undefined";
            }
            if (helper.isResultVar(part)) {
              return helper.isWildcard(part) ? "wildcard": "var";
            }
            if (Array.isArray(part)) {
              return "array";
            }
            if (typeof part == "object") {
              return "object";
            }
            if (typeof part == "function") {
              return "function";
            }
            else {
              return "primitive";
            }
          }
      
        };
      
      
      
      }
        function createRegrouper() {
        
          function forkFlow(idx) {
            return function(fork) {
              return {if: fork.cmd, then: flow(fork.patterns, idx)};
            }
          }
        
          function flow(patterns, idx) {
            if (patterns.length == 1) return patterns[0].slice(idx);
            var cmds = [], i;
            while (patterns.length > 0) {
              patterns = patterns.filter(_notEmpty);
              if (patterns.length == 0) break;
              var forks = [{cmd: patterns[0][idx], patterns: [patterns[0]]}];
              for (i = 1; i < patterns.length; i++) {
                var found = false;
                for (var f = 0; f < forks.length; f++) {
                  if (patterns[i][idx].eq(forks[f].cmd)) {
                    forks[f].patterns.push(patterns[i]);
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  forks.push({cmd: patterns[i][idx], patterns: [patterns[i]]});
                }
              }
              if (forks.length == 1) {
                cmds.push(forks[0].cmd);
              }
              else {
                cmds.push({fork: forks.map(forkFlow(idx + 1))});
                break;
              }
              idx++;
            }
            return cmds;
          }
        
        
          return function regroup(patterns) {
            return flow(patterns, 0);
          };
        
        }  function createRenderer(firstArgName, secondArgName, guardArgName, plugins) {
      
        var padStep = "  ";
        var resVarName = "res";
      
        plugins.addFirst(pluginDone(resVarName, secondArgName, guardArgName));
      
        return function createFn(commands, options) {
          options = options || {debug: {}};
      
          var temp = {
            vars: {},
            next: 1,
            all: []
          };
          temp.vars[firstArgName] = firstArgName;
      
          function addPad(pad, item) {
            return pad + item;
          }
      
          function renderExpressions(ret, pad, cmds) {
            return _flat(cmds.map(renderExpression.bind(null, ret, pad)).filter(_notEmpty)).map(addPad.bind(null, pad));
          }
      
          function renderDebug(condition) {
            if (options.debug.matching && condition != null) {
              return ["if (!(" + condition + ")) {console.log('[PROKRUST] ' + " + JSON.stringify(condition) + " + ' -> failed' );}"]
            }
            return [];
          }
      
          function renderConditionCheck(cond, ret) {
            return renderDebug(cond) + "if (!(" + cond + ")) " + ret + ";";
          }
      
          function renderFork(pad, fork) {
            return ["do {"]
              .concat(renderExpressions("break", pad, [fork.if].concat(fork.then)))
              .concat(["} while(false);"]);
          }
      
          function renderExpression(ret, pad, command) {
      
            if (command.fork) {
              return command.fork.map(function(f) {
                return renderFork(pad, f);
              });
            }
      
            var rendered = plugins.render(command, getVar(command.var), createVar, getVar);
            if (rendered === false) {
              throw new Error("Do not know how to render this: " + JSON.stringify(command))
            }
            else if (rendered.noIf) {
              return rendered.noIf;
            }
            else {
              return renderConditionCheck(rendered, ret);
            }
      
            function createVar(prefix) {
              var newvar;
              temp.all.push(temp.vars[command.newvar] = newvar = (prefix ? prefix : "var") + "$" + temp.next);
              temp.next++;
              return newvar;
            }
      
            function getVar(name) {
              return temp.vars[name];
            }
          }
      
          var code = renderExpressions("return false", padStep, commands);
          code.unshift(padStep + "var " + [resVarName].concat(temp.all).join(", ") + ";");
          try {
            var fn = new Function(firstArgName, secondArgName, guardArgName, code.join("\n"));
            if (options.debug.functions) {
              console.log(fn.toString());
            }
            return fn;
          }
          catch (e) {
            console.error("Cannot parse generated function code:\n" + code.join("\n"));
            console.error();
            console.error(e);
            throw e;
          }
        }
      }
      
      
    })();
    
    
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
    var defn = arguments[2];
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
    function pluginArray() {
    
      return {
        ignoreLengthFor: "export",
    
        before_parse: function(doExport) {
          doExport("ignoreLengthFor", function(ar) {
            ar.___ignore_length = true;
          });
        },
    
        parse_array: function(part, f) {
          if (part.___ignore_length) {
            delete part.___ignore_length;
          }
          else {
            f.addCheck("lengthEq", part.length);
          }
          for (var i = 0; i < part.length; i++) {
            f.yieldSubitem("item", i, part[i]);
          }
        },
    
        render_lengthEq: function(command, varname) {
          return "Array.isArray(" + varname + ") && " + varname + ".length === " + command.value;
        },
    
        render_item: function(command, varname, createVar) {
          return "(" + createVar("item" + command.value) + " = " + varname + "[" + command.value + "]) != null";
        }
      }
    }
      
      function pluginBitregistry() {
      
        var bitRegistry = {
          idx: 1,
          head: true,
          objs: {},
          pairs: {},
          assign: function(obj) {
            var idx = this.idx;
            this.objs[idx] = obj;
            if (!this.head) {
              var headIdx = idx >> 1;
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
            }
          },
      
          after_parse: function() {
            Object.prototype.valueOf = this.oldValueOf;
          }
        }
      }
        function pluginConstructor() {
        
          return {
            parse_function: function(part, f) {
              f.addCheck("constructor", part.name);
            },
        
            render_constructor: function(command, varname) {
                return varname + ".constructor.name === " + JSON.stringify(command.value);
            }
          }
        }
          function pluginDone(resVarName, secondArgName, guardArgName) {
          
            return {
              render_done: function(command, varname, createVar, getVar) {
                var result = [];
                for (var ref in command.value) {
                  if (!command.value.hasOwnProperty(ref)) continue;
                  result.push("'" + ref + "': " + getVar(command.value[ref]));
                }
                return {noIf: [
                  resVarName + " = {" + result.join(', ') + "};",
                  "if (" + guardArgName + "[" + command.index + "] && " + guardArgName + "[" + command.index + "](" + resVarName + ")) return {ok: " + secondArgName + "[" + command.index + "](" + resVarName + ")};"
                ]}
              },
          
              render_ref: function(command, varname, createVar, getVar) {
                return varname + " === " + getVar(command.value);
              }
            }
          }
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
                    f.yieldAs(beforeTail);
                    f.yieldSubitem("tail", beforeTail.length, tail);
                  },
            
                  render_lengthGe: function(command, varname) {
                    return "Array.isArray(" + varname + ") && " + varname + ".length >= " + command.value;
                  },
            
                  render_tail: function(command, varname, createVar) {
                    return {noIf: createVar("tail") + " = " + varname + ".slice(" + command.value + ")"};
                  }
            
              }
            }
            pluginHeadTail.createTail = function createTail(o) { return new Tail(o);};
            
              function pluginObject() {
              
                return {
                  parse_object: function(part, f) {
                    var keys = Object.keys(part);
                    keys.sort();
                    for (var i = 0; i < keys.length; i++) {
                      f.yieldSubitem("prop", keys[i], part[keys[i]]);
                    }
                  },
              
                  render_prop: function(command, varname, createVar) {
                    return "(" + createVar(command.value) + " = " + varname + "." + command.value + ") != null";
                  }
                }
              }
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
                };  function PluginsFactory() {
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
    var defn = arguments[2];
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
    function pluginPrimitive() {
    
      return {
        parse_primitive: function(part, f) {
          f.addCheck("value", part);
        },
    
        render_value: function(command, varname, createVar) {
          return varname + " === " + JSON.stringify(command.value);
        }
      }
    }
      function pluginReference() {
      
        return {
          parse_var: function(part, f) {
            f.addCheck("any")
          },
      
          parse_wildcard: function(part, f) {
            f.addCheck("any")
          },
      
          render_any: function() {
            return {noIf: []};
          }
        }
      }
      
  //Global context - used to pass data from Match to Whens
  var context = {
    kvars: {}
  };
  
  //Represents placeholder variable (i.e. @x, @y, etc.) that will be filled with value during destruction
  //@param key - is a variable name
  function Placeholder(key) {
    this.__key = key;
  }
  Placeholder.prototype = {
    meet: function() {
      return new Placeholder(this.__key);
    }
  };
  var _ = new Placeholder("_");
  _.meet = function() {
    return this;
  };
  
  function isPrimitive(obj) {
    var type = typeof obj;
    return type === "string" || type === "number" || type === "boolean";
  }
  
  function createPlaceholder(name) {
    var placeholder = name === "_" ? _ : new Placeholder(name);
  
    Object.defineProperty(context.kvars, name, {
      configurable: true,
      get: function() {
        return placeholder.meet();
      },
      set: function(vl) {
        if (vl === null) return;
        if (vl.__key) throw new Error("Cannot assign pattern variables to each other!");
        if (isPrimitive(vl)) {
          throw new Error("Cannot assign pattern variable to constant num (well, why do you need it for?)");
        }
        else {
          if (!vl.hasOwnProperty("__reference")) {
            var allRefs = [];
            Object.defineProperty(vl, "__reference", {
              configurable: false,
              enumerable: false,
              get: function() {
                return allRefs.shift();
              },
              set: function(vl) {
                allRefs.push(vl);
              }
            });
          }
          vl.__reference = placeholder.meet();
        }
      }
    });
    return placeholder;
  }
  
  function getAll(regexp, text) {
    var vals = {};
    var val = regexp.exec(text);
    while (val) {
      vals[val[1]] = true;
      val = regexp.exec(text);
    }
    return Object.keys(vals);
  }
  
  
  function Match(whensFactories) {
    var value, patternsAndFns, patterns, whenFns, guards, compiled, plugins;
    if (arguments.length == 2) {
      if (typeof arguments[1] == 'function' && typeof arguments[0] != 'function') {
        value = arguments[0];
        whensFactories = arguments[1];
      }
    }
    getAll(/this\.([a-zA-Z0-9_]+)/gi, whensFactories.toString()).map(createPlaceholder);
    plugins = pluginsFactory.create();
    plugins.before_parse();
    try {
      patternsAndFns = whensFactories.call(context.kvars);
    }
    finally {
      plugins.after_parse();  //TODO: rename
    }
    patterns = _puck("pattern", patternsAndFns);
    guards = _puck("guard", patternsAndFns);
    whenFns = _puck("execute", patternsAndFns);
    try {
      compiled = doCompilePatterns(patterns, plugins);
    }
    catch (e) {
      console.error(e, e.stack);
      throw e;
    }
    match.matchFn = compiled;
    if (typeof value !== 'undefined') return match(value);
    return match;
  
    function match(value) {
      var res = compiled(value, whenFns, guards);
      if (res) return res.ok;
      throw new Error("Value is not matched by any condition: '" + value + "'");
    }
  }
  
  function doCompilePatterns(patterns, plugins) {
    return compilePattern(patterns, plugins, {
      getResultRef: function(o) {
        if (o === _) return null;
        var lastRef = o.__reference;
        if (lastRef) return lastRef.__key;
        if (o.__key) return o.__key;
      },
      isResultVar: function(o) {return o instanceof Placeholder;},
      isWildcard: function(i) { return i === _;},
      renderOptions: {
        debug: exports.debug
      }
    })
  }
  
  function When(pattern, execute) {
    if (context.multipleParamsInWhen) {
      var args = [].slice.call(arguments);
      execute = args.pop();
      pattern = args;
    }
    var guards = [];
    var guardSucceeded = function() { return true;};
    if (Array.isArray(execute)) {
      guards = execute;
      execute = guards.pop();
      guardSucceeded = function(ctx) {
        return !guards.some(function(g) { return !g.call(ctx); })
      }
    }
    return {pattern: pattern, guard: guardSucceeded, execute: function(ctx) { return execute.call(ctx); }};
  
  }
  
  function Having(guardFn) {
    return function(execute) {
      return [guardFn, execute]
    }
  }
  
  function functionMatch() {
    context.multipleParamsInWhen = true;
    var fn = Match.apply(this, arguments);
    context.multipleParamsInWhen = false;
    return function() {
      var args = [].slice.call(arguments);
      return fn(args);
    }
  }
    var pluginsFactory = new PluginsFactory()
    .add(pluginBitregistry)
    .add(pluginHeadTail)
    .add(pluginArray)
    .add(pluginPrimitive)
    .add(pluginObjectOf)
    .add(pluginObject)
    .add(pluginReference)
    .add(pluginConstructor);
  exports.plugins = {
    array: pluginArray,
    bitRegistry: pluginBitregistry,
    headTail: pluginHeadTail,
    object: pluginObject,
    objectOf: pluginObjectOf,
    primitive: pluginPrimitive,
    reference: pluginReference,
    constructor: pluginConstructor,

    add: function(p) {
      pluginsFactory.add(p);
    },
    addFirst: function(p) {
      pluginsFactory.addFirst(p);
    },
    erase: function() {
      pluginsFactory.erase();
    }
  };
  exports.Match = Match;
  exports.functionMatch = functionMatch;
  exports.When = When;
  exports.Having = Having;
  exports.Tail = pluginHeadTail.createTail;
  exports.ObjectOf = pluginObjectOf.ObjectOf;
  exports.debug = {
    functions: false,
    parsed: false,
    matching: false
  };

})(typeof exports === 'undefined'? this['procrust']={}: exports);