import { AxiosError } from "axios";
import { createServer } from "http";
import url from "url";
import { Server } from "socket.io";
import { GameState } from "./types";
import DB from "./utils/db";
import { createGame, startGame, addAnswer, removeUserFromGame, betToken, betChip, activeUsers, leaveGame } from "./utils/game";
import { registerUser, updateUser, User } from "./utils/user";

const db = new DB();

const users: { [key: string]: any } = {};

let id = '';
let isStale = false;

function deleteGame(gameId: string) {
    setTimeout(async () => {
        const game = await db.get(gameId);
        if (game && activeUsers(game).length === 0) {
            await db.delete(gameId);
            game.users.forEach((user: User) => {
                delete users[user.id];
            });
        }
    }, 60000);
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
                    db.getAll().then((games) => {
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
                    db.get(id).then((game) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.write(JSON.stringify(game));
                        res.end();
                    });
                }
                break;
            case '/users':
                if (req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(JSON.stringify(users));
                    res.end();
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

    users[socket.id] = {
        name: socket.id,
        id: socket.id,
    };


    console.log("a user connected");
    console.log(socket.id);
    console.log(Object.keys(users).length);
    socket.emit('id', socket.id)

    socket.on("create", async (name) => {
        const newGame = await db.create(createGame(new User(name, socket.id)));
        gameId = newGame.id;
        id = gameId.toString();

        socket.emit('gameState', Object.keys(newGame), newGame)
        socket.join(gameId.toString())
        isStale = true;
    });

    socket.on("register", async (name, gameID) => {
        console.log('register');

        gameId = gameID
        const game = await db.get(gameId);
        const updatedGame = await db.update(gameId, registerUser(game, name, socket.id));
        socket.emit('gameState', updatedGame)
        socket.emit('id', socket.id)
        socket.join(gameId.toString())
        isStale = true;
    });

    socket.on('reconnect', async (existingId, gameid) => {
        console.log('reconnect');

        gameId = gameid
        const game = await db.get(gameId) as GameState | undefined;
        if (!game || !game.users) {
            console.log('no game');
            socket.emit('noReconnect')
            return;
        }

        const user = game.users.find((user) => user.id === existingId) as User | undefined;

        if (!user) {
            console.log('no user');
            socket.emit('noReconnect')
            return;
        }

        const updatedGame = await db.update(gameId, updateUser(game, existingId, new User(user.name, socket.id)));
        socket.emit('gameState', updatedGame)
        socket.join(gameId.toString())
        isStale = true;
    })

    socket.on("updateRegister", async (existingId, gameID) => {
        console.log('updateRegister');

        gameId = gameID
        const game = await db.get(gameId) as GameState | undefined;
        if (!game) {
            return;
        }
        const user = game.users.find((user) => user.id === existingId) as User | undefined;
        if (!user) {
            delete users[existingId]
            socket.join(gameId.toString())
            return;
        }
        const updatedGame = await db.update(gameId, updateUser(game, existingId, new User(user.name, socket.id)));
        socket.emit('gameState', updatedGame)
        socket.join(gameId.toString())
        isStale = true;
    });

    socket.on("start", async () => {
        console.log('start');

        const game = await db.get(gameId);
        await db.update(gameId, startGame(game));
        isStale = true;
    });

    socket.on('submitAnswer', async (answer) => {
        const game = await db.get(gameId);
        try {
            await db.update(gameId, addAnswer(game, socket.id, answer));
            isStale = true;
        } catch (e) {
            if (e instanceof Error) {
                socket.emit('error', e.message)
            }
        }
    })

    socket.on('bet', async (answer: string, payout: number, betIdx: number) => {
        const game = await db.get(gameId);
        await db.update(gameId, betToken(game, socket.id, answer, payout, betIdx));
        isStale = true;
    })

    socket.on('betChip', async (betIdx: number, amount: number) => {
        const game = await db.get(gameId);
        await db.update(gameId, betChip(game, socket.id, betIdx, amount));
        isStale = true;
    })

    socket.on("disconnect", async () => {
        console.log("user disconnected");
        if (gameId) {
            const game = await db.get(gameId);
            if (activeUsers(game).length <= 1) {
                deleteGame(gameId);
                gameId = '';
            } else {
                await db.update(gameId, leaveGame(game, socket.id));
            }
        }
        console.log(Object.keys(users).length);
        isStale = true;
    });
});

httpServer

httpServer.listen(8080);

setInterval(async () => {
    if (isStale && id) {
        const game = await db.get(id)
        io.to(id).emit("gameState", game);
        isStale = false;
    }
}, 100);

