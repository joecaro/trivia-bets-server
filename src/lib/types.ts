import { UserClient } from "../types"

const STAGE_MAP = {
    "lobby": "lobby",
    "question": "question",
    "bets": "bets",
    "tally": "tally",
    "finished": "finished"
}

export type AnswerGroup = {
    answers: { [userId: string]: {
        answer: string,
        isCorrect: boolean
    } },
    correctAnswer: string | null
}

export type BetGroup = {
    [userId: string]: {
        tokens: [number | null, number | null],
        chips: number[]
    }
}

export type Round = {
    bets: BetGroup;
    answers: AnswerGroup
}

export interface GameState {
    users: UserClient[]
    questions: {question: string, answer: string}[];
    currentQuestionIndex: number;
    currentAnswers: AnswerGroup;
    currentBets: BetGroup;
    rounds: Round[];
    stage: keyof typeof STAGE_MAP;
};