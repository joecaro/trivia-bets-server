import { users } from './index';

export const createUser = async (socketId: string, name: string, gameId: string | null) => {
    const user = await users.insertOne({ socketId, name, lastGameId: gameId, lastUpdatedAt: Date.now() });
    return user.acknowledged;
}

export const getUser = async (socketId: string) => {
    const user = await users.findOne({ socketId });

    return user;
}

export const updateUser = async (socketId: string, name: string, gameId: string) => {
    const user = await users.updateOne({ socketId }, { $set: { socketId, name, lastGameId: gameId, lastUpdatedAt: Date.now() } });

    return user.acknowledged;
}

export const deleteUser = async (socketId: string) => {
    const user = await users.deleteOne({ socketId });

    return user.acknowledged;
}