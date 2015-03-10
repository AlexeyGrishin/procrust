jest.dontMock '../procrust'
{Tail, Match, When, Having, ObjectOf, functionMatch} = pm = require('../procrust')

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

  describe 'by exact value', ->
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

  describe 'with destruction', ->
    fnSimple = Match -> [
      When @a = Number, -> @a
      When @a = String, -> @a
    ]

    it 'shall destruct primitive value', ->
      expect(fnSimple 3).toEqual(3)
      expect(fnSimple 'test').toEqual('test')

    it 'shall destruct variables by type even several vars refer to same type', ->
      fnDuplicateCtors = Match -> [
        When @a = Number, -> "a" + @a
        When @b = Number, -> "b" + @b
      ]
      expect(fnDuplicateCtors 10).toEqual("a10")

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

    it 'shall destruct head and tail when head is struct', ->
      fnTail = Match -> [
        When [{x: 10} | @tail], -> @tail
      ]
      expect(fnTail [{x:10},"test"]).toEqual(["test"])

    it 'shall destruct head and tail when head is array', ->
      fnTail = Match -> [
        When [["head"] | @tail], -> @tail
      ]
      expect(fnTail [["head"],"test"]).toEqual(["test"])

    it 'shall destruct head and tail even same variables appear in different branches', ->
      fn = Match -> [
        When [10, @head1 | @tail], -> [@head1, @tail]
        When [20, @head2 | @tail], -> [@head2, @tail]
      ]
      expect(fn [10, 1, 2]).toEqual([1,[2]])
      expect(fn [20, 1, 2]).toEqual([1,[2]])


    it 'shall not destruct string as array', ->
      fn = Match -> [
        When [@head | @tail], -> [@head, @tail]
      ]
      expect(-> fn "str").toThrow()


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

    it 'shall destruct whole structs and struct parts', ->
      fn = Match -> [
        When {a: @a = {_non_exist: @_}}, -> throw "failed"
        When {a: @a = {b: @b}}, -> [@a, @b]
      ]
      expect(fn {a: {b: 3, c: 4}}).toEqual([{b:3,c:4},3])



    class MyClass1
      constructor: (@x, @y) ->

    class MyClass2
      constructor: (@x, @y) ->
        return m if m = ObjectOf(@, MyClass2, arguments)

    fnClass = Match -> [
      When @o = ObjectOf(MyClass1, x:3, y:@y), -> [@y, @o.y]
      When MyClass1, -> "class1"
      When @o = MyClass2(x:5, y:@y), -> [@y, @o.y]
      When MyClass2, -> "class2"
    ]
    it 'shall not break default class behavior', ->
      m = new MyClass2(1,2)
      expect(m instanceof MyClass2).toBeTruthy()
      expect(m.x).toEqual(1)
      expect(m.y).toEqual(2)
    it 'shall destruct struct of specific type with specific properties using ObjectOf', ->
      expect(fnClass new MyClass1(3, 10)).toEqual([10, 10])
      expect(fnClass new MyClass1(4, 10)).toEqual("class1")
    it 'shall destruct struct of specific type with specific properties using special constructor', ->
      expect(fnClass new MyClass2(5, 11)).toEqual([11, 11])
      expect(fnClass new MyClass2(4, 11)).toEqual("class2")


  describe 'of identical variables', ->
    it 'shall check identity if same variable met twice', ->
      fn = Match -> [
        When [@x, @x, @x], -> 'ok'
      ]
      expect(fn [3,3,3]).toEqual('ok')
      expect(->fn [3,3,4]).toThrow()

    it "shall not check identity for wildcard variable", ->
      fn = Match -> [
        When [@_, @_, @_], -> "ok"
      ]
      expect(fn [3,3,3]).toEqual('ok')
      expect(fn [1,2,3]).toEqual('ok')

  it 'shall process several calls', ->
    fn = Match -> [
      When @x, -> @x
    ]
    expect(fn 1).toEqual(1)
    expect(fn 2).toEqual(2)

  it 'shall work with value', ->
    res = Match 5, -> [
      When 4, -> 'bad'
      When 5, -> 'good'
    ]
    expect(res).toEqual('good')

  it 'shall correctly process different return values', ->
    fn = Match -> [
      When 1, -> false
      When 2, -> 0
      When 3, -> null
      When 4, -> undefined
    ]
    expect(fn 1).toBe(false)
    expect(fn 2).toBe(0)
    expect(fn 3).toBe(null)
    expect(fn 4).toBe(undefined)

  it 'shall work nested', ->
    res = Match {x: 2}, -> [
      When {x: @x}, -> Match @x, -> [
        When 2, -> 'good'
      ]
    ]
    expect(res).toEqual('good')


  describe 'with guards', ->
    it 'shall work using Having syntax', ->

      fn = Match -> [
        When @x, Having(-> @x == 1) -> '1'
        When @x, Having(-> @x == 2) -> '2'
        When @x, -> 'other'
      ]

      expect(fn 1).toEqual('1')
      expect(fn 2).toEqual('2')
      expect(fn 3).toEqual('other')

    it 'shall work using array of fns', ->
      fn = Match -> [
        When @x, [(-> @x > 1), (-> @x > 10), -> "1 " + @x]
        When @x, [(-> @x > 1), -> "2 " + @x]
        When @x, [-> "3 " + @x]
      ]
      expect(fn 11).toEqual("1 11")
      expect(fn 10).toEqual("2 10")
      expect(fn 1).toEqual("3 1")


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