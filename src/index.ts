import * as dotenv from 'dotenv';
dotenv.config();

import * as url from 'url';
import { createServer } from "http";
import { Server } from "socket.io";
import { UserClient } from "./types";
import {
    createGame,
    addAnswer,
    betToken,
    betChip,
    activeUsers,
    leaveGame,
    newGame,
    nextStage,
    deactivateUser
} from "./utils/game";
import { registerUser, updateGameUser, User } from "./utils/user";

import * as mUser from './utils/mongodb/users';
import * as mGame from './utils/mongodb/games';


const clearDB = async () => {
    const games = await mGame.getGames();

    const responses = await Promise.all(games.map(async (game) => {
        await mGame.deleteGame(game._id.toHexString());
    }));

    console.log('DB cleared');
};

clearDB();

function delayDeleteGame(gameId: string) {
    setTimeout(async () => {
        console.log('Attempting to delete game');

        const game = await mGame.getGame(gameId);

        if (!game) {
            console.log('Game not found');
            return;
        }

        if (game && activeUsers(game).length === 0) {
            await mGame.deleteGame(gameId);
            await Promise.all(game.users.map(async (user) => {
                await mUser.deleteUser(user.id);
            }));

            games.delete(gameId)

            console.log('Game deleted');
        } else {
            console.log('Game not deleted');
        }
    }, 1000 * 5);
}

const TIMEOUT = 1500;
const DELAY = 1000 / 2;
let lastUpdate = Date.now();
let timeout = null;

type GameStale = {
    id: string;
}
const games = new Map<string, GameStale>();

function emitGame(gameId: string) {
    if (!shouldUpdate(gameId)) {
        if (games.has(gameId) && timeout === null) {
            timeout = setTimeout(() => {
                emitGame(gameId);
            }, TIMEOUT);
        }
    }
    
    mGame.getGame(gameId).then((game) => {
        if (game) {
            io.to(gameId).emit('gameState', game);
        }
    });
}

function shouldUpdate(id: string) {
    const now = Date.now();
    if (games.has(id) && now - lastUpdate > DELAY) {
        lastUpdate = now;
        return true;
    }
    return false;
}

const httpServer = createServer((req, res) => {
    // Parse the request url
    if (req.url) {
        const reqUrl = url.parse(req.url).pathname
        switch (reqUrl) {
            case '/':
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write('<h1>Hello World!</h1>');
                res.end();
                break;
            case '/games':
                if (req.method === 'GET') {
                    mGame.getGames().then((games) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.write(JSON.stringify(games));
                        res.end();
                    });
                }
                break;
            case reqUrl?.match(/games\/([1-999])/)?.input:
                if (req.method === 'GET') {
                    const id = reqUrl?.match(/games\/([1-999])/)?.[1];
                    if (!id) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.write('<h1>404 Not Found</h1>');
                        res.end();
                        break;
                    }
                    mGame.getGame(id).then((game) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.write(JSON.stringify(game));
                        res.end();
                    });
                }
                break;
            default:
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.write('<h1>404 Not Found</h1>');
                res.end();
                break;
        }
    }
});

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    let gameId: string;
    let clientUser: UserClient;

    console.log("a user connected");
    socket.emit('id', socket.id)

    socket.on("create", async (name) => {
        const newGameId = await mGame.createGame(createGame(new User(name, socket.id)));

        const newUserCreated = await mUser.createUser(socket.id, name, newGameId.toHexString())
        clientUser = newUserCreated ? { socketId: socket.id, name: name, lastGameId: newGameId.toHexString(), lastUpdatedAt: Date.now() } : clientUser

        gameId = newGameId.toHexString();
        games.set(gameId, { id: gameId });

        socket.emit('gameState', Object.keys(newGame), newGame)
        socket.join(newGameId.toHexString())
        emitGame(newGameId.toHexString());
    });

    socket.on("register", async (name, gameID) => {
        console.log('register');

        gameId = gameID

        const game = await mGame.getGame(gameID)
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')
        }

        const newUserCreated = await mUser.createUser(socket.id, name, gameID)
        clientUser = newUserCreated ? { socketId: socket.id, name: name, lastGameId: gameID, lastUpdatedAt: Date.now() } : clientUser

        const updatedGame = await mGame.updateGame(gameId, registerUser(game, name, socket.id));
        socket.emit('gameState', updatedGame)
        socket.emit('id', socket.id)
        socket.join(game._id.toHexString())
        emitGame(game._id.toHexString());
    });

    socket.on('reconnect', async (existingId, gameid) => {
        console.log('reconnect');

        gameId = gameid
        const game = await mGame.getGame(gameid)
        if (!game || !game.users) {
            console.log('reconnect - no game');
            socket.emit('noReconnect')
            return;
        }

        const user = game.users.find((user) => user.id === existingId) as User | undefined;

        if (!user) {
            console.log('reconnect - no user');
            socket.emit('noReconnect')
            return;
        }

        const updatedUser = await mUser.updateUser(socket.id, user.name, gameId)
        clientUser = updatedUser ? { socketId: socket.id, name: user.name, lastGameId: gameId, lastUpdatedAt: Date.now() } : clientUser;

        const updatedGame = await mGame.updateGame(gameId, updateGameUser(game, existingId, user.name, socket.id));

        socket.emit('gameState', updatedGame)
        socket.join(game._id.toHexString())
        emitGame(game._id.toHexString());
    })

    socket.on("nextStage", async () => {
        console.log('nextStage');

        const game = await mGame.getGame(gameId);
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')
        }
        await mGame.updateGame(gameId, nextStage(game));
        emitGame(game._id.toHexString());
    });

    socket.on('submitAnswer', async (answer) => {
        const game = await mGame.getGame(gameId);
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')        }
        try {
            await mGame.updateGame(gameId, addAnswer(game, socket.id, answer));
            emitGame(game._id.toHexString());
        } catch (e) {
            if (e instanceof Error) {
                socket.emit('error', e.message)
            }
        }
    })

    socket.on('bet', async (answer: string, payout: number, betIdx: number) => {
        const game = await mGame.getGame(gameId);
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')
        }
        await mGame.updateGame(gameId, betToken(game, socket.id, answer, payout, betIdx));
        emitGame(game._id.toHexString());
    })

    socket.on('betChip', async (betIdx: number, amount: number) => {
        const game = await mGame.getGame(gameId);
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')
        }
        await mGame.updateGame(gameId, betChip(game, socket.id, betIdx, amount));
        emitGame(game._id.toHexString());
    })

    socket.on('newGame', async () => {
        const game = await mGame.getGame(gameId);
        if (!game) {
            console.warn('No Game Found')
            socket.emit('noGame')
        }
        await mGame.updateGame(gameId, newGame(game));
        emitGame(game._id.toHexString());
    })

    socket.on("disconnect", async () => {
        console.log("user disconnected");
        if (gameId) {
            const game = await mGame.getGame(gameId);
            if (!game) {
                console.warn('No Game Found')
                socket.emit('noGame')
            }
            if (!game.users) {
                throw new Error('Game has no users');
            }
            if (game && activeUsers(game).length <= 1) {
                // delay delete in case of reconnect
                await mGame.updateGame(gameId, deactivateUser(game, socket.id))
                delayDeleteGame(gameId)
            } else {
                await mGame.updateGame(gameId, leaveGame(game, socket.id));
            }
        }
        emitGame(gameId);
    });
});

console.log(process.env.PORT);


httpServer.listen(process.env.PORT || 8080);
