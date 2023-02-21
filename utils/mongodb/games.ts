import { games } from './index';

import { User } from '../user'
import * as g from '../game'
import { GameState } from '../../types';
import { ObjectId } from 'mongodb';

export const createGame = async (gameState: GameState) => {
    const game = await games.insertOne(gameState);
    return game.insertedId;
}

export const getGames = async () => {
    const gamesList = await games.find({}).toArray();

    return gamesList;
}

export const getGame = async (id: string) => {
    const game = await games.findOne({ _id: new ObjectId(id) });

    return game;
}

export const updateGame = async (id: string, gameState: GameState) => {
    const game = await games.updateOne({ _id: new ObjectId(id) }, { $set: gameState });

    return game.upsertedId;
}

export const deleteGame = async (id: string) => {
    const game = await games.deleteOne({ _id: new ObjectId(id) });

    return game;
}