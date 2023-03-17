import { GameState, UserId } from "../types";

export class User {
    chips = 0;
    active = false;
    id: string;
    icon: string = 'smiley'
    constructor(public name: string, id: string) {
        this.id = id;
        this.active = true
    }
}

export function registerUser(game: GameState, name: string, id: string): GameState {
    return { ...game, users: [...game.users, new User(name, id)] }
}

export function unregisterUser(game: GameState, id: string, users: User[]): GameState {
    return { ...game, users: users.filter(user => user.id !== id) };
}

export function updateGameUser(game: GameState, id: UserId, key: string, value: string | number | boolean, newId: string): GameState {
    const updatedUsers = { ...game, users: game.users.map(user => user.id === id ? { ...user, id: newId, [key]: value } : user) };

    if (id !== newId) {
        // update current answers
        if (updatedUsers.currentAnswers.answers[id]) {
            updatedUsers.currentAnswers.answers[newId] = updatedUsers.currentAnswers.answers[id];
            delete updatedUsers.currentAnswers.answers[id];
        }

        // update current bets
        if (updatedUsers.currentBets[id]) {
            updatedUsers.currentBets[newId] = updatedUsers.currentBets[id];
            delete updatedUsers.currentBets[id];
        }

        // update rounds
        updatedUsers.rounds = updatedUsers.rounds.map(round => {
            if (round.answers.answers[id]) {
                round.answers.answers[newId] = round.answers.answers[id];
                delete round.answers.answers[id];
            }
            if (round.bets[id]) {
                round.bets[newId] = round.bets[id];
                delete round.bets[id];
            }
            return round;
        }
        )
    }

    return updatedUsers;
}

