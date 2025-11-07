#!/usr/bin/env node
/**
 * Profile different word list optimization approaches
 */

const fs = require('fs');

// Load the word list
function loadWordList() {
    const content = fs.readFileSync('words.js', 'utf8');
    const match = content.match(/const WORD_LIST = (\[[\s\S]*?\]);/);
    if (match) {
        return JSON.parse(match[1]);
    }
    return [];
}

// Utility functions
function sortString(str) {
    return str.toLowerCase().split('').sort().join('');
}

function getLetterCounts(str) {
    const counts = {};
    for (const char of str.toLowerCase()) {
        counts[char] = (counts[char] || 0) + 1;
    }
    return counts;
}

function canMakeWord(targetWord, availableLetters) {
    const targetCounts = getLetterCounts(targetWord);
    const availableCounts = getLetterCounts(availableLetters);

    for (const [letter, count] of Object.entries(targetCounts)) {
        if ((availableCounts[letter] || 0) < count) {
            return false;
        }
    }
    return true;
}

// =============================================================================
// BASELINE - Current approach (no optimization)
// =============================================================================
class BaselineSearch {
    constructor(wordList) {
        this.wordList = wordList;
        this.name = "Baseline (No Optimization)";
    }

    // Find exact anagrams
    findAnagrams(letters, exactMatch = false) {
        const results = [];
        const letterCounts = getLetterCounts(letters);

        for (const word of this.wordList) {
            if (exactMatch) {
                if (sortString(word) === sortString(letters)) {
                    results.push(word);
                }
            } else {
                if (canMakeWord(word, letters)) {
                    results.push(word);
                }
            }
        }
        return results;
    }

    // Find two-word combinations
    findCombinations(targetWord, availableLetters) {
        const combinations = [];
        const targetLen = targetWord.length;

        // Filter relevant words
        const relevantWords = this.wordList.filter(w =>
            w.length >= 2 && w.length <= 10 && canMakeWord(w, targetWord)
        );

        for (let i = 0; i < relevantWords.length; i++) {
            const word1 = relevantWords[i];
            for (let j = 0; j < relevantWords.length; j++) {
                if (i === j) continue;
                const word2 = relevantWords[j];
                const combined = availableLetters + word1 + word2;

                if (combined.length >= targetLen && canMakeWord(targetWord, combined)) {
                    combinations.push([word1, word2]);
                    if (combinations.length >= 100) return combinations; // Limit for testing
                }
            }
        }
        return combinations;
    }
}

// =============================================================================
// OPTIMIZATION 1: Letter Signature Index
// =============================================================================
class LetterSignatureIndex {
    constructor(wordList) {
        this.wordList = wordList;
        this.name = "Letter Signature Index";
        this.signatureMap = new Map();
        this._buildIndex();
    }

    _buildIndex() {
        for (const word of this.wordList) {
            const signature = sortString(word);
            if (!this.signatureMap.has(signature)) {
                this.signatureMap.set(signature, []);
            }
            this.signatureMap.get(signature).push(word);
        }
    }

    findAnagrams(letters, exactMatch = false) {
        if (exactMatch) {
            const signature = sortString(letters);
            return this.signatureMap.get(signature) || [];
        } else {
            // For non-exact, still need to iterate but can use signature for quick checks
            const results = [];
            const letterCounts = getLetterCounts(letters);

            for (const word of this.wordList) {
                if (canMakeWord(word, letters)) {
                    results.push(word);
                }
            }
            return results;
        }
    }

    findCombinations(targetWord, availableLetters) {
        const combinations = [];
        const targetLen = targetWord.length;

        const relevantWords = this.wordList.filter(w =>
            w.length >= 2 && w.length <= 10 && canMakeWord(w, targetWord)
        );

        for (let i = 0; i < relevantWords.length; i++) {
            const word1 = relevantWords[i];
            for (let j = 0; j < relevantWords.length; j++) {
                if (i === j) continue;
                const word2 = relevantWords[j];
                const combined = availableLetters + word1 + word2;

                if (combined.length >= targetLen && canMakeWord(targetWord, combined)) {
                    combinations.push([word1, word2]);
                    if (combinations.length >= 100) return combinations;
                }
            }
        }
        return combinations;
    }
}

// =============================================================================
// OPTIMIZATION 2: First Letter + Length Index
// =============================================================================
class FirstLetterLengthIndex {
    constructor(wordList) {
        this.wordList = wordList;
        this.name = "First Letter + Length Index";
        this.index = {}; // {firstLetter: {length: [words]}}
        this._buildIndex();
    }

    _buildIndex() {
        for (const word of this.wordList) {
            const firstLetter = word[0].toLowerCase();
            const length = word.length;

            if (!this.index[firstLetter]) {
                this.index[firstLetter] = {};
            }
            if (!this.index[firstLetter][length]) {
                this.index[firstLetter][length] = [];
            }
            this.index[firstLetter][length].push(word);
        }
    }

    findAnagrams(letters, exactMatch = false) {
        const results = [];
        const letterCounts = getLetterCounts(letters);
        const targetLength = letters.length;

        // Search only words with matching length and first letter in our letters
        const availableFirstLetters = new Set(letters.toLowerCase().split(''));

        for (const firstLetter of availableFirstLetters) {
            const wordsWithLetter = this.index[firstLetter];
            if (!wordsWithLetter) continue;

            if (exactMatch) {
                const wordsOfLength = wordsWithLetter[targetLength] || [];
                for (const word of wordsOfLength) {
                    if (sortString(word) === sortString(letters)) {
                        results.push(word);
                    }
                }
            } else {
                // Check all lengths <= target length
                for (const length in wordsWithLetter) {
                    if (length > targetLength) continue;
                    for (const word of wordsWithLetter[length]) {
                        if (canMakeWord(word, letters)) {
                            results.push(word);
                        }
                    }
                }
            }
        }
        return results;
    }

    findCombinations(targetWord, availableLetters) {
        const combinations = [];
        const targetLen = targetWord.length;
        const targetLetterSet = new Set(targetWord.toLowerCase().split(''));

        // Only consider words that start with letters in target word
        const relevantWords = [];
        for (const firstLetter of targetLetterSet) {
            const wordsWithLetter = this.index[firstLetter];
            if (!wordsWithLetter) continue;

            for (const length in wordsWithLetter) {
                if (length < 2 || length > 10) continue;
                for (const word of wordsWithLetter[length]) {
                    if (canMakeWord(word, targetWord)) {
                        relevantWords.push(word);
                    }
                }
            }
        }

        for (let i = 0; i < relevantWords.length; i++) {
            const word1 = relevantWords[i];
            for (let j = 0; j < relevantWords.length; j++) {
                if (i === j) continue;
                const word2 = relevantWords[j];
                const combined = availableLetters + word1 + word2;

                if (combined.length >= targetLen && canMakeWord(targetWord, combined)) {
                    combinations.push([word1, word2]);
                    if (combinations.length >= 100) return combinations;
                }
            }
        }
        return combinations;
    }
}

// =============================================================================
// OPTIMIZATION 3: Letter Set Index
// =============================================================================
class LetterSetIndex {
    constructor(wordList) {
        this.wordList = wordList;
        this.name = "Letter Set Index";
        this.letterSetMap = new Map(); // Map<letterSet, words[]>
        this._buildIndex();
    }

    _buildIndex() {
        for (const word of this.wordList) {
            const letterSet = [...new Set(word.toLowerCase().split(''))].sort().join('');
            if (!this.letterSetMap.has(letterSet)) {
                this.letterSetMap.set(letterSet, []);
            }
            this.letterSetMap.get(letterSet).push(word);
        }
    }

    findAnagrams(letters, exactMatch = false) {
        const results = [];
        const availableLetterSet = new Set(letters.toLowerCase().split(''));

        // Check words that only use our available letters
        for (const [letterSet, words] of this.letterSetMap.entries()) {
            const wordLetters = letterSet.split('');
            const allLettersAvailable = wordLetters.every(l => availableLetterSet.has(l));

            if (!allLettersAvailable) continue;

            for (const word of words) {
                if (exactMatch) {
                    if (sortString(word) === sortString(letters)) {
                        results.push(word);
                    }
                } else {
                    if (canMakeWord(word, letters)) {
                        results.push(word);
                    }
                }
            }
        }
        return results;
    }

    findCombinations(targetWord, availableLetters) {
        const combinations = [];
        const targetLen = targetWord.length;
        const targetLetterSet = new Set(targetWord.toLowerCase().split(''));

        // Get words that use letters from target
        const relevantWords = [];
        for (const [letterSet, words] of this.letterSetMap.entries()) {
            const wordLetters = letterSet.split('');
            const hasRelevantLetters = wordLetters.some(l => targetLetterSet.has(l));

            if (!hasRelevantLetters) continue;

            for (const word of words) {
                if (word.length >= 2 && word.length <= 10 && canMakeWord(word, targetWord)) {
                    relevantWords.push(word);
                }
            }
        }

        for (let i = 0; i < relevantWords.length; i++) {
            const word1 = relevantWords[i];
            for (let j = 0; j < relevantWords.length; j++) {
                if (i === j) continue;
                const word2 = relevantWords[j];
                const combined = availableLetters + word1 + word2;

                if (combined.length >= targetLen && canMakeWord(targetWord, combined)) {
                    combinations.push([word1, word2]);
                    if (combinations.length >= 100) return combinations;
                }
            }
        }
        return combinations;
    }
}

// =============================================================================
// OPTIMIZATION 4: Pre-computed Letter Counts
// =============================================================================
class PrecomputedLetterCounts {
    constructor(wordList) {
        this.wordList = wordList;
        this.name = "Pre-computed Letter Counts";
        this.wordData = []; // [{word, counts, signature}]
        this._buildIndex();
    }

    _buildIndex() {
        for (const word of this.wordList) {
            this.wordData.push({
                word: word,
                counts: getLetterCounts(word),
                signature: sortString(word),
                letterSet: new Set(word.toLowerCase().split(''))
            });
        }
    }

    _canMakeWordFast(targetCounts, availableCounts) {
        for (const [letter, count] of Object.entries(targetCounts)) {
            if ((availableCounts[letter] || 0) < count) {
                return false;
            }
        }
        return true;
    }

    findAnagrams(letters, exactMatch = false) {
        const results = [];
        const letterCounts = getLetterCounts(letters);
        const signature = sortString(letters);

        for (const data of this.wordData) {
            if (exactMatch) {
                if (data.signature === signature) {
                    results.push(data.word);
                }
            } else {
                if (this._canMakeWordFast(data.counts, letterCounts)) {
                    results.push(data.word);
                }
            }
        }
        return results;
    }

    findCombinations(targetWord, availableLetters) {
        const combinations = [];
        const targetLen = targetWord.length;
        const targetCounts = getLetterCounts(targetWord);

        // Filter relevant words using pre-computed data
        const relevantWords = this.wordData.filter(data =>
            data.word.length >= 2 &&
            data.word.length <= 10 &&
            this._canMakeWordFast(data.counts, targetCounts)
        );

        const availableCounts = getLetterCounts(availableLetters);

        for (let i = 0; i < relevantWords.length; i++) {
            const word1Data = relevantWords[i];
            for (let j = 0; j < relevantWords.length; j++) {
                if (i === j) continue;
                const word2Data = relevantWords[j];

                // Combine counts
                const combinedCounts = {...availableCounts};
                for (const [letter, count] of Object.entries(word1Data.counts)) {
                    combinedCounts[letter] = (combinedCounts[letter] || 0) + count;
                }
                for (const [letter, count] of Object.entries(word2Data.counts)) {
                    combinedCounts[letter] = (combinedCounts[letter] || 0) + count;
                }

                if (this._canMakeWordFast(targetCounts, combinedCounts)) {
                    combinations.push([word1Data.word, word2Data.word]);
                    if (combinations.length >= 100) return combinations;
                }
            }
        }
        return combinations;
    }
}

// =============================================================================
// BENCHMARKING
// =============================================================================

function benchmark(name, fn, iterations = 1) {
    const start = process.hrtime.bigint();
    let result;
    for (let i = 0; i < iterations; i++) {
        result = fn();
    }
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    return { duration, result };
}

function runBenchmarks() {
    console.log('Loading word list...');
    const wordList = loadWordList();
    console.log(`Loaded ${wordList.length} words\n`);

    const approaches = [
        new BaselineSearch(wordList),
        new LetterSignatureIndex(wordList),
        new FirstLetterLengthIndex(wordList),
        new LetterSetIndex(wordList),
        new PrecomputedLetterCounts(wordList)
    ];

    // Test cases
    const testCases = {
        anagramExact: {
            name: 'Find exact anagrams of "seabass"',
            fn: (approach) => approach.findAnagrams('seabass', true),
            iterations: 100
        },
        anagramPartial: {
            name: 'Find words from letters "seabass"',
            fn: (approach) => approach.findAnagrams('seabass', false),
            iterations: 50
        },
        anagramLong: {
            name: 'Find words from letters "playground"',
            fn: (approach) => approach.findAnagrams('playground', false),
            iterations: 50
        },
        combinations: {
            name: 'Find 2-word combinations for "seabass"',
            fn: (approach) => approach.findCombinations('seabass', ''),
            iterations: 5
        },
        combinationsWithLetters: {
            name: 'Find 2-word combinations for "baseball" with "ll"',
            fn: (approach) => approach.findCombinations('baseball', 'll'),
            iterations: 5
        }
    };

    console.log('='.repeat(80));
    console.log('BENCHMARK RESULTS');
    console.log('='.repeat(80));
    console.log();

    for (const [testKey, test] of Object.entries(testCases)) {
        console.log(`\n${test.name}`);
        console.log('-'.repeat(80));

        const results = [];

        for (const approach of approaches) {
            const { duration, result } = benchmark(
                approach.name,
                () => test.fn(approach),
                test.iterations
            );

            const avgTime = (duration / test.iterations).toFixed(2);
            const resultCount = Array.isArray(result) ? result.length : 0;

            results.push({
                name: approach.name,
                avgTime: parseFloat(avgTime),
                totalTime: duration.toFixed(2),
                resultCount
            });
        }

        // Sort by average time
        results.sort((a, b) => a.avgTime - b.avgTime);

        // Display results
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            const speedup = i === 0 ? '(baseline)' : `(${(results[0].avgTime / r.avgTime * 100).toFixed(0)}% of fastest)`;
            console.log(`  ${(i + 1).toString().padStart(2)}. ${r.name.padEnd(35)} ${r.avgTime.toString().padStart(8)} ms avg  ${speedup}`);
            console.log(`      Total: ${r.totalTime} ms, Results: ${r.resultCount}`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('\nRecommendation: Analyze the results above to determine which approach');
    console.log('provides the best balance of speed improvement and memory usage.');
}

// Run the benchmarks
runBenchmarks();
