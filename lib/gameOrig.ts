// import { Question, User } from "./classes";
// import PubSub from "./pubSub";
// import { defaultQuestions } from "./questions";
// import { GameState } from "./types";

// export const defaultGameState: GameState = {
//     users: {},
//     userList: [],
//     questions: [],
//     answers: [],
//     rounds: [],
//     currentQuestionIndex: -1,
//     currentQuestion: null,
//     stage: "lobby",
//     isFinished: false,
// }
// export default class TriviaGame {
//     _state: GameState = defaultGameState;

//     state = new Proxy(this._state, {
//         get: (target, name) => {
//             return target[name as keyof GameState];
//         },
//         set: (target, name, value) => {
//             if (name in target) {
//                 // @ts-ignore
//                 target[name] = value;

//                 // @ts-ignore
//                 this.publish(name);
//                 return true;
//             }
//             return false;
//         }
//     });

//     pubSub = new PubSub(Object.keys(this._state));

//     constructor() {
//         this._state.questions = defaultQuestions;

//         this._state.currentQuestionIndex = 0;

//         this.registerUser('player1', 'player1');
//         this.registerUser('player2', 'player2');
//         this.registerUser('player3', 'player3');
//         this.registerUser('player4', 'player4');
//     }

//     registerUser(name: string, id: string): void {
//         this.state.users = { ...this.state.users, [id]: new User(name, id) };
//         this.state.userList = Object.values(this.state.users);
//     }

//     unregisterUser(id: string): void {
//         const { [id]: _, ...users } = this.state.users;

//         this.state.users = users;
//     }

//     start() {
//         if (this.state.userList.length < 1) {
//             throw new Error("Not enough players");
//         }

//         this.nextStage();
//     }

//     nextStage(): void {
//         const currentStage = this.state.stage;

//         if (currentStage === "lobby") {
//             this.state.stage = "question";
//             this.state.currentQuestionIndex = 0;
//             this.state.currentQuestion = this.getCurrentQuestion();
//             this.state.answers = [{ answers: {}, correctAnswer: null }];
//         }

//         if (currentStage === "question") {
//             this.state.stage = "bets";
//         }

//         if (currentStage === "bets") {
//             this.state.stage = "tally";
//         }

//         if (currentStage === "tally" && this.state.currentQuestionIndex < this.state.questions.length - 1) {
//             this.state.stage = "question";
//             this.state.currentQuestionIndex++;
//             this.state.currentQuestion = this.getCurrentQuestion();
//             this.state.answers = [...this.state.answers, { answers: {}, correctAnswer: null }]
//         }

//         if (currentStage === "tally" && this.state.currentQuestionIndex === this.state.questions.length - 1) {
//             this.state.stage = "finished";
//             this.state.isFinished = true;
//         }

//         if (currentStage === "finished") {
//             this.reset();
//         }
//     }

//     getCurrentQuestion(): Question {
//         return this.state.questions[this.state.currentQuestionIndex];
//     }

//     addAnswer(userId: string, answer: string): void {
//         const answers = this.state.answers;
//         const currentQuestion = this.state.currentQuestion;

//         if (!currentQuestion) {
//             throw new Error("No current question");
//         }

//         const answerGroup = answers[answers.length - 1];

//         if (answerGroup) {
//             answerGroup.answers = { ...answerGroup.answers, [userId]: answer };
//         } else {
//             answers.push({
//                 answers: { [userId]: answer },
//                 correctAnswer: null
//             });
//         }

//         this.state.answers = answers;
//     }

//     computeCorrectAnswer() {
//         const answers = this.state.answers;
//         const currentQuestion = this.state.currentQuestion;

//         if (!currentQuestion) {
//             throw new Error("No current question");
//         }

//         const answerGroup = answers[answers.length - 1];

//         if (answerGroup) {
//             const closestAnswer = Object.entries(answerGroup.answers).reduce((acc, [key, value]) => {
//                 const distance = Math.abs(Number(currentQuestion.answer) - Number(value));
//                 if (distance < acc.distance) {
//                     return { distance, key };
//                 }
//                 return acc;
//             }, { distance: Infinity, key: null });
            
//             answerGroup.correctAnswer = closestAnswer.key;
//         }
//         answers[answers.length - 1] = answerGroup;
        
//         this.state.answers = [...answers];
//     }

//     addBet(userId: string, bet: number): void {
//         const user = this.state.users[userId];

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
//         this.state.currentQuestionIndex = 0;
//         this.state.isFinished = false;
//     }

//     private publish(stateKey: keyof GameState): void {
//         this.pubSub.publish(stateKey, this.state[stateKey]);
//     }

//     subscribe<T extends keyof GameState>(stateKey: T, callback: (data: GameState[T]) => void): () => void {
//         this.pubSub.subscribe(stateKey, callback);
//         return () => {
//             this.pubSub.unsubscribe(stateKey, callback);
//         }
//     }
// }