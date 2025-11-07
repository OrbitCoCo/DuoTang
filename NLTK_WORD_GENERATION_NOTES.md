# NLTK Word Generation Attempt

## Overview
Attempted to generate a curated list of concrete nouns (physical objects only) using NLTK's WordNet to replace the original word list with better quality, more appropriate words for the DuoTang puzzle game.

## Goal
Create a word list containing only:
- Concrete, physical objects (things you can touch/see)
- Common, everyday items suitable for word puzzles
- NO abstract concepts, people, occupations, medical terms, technical jargon, etc.

## What Was Done

### Created `generate_nouns.py`
A Python script that uses NLTK and WordNet to:
1. Extract all nouns from WordNet
2. Filter for concrete nouns using hypernym analysis
3. Exclude abstract concepts, people, organizations, technical terms
4. Generate `words.js` in the required format

### Filters Applied
The script filters out:
- Special characters and numbers
- Proper nouns (people, places)
- Abstract concepts (states, emotions, ideas, processes)
- People/occupations/nationalities
- Organizations and groups
- Body parts and anatomical terms
- Medical/pharmaceutical terms
- Scientific/technical terms (physics, chemistry)
- Fossils and extinct things
- Devices and instruments
- Overly formal/archaic words with abstract meanings

### Results
- **Final count**: 12,808 concrete nouns
- **Original count**: ~6,775 words (in original list)
- Successfully includes common words: book, tree, bass, drill, table, chair, cup, pen, car, dog, cat, bird, scissors
- Successfully filters: scotsman, fentanyl, benzedrine, facsimile, belemnite, etc.

## Why It Didn't Work
The user indicated "that didn't work" - likely issues:
1. Still contains obscure/unfamiliar words not suitable for puzzles
2. May be missing some common words
3. WordNet's classification might not align with "puzzle-appropriate" words
4. The automated filtering can't capture the nuance of what makes a good puzzle word

## Files Created
- `generate_nouns.py` - The Python script to generate word lists
- `words_nltk_generated.js` - The generated word list (12,808 words) in JS format
- `nouns_nltk_list.txt` - The generated word list in plain text format
- `NLTK_WORD_GENERATION_NOTES.md` - This document

## To Resume This Approach Later

### Option 1: Manual Curation
1. Start with `nouns_nltk_list.txt` (12,808 words)
2. Use a frequency list (e.g., from Google's N-gram corpus) to filter for common words
3. Manually review and curate the list
4. Add a profanity filter

### Option 2: Frequency-Based Filtering
Modify `generate_nouns.py` to:
```python
# Add word frequency data
from collections import Counter
import requests

# Get common English word frequencies
# Example: Use COCA (Corpus of Contemporary American English) word frequency data
# Only include words in top 20,000 most common words
```

### Option 3: Use a Different Source
Instead of WordNet, consider:
- Basic English 850 word list (very limited but guaranteed appropriate)
- Pictionary word lists (designed for object-based games)
- Scrabble dictionaries filtered for concrete nouns
- Children's vocabulary lists (grade 3-5 level)

### Option 4: Combine Approaches
1. Use NLTK/WordNet to get base set of concrete nouns
2. Cross-reference with word frequency data (keep top 50% most common)
3. Apply profanity filter
4. Manual review of remaining ~6,000 words

## Code Reference

### Running the script
```bash
python3 generate_nouns.py
```

### Key Functions in generate_nouns.py
- `is_concrete_noun(word)` - Checks if word is a physical object using hypernyms
- `is_valid_word(word)` - Filters special chars, numbers, proper nouns
- `get_concrete_nouns()` - Main function that orchestrates filtering

### Adjusting Filters
To make the list more/less strict, modify these sets in `is_concrete_noun()`:
- `abstract_roots` - Add more WordNet synsets to exclude
- `concrete_roots` - Add more WordNet synsets to include
- `technical_keywords` - Add definition keywords to filter out

## Next Steps (Recommendations)
1. **Manual curation** is probably the best approach for a game
2. Start with a smaller, hand-picked list of ~1000-2000 common objects
3. Use the NLTK approach to verify words are real and get definitions
4. Grow the list over time based on user feedback

## Original Word List
The original word list has been restored from git:
- Location: `words.js`
- Format: `const WORD_LIST = [...]` and `const WORD_SET = new Set(WORD_LIST)`

## Profanity Filtering (Not Yet Implemented)
For future implementation, consider:
- Use a library like `better-profanity` (Python)
- Use a curated profanity list from GitHub
- Example: https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
