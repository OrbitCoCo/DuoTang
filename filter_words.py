#!/usr/bin/env python3
"""
Filter the word list to remove:
1. Offensive/profane words
2. Abstract nouns that can't be represented as physical objects
3. People/occupations/nationalities
4. Concepts, emotions, states, actions, processes

Creates a filtered list while preserving the original.
"""

import json
import re

def load_words_from_js(filename):
    """Extract word list from JavaScript file."""
    with open(filename, 'r') as f:
        content = f.read()

    # Find the array in const WORD_LIST = [...]
    match = re.search(r'const WORD_LIST = (\[.*?\]);', content, re.DOTALL)
    if match:
        # Parse the JSON array
        words_json = match.group(1)
        words = json.loads(words_json)
        return words
    return []

# Profanity list (basic common offensive words)
PROFANITY = {
    'ass', 'arse', 'asshole', 'bastard', 'bitch', 'bollocks', 'crap', 'cunt',
    'damn', 'dick', 'fuck', 'fucking', 'piss', 'shit', 'slut', 'whore',
    'fisting', 'floozie', 'cock', 'coitus'
}

# Abstract concepts - words ending in these suffixes are often abstract
ABSTRACT_SUFFIXES = [
    'tion', 'sion', 'ment', 'ness', 'ity', 'ty', 'ance', 'ence', 'ship',
    'hood', 'dom', 'ism', 'ization', 'isation', 'age', 'ery', 'ry', 'cy'
]

# Words that indicate abstract concepts in themselves
ABSTRACT_WORDS = {
    # Emotions and psychological states
    'ability', 'abnormality', 'abolishment', 'abortion', 'abrogation', 'absence',
    'abuse', 'acceptance', 'accomplishment', 'accord', 'accordance', 'accountability',
    'accuracy', 'accusation', 'achievement', 'acknowledgment', 'activation', 'activity',
    'adaptation', 'addiction', 'adjustment', 'administration', 'admission', 'adoption',
    'advance', 'advancement', 'advantage', 'advent', 'advertising', 'advice', 'advocacy',
    'affair', 'affect', 'affinity', 'aftermath', 'agency', 'aggression', 'agony',
    'agreement', 'aid', 'aim', 'alarm', 'alert', 'allegation', 'allocation',
    'allowance', 'amazement', 'ambiguity', 'ambition', 'amendment', 'amnesty',
    'amusement', 'analgesia', 'anarchy', 'anger', 'angina', 'anguish', 'animation',
    'announcement', 'answer', 'anticipation', 'anxiety', 'apology', 'appeal',
    'appearance', 'appellation', 'appetite', 'applause', 'application', 'appointment',
    'appreciation', 'apprehension', 'approach', 'appropriation', 'approval',
    'argument', 'arithmetic', 'arrangement', 'array', 'arrest', 'arrival', 'arrogance',
    'art', 'ascend', 'ascent', 'aside', 'aspect', 'aspiration', 'assassination',
    'assault', 'assembly', 'assertion', 'assessment', 'assignment', 'assistance',
    'association', 'assumption', 'assurance', 'asymmetry', 'attempt', 'attendance',
    'attention', 'attenuation', 'attitude', 'attraction', 'attribute', 'authentication',
    'authenticity', 'authorisation', 'authority', 'authorization', 'autoimmunity',
    'automation', 'availability', 'avalanche', 'average', 'aversion', 'award',
    'awareness', 'awe', 'backburn', 'backdrop', 'background', 'backup', 'bafflement',
    'bail', 'balance', 'ban', 'bandwidth', 'banking', 'bankruptcy', 'bargain',
    'barrage', 'barrier', 'baseline', 'basics', 'basis', 'batting', 'battle',
    'beat', 'beating', 'beauty', 'beginning', 'behalf', 'behavior', 'behaviour',
    'beheading', 'behest', 'behold', 'being', 'belief', 'belligerency', 'benefit',
    'best-seller', 'bestseller', 'bet', 'betray', 'betrayal', 'betting', 'beverage',
    'beyond', 'bias', 'bibliography', 'bid', 'bidding', 'billing', 'billion',
    'biography', 'biology', 'biopsy', 'birth', 'birthday', 'bit', 'bite', 'bitter',
    'bitterness', 'blackness', 'blame', 'blank', 'blast', 'bleeding', 'blend',
    'blessing', 'blight', 'blindness', 'bliss', 'blow', 'blue', 'blunder', 'blur',
    'blush', 'boast', 'boasting', 'body', 'boil', 'bombing', 'bond', 'bonding',
    'bonus', 'booking', 'boolean', 'boom', 'boon', 'boost', 'border', 'bore',
    'boredom', 'borrowing', 'bother', 'bottom', 'bottom-line', 'bout', 'boundary',
    'bout', 'boycott', 'boyhood', 'bracket', 'brag', 'bragging', 'brain',
    'brand', 'bravery', 'breach', 'break', 'breakdown', 'breakfast', 'breakpoint',
    'breakthrough', 'breath', 'breathing', 'breed', 'breeding', 'breeze', 'bribery',
    'brief', 'briefing', 'briefly', 'brightness', 'brilliance', 'brilliant', 'brink',
    'broadcast', 'brotherhood', 'browsing', 'brunch', 'brushing', 'brutality',
    'bubble', 'budget', 'build', 'building', 'bulk', 'bulletin', 'bullying',
    'bump', 'bunch', 'bundle', 'burden', 'burial', 'burn', 'burn-out', 'burning',
    'burst', 'business', 'bust', 'bustle', 'buy', 'buyer', 'buying', 'buzz',

    # Time-related abstracts
    'adulthood', 'afternoon', 'afterlife', 'aftershock', 'afterthought', 'age',
    'boyhood', 'century', 'childhood', 'dawn', 'day', 'daylight', 'deadline',
    'decade', 'delay', 'duration', 'dusk', 'era', 'eternity', 'eve', 'evening',
    'event', 'forever', 'fortnight', 'future', 'girlhood', 'hour', 'interval',
    'lifespan', 'lifetime', 'manhood', 'midnight', 'millennium', 'minute', 'moment',
    'month', 'morning', 'night', 'nightfall', 'nighttime', 'noon', 'past',
    'period', 'present', 'season', 'second', 'semester', 'shift', 'spell',
    'springtime', 'summertime', 'sunrise', 'sunset', 'teatime', 'term', 'time',
    'timeframe', 'timeline', 'tomorrow', 'tonight', 'twilight', 'week', 'weekend',
    'while', 'wintertime', 'year', 'yesterday', 'youth',

    # Actions and processes
    'act', 'action', 'activation', 'activity', 'adaptation', 'addition', 'adjustment',
    'adoption', 'advance', 'advancement', 'advertising', 'advocacy', 'allocation',
    'alteration', 'amendment', 'analysis', 'animation', 'announcement', 'application',
    'approach', 'appropriation', 'arrangement', 'arrest', 'arrival', 'ascent',
    'assassination', 'assault', 'assembly', 'assessment', 'assignment', 'assist',
    'assistance', 'association', 'attack', 'attainment', 'attempt', 'attendance',
    'attenuation', 'authentication', 'authorization', 'automation', 'backup',
    'banking', 'bargain', 'barrage', 'battle', 'beat', 'beating', 'beginning',
    'behavior', 'behaviour', 'beheading', 'betrayal', 'betting', 'bid', 'bidding',
    'billing', 'birth', 'bite', 'blackmail', 'blast', 'bleeding', 'blend', 'blessing',
    'blight', 'blink', 'blow', 'boast', 'boasting', 'boil', 'bombing', 'bonding',
    'booking', 'boom', 'boost', 'bore', 'borrowing', 'bounce', 'bout', 'boycott',
    'bragging', 'branding', 'breach', 'break', 'breakdown', 'breakthrough', 'breath',
    'breathing', 'breed', 'breeding', 'bribery', 'broadcast', 'browsing', 'brushing',
    'build', 'building', 'bullying', 'bump', 'burn', 'burning', 'burst', 'business',
    'buy', 'buying', 'buzz',

    # People/occupations
    'academics', 'accompanist', 'accountant', 'achiever', 'activist', 'actor', 'actress',
    'admin', 'administrator', 'adult', 'adviser', 'advocate', 'agent', 'aide',
    'airman', 'alien', 'allergist', 'ally', 'ambassador', 'analyst', 'anarchist',
    'ancestor', 'angel', 'anesthesiologist', 'announcer', 'antagonist', 'anthropologist',
    'anybody', 'anyone', 'applicant', 'archaeologist', 'archer', 'architect', 'aristocrat',
    'artist', 'assistant', 'associate', 'astronaut', 'astronomer', 'atheist', 'athlete',
    'attendant', 'attorney', 'audience', 'aunt', 'author', 'baby', 'babe', 'bachelor',
    'badger', 'baker', 'ballerina', 'balloonist', 'bandleader', 'bandit', 'banker',
    'barber', 'bard', 'baritone', 'bartender', 'bather', 'batman', 'beggar', 'beginner',
    'believer', 'beneficiary', 'bidder', 'billionaire', 'biographer', 'biologist',
    'blacksmith', 'blogger', 'bloke', 'boarder', 'boatman', 'bodyguard', 'bondsman',
    'bookkeeper', 'boss', 'bouncer', 'boy', 'boyfriend', 'bride', 'bridesmaid',
    'brigadier', 'broadcaster', 'broker', 'brother', 'brother-in-law', 'buddy',
    'builder', 'burglar', 'businessman', 'businesswoman', 'butcher', 'butler', 'buyer',
    'bystander',

    # Relationships and social constructs
    'brotherhood', 'citizenship', 'comradeship', 'companionship', 'courtship',
    'fellowship', 'fatherhood', 'friendship', 'kinship', 'leadership', 'membership',
    'motherhood', 'ownership', 'parenthood', 'partnership', 'relationship',
    'sisterhood', 'sportsmanship', 'stewardship', 'apprenticeship', 'dictatorship',
    'guardianship', 'hardship', 'internship', 'kingship', 'kinship', 'lordship',
    'partnership', 'readership', 'scholarship', 'sponsorship', 'trusteeship',
    'workmanship',
}

# Additional keywords that often indicate abstract concepts
ABSTRACT_KEYWORDS = [
    # Measurements and quantities
    'abundance', 'amount', 'capacity', 'degree', 'depth', 'dimension', 'distance',
    'extent', 'height', 'length', 'level', 'magnitude', 'measure', 'portion',
    'quantity', 'ratio', 'scale', 'scope', 'size', 'total', 'volume', 'weight',
    'width',

    # States and conditions
    'condition', 'situation', 'state', 'status', 'circumstance', 'position',

    # Ideas and concepts
    'concept', 'idea', 'notion', 'theory', 'thought', 'principle', 'hypothesis',
    'philosophy', 'ideology',

    # Qualities and attributes
    'quality', 'characteristic', 'feature', 'trait', 'attribute', 'property',

    # Processes and systems
    'process', 'procedure', 'method', 'system', 'technique', 'approach', 'strategy',

    # Legal and formal terms
    'law', 'legislation', 'regulation', 'rule', 'policy', 'protocol', 'statute',

    # Academic and technical
    'analysis', 'research', 'study', 'investigation', 'examination', 'evaluation',
    'assessment',
]

def is_abstract_noun(word):
    """
    Check if a word is likely an abstract noun.
    """
    word_lower = word.lower()

    # Direct match in abstract words set
    if word_lower in ABSTRACT_WORDS:
        return True

    # Check for abstract keywords
    if word_lower in ABSTRACT_KEYWORDS:
        return True

    # Check for abstract suffixes (only for longer words)
    if len(word) > 7:
        for suffix in ABSTRACT_SUFFIXES:
            if word_lower.endswith(suffix):
                # Some exceptions that are concrete despite suffix
                if word_lower in ['station', 'nation', 'ration', 'portion', 'motion',
                                  'lotion', 'potion', 'cushion', 'fashion', 'mansion',
                                  'passion', 'session', 'mission', 'television',
                                  'prison', 'poison', 'bison', 'melon', 'lemon',
                                  'demon', 'summon', 'common', 'salmon', 'cotton',
                                  'button', 'mutton', 'mitten', 'kitten', 'garden',
                                  'warden', 'burden', 'golden', 'wooden', 'sudden']:
                    continue
                return True

    return False

def is_profane(word):
    """Check if word is in profanity list."""
    return word.lower() in PROFANITY

def should_filter(word):
    """
    Determine if a word should be filtered out.
    """
    # Filter profanity
    if is_profane(word):
        return True

    # Filter abstract nouns
    if is_abstract_noun(word):
        return True

    return False

def main():
    print("Loading words from words.js...")
    words = load_words_from_js('words.js')
    print(f"Loaded {len(words)} words")

    print("\nFiltering words...")
    filtered_words = []
    removed_words = []

    for word in words:
        if should_filter(word):
            removed_words.append(word)
        else:
            filtered_words.append(word)

    print(f"\nFiltered list: {len(filtered_words)} words")
    print(f"Removed: {len(removed_words)} words")

    # Show sample of removed words
    print(f"\nSample of removed words (first 50):")
    print(", ".join(removed_words[:50]))

    # Save filtered list to JSON for review
    with open('filtered_words.json', 'w') as f:
        json.dump(filtered_words, f, indent=2)

    print(f"\nSaved filtered words to filtered_words.json")

    # Also save removed words for review
    with open('removed_words.json', 'w') as f:
        json.dump(removed_words, f, indent=2)

    print(f"Saved removed words to removed_words.json")

    # Generate new words.js with both lists
    js_content = f"""// Comprehensive list of English nouns
// Source: The Great Noun List (desiquintans.com/nounlist)

// Filtered list (concrete nouns only, ~{len(filtered_words)} words)
const WORD_LIST = {json.dumps(filtered_words, indent=2)};

// Original expanded list (~{len(words)} words)
const WORD_LIST_EXPANDED = {json.dumps(words, indent=2)};

// Convert arrays to sets for faster lookups
const WORD_SET = new Set(WORD_LIST);
const WORD_SET_EXPANDED = new Set(WORD_LIST_EXPANDED);

// Default to filtered list, but allow switching
let currentWordList = WORD_LIST;
let currentWordSet = WORD_SET;

function useExpandedWordList(useExpanded) {{
    if (useExpanded) {{
        currentWordList = WORD_LIST_EXPANDED;
        currentWordSet = WORD_SET_EXPANDED;
    }} else {{
        currentWordList = WORD_LIST;
        currentWordSet = WORD_SET;
    }}
}}
"""

    with open('words_new.js', 'w') as f:
        f.write(js_content)

    print(f"Generated words_new.js with both filtered and expanded lists")
    print(f"\nReview the files, then replace words.js with words_new.js if satisfied")

if __name__ == '__main__':
    main()
