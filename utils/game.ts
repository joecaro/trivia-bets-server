import { Question } from "../lib/classes";
import { witsQuestions } from "../lib/questions";
import { BetGroup, GameState, Round } from "../types";
import { User } from "./user";

export const defaultGameState: GameState = {
    users: [],
    questions: generateQuestionList(),
    currentAnswers: { answers: {}, closestAnswer: { userId: '', answer: '' } },
    currentBets: {},
    rounds: [],
    currentQuestionIndex: 0,
    stage: "lobby",
}

export function createGame(gameHost: User): GameState {
    return { ...defaultGameState, users: [gameHost] }
}

export function addUserToGame(game: GameState, user: User): GameState {
    return { ...game, users: [...game.users, user] }
}

export function removeUserFromGame(game: GameState, userId: string): GameState {
    return { ...game, users: game.users.filter(user => user.id !== userId) }
}

export function startGame(game: GameState): GameState {
    if (game.users.length < 1) {
        throw new Error("Not enough players to start game");
    }

    return nextStage(game);
}

export function nextStage(game: GameState): GameState {
    switch (game.stage) {
        case "lobby":
            return nextRound(game);
        case "question":
            return { ...game, stage: "bets" };
        case "bets":
            return { ...tallyBets(game), stage: "tally" };
        case "tally":
            if (game.currentQuestionIndex === game.questions.length - 1) {
                return { ...game, stage: "finished" };
            } else return nextRound(game);
        case "finished":
            return { ...game, stage: "question", currentQuestionIndex: 0 };
        default:
            throw new Error("Invalid game stage");
    }
}

export function nextRound(game: GameState) {
    if (game.stage !== "lobby") {
        const currentRound: Round = {
            answers: game.currentAnswers,
            bets: game.currentBets,
            scores: {},
        }

        for (const user of game.users) {
           currentRound.scores[user.id] = user.chips;
        }


        game.rounds.push(currentRound);
        game.currentAnswers = {
            answers: {},
            closestAnswer: { userId: '', answer: '' }
        };
    }
    game.currentBets = generateBlankBets(game);
    game.currentQuestionIndex = game.currentQuestionIndex + 1;
    game.stage = 'question';

    return game;
}

function generateBlankBets(game: GameState) {
    const bets: BetGroup = {}

    for (const user of game.users) {
        bets[user.id] = [{ answer: null, chips: 0, payout: 2 }, { answer: null, chips: 0, payout: 2 }]
    }

    return bets;
}

export function getCurrentQuestion(game: GameState): { question: string, answer: string } {
    return game.questions[game.currentQuestionIndex];
}

export function addAnswer(game: GameState, userId: string, answer: string): GameState {
    const answers = game.currentAnswers;

    const currentQuestion = getCurrentQuestion(game);

    if (!currentQuestion) {
        throw new Error("No current question");
    }


    // if the answer is already in the answers object, throw error
    if (Object.values(answers.answers).findIndex(ans => ans.answer === answer) !== -1) {
        throw new Error("Answer already exists");
    }


    answers.answers = { ...answers.answers, [userId]: { answer: answer, isCorrect: answer === currentQuestion.answer } };

    return { ...game, currentAnswers: answers, stage: Object.keys(answers.answers).length === game.users.length ? 'bets' : 'question' };
}

export function betToken(game: GameState, userId: string, answer: string, payout: number, betIdx: number): GameState {
    const user = game.users.find(user => user.id === userId);

    if (!user) {
        throw new Error("User not found");
    }

    const currentBet = game.currentBets[userId];
    if (!currentBet) {
        throw new Error("No current bet");
    }
    user.chips = user.chips + currentBet[betIdx].chips;
    currentBet[betIdx] = { answer, payout, chips: 0 }

    return {
        ...game,
        currentBets: {
            ...game.currentBets,
            [userId]: currentBet
        },
        users: game.users.map(user => user.id === userId ? user : user)
    };
}

export function betChip(game: GameState, userId: string, betIdx: number, amount: number) {
    const user = game.users.find(user => user.id === userId);

    if (!user) {
        throw new Error("User not found");
    }

    const currentBet = game.currentBets[userId];

    if (user.chips > 0) {
        currentBet[betIdx].chips = currentBet[betIdx].chips + amount;
        user.chips = user.chips - amount;
    }

    return {
        ...game,
        currentBets: {
            ...game.currentBets,
            [userId]: currentBet
        },
        users: game.users.map(user => user.id === userId ? user : user)
    };
}

export function tallyBets(game: GameState): GameState {
    const currentQuestion = getCurrentQuestion(game);
    const currentAnswers = game.currentAnswers;

    if (!currentQuestion) {
        throw new Error("No current question");
    }

    if (!currentAnswers) {
        throw new Error("No current answers");
    }

    const closestUser = Object.keys(currentAnswers.answers).reduce((acc, user) => {
        const current = parseInt(currentAnswers.answers[acc]?.answer);
        const next = parseInt(currentAnswers.answers[user].answer);
        const answer = parseInt(currentQuestion.answer)
        if (isNaN(current)) {
            console.log(answer - next);

            return answer - next >= 0 ? user : 'none';
        } else {
            const nextDiff = Math.abs(answer - next);
            const currentDiff = Math.abs(answer - current);

            return nextDiff < currentDiff && answer - next >= 0 ? user : acc;
        }
    }, '')

    game.currentAnswers.closestAnswer = { userId: closestUser, answer: currentAnswers.answers[closestUser]?.answer || 'none' };

    return calculateNetChips(game)
}

const TOKEN = 1;

export function calculateNetChips(game: GameState): GameState {
    const closestAnswer = game.currentAnswers.closestAnswer;

    if (!closestAnswer) {
        throw new Error("No correct answer");
    }

    const users = game.users.map(user => {
        const userBets = game.currentBets[user.id];
        const betOne = userBets[0]
        const betTwo = userBets[1]
        const betOneValue = betOne.answer === closestAnswer.answer ? (betOne.chips + TOKEN) * betOne.payout : 0;
        const betTwoValue = betTwo.answer === closestAnswer.answer ? (betTwo.chips + TOKEN) * betOne.payout : 0;

        const userNet = betOneValue + betTwoValue;
        const newUserChips = Math.max(user.chips + userNet, 0);

        return {
            ...user,
            chips: newUserChips
        }
    });

    return {
        ...game,
        users
    }
}

function generateQuestionList() {
    const questions: Question[] = []
    const length = witsQuestions.length - 1;
    for (let i = 0; i < 10; i++) {
        questions.push(witsQuestions[Math.floor(Math.random() * length)])
    }
    return questions;
}

function deactivateUser(game: GameState, userId: string): GameState {
    const user = game.users.find(user => user.id === userId);

    if (!user) {
        throw new Error("User not found");
    }

    user.active = false;

    return {
        ...game,
        users: game.users.map(user => user.id === userId ? user : user)
    };
}

export function leaveGame(game: GameState, userId: string): GameState {
    const user = game.users.find(user => user.id === userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (game.stage === 'question' || game.stage === 'bets') {
        return deactivateUser(game, userId);
    } else {
        return {
            ...game,
            users: game.users.filter(user => user.id !== userId)
        };
    }
}

export function reactivateUser(game: GameState, userId: string): GameState {
    const user = game.users.find(user => user.id === userId);

    if (!user) {
        throw new Error("User not found");
    }

    user.active = true;

    return {
        ...game,
        users: game.users.map(user => user.id === userId ? user : user)
    };
}

export function activeUsers(game: GameState): User[] {
    return game.users.filter(user => user.active);
}