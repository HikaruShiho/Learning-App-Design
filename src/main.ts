import express from 'express'
import 'express-async-errors'
import morgan from 'morgan'
import mysql from 'mysql2/promise'
import { GameGateway } from './dataaccess/gameGateway'

const EMPTY = 0
const DARK = 1
const LIGHT = 2

const INITIAL_BOARD = [
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, DARK, LIGHT, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, LIGHT, DARK, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
]

const PORT = 3000

const app = express()

app.use(morgan('dev'))
app.use(express.static('static', { extensions: ['html'] }))
app.use(express.json())

const gameGateway = new GameGateway()

app.get('/api/hello', async (req, res) => {
  res.json({
    message: 'Hello Express!!!'
  })
})

app.get('/api/error', async (req, res) => {
  throw new Error('Error endpoint')
})

app.post('/api/games', async (req, res) => {
  const now = new Date()

  const conn = await connectMySQL()
  try {
    await conn.beginTransaction()

    const gameRecord = await gameGateway.insert(conn, now)

    const turnInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)',
      [gameRecord.id, 0, DARK, now]
    )
    const turnId = turnInsertResult[0].insertId

    const squareCount = INITIAL_BOARD.map((line) => line.length).reduce(
      (v1, v2) => v1 + v2,
      0
    )

    const squaresInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')

    const squaresInsertValues: any[] = []
    INITIAL_BOARD.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })

    await conn.execute(squaresInsertSql, squaresInsertValues)

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

app.get('/api/games/latest/turns/:turnCount', async (req, res) => {
  const turnCount = parseInt(req.params.turnCount)

  const conn = await connectMySQL()
  try {
    const gameRecord = await gameGateway.findLatest(conn)
    if (!gameRecord) {
      throw new Error('Latest game not found')
    }

    const turnSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?',
      [gameRecord.id, turnCount]
    )
    const turn = turnSelectResult[0][0]

    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      `select id, turn_id, x, y, disc from squares where turn_id = ?`,
      [turn['id']]
    )
    const squares = squaresSelectResult[0]
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    squares.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    const responseBody = {
      turnCount,
      board,
      nextDisc: turn['next_disc'],
      // TODO 決着がついている場合、game_results テーブルから取得する
      winnerDisc: null
    }
    res.json(responseBody)
  } finally {
    await conn.end()
  }
})

app.post('/api/games/latest/turns', async (req, res) => {
  const turnCount = parseInt(req.body.turnCount)
  const disc = parseInt(req.body.move.disc)
  const x = parseInt(req.body.move.x)
  const y = parseInt(req.body.move.y)

  const conn = await connectMySQL()
  try {
    await conn.beginTransaction()

    // 1つ前のターンを取得する
    const gameRecord = await gameGateway.findLatest(conn)
    if (!gameRecord) {
      throw new Error('Latest game not found')
    }

    const previousTurnCount = turnCount - 1
    const turnSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      'select id, game_id, turn_count, next_disc, end_at from turns where game_id = ? and turn_count = ?',
      [gameRecord.id, previousTurnCount]
    )
    const turn = turnSelectResult[0][0]

    const squaresSelectResult = await conn.execute<mysql.RowDataPacket[]>(
      `select id, turn_id, x, y, disc from squares where turn_id = ?`,
      [turn['id']]
    )
    const squares = squaresSelectResult[0]
    const board = Array.from(Array(8)).map(() => Array.from(Array(8)))
    squares.forEach((s) => {
      board[s.y][s.x] = s.disc
    })

    // TODO 盤面に置けるかチェック

    // 石を置く
    board[y][x] = disc

    // TODO ひっくり返す

    // ターンを保存する
    const nextDisc = disc === DARK ? LIGHT : DARK
    const now = new Date()
    const turnInsertResult = await conn.execute<mysql.ResultSetHeader>(
      'insert into turns (game_id, turn_count, next_disc, end_at) values (?, ?, ?, ?)',
      [gameRecord.id, turnCount, nextDisc, now]
    )
    const turnId = turnInsertResult[0].insertId

    const squareCount = board
      .map((line) => line.length)
      .reduce((v1, v2) => v1 + v2, 0)

    const squaresInsertSql =
      'insert into squares (turn_id, x, y, disc) values ' +
      Array.from(Array(squareCount))
        .map(() => '(?, ?, ?, ?)')
        .join(', ')

    const squaresInsertValues: any[] = []
    board.forEach((line, y) => {
      line.forEach((disc, x) => {
        squaresInsertValues.push(turnId)
        squaresInsertValues.push(x)
        squaresInsertValues.push(y)
        squaresInsertValues.push(disc)
      })
    })

    await conn.execute(squaresInsertSql, squaresInsertValues)

    await conn.execute(
      'insert into moves (turn_id, disc, x, y) values (?, ?, ?, ?)',
      [turnId, disc, x, y]
    )

    await conn.commit()
  } finally {
    await conn.end()
  }

  res.status(201).end()
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Reversi application started: http://localhost:${PORT}`)
})

function errorHandler(
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  console.error('Unexpected error occurred', err)
  res.status(500).send({
    message: 'Unexpected error occurred'
  })
}

async function connectMySQL() {
  return await mysql.createConnection({
    host: 'localhost',
    database: 'reversi',
    user: 'reversi',
    password: 'password'
  })
}
