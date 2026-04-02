/** Multiple-choice questions for optional combat buffs. */
const COMBAT_QUESTIONS = [
    {
        question: "What is 7 + 5?",
        answers: [
            { text: "10", correct: false },
            { text: "12", correct: true },
            { text: "13", correct: false },
            { text: "11", correct: false }
        ]
    },
    {
        question: "Which planet is known as the Red Planet?",
        answers: [
            { text: "Venus", correct: false },
            { text: "Mars", correct: true },
            { text: "Jupiter", correct: false },
            { text: "Saturn", correct: false }
        ]
    },
    {
        question: "What is the capital of France?",
        answers: [
            { text: "London", correct: false },
            { text: "Berlin", correct: false },
            { text: "Paris", correct: true },
            { text: "Madrid", correct: false }
        ]
    }
];

function getRandomCombatQuestion() {
    const i = Math.floor(Math.random() * COMBAT_QUESTIONS.length);
    return COMBAT_QUESTIONS[i];
}
