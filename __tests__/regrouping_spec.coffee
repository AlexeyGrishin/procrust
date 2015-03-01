jest.dontMock '../procrust'
{Tail, Match, When, Having, functionMatch} = pm = require('../procrust')

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
    console.log(fn.matchFn.toString())
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
