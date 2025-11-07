#!/usr/bin/env node
/**
 * Build optimized indexes for word lists
 * Generates:
 * 1. Letter Signature Index - for fast exact anagram lookup
 * 2. First Letter + Length Index - for fast combination search
 */

const fs = require('fs');

function loadWordList() {
    const content = fs.readFileSync('words.js', 'utf8');

    // Extract WORD_LIST
    const match1 = content.match(/const WORD_LIST = (\[[\s\S]*?\]);/);
    const wordList = match1 ? JSON.parse(match1[1]) : [];

    // Extract WORD_LIST_EXPANDED
    const match2 = content.match(/const WORD_LIST_EXPANDED = (\[[\s\S]*?\]);/);
    const wordListExpanded = match2 ? JSON.parse(match2[1]) : [];

    return { wordList, wordListExpanded };
}

function sortString(str) {
    return str.toLowerCase().split('').sort().join('');
}

function buildLetterSignatureIndex(wordList) {
    const index = {};

    for (const word of wordList) {
        const signature = sortString(word);
        if (!index[signature]) {
            index[signature] = [];
        }
        index[signature].push(word);
    }

    return index;
}

function buildFirstLetterLengthIndex(wordList) {
    const index = {};

    for (const word of wordList) {
        const firstLetter = word[0].toLowerCase();
        const length = word.length;

        if (!index[firstLetter]) {
            index[firstLetter] = {};
        }
        if (!index[firstLetter][length]) {
            index[firstLetter][length] = [];
        }
        index[firstLetter][length].push(word);
    }

    return index;
}

function main() {
    console.log('Loading word lists from words.js...');
    const { wordList, wordListExpanded } = loadWordList();

    console.log(`Filtered list: ${wordList.length} words`);
    console.log(`Expanded list: ${wordListExpanded.length} words`);

    console.log('\nBuilding indexes for filtered list...');
    const signatureIndex = buildLetterSignatureIndex(wordList);
    const firstLetterLengthIndex = buildFirstLetterLengthIndex(wordList);

    console.log('\nBuilding indexes for expanded list...');
    const signatureIndexExpanded = buildLetterSignatureIndex(wordListExpanded);
    const firstLetterLengthIndexExpanded = buildFirstLetterLengthIndex(wordListExpanded);

    console.log('\nIndex statistics:');
    console.log(`  Signature index entries: ${Object.keys(signatureIndex).length} (filtered), ${Object.keys(signatureIndexExpanded).length} (expanded)`);
    console.log(`  First letter index entries: ${Object.keys(firstLetterLengthIndex).length} (filtered), ${Object.keys(firstLetterLengthIndexExpanded).length} (expanded)`);

    // Generate new words.js with indexes
    const jsContent = `// Comprehensive list of English nouns
// Source: The Great Noun List (desiquintans.com/nounlist)

// Filtered list (concrete nouns only, ~${wordList.length} words)
const WORD_LIST = ${JSON.stringify(wordList, null, 2)};

// Original expanded list (~${wordListExpanded.length} words)
const WORD_LIST_EXPANDED = ${JSON.stringify(wordListExpanded, null, 2)};

// Convert arrays to sets for faster lookups
const WORD_SET = new Set(WORD_LIST);
const WORD_SET_EXPANDED = new Set(WORD_LIST_EXPANDED);

// ============================================================================
// OPTIMIZED INDEXES
// ============================================================================

// Letter Signature Index - for exact anagram lookups (O(1) instead of O(n))
// Maps sorted letters to words with those letters
// Example: "abss" -> ["bass", "sabs"]
const SIGNATURE_INDEX = ${JSON.stringify(signatureIndex)};
const SIGNATURE_INDEX_EXPANDED = ${JSON.stringify(signatureIndexExpanded)};

// First Letter + Length Index - for fast combination search
// Maps first letter -> length -> words
// Example: {"b": {"4": ["bass", "ball", "bean", ...]}}
const FIRST_LETTER_LENGTH_INDEX = ${JSON.stringify(firstLetterLengthIndex)};
const FIRST_LETTER_LENGTH_INDEX_EXPANDED = ${JSON.stringify(firstLetterLengthIndexExpanded)};

// ============================================================================
// DYNAMIC WORD LIST SWITCHING
// ============================================================================

// Default to filtered list, but allow switching
let currentWordList = WORD_LIST;
let currentWordSet = WORD_SET;
let currentSignatureIndex = SIGNATURE_INDEX;
let currentFirstLetterLengthIndex = FIRST_LETTER_LENGTH_INDEX;

function useExpandedWordList(useExpanded) {
    if (useExpanded) {
        currentWordList = WORD_LIST_EXPANDED;
        currentWordSet = WORD_SET_EXPANDED;
        currentSignatureIndex = SIGNATURE_INDEX_EXPANDED;
        currentFirstLetterLengthIndex = FIRST_LETTER_LENGTH_INDEX_EXPANDED;
    } else {
        currentWordList = WORD_LIST;
        currentWordSet = WORD_SET;
        currentSignatureIndex = SIGNATURE_INDEX;
        currentFirstLetterLengthIndex = FIRST_LETTER_LENGTH_INDEX;
    }
}
`;

    fs.writeFileSync('words_optimized.js', jsContent);
    console.log('\nGenerated words_optimized.js');
    console.log('Review the file, then replace words.js with it if satisfied.');
}

main();
