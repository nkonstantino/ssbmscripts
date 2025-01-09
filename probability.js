function shuffleDeckMultipleSplits(deck, splitCount = 2) {
    // Split the deck into multiple parts
    const splits = [];
    let remainingDeck = [...deck];
    for (let i = 0; i < splitCount - 1; i++) {
        const splitSize = Math.floor(remainingDeck.length / (splitCount - i));
        splits.push(remainingDeck.splice(0, splitSize));
    }
    splits.push(remainingDeck);

    // Weave the chunks together
    const shuffled = [];
    while (splits.some(chunk => chunk.length > 0)) {
        for (const chunk of splits) {
            if (chunk.length > 0) {
                shuffled.push(chunk.shift());
            }
        }
    }

    // Perform the cut
    const cutPoint = Math.floor(Math.random() * (deck.length / 2)) + deck.length / 4;
    return shuffled.slice(cutPoint).concat(shuffled.slice(0, cutPoint));
}

function calculateProbabilityMultipleSplits(targetCard, topX, shuffleCount, splitCount, iterations = 100000) {
    const initialDeck = Array.from({ length: 99 }, (_, i) => i + 1);
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
        let deck = [...initialDeck];

        // Perform shuffles
        for (let j = 0; j < shuffleCount; j++) {
            deck = shuffleDeckMultipleSplits(deck, splitCount);
        }

        // Check if the target card is in the top X cards
        if (deck.slice(0, topX).includes(targetCard)) {
            successes++;
        }
    }

    // Return the probability
    return successes / iterations;
}

// Example usage
const targetCard = 94; // Card number to check
const topX = 10; // Top X cards
const shuffleCount = 2; // Number of shuffles
const splitCount = 3; // Number of splits
console.log(
    `Probability: ${calculateProbabilityMultipleSplits(targetCard, topX, shuffleCount, splitCount).toFixed(4)}`
);
