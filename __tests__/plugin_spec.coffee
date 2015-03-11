jest.dontMock '../procrust'
{Tail, Match, When, Having, ObjectOf} = pm = require('../procrust')

this.ctx =
  called_primitive: false
  called_array: false
  reset: ->
    @called_array = @called_primitive = false



myPlugin = ->
  parse_primitive: (part, f) ->
    f.addCheck("mycheck", "called_primitive")

  parse_array: (part, f) ->
    f.addCheck("mycheck", "called_array")
    if (part.length > 0)
      f.yieldNext(part[0], f.delegateReference(f.addVariable("item", 0)))



  render_mycheck: (cmd, varname) ->
    return { noIf: "this.ctx.#{cmd.value} = true" }


describe "my own plugin", ->
  it "shall add to beginning without problem", ->
    pm.plugins.addFirst(myPlugin)

  it "shall intersect primitive parsing", ->
    ctx.reset()
    fn = Match -> [
      When 10, -> "ok"
    ]
    expect(ctx.called_primitive).toBeFalsy()
    fn(11)
    expect(ctx.called_primitive).toBeTruthy()

  it "shall intersect array parsing", ->
    ctx.reset()
    fn = Match -> [
      When [], -> "ok"
    ]
    fn([])
    expect(ctx.called_array).toBeTruthy()

  it "shall pass reference to subitem", ->
    fn = Match -> [
      When @x = [1,2,3], -> @x
    ]
    expect(fn [1,2,3]).toEqual(1)

  it "shall process only one item of array", ->
    fn = Match -> [
      When [Number,2,3], -> "ok"
    ]
    expect(fn [1]).toEqual("ok")
    expect(fn [1,1]).toEqual("ok")
    expect(-> fn ["a"]).toThrow()
