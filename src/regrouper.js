function createRegrouper() {

  function forkFlow(idx) {
    return function(fork) {
      /*global flow*/
      return {if: fork.cmd, then: flow(fork.patterns, idx)};
    };
  }

  function flow(patterns, idx) {
    if (patterns.length === 1) {
      return patterns[0].slice(idx);
    }
    var cmds = [], i, forks, found, f;
    while (patterns.length > 0) {
      patterns = patterns.filter(_notEmpty);
      if (patterns.length === 0) {
        break;
      }
      forks = [{cmd: patterns[0][idx], patterns: [patterns[0]]}];
      for (i = 1; i < patterns.length; i++) {
        found = false;
        for (f = 0; f < forks.length; f++) {
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
      if (forks.length === 1) {
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

}