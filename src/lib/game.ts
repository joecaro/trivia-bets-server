// import { Question, User } from "./classes";
// import { triviaQuestions } from "./questions";
// import { GameState } from "./types";

// export default class TriviaGame {

    

//     start() {
//         if (this.state.users.length < 1) {
//             return new Error("Not enough players to start game");
//         }

//         this.nextStage();
//     }

    

//     getCurrentQuestion(): Question {
//         return this.state.questions[this.state.currentQuestionIndex];
//     }

//     addAnswer(userId: string, answer: string): void {
//         const answers = this.state.currentAnswers;

//         const currentQuestion = this.getCurrentQuestion();

//         if (!currentQuestion) {
//             throw new Error("No current question");
//         }


//         answers.answers = { ...answers.answers, [userId]: {answer: answer, isCorrect: answer === currentQuestion.answer} };

//         this.state.currentAnswers = answers;
//     }

//     addBet(userId: string, bet: number): void {
//         const user = this.state.users.find(user => user.id === userId);

//         if (!user) {
//             throw new Error("User not found");
//         }

//         const currentRound = this.state.rounds[this.state.currentQuestionIndex]
//         const currentTokens = currentRound?.bets[userId]?.tokens || [null, null];
//         if (currentTokens[0] === bet) { currentTokens[0] = null }
//         else if (currentTokens[1] === bet) { currentTokens[1] = null }
//         else if (currentTokens[1] === null) {
//             currentTokens[1] = bet;
//         } else if (currentTokens[0] === null) {
//             currentTokens[0] = bet;
//         }
//         else {
//             throw new Error("You can only bet twice per question");
//         }

//         this.state.rounds[this.state.currentQuestionIndex] = {
//             ...currentRound,
//             bets: {
//                 ...currentRound?.bets,
//                 [userId]: {
//                     ...currentRound?.bets?.[userId],
//                     tokens: [...currentTokens]
//                 }
//             }
//         }

//         this.state.rounds = [...this.state.rounds];
//     }

//     nextQuestion(): void {
//         this.nextStage();
//     }

//     reset(): void {
//         this.state = {...defaultGameState, questions: this.state.questions, users: this.state.users}
//     }
// }