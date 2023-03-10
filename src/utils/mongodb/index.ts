
import { MongoClient } from 'mongodb';
import { GameState } from '../../types';
import { UserClient } from '../../types';

export const client = new MongoClient(process.env.MONGO_DB_URL as string);
const dbName = 'trivia-bets';

export const users = client.db(dbName).collection<UserClient>('users');
export const games = client.db(dbName).collection<GameState>('games');