function createRegrouper() {

  function flow(patterns, idx) {
    if (patterns.length == 1) return patterns[0].cmds;
    var cmds = [], i;
    while (patterns.length > 0) {
      patterns = patterns.filter(_notEmpty);
      if (patterns.length == 0) break;
      var forks = [{cmd: patterns[0].cmds[idx], patterns: [patterns[0]]}];
      for (i = 1; i < patterns.length; i++) {
        var found = false;
        for (var f = 0; f < forks.length; f++) {
          if (patterns[i].cmds[idx].eq(forks[f].cmd)) {
            forks[f].patterns.push(patterns[i]);
            found = true;
            break;
          }
        }
        if (!found) {
          forks.push({cmd: patterns[i].cmds[idx], patterns: [patterns[i]]});
        }
      }
      if (forks.length == 1) {
        cmds.push(forks[0].cmd);
      }
      else {
        cmds.push({
          fork: forks.map(function (f) {
            return {
              if: f.cmd,
              then: flow(f.patterns, idx + 1)
            }
          })
        });
        break;
      }
      idx++;
    }
    return cmds;
  }


  return function regroup(patterns) {
    return _parsedPattern(flow(patterns, 0));
  };

}