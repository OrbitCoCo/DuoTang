// Puzzle state
let targetWords = [];
let stages = [];
let currentStage = 0;

// Utility functions
function sortString(str) {
    return str.split('').sort().join('');
}

function getLetterCounts(str) {
    const counts = {};
    for (const char of str.toLowerCase()) {
        counts[char] = (counts[char] || 0) + 1;
    }
    return counts;
}

// OPTIMIZATION: Array-based letter counting (10-20% faster than objects)
// Use 26-element array for a-z
function getLetterCountsArray(str) {
    const counts = new Uint8Array(26); // a=0, b=1, ..., z=25
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i) | 32; // Fast lowercase: ASCII 'A'=65, 'a'=97
        if (code >= 97 && code <= 122) { // a-z
            counts[code - 97]++;
        }
    }
    return counts;
}

// Check if availableCounts array has enough letters for targetCounts array
function canMakeWordArray(targetCounts, availableCounts) {
    for (let i = 0; i < 26; i++) {
        if (targetCounts[i] > availableCounts[i]) {
            return false;
        }
    }
    return true;
}

// Add counts2 to counts1 (mutates counts1)
function addCountsArray(counts1, counts2) {
    for (let i = 0; i < 26; i++) {
        counts1[i] += counts2[i];
    }
}

function canMakeWord(word, availableLetters) {
    const wordCounts = getLetterCounts(word);
    const availableCounts = getLetterCounts(availableLetters);

    for (const [letter, count] of Object.entries(wordCounts)) {
        if (!availableCounts[letter] || availableCounts[letter] < count) {
            return false;
        }
    }
    return true;
}

function subtractLetters(pool, word) {
    const poolCounts = getLetterCounts(pool);
    const wordCounts = getLetterCounts(word);

    for (const [letter, count] of Object.entries(wordCounts)) {
        poolCounts[letter] -= count;
    }

    let result = '';
    for (const [letter, count] of Object.entries(poolCounts)) {
        result += letter.repeat(count);
    }
    return result;
}

function findAnagrams(letters, exactMatch = false) {
    const results = [];

    if (exactMatch) {
        // OPTIMIZED: Use Letter Signature Index for exact anagrams (O(1) lookup)
        const signature = sortString(letters);
        const matches = currentSignatureIndex[signature] || [];
        return [...matches]; // Return copy of array
    } else {
        // For partial match, word can use subset of letters
        const letterCounts = getLetterCounts(letters);
        for (const word of currentWordList) {
            if (canMakeWord(word, letters)) {
                results.push(word);
            }
        }
        return results;
    }
}

async function findWordCombinations(targetWord, availableLetters = '', minWords = 1, maxWords = 3, minLength = 2, maxLength = 7, includeIncomplete = false, progressCallback = null) {
    const combinations = [];
    const targetLen = targetWord.length;

    // If we have available letters from previous stage, check if they alone can make the target
    if (availableLetters && canMakeWord(targetWord, availableLetters)) {
        combinations.push({words: [], complete: true});  // Empty array means "use available letters only"
        if (progressCallback) progressCallback([...combinations]);
    }

    // Get ignored words from global filter
    const ignoreWordsInput = document.getElementById('global-ignore-words');
    const ignoreWords = new Set();
    if (ignoreWordsInput && ignoreWordsInput.value.trim()) {
        const words = ignoreWordsInput.value.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
        words.forEach(w => ignoreWords.add(w));
    }

    // Calculate what letters we're missing from the target
    const targetCounts = getLetterCounts(targetWord);
    const availableCounts = getLetterCounts(availableLetters);
    const missingLetters = new Set();

    for (const [letter, count] of Object.entries(targetCounts)) {
        const available = availableCounts[letter] || 0;
        if (available < count) {
            missingLetters.add(letter);
        }
    }

    // Get unique letters from target word for fallback filtering
    const targetLetters = new Set(targetWord.toLowerCase().split(''));

    // OPTIMIZED: Use First Letter + Length Index to reduce search space
    // Instead of checking all words, only check words that:
    // 1. Start with a letter from the target word
    // 2. Match the length criteria
    const targetLower = targetWord.toLowerCase();
    const relevantWords = [];

    // Iterate through letters in target word
    for (const firstLetter of targetLetters) {
        const wordsWithLetter = currentFirstLetterLengthIndex[firstLetter];
        if (!wordsWithLetter) continue;

        // Check each length in range
        for (let length = minLength; length <= maxLength; length++) {
            const wordsOfLength = wordsWithLetter[length];
            if (!wordsOfLength) continue;

            // Apply additional filters
            for (const w of wordsOfLength) {
                // Exclude target word itself
                if (w.toLowerCase() === targetLower) continue;
                // Exclude ignored words
                if (ignoreWords.has(w.toLowerCase())) continue;

                // If we know what letters we're missing, prioritize words that have those letters
                if (availableLetters && missingLetters.size > 0) {
                    let hasMissingLetter = false;
                    for (const letter of w.toLowerCase()) {
                        if (missingLetters.has(letter)) {
                            hasMissingLetter = true;
                            break;
                        }
                    }

                    if (hasMissingLetter) {
                        relevantWords.push(w);
                        continue;
                    }

                    // If includeIncomplete is true, also include words that don't have missing letters
                    if (includeIncomplete) {
                        let hasTargetLetter = false;
                        for (const letter of w.toLowerCase()) {
                            if (targetLetters.has(letter)) {
                                hasTargetLetter = true;
                                break;
                            }
                        }
                        if (hasTargetLetter) {
                            relevantWords.push(w);
                        }
                    }
                } else {
                    // Word starts with a letter from target, so it's relevant
                    relevantWords.push(w);
                }
            }
        }
    }

    // Shuffle relevant words to get diverse results across alphabet
    const shuffled = [...relevantWords].sort(() => Math.random() - 0.5);

    // Find single words that, combined with available letters, make the target
    if (minWords <= 1) {
        for (const word of shuffled) {
            const combined = availableLetters + word;
            const isComplete = combined.length >= targetLen && canMakeWord(targetWord, combined);

            if (isComplete) {
                combinations.push({words: [word], complete: true});
                if (progressCallback) progressCallback([...combinations]);
                if (combinations.length >= 200) return combinations;
            } else if (includeIncomplete) {
                // Include incomplete words if the option is enabled
                combinations.push({words: [word], complete: false});
                if (progressCallback && combinations.length % 50 === 0) progressCallback([...combinations]);
                if (combinations.length >= 200) return combinations;
            }
        }
    }

    // Find pairs of words that (with available letters) contain all letters of target word
    if (minWords <= 2 && maxWords >= 2) {
        const searchWords = shuffled;
        let iterationCount = 0;
        let lastUpdate = 0;

        // OPTIMIZATION 3: Array-based letter counts (10-20% faster)
        const targetCounts = getLetterCountsArray(targetWord);
        const availableCounts = getLetterCountsArray(availableLetters);

        // OPTIMIZATION 1: Pre-compute letter counts for all words (avoid recalculating in inner loop)
        const wordData = searchWords.map(word => ({
            word: word,
            counts: getLetterCountsArray(word),
            letterSet: new Set(word.toLowerCase().split(''))
        }));

        // OPTIMIZATION 2: Build letter-to-words index (30-50% faster lookups)
        // Map each letter to list of word indices that contain it
        const letterToWordIndices = {};
        for (let idx = 0; idx < wordData.length; idx++) {
            for (const letter of wordData[idx].letterSet) {
                if (!letterToWordIndices[letter]) {
                    letterToWordIndices[letter] = [];
                }
                letterToWordIndices[letter].push(idx);
            }
        }

        for (let i = 0; i < wordData.length; i++) {
            const data1 = wordData[i];

            // Calculate what letters word1 + available letters provide
            const word1PlusAvailableCounts = new Uint8Array(availableCounts);
            addCountsArray(word1PlusAvailableCounts, data1.counts);

            // What letters are still missing?
            const stillMissingLetters = [];
            for (let letterIdx = 0; letterIdx < 26; letterIdx++) {
                if (targetCounts[letterIdx] > word1PlusAvailableCounts[letterIdx]) {
                    stillMissingLetters.push(String.fromCharCode(97 + letterIdx));
                }
            }

            // If word1 + available already completes it, skip
            if (stillMissingLetters.length === 0) continue;

            // OPTIMIZATION 2: Get candidate word2s that provide at least one missing letter
            const candidateIndices = new Set();
            for (const letter of stillMissingLetters) {
                const indices = letterToWordIndices[letter] || [];
                for (const idx of indices) {
                    if (idx !== i) { // Don't pair word with itself
                        candidateIndices.add(idx);
                    }
                }
            }

            // OPTIMIZATION: j=i+1 instead of j=0 (50% reduction - only check each pair once)
            for (let j = i + 1; j < wordData.length; j++) {
                // Only check candidates that provide needed letters
                if (!candidateIndices.has(j)) continue;

                const data2 = wordData[j];

                // OPTIMIZATION: Quick length check before expensive operations
                const combinedLength = availableLetters.length + data1.word.length + data2.word.length;
                if (combinedLength < targetLen) continue;

                // Check if combination satisfies target using array counts
                const combinedCounts = new Uint8Array(word1PlusAvailableCounts);
                addCountsArray(combinedCounts, data2.counts);

                if (canMakeWordArray(targetCounts, combinedCounts)) {
                    combinations.push({words: [data1.word, data2.word], complete: true});

                    // Send progress update every 50 new combinations
                    if (progressCallback && combinations.length - lastUpdate >= 50) {
                        progressCallback([...combinations]);
                        lastUpdate = combinations.length;
                    }
                }

                // Yield to browser every 2000 iterations to keep UI responsive
                iterationCount++;
                if (iterationCount % 2000 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
    }

    // Find triplets - search shorter words only
    if (minWords <= 3 && maxWords >= 3 && combinations.length < 100) {
        const shortWords = shuffled.filter(w => w.length <= 4).slice(0, 200);

        for (let i = 0; i < shortWords.length; i++) {
            const word1 = shortWords[i];
            for (let j = i + 1; j < shortWords.length; j++) {
                const word2 = shortWords[j];
                for (let k = j + 1; k < shortWords.length; k++) {
                    const word3 = shortWords[k];
                    const combined = availableLetters + word1 + word2 + word3;

                    if (combined.length >= targetLen) {
                        if (canMakeWord(targetWord, combined)) {
                            combinations.push({words: [word1, word2, word3], complete: true});
                            if (combinations.length >= 200) {
                                return combinations;
                            }
                        }
                    }
                }
            }
        }
    }

    return combinations;
}

// Stage Management
function addStage() {
    const newStage = {
        targetWord: '',
        sourceWords: [],
        letterPool: '',
        remainingLetters: '',
        complete: false,
        isFirst: stages.length === 0
    };

    // Set letter pool from previous stage if it exists and is complete
    if (stages.length > 0 && stages[stages.length - 1].complete) {
        newStage.letterPool = stages[stages.length - 1].remainingLetters;
    }

    stages.push(newStage);
    targetWords = stages.map(s => s.targetWord);
    renderPuzzleBuilder();
}

function removeStage(index) {
    if (stages.length <= 2 && !confirm('Are you sure you want to remove this stage? You need at least 2 stages for a puzzle.')) {
        return;
    }

    stages.splice(index, 1);

    // Update isFirst property
    if (stages.length > 0) {
        stages[0].isFirst = true;
    }

    // Recalculate letter pools for remaining stages
    for (let i = 1; i < stages.length; i++) {
        const prevStage = stages[i - 1];
        if (prevStage.complete) {
            stages[i].letterPool = prevStage.remainingLetters;
        } else {
            stages[i].letterPool = '';
            stages[i].complete = false;
        }
    }

    targetWords = stages.map(s => s.targetWord);
    renderPuzzleBuilder();
}

function updateTargetWord(index, value) {
    const newWord = value.trim().toLowerCase();

    // Only update if the word actually changed
    if (stages[index].targetWord === newWord) {
        return;
    }

    stages[index].targetWord = newWord;
    targetWords[index] = newWord;

    // Clear completion status when target word changes
    stages[index].complete = false;
    stages[index].remainingLetters = '';

    // Clear subsequent stages' completion and letter pools
    for (let i = index + 1; i < stages.length; i++) {
        stages[i].complete = false;
        stages[i].letterPool = '';
        stages[i].remainingLetters = '';
    }

    renderPuzzleBuilder();
}

// Initialize with 2 empty stages
document.addEventListener('DOMContentLoaded', () => {
    stages = [
        {
            targetWord: '',
            sourceWords: [],
            letterPool: '',
            remainingLetters: '',
            complete: false,
            isFirst: true
        },
        {
            targetWord: '',
            sourceWords: [],
            letterPool: '',
            remainingLetters: '',
            complete: false,
            isFirst: false
        }
    ];
    targetWords = ['', ''];

    document.getElementById('btn-add-stage').addEventListener('click', addStage);

    renderPuzzleBuilder();
});

// Step 2: Build Puzzle
function renderPuzzleBuilder() {
    const container = document.getElementById('puzzle-builder');
    container.innerHTML = '';

    stages.forEach((stage, index) => {
        const stageEl = createStageElement(stage, index);
        container.appendChild(stageEl);
    });

    updateSummary();
}

function createStageElement(stage, index) {
    const div = document.createElement('div');
    div.className = 'stage';
    div.id = `stage-${index}`;
    div.draggable = true;
    div.dataset.stageIndex = index;

    const statusClass = stage.complete ? 'complete' : 'incomplete';
    const statusText = stage.complete ? 'Complete' : 'Incomplete';

    div.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: grab;" title="Drag to reorder">
            <span style="color: #999; font-size: 18px; line-height: 1;">⋮⋮</span>
            <input
                type="text"
                class="target-word-input"
                id="target-input-${index}"
                value="${stage.targetWord}"
                placeholder="Target word ${index + 1}"
                onblur="updateTargetWord(${index}, this.value)"
                onkeypress="handleTargetInput(event, ${index})"
                onkeyup="checkTargetWordSpelling(${index})"
                style="flex: 1; padding: 8px 12px; font-size: 15px; border: 2px solid ${stage.targetWord && !currentWordSet.has(stage.targetWord) ? '#ffc107' : '#e0e0e0'}; border-radius: 4px;"
            >
            <span class="stage-status ${statusClass}" style="font-size: 12px;">${index + 1}</span>
            <button class="btn btn-secondary btn-small" onclick="removeStage(${index})" title="Remove stage" style="padding: 4px 8px;">✕</button>
        </div>
        <div id="target-spell-check-${index}" style="margin-bottom: 8px; font-size: 12px;">
            ${stage.targetWord && !currentWordSet.has(stage.targetWord) ? `
                <span style="color: #856404;">⚠️ Not in dictionary</span>
            ` : ''}
        </div>

        ${stage.targetWord && stage.isFirst && stage.letterPool ? `
            <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Starting letters:${stage.randomLetters ? ' <span style="color: #dc2626; font-weight: 600;">(random)</span>' : ''}</div>
                <div class="letters">
                    ${stage.letterPool.split('').map(l => {
                        const isRandom = stage.randomLetters && stage.randomLetters.includes(l);
                        return `<span class="letter-tile" style="${isRandom ? 'background: #ffc107; border-color: #e0a800;' : ''}" title="${isRandom ? 'Random letter' : ''}">${l.toUpperCase()}</span>`;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        ${stage.targetWord && !stage.isFirst && stage.letterPool ? `
            <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Available:${stage.randomLetters ? ' <span style="color: #dc2626; font-weight: 600;">(includes ' + stage.randomLetters.length + ' random letter' + (stage.randomLetters.length > 1 ? 's' : '') + ')</span>' : ''}</div>
                <div class="letters">
                    ${stage.letterPool.split('').map(l => {
                        const isRandom = stage.randomLetters && stage.randomLetters.includes(l);
                        return `<span class="letter-tile" style="${isRandom ? 'background: #ffc107; border-color: #e0a800;' : ''}" title="${isRandom ? 'Random letter' : ''}">${l.toUpperCase()}</span>`;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        ${stage.targetWord && (stage.isFirst || stages[index - 1].complete) ? `
            <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Missing letters: <span style="font-size: 11px; color: #999;">(click to add as word)</span></div>
                <div class="letters" id="missing-letters-${index}">
                    ${(() => {
                        const availableLetters = stage.letterPool || '';
                        const existingWords = stage.sourceWords.join('');
                        const allExistingLetters = availableLetters + existingWords;

                        const targetCounts = getLetterCounts(stage.targetWord);
                        const availableCounts = getLetterCounts(allExistingLetters);

                        let missingHTML = '';
                        for (const [letter, count] of Object.entries(targetCounts)) {
                            const available = availableCounts[letter] || 0;
                            const missing = count - available;
                            if (missing > 0) {
                                for (let i = 0; i < missing; i++) {
                                    missingHTML += `<span class="letter-tile" style="background: var(--sandy-brown); border-color: #d88a4d; box-shadow: 0 4px 0 #c07640; cursor: pointer;" onclick="addMissingLettersAsWord(${index}, '${letter}')" title="Click to add '${letter}' as a word">${letter.toUpperCase()}</span>`;
                                }
                            }
                        }
                        return missingHTML || '<span style="font-size: 12px; color: var(--persian-green); font-weight: 600;">None - ready to validate!</span>';
                    })()}
                </div>
            </div>
        ` : ''}

        ${stage.targetWord && (stage.isFirst || stages[index - 1].complete) ? `
            <div>
                ${stage.sourceWords.length > 0 ? `
                    <div class="selected-source-tags" id="selected-tags-${index}" style="margin-bottom: 8px;">
                        ${stage.sourceWords.map(w => `
                            <div class="source-tag" style="background: ${currentWordSet.has(w) ? '#667eea' : '#ffc107'}; color: ${currentWordSet.has(w) ? 'white' : '#333'}; padding: 4px 10px; font-size: 13px;">
                                ${!currentWordSet.has(w) ? '⚠️ ' : ''}${w}
                                <span class="remove" onclick="removeSourceWord(${index}, '${w}')">&times;</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="display: flex; gap: 4px; margin-bottom: 4px; align-items: center;">
                    <input
                        type="text"
                        id="source-input-${index}"
                        placeholder="Add word"
                        onkeypress="handleSourceInput(event, ${index})"
                        oninput="checkSourceWordSpelling(${index})"
                        style="flex: 1; padding: 6px 10px; font-size: 13px; border: 2px solid #e0e0e0; border-radius: 4px;"
                    >
                    <button class="btn btn-secondary btn-small" onclick="addSourceWord(${index})" style="padding: 6px 10px; font-size: 13px;">Add</button>
                    <span style="font-size: 11px; color: #666; font-weight: 600; margin-left: 4px;">Suggest:</span>
                    <button class="btn btn-secondary btn-small" onclick="showSuggestions(${index}, 'single')" style="padding: 6px 10px; font-size: 13px;">Word</button>
                    <button class="btn btn-secondary btn-small" onclick="showSuggestions(${index}, 'combo')" style="padding: 6px 10px; font-size: 13px;">Combo</button>
                </div>
                <div id="source-spell-check-${index}" style="font-size: 11px; margin-bottom: 8px;"></div>

                <div id="suggestions-${index}" class="suggestions" style="display: none; margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 600; color: #666;">Suggestions</span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #666; cursor: pointer;">
                                <input type="checkbox" id="incomplete-toggle-${index}" onchange="toggleIncomplete(${index})" style="cursor: pointer;">
                                <span>Show Incomplete</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #666; cursor: pointer;">
                                <input type="checkbox" id="exact-match-toggle-${index}" onchange="toggleExactMatch(${index})" style="cursor: pointer;">
                                <span>Exact Matches Only</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #666; cursor: pointer;">
                                <input type="checkbox" id="no-excess-toggle-${index}" checked onchange="toggleNoExcess(${index})" style="cursor: pointer;">
                                <span>No Excess (Red) Letters</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #666; cursor: pointer;">
                                <input type="checkbox" id="sort-toggle-${index}" checked onchange="toggleSort(${index})" style="cursor: pointer;">
                                <span>Sort by Best Match</span>
                            </label>
                            <button class="btn btn-secondary btn-small" onclick="hideSuggestions(${index})" style="padding: 4px 8px; font-size: 11px;">Hide</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 10px; color: #666; padding: 6px 8px; background: #fef9f0; border-radius: 8px; border: 2px solid #e0e0e0;">
                        <span style="font-weight: 600;">Legend:</span>
                        <span><span style="color: black; font-weight: 700;">Black</span> = Current target</span>
                        <span><span style="color: #15803d; font-weight: 700;">Green</span> = Future target</span>
                        <span><span style="color: #dc2626; font-weight: 700;">Red</span> = Not needed</span>
                    </div>
                    <div id="suggestions-list-${index}" class="suggestions-list"></div>
                </div>

                ${stage.remainingLetters ? `
                    <div style="margin-top: 8px;">
                        <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Remaining:</div>
                        <div class="letters">
                            ${stage.remainingLetters.split('').map(l => `<span class="letter-tile leftover" style="padding: 4px 8px; font-size: 13px;">${l.toUpperCase()}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div id="message-${index}" style="margin-top: 8px;"></div>
            </div>
        ` : `
            <div style="color: #999; font-size: 12px; font-style: italic;">Complete previous stage first</div>
        `}
    `;

    // Add drag event listeners
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragenter', handleDragEnter);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('dragend', handleDragEnd);

    return div;
}

// Drag and Drop functionality
let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    draggedIndex = parseInt(draggedElement.dataset.stageIndex);
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (e.currentTarget !== draggedElement) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();

    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over');

    if (draggedElement !== dropTarget) {
        const dropIndex = parseInt(dropTarget.dataset.stageIndex);

        // Swap the stages
        [stages[draggedIndex], stages[dropIndex]] = [stages[dropIndex], stages[draggedIndex]];

        // Update isFirst property
        stages[0].isFirst = true;
        for (let i = 1; i < stages.length; i++) {
            stages[i].isFirst = false;
        }

        // Clear completion states for affected stages
        const minIndex = Math.min(draggedIndex, dropIndex);
        for (let i = minIndex; i < stages.length; i++) {
            if (i > 0) {
                stages[i].complete = false;
                stages[i].letterPool = '';
                stages[i].remainingLetters = '';
            }
        }

        // Recalculate letter pools
        for (let i = 1; i < stages.length; i++) {
            const prevStage = stages[i - 1];
            if (prevStage.complete) {
                stages[i].letterPool = prevStage.remainingLetters;
            }
        }

        renderPuzzleBuilder();
    }

    return false;
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';

    // Remove drag-over class from all stages
    document.querySelectorAll('.stage').forEach(stage => {
        stage.classList.remove('drag-over');
    });
}

function handleTargetInput(event, stageIndex) {
    if (event.key === 'Enter') {
        const input = document.getElementById(`target-input-${stageIndex}`);
        updateTargetWord(stageIndex, input.value);
        input.blur(); // Remove focus from input
    }
}

function handleSourceInput(event, stageIndex) {
    if (event.key === 'Enter') {
        addSourceWord(stageIndex);
    }
}

function checkTargetWordSpelling(stageIndex) {
    const input = document.getElementById(`target-input-${stageIndex}`);
    const checkDiv = document.getElementById(`target-spell-check-${stageIndex}`);
    const word = input.value.trim().toLowerCase();

    if (!word) {
        checkDiv.innerHTML = '';
        input.style.borderColor = '#e0e0e0';
        return;
    }

    if (!currentWordSet.has(word)) {
        checkDiv.innerHTML = '<span style="color: #856404;">⚠️ Word not found in dictionary (can still use it)</span>';
        input.style.borderColor = '#ffc107';
    } else {
        checkDiv.innerHTML = '<span style="color: #28a745;">✓ Word found in dictionary</span>';
        input.style.borderColor = '#e0e0e0';
    }
}

function checkSourceWordSpelling(stageIndex) {
    const input = document.getElementById(`source-input-${stageIndex}`);
    const checkDiv = document.getElementById(`source-spell-check-${stageIndex}`);
    const word = input.value.trim().toLowerCase();

    if (!word) {
        checkDiv.innerHTML = '';
        return;
    }

    if (!currentWordSet.has(word)) {
        checkDiv.innerHTML = '<span style="color: #856404;">⚠️ Word not found in dictionary (can still add it)</span>';
    } else {
        checkDiv.innerHTML = '<span style="color: #28a745;">✓ Word found in dictionary</span>';
    }
}

function addSourceWord(stageIndex) {
    const input = document.getElementById(`source-input-${stageIndex}`);
    const word = input.value.trim().toLowerCase();

    if (!word) return;

    if (stages[stageIndex].sourceWords.includes(word)) {
        showMessage(stageIndex, `"${word}" is already added.`, 'error');
        return;
    }

    stages[stageIndex].sourceWords.push(word);
    input.value = '';

    // Clear spell check message
    const checkDiv = document.getElementById(`source-spell-check-${stageIndex}`);
    if (checkDiv) {
        checkDiv.innerHTML = '';
    }

    renderPuzzleBuilder();

    // Auto-validate after adding word
    autoValidateStage(stageIndex);
}

function addMissingLettersAsWord(stageIndex, letters) {
    if (!letters) return;

    const word = letters.toLowerCase();

    // Allow duplicate letters to be added (you might need multiple of the same letter)
    stages[stageIndex].sourceWords.push(word);
    renderPuzzleBuilder();

    // Auto-validate after adding word
    autoValidateStage(stageIndex);
}

function removeSourceWord(stageIndex, word) {
    stages[stageIndex].sourceWords = stages[stageIndex].sourceWords.filter(w => w !== word);
    renderPuzzleBuilder();

    // Auto-validate after removing word
    autoValidateStage(stageIndex);
}

function toggleGlobalFilters() {
    const filtersDiv = document.getElementById('global-filters');
    if (filtersDiv.style.display === 'none') {
        filtersDiv.style.display = 'block';
    } else {
        filtersDiv.style.display = 'none';
    }
}

function sortByBestMatch(combinations, targetWord, existingLetters, stageIndex) {
    const targetCounts = getLetterCounts(targetWord);
    const existingCounts = getLetterCounts(existingLetters);

    // Calculate what letters we're still missing for current target
    const missingCounts = {};
    for (const [letter, count] of Object.entries(targetCounts)) {
        const existing = existingCounts[letter] || 0;
        if (existing < count) {
            missingCounts[letter] = count - existing;
        }
    }

    // Get future target words (if stageIndex is provided)
    const futureCounts = {};
    if (stageIndex !== undefined) {
        for (let i = stageIndex + 1; i < stages.length; i++) {
            if (stages[i].targetWord) {
                const futureTargetCounts = getLetterCounts(stages[i].targetWord);
                for (const [letter, count] of Object.entries(futureTargetCounts)) {
                    futureCounts[letter] = (futureCounts[letter] || 0) + count;
                }
            }
        }
    }

    // Score each combination
    const scored = combinations.map(comboObj => {
        const comboLetters = comboObj.words.join('');
        const comboCounts = getLetterCounts(comboLetters);
        const allLetters = existingLetters + comboLetters;
        const allCounts = getLetterCounts(allLetters);

        // Count how many missing letters this combo provides for current target
        let missingProvided = 0;
        const remainingComboCounts = { ...comboCounts };

        for (const [letter, neededCount] of Object.entries(missingCounts)) {
            const provided = Math.min(remainingComboCounts[letter] || 0, neededCount);
            missingProvided += provided;
            // Subtract used letters
            if (remainingComboCounts[letter]) {
                remainingComboCounts[letter] -= provided;
            }
        }

        // Count how many future target letters the remaining letters provide
        let futureProvided = 0;
        for (const [letter, count] of Object.entries(remainingComboCounts)) {
            if (count > 0 && futureCounts[letter]) {
                const provided = Math.min(count, futureCounts[letter]);
                futureProvided += provided;
            }
        }

        // Count excess letters (letters beyond what current AND future targets need)
        let excessCount = 0;
        for (const [letter, count] of Object.entries(allCounts)) {
            const currentNeeded = targetCounts[letter] || 0;
            const futureNeeded = futureCounts[letter] || 0;
            const totalNeeded = currentNeeded + futureNeeded;
            const excess = count - totalNeeded;
            if (excess > 0) {
                excessCount += excess;
            }
        }

        // Calculate efficiency ratio
        const totalLength = comboLetters.length;
        const efficiency = totalLength > 0 ? (missingProvided + futureProvided) / totalLength : 0;

        // Complete words come before incomplete
        const completePriority = comboObj.complete ? 0 : 1;

        return {
            combo: comboObj,
            completePriority: completePriority,
            missingProvided: missingProvided,
            futureProvided: futureProvided,
            excessCount: excessCount,
            efficiency: efficiency,
            totalLength: totalLength
        };
    });

    // Sort by: complete first, most missing letters provided, most future letters provided, fewest excess, highest efficiency
    scored.sort((a, b) => {
        if (a.completePriority !== b.completePriority) {
            return a.completePriority - b.completePriority;
        }
        if (a.missingProvided !== b.missingProvided) {
            return b.missingProvided - a.missingProvided; // More is better
        }
        if (a.futureProvided !== b.futureProvided) {
            return b.futureProvided - a.futureProvided; // More is better
        }
        if (a.excessCount !== b.excessCount) {
            return a.excessCount - b.excessCount; // Fewer is better
        }
        if (Math.abs(a.efficiency - b.efficiency) > 0.01) {
            return b.efficiency - a.efficiency; // Higher is better
        }
        return a.totalLength - b.totalLength; // Shorter is better
    });

    return scored.map(item => item.combo);
}

async function showSuggestions(stageIndex, mode = 'single') {
    const stage = stages[stageIndex];
    const suggestionsDiv = document.getElementById(`suggestions-${stageIndex}`);
    const listDiv = document.getElementById(`suggestions-list-${stageIndex}`);

    suggestionsDiv.style.display = 'block';
    const searchText = mode === 'single' ? 'Searching for single words...' : 'Searching for combinations...';
    listDiv.innerHTML = `<p style="padding: 12px; color: #666;">${searchText} (this may take a moment)</p>`;

    // Use setTimeout to allow UI to update
    setTimeout(async () => {
        // Get available letters from previous stage (if not first stage)
        const availableLetters = stage.letterPool || '';

        // Get letters from already-selected source words
        const existingWords = stage.sourceWords.join('');
        const allExistingLetters = availableLetters + existingWords;

        // Get global filter values
        const minLengthInput = document.getElementById('global-min-length');
        const maxLengthInput = document.getElementById('global-max-length');
        const minLength = minLengthInput ? parseInt(minLengthInput.value) || 2 : 2;
        const maxLength = maxLengthInput ? parseInt(maxLengthInput.value) || 10 : 10;

        // Set min/max words based on mode
        let minWords, maxWords;
        if (mode === 'single') {
            minWords = 1;
            maxWords = 1;
        } else {
            minWords = 2;
            maxWords = 3;
        }

        // Check if incomplete toggle is enabled (only for single word mode)
        const incompleteToggle = document.getElementById(`incomplete-toggle-${stageIndex}`);
        const includeIncomplete = mode === 'single' && incompleteToggle && incompleteToggle.checked;

        // Set default sort based on mode: on for 'single', off for 'combo'
        const defaultSort = mode === 'single';
        const sortToggle = document.getElementById(`sort-toggle-${stageIndex}`);
        if (sortToggle) {
            sortToggle.checked = defaultSort;
        }

        stage.currentMode = mode;
        stage.searchInProgress = true;

        // Progress callback to render results as they're found
        const progressCallback = (currentCombinations) => {
            if (currentCombinations.length === 0) return;

            // Store both sorted and unsorted versions
            stage.unsortedCombinations = currentCombinations;
            stage.sortedCombinations = sortByBestMatch(currentCombinations, stage.targetWord, allExistingLetters, stageIndex);

            // Apply filters
            const sortToggle = document.getElementById(`sort-toggle-${stageIndex}`);
            const exactMatchToggle = document.getElementById(`exact-match-toggle-${stageIndex}`);
            const noExcessToggle = document.getElementById(`no-excess-toggle-${stageIndex}`);

            let finalCombinations = defaultSort ? stage.sortedCombinations : stage.unsortedCombinations;

            const targetCounts = getLetterCounts(stage.targetWord);
            const futureLetters = new Set();
            for (let i = stageIndex + 1; i < stages.length; i++) {
                if (stages[i].targetWord) {
                    stages[i].targetWord.toLowerCase().split('').forEach(letter => futureLetters.add(letter));
                }
            }
            const targetLetters = new Set(stage.targetWord.toLowerCase().split(''));

            finalCombinations = finalCombinations.filter(comboObj => {
                const comboLetters = comboObj.words.join('');
                const allLetters = allExistingLetters + comboLetters;
                const allCounts = getLetterCounts(allLetters);

                // Exact match filter
                if (exactMatchToggle && exactMatchToggle.checked) {
                    for (const [letter, count] of Object.entries(allCounts)) {
                        const needed = targetCounts[letter] || 0;
                        if (count > needed) {
                            return false;
                        }
                    }
                }

                // No excess filter
                if (noExcessToggle && noExcessToggle.checked) {
                    for (const letter of comboLetters.toLowerCase()) {
                        if (!targetLetters.has(letter) && !futureLetters.has(letter)) {
                            return false;
                        }
                    }
                }

                return true;
            });

            stage.currentCombinations = finalCombinations;
            stage.combinationsShown = 0;

            renderSuggestions(stageIndex, mode);
        };

        const combinations = await findWordCombinations(stage.targetWord, allExistingLetters, minWords, maxWords, minLength, maxLength, includeIncomplete, progressCallback);

        stage.searchInProgress = false;

        if (combinations.length === 0) {
            const message = mode === 'single'
                ? 'No single words found to complete the puzzle. Try adjusting filters or adding manually.'
                : 'No combinations found. Try adjusting filters or adding words manually.';
            listDiv.innerHTML = `<p style="padding: 12px; color: #666;">${message}</p>`;
            return;
        }

        // Final update with all combinations
        stage.unsortedCombinations = combinations;
        stage.sortedCombinations = sortByBestMatch(combinations, stage.targetWord, allExistingLetters, stageIndex);

        // Apply filters
        const exactMatchToggle = document.getElementById(`exact-match-toggle-${stageIndex}`);
        const noExcessToggle = document.getElementById(`no-excess-toggle-${stageIndex}`);
        let finalCombinations = defaultSort ? stage.sortedCombinations : stage.unsortedCombinations;

        const targetCounts = getLetterCounts(stage.targetWord);
        const futureLetters = new Set();
        for (let i = stageIndex + 1; i < stages.length; i++) {
            if (stages[i].targetWord) {
                stages[i].targetWord.toLowerCase().split('').forEach(letter => futureLetters.add(letter));
            }
        }
        const targetLetters = new Set(stage.targetWord.toLowerCase().split(''));

        finalCombinations = finalCombinations.filter(comboObj => {
            const comboLetters = comboObj.words.join('');
            const allLetters = allExistingLetters + comboLetters;
            const allCounts = getLetterCounts(allLetters);

            // Exact match filter
            if (exactMatchToggle && exactMatchToggle.checked) {
                for (const [letter, count] of Object.entries(allCounts)) {
                    const needed = targetCounts[letter] || 0;
                    if (count > needed) {
                        return false;
                    }
                }
            }

            // No excess filter
            if (noExcessToggle && noExcessToggle.checked) {
                for (const letter of comboLetters.toLowerCase()) {
                    if (!targetLetters.has(letter) && !futureLetters.has(letter)) {
                        return false;
                    }
                }
            }

            return true;
        });

        stage.currentCombinations = finalCombinations;
        stage.combinationsShown = 0;

        renderSuggestions(stageIndex, mode);
    }, 10);
}

function renderSuggestions(stageIndex, mode) {
    const stage = stages[stageIndex];
    const listDiv = document.getElementById(`suggestions-list-${stageIndex}`);
    const combinations = stage.currentCombinations || [];

    const batchSize = 400;
    const startIndex = stage.combinationsShown || 0;
    const endIndex = Math.min(startIndex + batchSize, combinations.length);
    const batch = combinations.slice(startIndex, endIndex);

    const hasManualWords = stage.sourceWords.length > 0;
    const availableLetters = stage.letterPool || '';
    const hasAvailableLetters = availableLetters.length > 0;

    // Calculate missing letters
    const existingWords = stage.sourceWords.join('');
    const allExistingLetters = availableLetters + existingWords;
    const targetCounts = getLetterCounts(stage.targetWord);
    const availableCounts = getLetterCounts(allExistingLetters);
    const missingLetters = new Set();

    for (const [letter, count] of Object.entries(targetCounts)) {
        const available = availableCounts[letter] || 0;
        if (available < count) {
            missingLetters.add(letter);
        }
    }

    let headerText = '';
    if (mode === 'single') {
        // Single word mode
        if (hasManualWords && hasAvailableLetters) {
            headerText = `Single words to complete with: ${availableLetters.toUpperCase()} + ${stage.sourceWords.join(' + ')}`;
        } else if (hasManualWords) {
            headerText = `Single words to complete with: ${stage.sourceWords.join(' + ')}`;
        } else if (hasAvailableLetters) {
            headerText = `Single words to complete with available letters: ${availableLetters.toUpperCase()}`;
        } else {
            headerText = 'Suggested single words:';
        }
    } else {
        // Combination mode
        if (hasManualWords || hasAvailableLetters) {
            headerText = 'Word combinations (will add to existing):';
        } else {
            headerText = 'Suggested word combinations:';
        }
    }

    // Helper function to highlight letters by relevance
    const highlightWord = (word) => {
        // Get current target word letters
        const targetLetters = new Set(stage.targetWord.toLowerCase().split(''));

        // Get subsequent target words letters
        const futureLetters = new Set();
        for (let i = stageIndex + 1; i < stages.length; i++) {
            if (stages[i].targetWord) {
                stages[i].targetWord.toLowerCase().split('').forEach(letter => futureLetters.add(letter));
            }
        }

        return word.split('').map(letter => {
            const lowerLetter = letter.toLowerCase();

            if (targetLetters.has(lowerLetter)) {
                // Letter appears in current target word - normal black
                return `<span style="color: black;">${letter}</span>`;
            } else if (futureLetters.has(lowerLetter)) {
                // Letter appears in subsequent target words - green
                return `<span style="color: #15803d; font-weight: 700;">${letter}</span>`;
            } else {
                // Letter doesn't appear in any target word - red
                return `<span style="color: #dc2626; font-weight: 700;">${letter}</span>`;
            }
        }).join('');
    };

    const itemsHTML = batch.map(comboObj => {
        let comboText;
        const warningIcon = comboObj.complete ? '' : '<span style="color: var(--burnt-sienna); margin-right: 4px;" title="Incomplete - missing some letters">⚠️</span>';

        if (comboObj.words.length > 0) {
            comboText = comboObj.words.map(word => highlightWord(word)).join(' + ');
        } else {
            comboText = '(use available letters only)';
        }
        return `<div class="suggestion-item" onclick="selectCombination(${stageIndex}, ${JSON.stringify(comboObj.words).replace(/"/g, '&quot;')})">${warningIcon}${comboText}</div>`;
    }).join('');

    const hasMore = endIndex < combinations.length;
    const countText = `Showing ${endIndex} of ${combinations.length}${stage.searchInProgress ? '+' : ''} ${mode === 'single' ? 'words' : 'combinations'}`;

    if (startIndex === 0) {
        // First render
        listDiv.innerHTML = `
            <p style="padding: 8px; color: var(--charcoal); font-weight: 600; font-size: 11px; background: #e8f4f2; border-radius: 8px; margin-bottom: 8px;">${headerText}</p>
            <div id="suggestions-items-${stageIndex}" style="display: contents;">${itemsHTML}</div>
            ${hasMore || stage.searchInProgress ? `
                <div id="load-more-container-${stageIndex}" style="grid-column: 1/-1; margin-top: 8px; text-align: center;">
                    <p style="font-size: 11px; color: #666; margin-bottom: 8px;">${countText}${stage.searchInProgress ? ' (finding more...)' : ''}</p>
                    ${hasMore && !stage.searchInProgress ? `<button class="btn btn-secondary btn-small" onclick="loadMoreSuggestions(${stageIndex}, '${mode}')" style="padding: 6px 16px;">Load More</button>` : ''}
                </div>
            ` : `
                <p style="grid-column: 1/-1; margin-top: 8px; font-size: 11px; color: #666; text-align: center;">${countText}</p>
            `}
        `;
    } else {
        // Append more items
        const itemsContainer = document.getElementById(`suggestions-items-${stageIndex}`);
        itemsContainer.insertAdjacentHTML('beforeend', itemsHTML);

        const loadMoreContainer = document.getElementById(`load-more-container-${stageIndex}`);
        if (hasMore) {
            loadMoreContainer.querySelector('p').textContent = countText;
        } else {
            loadMoreContainer.innerHTML = `<p style="font-size: 11px; color: #666; text-align: center;">${countText}</p>`;
        }
    }

    stage.combinationsShown = endIndex;
}

function loadMoreSuggestions(stageIndex, mode) {
    renderSuggestions(stageIndex, mode);
}

function toggleSort(stageIndex) {
    applyFilters(stageIndex);
}

function toggleIncomplete(stageIndex) {
    // Only refresh if suggestions are currently visible
    const stage = stages[stageIndex];
    const suggestionsDiv = document.getElementById(`suggestions-${stageIndex}`);
    if (suggestionsDiv && suggestionsDiv.style.display !== 'none' && stage.currentMode) {
        // Re-run the suggestions with the new incomplete setting
        showSuggestions(stageIndex, stage.currentMode);
    }
}

function toggleExactMatch(stageIndex) {
    applyFilters(stageIndex);
}

function toggleNoExcess(stageIndex) {
    applyFilters(stageIndex);
}

function applyFilters(stageIndex) {
    const stage = stages[stageIndex];
    const suggestionsDiv = document.getElementById(`suggestions-${stageIndex}`);

    if (suggestionsDiv && suggestionsDiv.style.display !== 'none' && stage.currentMode) {
        const sortToggle = document.getElementById(`sort-toggle-${stageIndex}`);
        const exactMatchToggle = document.getElementById(`exact-match-toggle-${stageIndex}`);
        const noExcessToggle = document.getElementById(`no-excess-toggle-${stageIndex}`);

        const baseSource = sortToggle.checked ? stage.sortedCombinations : stage.unsortedCombinations;

        const existingWords = stage.sourceWords.join('');
        const availableLetters = stage.letterPool || '';
        const allExistingLetters = availableLetters + existingWords;
        const targetCounts = getLetterCounts(stage.targetWord);

        // Get future target letters for no-excess filter
        const futureLetters = new Set();
        for (let i = stageIndex + 1; i < stages.length; i++) {
            if (stages[i].targetWord) {
                stages[i].targetWord.toLowerCase().split('').forEach(letter => futureLetters.add(letter));
            }
        }
        const targetLetters = new Set(stage.targetWord.toLowerCase().split(''));

        // Apply both filters
        stage.currentCombinations = baseSource.filter(comboObj => {
            const comboLetters = comboObj.words.join('');
            const allLetters = allExistingLetters + comboLetters;
            const allCounts = getLetterCounts(allLetters);

            // Exact match filter: no excess letters at all
            if (exactMatchToggle && exactMatchToggle.checked) {
                for (const [letter, count] of Object.entries(allCounts)) {
                    const needed = targetCounts[letter] || 0;
                    if (count > needed) {
                        return false; // Has excess letters
                    }
                }
            }

            // No excess filter: no letters that would be red (not in current or future targets)
            if (noExcessToggle && noExcessToggle.checked) {
                for (const letter of comboLetters.toLowerCase()) {
                    if (!targetLetters.has(letter) && !futureLetters.has(letter)) {
                        return false; // Has red (unneeded) letter
                    }
                }
            }

            return true;
        });

        // Reset to show from the beginning
        stage.combinationsShown = 0;
        renderSuggestions(stageIndex, stage.currentMode);
    }
}

function hideSuggestions(stageIndex) {
    document.getElementById(`suggestions-${stageIndex}`).style.display = 'none';
}

function selectCombination(stageIndex, combo) {
    const stage = stages[stageIndex];

    // If there are already words selected, add the suggestion to them
    // Otherwise, replace with the suggestion
    if (stage.sourceWords.length > 0) {
        // Add combo words to existing words (avoiding duplicates)
        const combined = [...stage.sourceWords];
        for (const word of combo) {
            if (!combined.includes(word)) {
                combined.push(word);
            }
        }
        stage.sourceWords = combined;
    } else {
        stage.sourceWords = [...combo];
    }

    renderPuzzleBuilder();
    hideSuggestions(stageIndex);

    // Auto-validate after selecting combination
    autoValidateStage(stageIndex);
}

function autoValidateStage(stageIndex) {
    const stage = stages[stageIndex];
    const sourceLetters = stage.sourceWords.join('');
    const targetWord = stage.targetWord;

    // For non-first stages, combine available letters with source words
    const availableLetters = stage.letterPool || '';
    const allLetters = availableLetters + sourceLetters;

    // Check if all letters (available + source) contain what's needed for target word
    if (!canMakeWord(targetWord, allLetters)) {
        // Not complete - clear completion status
        if (stage.complete) {
            stage.complete = false;
            stage.remainingLetters = '';
            // Clear subsequent stages' completion and letter pools
            for (let i = stageIndex + 1; i < stages.length; i++) {
                stages[i].complete = false;
                stages[i].letterPool = '';
                stages[i].remainingLetters = '';
            }
            renderPuzzleBuilder();
        }
        return;
    }

    // Mark stage as complete
    stage.complete = true;
    stage.remainingLetters = subtractLetters(allLetters, targetWord);

    // Set up next stage's letter pool
    if (stageIndex < stages.length - 1) {
        const nextStage = stages[stageIndex + 1];
        nextStage.letterPool = stage.remainingLetters;
    }

    renderPuzzleBuilder();
}

function validateStage(stageIndex) {
    const stage = stages[stageIndex];
    const sourceLetters = stage.sourceWords.join('');
    const targetWord = stage.targetWord;

    // For non-first stages, combine available letters with source words
    const availableLetters = stage.letterPool || '';
    const allLetters = availableLetters + sourceLetters;

    // Check if all letters (available + source) contain what's needed for target word
    if (!canMakeWord(targetWord, allLetters)) {
        showMessage(stageIndex, 'The available letters and source words do not contain all the letters needed to make the target word.', 'error');
        return;
    }

    // Mark stage as complete
    stage.complete = true;
    stage.remainingLetters = subtractLetters(allLetters, targetWord);

    // Set up next stage's letter pool
    if (stageIndex < stages.length - 1) {
        const nextStage = stages[stageIndex + 1];
        nextStage.letterPool = stage.remainingLetters;
        showMessage(stageIndex, '✓ Stage complete! The remaining letters will be used for the next stage.', 'success');
    } else {
        if (stage.remainingLetters.length === 0) {
            showMessage(stageIndex, '✓ Final stage complete! Perfect - no letters remaining!', 'success');
        } else {
            showMessage(stageIndex, `✓ Final stage complete, but ${stage.remainingLetters.length} letters remain: ${stage.remainingLetters.toUpperCase()}`, 'success');
        }
    }

    renderPuzzleBuilder();
}

function showMessage(stageIndex, message, type) {
    const messageDiv = document.getElementById(`message-${stageIndex}`);
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;

    setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = '';
    }, 5000);
}

function updateSummary() {
    const summaryPanel = document.getElementById('puzzle-summary');
    const summaryDiv = document.getElementById('summary-content');

    // Hide summary if no stages
    if (stages.length === 0) {
        summaryPanel.style.display = 'none';
        return;
    }

    summaryPanel.style.display = 'block';

    const allComplete = stages.every(s => s.complete);
    const lastStage = stages[stages.length - 1];
    const finalLettersRemaining = lastStage.remainingLetters;

    let html = '<div style="line-height: 1.8;">';

    html += '<h4 style="margin-bottom: 12px;">Puzzle Flow:</h4>';

    stages.forEach((stage, index) => {
        if (stage.complete) {
            html += `
                <div style="margin-bottom: 16px; padding: 12px; background: #f0f0f0; border-radius: 6px;">
                    <strong>Stage ${index + 1}:</strong> ${stage.sourceWords.join(' + ')} → <strong>${stage.targetWord.toUpperCase()}</strong><br>
                    ${stage.remainingLetters ? `<span style="color: #666;">Remaining: ${stage.remainingLetters.toUpperCase()}</span>` : '<span style="color: #28a745;">No letters remaining</span>'}
                </div>
            `;
        } else {
            html += `
                <div style="margin-bottom: 16px; padding: 12px; background: #fff3cd; border-radius: 6px;">
                    <strong>Stage ${index + 1}:</strong> ${stage.targetWord.toUpperCase()} <span style="color: #856404;">(not yet configured)</span>
                </div>
            `;
        }
    });

    if (allComplete) {
        if (finalLettersRemaining.length === 0) {
            html += '<div style="margin-top: 16px; padding: 12px; background: #d4edda; border-radius: 6px; color: #155724;"><strong>✓ Perfect puzzle!</strong> All letters are used exactly.</div>';
        } else {
            html += `<div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-radius: 6px; color: #856404;"><strong>Note:</strong> ${finalLettersRemaining.length} letters remain: ${finalLettersRemaining.toUpperCase()}</div>`;
        }

        html += `
            <div style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="exportPuzzle()">Export Puzzle Data</button>
                <button class="btn btn-secondary" style="margin-left: 8px;" onclick="startOver()">Start Over</button>
            </div>
        `;
    }

    html += '</div>';

    summaryDiv.innerHTML = html;
}

function exportPuzzle() {
    const puzzleData = {
        targetWords: targetWords,
        stages: stages.map(s => ({
            targetWord: s.targetWord,
            sourceWords: s.sourceWords,
            remainingLetters: s.remainingLetters
        }))
    };

    const json = JSON.stringify(puzzleData, null, 2);

    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word-puzzle.json';
    a.click();
    URL.revokeObjectURL(url);

    // Also show in alert for copying
    alert('Puzzle data exported! Also copying to clipboard...\n\n' + json);
    navigator.clipboard.writeText(json).catch(() => {
        console.log('Could not copy to clipboard');
    });
}

function startOver() {
    if (confirm('Are you sure you want to start over? This will clear all your progress.')) {
        targetWords = [];
        stages = [];
        currentStage = 0;

        // Clear inputs
        document.querySelectorAll('.target-word-input').forEach(input => {
            input.value = '';
        });

        renderPuzzleBuilder();
    }
}

function toggleWordList() {
    const checkbox = document.getElementById('use-expanded-wordlist');
    const useExpanded = checkbox.checked;

    // Switch to expanded or filtered word list
    useExpandedWordList(useExpanded);

    // Refresh all visible suggestions
    stages.forEach((stage, index) => {
        const suggestionsDiv = document.getElementById(`suggestions-${index}`);

        // If suggestions are currently visible, refresh them
        if (suggestionsDiv && suggestionsDiv.style.display !== 'none') {
            // Clear cached combinations since word list changed
            stage.sortedCombinations = null;
            stage.unsortedCombinations = null;
            stage.currentCombinations = null;
            stage.combinationsShown = 0;

            // Re-trigger the search with current mode
            if (stage.currentMode) {
                if (stage.currentMode === 'single') {
                    showSuggestions(index, 'single');
                } else if (stage.currentMode === 'combo') {
                    showSuggestions(index, 'combo');
                }
            }
        }
    });

    // Show notification
    const wordCount = useExpanded ? '~6,800' : '~5,600';
    const listType = useExpanded ? 'expanded' : 'filtered';
    console.log(`Switched to ${listType} word list (${wordCount} words)`);
}

// Auto-Generation Functions

// Find best word combination for a target word with minimal excess letters
async function findBestWordCombinationForTarget(targetWord, availableLetters = '', maxRandomLetters = 3) {
    const targetCounts = getLetterCounts(targetWord);
    const availableCounts = getLetterCounts(availableLetters);

    // Calculate what letters we're missing
    const missingCounts = {};
    for (const [letter, count] of Object.entries(targetCounts)) {
        const available = availableCounts[letter] || 0;
        if (available < count) {
            missingCounts[letter] = count - available;
        }
    }

    const missingLettersNeeded = Object.values(missingCounts).reduce((a, b) => a + b, 0);

    // If we can complete with available letters alone, no words needed
    if (missingLettersNeeded === 0) {
        return {
            sourceWords: [],
            randomLetters: '',
            excess: Object.entries(availableCounts).reduce((sum, [letter, count]) => {
                const needed = targetCounts[letter] || 0;
                return sum + Math.max(0, count - needed);
            }, 0)
        };
    }

    // Try to find word combinations that minimize random letters needed
    // Start with single words, then pairs, then triplets
    const minLength = 2;
    const maxLength = 10;

    let bestSolution = null;
    let bestRandomCount = Infinity;

    // Try single words first
    for (let mode = 1; mode <= 3; mode++) {
        const combinations = await findWordCombinations(
            targetWord,
            availableLetters,
            mode,
            mode,
            minLength,
            maxLength,
            false,
            null
        );

        // Score each combination
        for (const combo of combinations) {
            const comboLetters = combo.words.join('');
            const allLetters = availableLetters + comboLetters;
            const allCounts = getLetterCounts(allLetters);

            // Calculate missing and excess
            let missing = 0;
            let excess = 0;

            for (const [letter, needed] of Object.entries(targetCounts)) {
                const have = allCounts[letter] || 0;
                if (have < needed) {
                    missing += needed - have;
                } else if (have > needed) {
                    excess += have - needed;
                }
            }

            // Add excess from letters not in target
            for (const [letter, count] of Object.entries(allCounts)) {
                if (!targetCounts[letter]) {
                    excess += count;
                }
            }

            // If this combination requires fewer random letters, it's better
            if (missing <= maxRandomLetters && missing < bestRandomCount) {
                bestRandomCount = missing;
                bestSolution = {
                    sourceWords: combo.words,
                    randomLetters: '',
                    missingCount: missing,
                    excess: excess
                };
            } else if (missing === bestRandomCount && bestSolution && excess < bestSolution.excess) {
                // If same random count, prefer less excess
                bestSolution = {
                    sourceWords: combo.words,
                    randomLetters: '',
                    missingCount: missing,
                    excess: excess
                };
            }

            // If we found a perfect solution with no random letters, stop searching
            if (missing === 0 && excess === 0) {
                return bestSolution;
            }
        }

        // If we found a solution with 0 random letters, no need to check more complex combinations
        if (bestSolution && bestSolution.missingCount === 0) {
            break;
        }
    }

    // If we found a solution, generate the random letters needed
    if (bestSolution) {
        if (bestSolution.missingCount > 0) {
            const allLetters = availableLetters + bestSolution.sourceWords.join('');
            const allCounts = getLetterCounts(allLetters);

            let randomLetters = '';
            for (const [letter, needed] of Object.entries(targetCounts)) {
                const have = allCounts[letter] || 0;
                if (have < needed) {
                    randomLetters += letter.repeat(needed - have);
                }
            }
            bestSolution.randomLetters = randomLetters;
        }
        return bestSolution;
    }

    // If no solution found with words, generate all letters as random (up to max)
    let randomLetters = '';
    let totalMissing = 0;
    for (const [letter, count] of Object.entries(missingCounts)) {
        totalMissing += count;
    }

    if (totalMissing <= maxRandomLetters) {
        for (const [letter, count] of Object.entries(missingCounts)) {
            randomLetters += letter.repeat(count);
        }
    } else {
        // Can't complete even with max random letters - prioritize most needed letters
        const sortedMissing = Object.entries(missingCounts).sort((a, b) => b[1] - a[1]);
        let added = 0;
        for (const [letter, count] of sortedMissing) {
            const toAdd = Math.min(count, maxRandomLetters - added);
            randomLetters += letter.repeat(toAdd);
            added += toAdd;
            if (added >= maxRandomLetters) break;
        }
    }

    return {
        sourceWords: [],
        randomLetters: randomLetters,
        missingCount: randomLetters.length,
        excess: 0
    };
}

// Find word combination that uses exactly the target letters (0 remaining)
async function findExactWordCombination(targetWord, availableLetters = '', maxRandomLetters = 3, randomize = false) {
    const targetCounts = getLetterCounts(targetWord);
    const availableCounts = getLetterCounts(availableLetters);

    // Calculate missing letters
    const missingCounts = {};
    for (const [letter, count] of Object.entries(targetCounts)) {
        const available = availableCounts[letter] || 0;
        if (available < count) {
            missingCounts[letter] = count - available;
        }
    }

    const minLength = 2;
    const maxLength = 10;

    const candidates = []; // Collect all candidates to potentially randomize

    // Try different word combination sizes
    for (let mode = 1; mode <= 3; mode++) {
        const combinations = await findWordCombinations(
            targetWord,
            availableLetters,
            mode,
            mode,
            minLength,
            maxLength,
            false,
            null
        );

        for (const combo of combinations) {
            const comboLetters = combo.words.join('');
            const allLetters = availableLetters + comboLetters;
            const allCounts = getLetterCounts(allLetters);

            // Calculate missing and excess
            let missing = 0;
            let excess = 0;

            for (const [letter, needed] of Object.entries(targetCounts)) {
                const have = allCounts[letter] || 0;
                if (have < needed) {
                    missing += needed - have;
                } else if (have > needed) {
                    excess += have - needed;
                }
            }

            // Count excess from letters not in target
            for (const [letter, count] of Object.entries(allCounts)) {
                if (!targetCounts[letter]) {
                    excess += count;
                }
            }

            // Only consider if missing is within limit
            if (missing > maxRandomLetters) continue;

            // Score: heavily penalize random letters, then excess
            const score = missing * 1000 + excess;

            candidates.push({
                sourceWords: combo.words,
                missingCount: missing,
                excess: excess,
                score: score
            });

            // If perfect solution and not randomizing, return immediately
            if (score === 0 && !randomize) {
                const solution = candidates[candidates.length - 1];
                if (solution.missingCount > 0) {
                    const allLetters = availableLetters + solution.sourceWords.join('');
                    const allCounts = getLetterCounts(allLetters);
                    let randomLetters = '';
                    for (const [letter, needed] of Object.entries(targetCounts)) {
                        const have = allCounts[letter] || 0;
                        if (have < needed) {
                            randomLetters += letter.repeat(needed - have);
                        }
                    }
                    solution.randomLetters = randomLetters;
                }
                return solution;
            }
        }
    }

    // Sort candidates by score
    candidates.sort((a, b) => a.score - b.score);

    // If randomizing, pick from top candidates randomly
    let bestSolution;
    if (randomize && candidates.length > 0) {
        const topCount = Math.min(10, candidates.length);
        const randomIndex = Math.floor(Math.random() * topCount);
        bestSolution = candidates[randomIndex];
    } else if (candidates.length > 0) {
        bestSolution = candidates[0];
    }

    // Generate random letters if needed
    if (bestSolution && bestSolution.missingCount > 0) {
        const allLetters = availableLetters + bestSolution.sourceWords.join('');
        const allCounts = getLetterCounts(allLetters);

        let randomLetters = '';
        for (const [letter, needed] of Object.entries(targetCounts)) {
            const have = allCounts[letter] || 0;
            if (have < needed) {
                randomLetters += letter.repeat(needed - have);
            }
        }
        bestSolution.randomLetters = randomLetters;
    } else if (!bestSolution) {
        // No word combinations found - use only random letters (up to max)
        let randomLetters = '';
        let totalMissing = Object.values(missingCounts).reduce((a, b) => a + b, 0);

        if (totalMissing <= maxRandomLetters) {
            // Can complete with random letters
            for (const [letter, count] of Object.entries(missingCounts)) {
                randomLetters += letter.repeat(count);
            }
            bestSolution = {
                sourceWords: [],
                randomLetters: randomLetters,
                missingCount: randomLetters.length,
                excess: 0
            };
        } else {
            // Too many missing - take what we can
            const sortedMissing = Object.entries(missingCounts).sort((a, b) => b[1] - a[1]);
            let added = 0;
            for (const [letter, count] of sortedMissing) {
                const toAdd = Math.min(count, maxRandomLetters - added);
                randomLetters += letter.repeat(toAdd);
                added += toAdd;
                if (added >= maxRandomLetters) break;
            }
            bestSolution = {
                sourceWords: [],
                randomLetters: randomLetters,
                missingCount: randomLetters.length,
                excess: 0
            };
        }
    }

    return bestSolution;
}

// Main auto-generation function with backward optimization
async function autoGeneratePuzzle() {
    const statusDiv = document.getElementById('auto-generate-status');

    // Validate that all stages have target words
    const emptyStages = stages.filter(s => !s.targetWord.trim());
    if (emptyStages.length > 0) {
        statusDiv.innerHTML = '<span style="color: #dc2626;">⚠️ Please fill in all target words first</span>';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
        return;
    }

    statusDiv.innerHTML = '<span style="color: #667eea;">⏳ Generating puzzle...</span>';

    // Clear all existing source words
    stages.forEach(stage => {
        stage.sourceWords = [];
        stage.complete = false;
        stage.remainingLetters = '';
        stage.letterPool = '';
        stage.randomLetters = '';
    });

    let totalRandomLetters = 0;
    const maxIterations = 5;
    let iteration = 0;
    let finalRemaining = '';

    // Try to generate a valid puzzle with 0 remaining letters
    while (iteration < maxIterations) {
        iteration++;
        totalRandomLetters = 0;

        // Reset stages for this iteration (except on first)
        if (iteration > 1) {
            stages.forEach(stage => {
                stage.sourceWords = [];
                stage.complete = false;
                stage.remainingLetters = '';
                stage.letterPool = '';
                stage.randomLetters = '';
            });
        }

        statusDiv.innerHTML = `<span style="color: #667eea;">⏳ Generating puzzle (attempt ${iteration}/${maxIterations})...</span>`;

        // Generate for each stage
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];

            // Get available letters from previous stage
            const availableLetters = i > 0 ? stages[i - 1].remainingLetters : '';

            // For the last stage, strongly prefer 0 excess
            // For other stages, allow some excess
            // Randomize on retries to explore different solutions
            const shouldRandomize = iteration > 1;
            const solution = await findExactWordCombination(stage.targetWord, availableLetters, 3, shouldRandomize);

            console.log(`Stage ${i+1}: target="${stage.targetWord}", available="${availableLetters}", solution=`, solution);

            // Apply solution
            stage.sourceWords = [...solution.sourceWords];
            stage.randomLetters = solution.randomLetters || '';

            // Set up letterPool: available from previous + any random letters needed
            if (solution.randomLetters) {
                totalRandomLetters += solution.randomLetters.length;
                stage.letterPool = availableLetters + solution.randomLetters;
            } else {
                stage.letterPool = availableLetters;
            }

            // Validate and complete the stage
            const allLetters = stage.letterPool + stage.sourceWords.join('');
            stage.complete = canMakeWord(stage.targetWord, allLetters);
            stage.remainingLetters = subtractLetters(allLetters, stage.targetWord);

            console.log(`  -> letterPool="${stage.letterPool}", sourceWords=[${stage.sourceWords.join(',')}], remaining="${stage.remainingLetters}"`);

            // Update next stage's letter pool
            if (i < stages.length - 1) {
                stages[i + 1].letterPool = stage.remainingLetters;
            }

            // Update UI progressively
            renderPuzzleBuilder();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Check if final stage has 0 remaining
        finalRemaining = stages[stages.length - 1].remainingLetters;
        console.log(`Iteration ${iteration}: Final remaining = "${finalRemaining}"`);

        if (finalRemaining.length === 0) {
            break; // Success!
        }
    }

    // If still have remaining letters, try to absorb them into target words
    if (finalRemaining.length > 0) {
        statusDiv.innerHTML = '<span style="color: #667eea;">⏳ Optimizing to eliminate remaining letters...</span>';

        // Check if we can use remaining letters by incorporating them into target words
        // This means finding alternative word combinations that consume these letters
        for (let stageIdx = stages.length - 1; stageIdx >= 0; stageIdx--) {
            const stage = stages[stageIdx];
            const targetWithRemaining = stage.targetWord + finalRemaining;

            // Try to find word combinations that make a superset including remaining letters
            const availableLetters = stageIdx > 0 ? stages[stageIdx - 1].remainingLetters : (stage.letterPool || '');

            // Look for combinations that use the remaining letters too
            let foundBetter = false;
            for (let mode = 1; mode <= 3; mode++) {
                const combinations = await findWordCombinations(
                    targetWithRemaining,
                    availableLetters,
                    mode,
                    mode,
                    2,
                    10,
                    false,
                    null
                );

                // Find one that uses exactly target + remaining
                for (const combo of combinations) {
                    const comboLetters = combo.words.join('');
                    const allLetters = availableLetters + comboLetters;

                    if (canMakeWord(targetWithRemaining, allLetters)) {
                        const newRemaining = subtractLetters(allLetters, targetWithRemaining);

                        // If this reduces remaining letters, use it
                        if (newRemaining.length < finalRemaining.length) {
                            stage.sourceWords = [...combo.words];
                            stage.remainingLetters = subtractLetters(allLetters, stage.targetWord);

                            // Update subsequent stages
                            for (let j = stageIdx + 1; j < stages.length; j++) {
                                stages[j].letterPool = stages[j - 1].remainingLetters;
                                const stageLetters = stages[j].letterPool + stages[j].sourceWords.join('');
                                stages[j].remainingLetters = subtractLetters(stageLetters, stages[j].targetWord);
                            }

                            finalRemaining = stages[stages.length - 1].remainingLetters;
                            foundBetter = true;
                            break;
                        }
                    }
                }

                if (foundBetter) break;
            }

            if (finalRemaining.length === 0) break;
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        renderPuzzleBuilder();
    }

    // Show completion message
    if (finalRemaining.length === 0) {
        if (totalRandomLetters === 0) {
            statusDiv.innerHTML = '<span style="color: #28a745;">✓ Perfect puzzle generated with no random letters!</span>';
        } else {
            statusDiv.innerHTML = `<span style="color: #28a745;">✓ Perfect puzzle generated with ${totalRandomLetters} random letter${totalRandomLetters > 1 ? 's' : ''}</span>`;
        }
    } else {
        statusDiv.innerHTML = `<span style="color: #ffc107;">⚠️ Puzzle generated but ${finalRemaining.length} letter${finalRemaining.length > 1 ? 's' : ''} remaining: ${finalRemaining.toUpperCase()}. Try different target words.</span>`;
    }

    setTimeout(() => statusDiv.innerHTML = '', 8000);
}
