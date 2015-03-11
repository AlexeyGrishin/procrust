{Tail, Match, When, Having} = pm = require('./../procrust')

checkBounds = (field, x,y) ->
  x >=0 and y >=0 and x < field.width and y < field.height

findOnField = Match -> [
  When [], @x, @y, -> false
  When [{side: @side, x: @x, y: @y}, Tail(@tail)], @x, @y, -> @side
  When [@head | @tail], @x, @y, -> findOnField(@tail, @x, @y)
]

find = Match -> [
  When @field, @x, @y, Having(-> !checkBounds(@field, @x, @y)) -> throw new Error("Invalid coords: #{@x}, #{@y}")
  When @field, @x, @y, -> findOnField(@field.field, @x, @y)
]
opposite = {x: 'o', o: 'x'}

turnOnField = Match -> [
  When [{side: @_, x: @x, y: @y}, Tail(@tail)], @x, @y, @_, -> throw new Error "Cell #{@x}, #{@y} is busy"
  When [], @x, @y, @side, -> [{side: @side, x:@x, y:@y}]
  When [@head | @tail], @x, @y, @side, -> [@head].concat(turnOnField(@tail, @x, @y, @side))
]

turn = Match -> [
  When @field, @_, @_, Having(-> @field.winner) -> throw new Error "Game is over"
  When @field, @x, @y, Having(-> !checkBounds(@field, @x, @y)) -> throw new Error("Invalid coords: #{@x}, #{@y}")
  When @field, @x, @y, ->
    @field.field = turnOnField(@field.field, @x, @y, @field.turn)
    @field.turn = opposite[@field.turn]
    checkWin(@field)
]

checkHorizontal = (field, side, y) ->
  field.field.filter((c) -> c.y == y and c.side == side).length == field.width

checkVertical = (field, side, x) ->
  field.field.filter((c) -> c.x == x and c.side == side).length == field.height

checkWinSide = (field, side) ->
  [0...field.width].some((x) -> checkVertical(field, side, x)) or
    [0...field.height].some((y) -> checkHorizontal(field, side, y))

checkWin = (field) ->
  field.winner = 'x' if checkWinSide(field, 'x')
  field.winner = 'o' if checkWinSide(field, 'o')
  field

TicTacToe =
  prepare: (size) -> {field: [], turn: 'x', width: size, height: size}
  find: find,
  turn: turn,
  toString: (field) ->
    [0...field.height].map((y) ->
      [0...field.width].map((x) ->
        find(field, x, y) or '.'
      ).join('')
    ).join('\n') + if field.winner then "\nWinner: #{field.winner}" else "\nTurn: #{field.turn}"




try
  f = TicTacToe.prepare(3)
  f = TicTacToe.turn(f, 1, 1)
  f = TicTacToe.turn(f, 1, 0)
  f = TicTacToe.turn(f, 0, 1)
  f = TicTacToe.turn(f, 1, 2)
  f = TicTacToe.turn(f, 2, 1)
  console.log(TicTacToe.toString(f))
catch e
  console.log('error')
  console.error(e.stack)