jest.dontMock '../procrust'
{Tail, Match, When, Having} = pm = require('../procrust')
{createRegrouper} = pm

describe 'regrouper', ->

  class Cmd
    constructor: (@name) ->
    toString: -> "[#{@name}]"
    eq: (anotherCmd) ->
      anotherCmd.name == @name

  asFlow = (cmds) ->
    cmds.split("").map (c) -> new Cmd(c)

  asString = (flow) ->
    flow.map((c) ->
      if c.fork
        c.fork.map((f) -> "[" + asString([f.if].concat(f.then)) + "]").join("")
      else
        c.name
    ).join("")

  regroup = (flows...) -> asString(createRegrouper()(flows.map(asFlow)))

  it 'shall return empty flow as is', ->
    expect(regroup "").toEqual("")

  it 'shall return single command flow as is', ->
    expect(regroup "123").toEqual "123"

  describe 'for 2 flows shall split command flow after equal commands ', ->

    it 'at the beginning', ->
      expect(regroup "abc", "Abc").toEqual("[abc][Abc]")
    it 'at the end', ->
      expect(regroup "abc", "abC").toEqual("ab[c][C]")

  describe 'shall split 3 flows', ->
    it 'on 3 different', ->
      expect(regroup "..A.", "..B.", "..C..").toEqual("..[A.][B.][C..]")
    it 'on 2 groups', ->
      expect(regroup "...A!", "..B!!", ".C!!!").toEqual(".[.[.A!][B!!]][C!!!]")

  it 'shall group non-neighbour flows', ->
    expect(regroup "..1.A", "..2.B", "..1.C", "..2.D").toEqual("..[1.[A][C]][2.[B][D]]")


describe 'big enough matching expression', ->

  fn = Match -> [
    When ['case', @x, @y], -> "case1"
    When {case: 'case', x: @x, y: @y}, -> "case2"
    When ['case', @x, @y, @z], -> "case3"
    When {case: 'case'}, -> "case4"
    When [@item1, @item2], -> "case5"
    When [@item1, @item1, @tail], -> "case6"
    When [@item1, @item2 | @tail], -> "case7"
    When [[[[[[[[[[[[[[["case"]]]]]]]]]]]], @x = {x:5}]]], -> "case8"
    When [[[[[[[[[[[[[[["case"]]]]]]]]]]]], @x]]], -> "case9"
    When {case: [{case: [{case: [{case: [{case: [@subnested]}]}]}]}]}, -> "case10"
    When {case: [{case: [{case: [{case: [@nested]}]}]}]}, -> "case11"
    When @_, -> "other"
  ]

  it "shall match all cases correctly", ->
    expect(fn ['case', 1, 2]).toEqual("case1")
    expect(fn {case: 'case', x: 1, y: 10}).toEqual("case2")
    expect(fn ['case', 1, 2, 3]).toEqual("case3")
    expect(fn {case: 'case', nox: 1}).toEqual("case4")
    expect(fn [10, 20]).toEqual("case5")
    expect(fn [10, 20, 30]).toEqual("case7")
    expect(fn [10, 10, 30]).toEqual("case6")
    expect(fn [10, 10, 30, 30]).toEqual("case7")
    expect(fn [10]).toEqual("other")
    expect(fn [[[[[[[[[[[[[[["case"]]]]]]]]]]]], {x:5}]]]).toEqual("case8")
    expect(fn [[[[[[[[[[[[[[["case"]]]]]]]]]]]], {x:6}]]]).toEqual("case9")
    expect(fn {case: [{case: [{case: [{case: [{case: [1]}]}]}]}]}).toEqual("case10")
    expect(fn {case: [{case: [{case: [{case: [{}]}]}]}]}).toEqual("case11")
    expect(fn {case: [{case: [{case: [{case: {}}]}]}]}).toEqual("other")
