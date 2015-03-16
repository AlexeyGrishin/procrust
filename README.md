#procrust.js

It is yet another pattern matching library for coffeescript. Well, it is written on javascript and could be used with javascript directly, but syntax was created specially for coffeescript.

Example of usage - http://jsfiddle.net/GRaAL/cowzckLc/

# Features & Syntax

See it on jsfiddle - http://jsfiddle.net/GRaAL/a5qh6pob/

```coffeescript
{Match, When, Having, ObjectOf, Tail} = require('./procrust.js')

# Here we create function that accepts any number of arguments and compares it with provided patterns.
# If no one matches then exception will be thrown.
# Patterns are checked one by one in order they appear in the code.
fn = Match -> [
  # Compares argument with exact number. If equal - executes corresponding expression.
  # Here - returns 'exact number' string
  #    fn(1) matches
  #    fn(2) does not
  When 1,                 -> "exact number"

  # Same with string
  #    fn("test") matches
  #    fn(2) does not
  When "test",            -> "exact string"

  # Here we bind @x variable to the argument if its constructor is Number
  # Note that then @x variable is used in expression
  #    fn(4) matches
  #    fn("nope") does not
  When @x = Number,       -> "constructor + store result in variable x = #{@x}"

  # Matches empty array
  #    fn([]) matches
  #    fn([1]) does not
  When [],                -> "empty array"

  # Matches array of exact 3 strings. Larger arrays or arrays with other data will be rejected
  #    fn(["a","b","c"]) matches
  #    fn(["a","b","c","d"]) does not
  When ["a","b","c"],     -> "exact array"

  # Matches array of any 3 elements, then first one is bound to variable @a, second and third ones - to @b and @c
  #    fn([1, "2", [3]]) matches
  #    fn([]) does not
  When [@a, @b, @c],      -> "array of 3 elements: #{@a}, #{@b}, #{@c}"

  # Matches array of 2 elements. Note that if we use the same variable then values shall be equal.
  #    fn([1,1]) matches
  #    fn([1,"1"]) does not
  When [@a, @a],          -> "array of 2 identical elements: #{@a}"

  # Accepts any array of length >= 1 and binds first element to @head and the rest elements to @tail
  # And yes, this is bitwise OR operator
  #    fn([1,2,3]) matches (so head = 1, tail = [2,3])
  #    fn([1]) matches (so head = 1, tail = [])
  #    fn([]) does not
  When [@head | @tail],   -> "split on head and tail - #{@head} | #{@tail}"

  # That fancy '|' way does not work for primitives, so tail shall be marked explicitly with Tail function
  #    fn(x:["start", 1, 2]) matches (so tail = [1,2])
  When x:["start", Tail(@tail)],  -> "split on primitive head and tail #{@tail}"

  # Alternative is to use coffeescript native syntax
  When x:["stop", @tail...],     -> "split on primitive head and tail #{@tail} using coffeescript syntax"

  # Matches object with existent field 'a'. Ignores presence of other fields. And binds field's value to variable @a
  #    fn({a: 10}) matches
  #    fn({a: 10, b: 20}) matches
  #    fn({b: 20}) does not
  When {a: @a},           -> "object with field a = #{@a}"

  # Matches object with existent fields z and y. Value of field y does not matter
  When {z: @z, y: @_},    -> "object with field z = #{@z} and any field y"

  # Matches object with nested field which shall have x property equal to 5. The nested field is bound to @nested variable
  #    fn({nested: {x:5,y:10}}) matches, so @nested = {x:5,y:10}
  #    fn({nested: {x:1}}) does not
  When {nested: @nested = {x: 5}}, -> "object with field nested = '#{JSON.stringify(@nested)}' where x = 5"

  # Matches object with fields x and y which is of type Point
  When ObjectOf(Point, {x:@x, y: @y}),        -> "custom object with fields x = #{@x}, y = #{@y}"

  # Same as before, but instead of ObjectOf we use class constructor itself. See how it is implemented to achieve
  # this syntax.
  When Line(point1: @p1 = Point$(x: 0, y: 0), point2: @p2 = Point), -> "custom object with modified constructor, p1 = #{@p1}, p2 = #{@p2}"

  # When pattern is matched the bound variables could be checked in guard function and it may reject the value
  # Following 2 patterns are equal, but first one works only for strings having exclamation mark character at beginning
  #    fn("!test") matches, 1st expression
  #    fn("test") matches, 2nd expression
  When @s = String, Having(-> @s[0] == '!') -> "guard expression for string #{@s} (shall start with exclamation mark)"
  When @s = String,        -> "no guard expression - any string #{@s}"

  # This pattern matches any single argument (except undefined/null)
  When @_,                 -> "anything else"

  # This pattern matches two different arguments
  #    fn("test", "one") matches
  When @_, @_,             -> "two arguments"

  # And here we match 3 or more arguments
  #    fn("one", "ring", "to", "rule", "them", "all") matches
  When @a, @b, @c | @x,    -> "three and more!"
]

# Simple class
class Point
  constructor: (@x, @y) ->
  toString: -> "(#{@x},#{@y})"

Point$ = ObjectOf(Point)

class Line
  constructor: (@point1, @point2) ->
    # This line allows to use the class constructor directly in patterns
    # So instead of writing
    #   When ObjectOf(Line, point1: @point1)
    # we may write
    #   When Line(point1: @point1)
    return m if m = ObjectOf(@, Line, arguments)

```

# Installation

Just get `procrust.js` from this repo. Will put it to npm later.

In node.js:
```coffeescript
{When, Match, ObjectOf, Having, Tail} = require('./procrust.js')
```

In browser:
```coffeescript
{When, Match, ObjectOf, Having, Tail} = window.procrust
```


# Build/Tests

```
git clone https://github.com/AlexeyGrishin/procrust.git
npm install
npm build
npm test
```

# Debugging

```coffeescript
# Prints compiled matching functions.
procrust.debug.functions = true

# Prints failed conditions while executing matching functions
procrust.debug.matching = true

# Print single compiled function body
fn = Match -> [...]
console.log fn.matchFn.toString()

```

# Writing plugins

Procrust has all patterns processing implemented as plugins. You may refer to src/plugins folder for more information.

Also here is a jsfiddle with regexp plugin - http://jsfiddle.net/GRaAL/n9jkvnn7/.
It allows to parse regexps this way:

```coffeescript
fn = Match -> [
  When @res = /(\d+):(\d+)/, -> hours: @res[1], mins: @res[2]
  # or
  When RE(/(\d+):(\d+)/, @hours, @min), -> {@hours, @mins}
]
```

# Performance

You may run `performance.coffee` from examples. Or also here is a js-perf which compares procrust matching, native coffeescript matching and `pun` library - http://jsperf.com/procrust-js-vs-manual-parsing/2

