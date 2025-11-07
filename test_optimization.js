// Run this in browser console to test if optimization is working

console.log("=== Testing Word Search Optimization ===\n");

// Test 1: Check if indexes exist
console.log("1. Checking if indexes are loaded:");
console.log("   SIGNATURE_INDEX exists:", typeof SIGNATURE_INDEX !== 'undefined');
console.log("   FIRST_LETTER_LENGTH_INDEX exists:", typeof FIRST_LETTER_LENGTH_INDEX !== 'undefined');
console.log("   currentSignatureIndex exists:", typeof currentSignatureIndex !== 'undefined');
console.log("   currentFirstLetterLengthIndex exists:", typeof currentFirstLetterLengthIndex !== 'undefined');

if (typeof SIGNATURE_INDEX !== 'undefined') {
    console.log("   Signature index entries:", Object.keys(SIGNATURE_INDEX).length);
}
if (typeof FIRST_LETTER_LENGTH_INDEX !== 'undefined') {
    console.log("   First letter index entries:", Object.keys(FIRST_LETTER_LENGTH_INDEX).length);
}

// Test 2: Benchmark exact anagram search
console.log("\n2. Benchmarking exact anagram search for 'seabass':");

// Old way (linear search)
console.time("   Linear search (baseline)");
let results1 = [];
for (const word of currentWordList) {
    if (word.toLowerCase().split('').sort().join('') === 'seabass'.toLowerCase().split('').sort().join('')) {
        results1.push(word);
    }
}
console.timeEnd("   Linear search (baseline)");
console.log("   Results:", results1);

// New way (index lookup)
console.time("   Index lookup (optimized)");
const signature = 'seabass'.toLowerCase().split('').sort().join('');
const results2 = currentSignatureIndex[signature] || [];
console.timeEnd("   Index lookup (optimized)");
console.log("   Results:", results2);

// Test 3: Benchmark combination search
console.log("\n3. Testing combination search optimization:");

// Count words that start with letters in "seabass"
const targetLetters = new Set('seabass'.toLowerCase().split(''));
console.log("   Target letters:", [...targetLetters].join(', '));

// Old way - iterate all words
console.time("   Linear scan (baseline)");
let count1 = 0;
for (const word of currentWordList) {
    if (word.length >= 2 && word.length <= 10) {
        const firstLetter = word[0].toLowerCase();
        if (targetLetters.has(firstLetter)) {
            count1++;
        }
    }
}
console.timeEnd("   Linear scan (baseline)");
console.log("   Words found:", count1);

// New way - use index
console.time("   Index lookup (optimized)");
let count2 = 0;
for (const firstLetter of targetLetters) {
    const wordsWithLetter = currentFirstLetterLengthIndex[firstLetter];
    if (wordsWithLetter) {
        for (let length = 2; length <= 10; length++) {
            const wordsOfLength = wordsWithLetter[length];
            if (wordsOfLength) {
                count2 += wordsOfLength.length;
            }
        }
    }
}
console.timeEnd("   Index lookup (optimized)");
console.log("   Words found:", count2);

console.log("\n=== Test Complete ===");
console.log("If you see similar timings for both methods, the optimization isn't working!");
console.log("Expected: Index lookup should be <1ms, Linear search should be 3-5ms");
