jest.dontMock '../pattern-matching'
{Tail, Match, When, Having, functionMatch} = require('../pattern-matching')

class MyClass

describe 'Match', ->
  describe 'by type', ->
    fn = Match -> [
      When Number, -> 'number'
      When String, -> 'string'
      When MyClass, -> 'myClass'
    ]

    it 'shall match numbers', ->
      expect(fn 3).toEqual('number')
    it 'shall match strings', ->
      expect(fn 'hello').toEqual('string')
    it 'shall match user classes', ->
      expect(fn new MyClass()).toEqual('myClass')
    it 'shall throw error if no match and no second arg', ->
      expect(-> fn null).toThrow()

  describe 'by value', ->
    fn = Match -> [
      When 3, -> 'is a 3'
      When 5, -> 'is a 5'
      When 'test', -> 'is a test'
      When {x: 3}, -> 'is a struct'
      When [1,2], -> 'is an array'
      When {x: {y: [1,2]}}, -> 'is a nested struct'
    ]
    it 'shall match number', ->
      expect(fn 3).toEqual('is a 3')
      expect(fn 5).toEqual('is a 5')
    it 'shall match string', ->
      expect(fn 'test').toEqual('is a test')
    it 'shall match exact struct', ->
      expect(fn {x:3}).toEqual('is a struct')
    it 'shall match exact partial struct', ->
      expect(fn {x:3, y:10}).toEqual('is a struct')
    it 'shall match exact array', ->
      expect(fn [1,2]).toEqual('is an array')
    it 'shall match nested struct', ->
      expect(fn {x: {y: [1,2]}}).toEqual('is a nested struct')

  describe 'destruction', ->
    fnSimple = Match -> [
      When @a = 3, -> @a
      When @a = 'test', -> @a
    ]

    it 'shall destruct simple value', ->
      expect(fnSimple 3).toEqual(3)
      expect(fnSimple 'test').toEqual('test')
    it 'shall throw on unknown value', ->
      expect(->fnSimple 4).toThrow()
      expect(->fnSimple 'notest').toThrow()

    fnArraySimple = Match -> [
      When @a = [1,2], -> @a
    ]
    fnArray = Match -> [
      When [1, @b], -> @b
      When [@a, @b], -> [@a, @b]
      When [@a | @b], -> [@a, @b]
    ]

    it 'shall destruct whole array', ->
      expect(fnArraySimple [1,2]).toEqual([1,2])
    it 'shall throw on non-matching array', ->
      expect(-> fnArraySimple [1,3]).toThrow()
      expect(-> fnArraySimple [1,2,3]).toThrow()
      expect(-> fnArraySimple [1]).toThrow()
    it 'shall destruct two-items array', ->
      expect(fnArray [5,6]).toEqual([5,6])
    it 'shall destruct head and tail', ->
      expect(fnArray [6,2,3]).toEqual([6,[2,3]])
      expect(fnArray [6]).toEqual([6,[]])
    it 'shall destruct second item if first matched', ->
      expect(fnArray [1,'get']).toEqual('get')

    it 'shall destruct head and tail with explicit tail', ->
      fnTail = Match -> [
        When [@head, Tail(@tail)], -> @tail
      ]
      expect(fnTail [1,2,3]).toEqual([2,3])

    fnStructSimple = Match -> [
      When @a = {x: 3}, -> @a
    ]
    fnStruct = Match -> [
      When {x: @_, y: @a}, -> @a
      When {x: @a}, -> @a
    ]
    fnNested = Match -> [
      When @b = {x: @a, y: [@c | @d]}, -> [@a, @b, @c, @d]
    ]

    it 'shall destruct whole struct', ->
      expect(fnStructSimple {x:3}).toEqual({x:3})
    it 'shall throw on non-matching struct', ->
      expect(-> fnStructSimple {x:4}).toThrow()
      expect(-> fnStructSimple {y:3}).toThrow()
      expect(-> fnStructSimple null).toThrow()
    it 'shall destruct single field', ->
      expect(fnStruct {x: 4}).toEqual(4)
    it 'shall destruct second field', ->
      expect(fnStruct {x:1,y:2}).toEqual(2)
    it 'shall throw if non-used field absent', ->
      expect(->fnStruct {y:2}).toThrow()

    it 'shall destruct complex nested struct', ->
      struct = {x: 'good', y: ['one', 'two', 'three']}
      expect(fnNested struct).toEqual([
        'good',
        struct,
        'one',
        ['two', 'three']
      ])

  it 'several calls', ->
    fn = Match -> [
      When @x, -> @x
    ]
    expect(fn 1).toEqual(1)
    expect(fn 2).toEqual(2)

  it 'with value', ->
    res = Match 5, -> [
      When 4, -> 'bad'
      When 5, -> 'good'
    ]
    expect(res).toEqual('good')

  it 'nested', ->
    res = Match {x: 2}, -> [
      When {x: @x}, -> Match @x, -> [
        When 2, -> 'good'
      ]
    ]
    expect(res).toEqual('good')


  it 'with guards', ->

    fn = Match -> [
      When @x, Having(-> @x == 1) -> '1'
      When @x, Having(-> @x == 2) -> '2'
      When @x, -> 'other'
    ]

    expect(fn 1).toEqual('1')
    expect(fn 2).toEqual('2')
    expect(fn 3).toEqual('other')


describe 'functionMatch', ->
  fn = functionMatch -> [
    When @param1, -> "1 param"
    When @param1, @param2, -> "2 params"
    When @param1 | @params, -> "#{@params.length + 1} params"
  ]

  it "shall process arguments as array", ->
    expect(fn(1)).toEqual("1 param")
    expect(fn(1, 2)).toEqual("2 params")
    expect(fn(1, 2, 3)).toEqual("3 params")
    expect(fn(1, 2, 3, 4)).toEqual("4 params")