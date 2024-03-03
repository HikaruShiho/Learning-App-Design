import express from 'express'
import { FindLastGameUseCase } from '../application/useCase/findLastGamesUseCase'
import { StartNewGameUseCase } from '../application/useCase/startNewGameUseCase'
import { FindLastGameMySQLQueryService } from '../infrastructure/query/findLastGameMySQLQueryService'
import { GameMySQLRepository } from '../infrastructure/repository/game/gameMySQLRepository'
import { TurnMySQLRepository } from '../infrastructure/repository/turn/turnMySQLRepository'

export const gameRouter = express.Router()

const findLastGamesUseCase = new FindLastGameUseCase(
  new FindLastGameMySQLQueryService()
)

const startNewGameUseCase = new StartNewGameUseCase(
  new GameMySQLRepository(),
  new TurnMySQLRepository()
)

interface GetGamesResponseBody {
  games: {
    id: number
    darkMoveCount: number
    lightMoveCount: number
    winnerDisc: number
    startedAt: Date
    endAt: Date
  }[]
}

gameRouter.get(
  '/api/games',
  async (_, res: express.Response<GetGamesResponseBody>) => {
    const output = await findLastGamesUseCase.run()

    const responseBodyGames = output.map((g) => {
      return {
        id: g.gameId,
        darkMoveCount: g.darkMoveCount,
        lightMoveCount: g.lightMoveCount,
        winnerDisc: g.winnerDisc,
        startedAt: g.startedAt,
        endAt: g.endAt
      }
    })

    res.json({ games: responseBodyGames})
  }
)

gameRouter.post('/api/games', async (req, res) => {
  await startNewGameUseCase.run()

  res.status(201).end()
})
