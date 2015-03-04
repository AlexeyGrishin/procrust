#procrust.js

It is yet another pattern matching library for coffeescript. Well, it is written on javascript and could be used with javascript directly, but syntax was created specially for coffeescript.

Here is a small example (see it on jsfiddle - http://jsfiddle.net/GRaAL/aykztvdy/):

```coffeescript
{Match, When, Having} = require('./procrust.js')

valueOf = Match -> [
  When @num = Number, -> @num
  When {value: @value, multiplier: @mul}, -> @value * @mul
  When {value: @value}, -> @value
]

sum = Match -> [
  When [], -> 0
  When [@firstHalf = {half: true}, @secondHalf | @tail], -> valueOf(@firstHalf) + valueOf(@secondHalf) + sum(@tail)
  When [@head | @tail], Having(-> Array.isArray(@head)) -> sum(@head) + sum(@tail)
  When [@head | @tail], -> valueOf(@head) + sum(@tail)
]


console.log "1 + 2 + 3 + 4 + 5 + 3*2 =", sum [
  {value: 1},
  2,
  {value: 1, half: true},
  {value: 2},
  [
    {value: 4},
    {value: 5}
  ],
  {value: 3, multiplier: 2},
]

```

# Features

TBD