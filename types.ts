import { User } from "./utils/user"

const STAGE_MAP = {
    "lobby": "lobby",
    "question": "question",
    "bets": "bets",
    "tally": "tally",
    "finished": "finished"
}

export type UserId = string;

export type AnswerGroup = {
    answers: { [userId: UserId]: {
        answer: string,
        isCorrect: boolean
    } },
    closestAnswer: {
        userId: UserId,
        answer: string,
    }
}

export type Bet ={
    answer: string | null,
    chips: number,
    payout: number
}
export type BetGroup = {
    [userId: UserId]:  [Bet, Bet]
}

export type Round = {
    bets: BetGroup;
    answers: AnswerGroup
    scores: { [userId: UserId]: number }
}

export interface GameState {
    users: User[]
    questions: {question: string, answer: string}[];
    currentQuestionIndex: number;
    currentAnswers: AnswerGroup;
    currentBets: BetGroup;
    rounds: Round[];
    stage: keyof typeof STAGE_MAP;
};