#!/usr/bin/env python3
"""
Generate a list of concrete nouns (physical objects) using NLTK and WordNet.
"""

import nltk
from nltk.corpus import wordnet as wn
import json
import ssl

# Fix SSL certificate issue for downloads
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Download required NLTK data (run once)
try:
    wn.synsets('test')
except:
    print("Downloading required NLTK data...")
    nltk.download('wordnet')
    nltk.download('omw-1.4')

def is_concrete_noun(word):
    """
    Check if a word is a concrete noun (physical object).
    Uses WordNet hypernyms to determine if the word refers to a physical entity.
    """
    synsets = wn.synsets(word, pos=wn.NOUN)

    if not synsets:
        return False

    # Abstract concept indicators (we want to exclude these)
    abstract_roots = {
        'abstraction.n.06',  # abstract entity
        'psychological_feature.n.01',  # psychological feature
        'attribute.n.02',  # attribute/quality
        'state.n.04',  # state/condition
        'event.n.01',  # event/happening
        'act.n.02',  # act/action
        'group.n.01',  # group (too abstract)
        'measure.n.02',  # measure/quantity
        'time_period.n.01',  # time period
        'relation.n.01',  # relation
        'communication.n.02',  # communication/message
        'content.n.05',  # content/substance (too abstract)
        'possession.n.02',  # possession (abstract ownership)
        'social_group.n.01',  # social group (abstract)
        'body_part.n.01',  # body parts (anatomical - exclude)
        'internal_organ.n.01',  # internal organs (anatomical - exclude)
        'person.n.01',  # people (too abstract)
        'human.n.01',  # humans
        'worker.n.01',  # workers/occupations
        'adult.n.01',  # adults
        'juvenile.n.01',  # juveniles
        'national.n.01',  # nationalities
        'native.n.03',  # natives
        'resident.n.01',  # residents
        'inhabitant.n.01',  # inhabitants
        'professional.n.01',  # professionals
        'skilled_worker.n.01',  # skilled workers
        'organization.n.01',  # organizations
        'establishment.n.01',  # establishments (organizations)
    }

    # Physical object indicators (we want these)
    concrete_roots = {
        'physical_entity.n.01',  # physical entity
        'object.n.01',  # physical object
        'artifact.n.01',  # artifact/man-made object
        'natural_object.n.01',  # natural object
        'living_thing.n.01',  # living thing
        'organism.n.01',  # organism
        'whole.n.02',  # whole/unit
    }

    for synset in synsets:
        # Get all hypernyms (parent concepts)
        hypernyms = set()
        for path in synset.hypernym_paths():
            hypernyms.update([h.name() for h in path])

        # Must be a physical entity
        if not (hypernyms & concrete_roots):
            continue

        # Must not be abstract
        if hypernyms & abstract_roots:
            continue

        # Additional filter: check the definition for abstract/technical keywords
        # Only filter if the word is PRIMARILY about the abstract concept
        definition = synset.definition().lower()
        abstract_keywords = ['concept of', 'idea of', 'theory of', 'principle of',
                             'state of being', 'feeling of', 'emotion of',
                             'the act of', 'the action of', 'the process of',
                             'the activity of', 'the event of']

        if any(keyword in definition for keyword in abstract_keywords):
            continue

        # Filter technical/scientific/medical terms
        technical_keywords = ['drug used', 'medicine', 'pharmaceutical', 'medication',
                             'chemical compound', 'enzyme', 'hormone', 'protein',
                             'antibiotic', 'trademark', 'trade name', 'brand name',
                             'physics', 'chemistry', 'particle', 'subatomic',
                             'molecular', 'atom', 'ion', 'transmits', 'duplicator',
                             'device for', 'apparatus', 'instrument for measuring',
                             'amphetamine', 'anesthetic', 'crystalline', 'sedative',
                             'stimulant', 'analgesic', 'ester', 'alkaloid', 'steroid',
                             'vitamin', 'fossil', 'extinct']

        if any(keyword in definition for keyword in technical_keywords):
            continue

        # Filter overly formal/archaic words (prefer common everyday terms)
        # Words ending in common formal suffixes
        formal_suffixes = ['tion', 'sion', 'ism', 'ity', 'ness', 'ment', 'ence', 'ance']
        if len(word) > 8 and any(word.endswith(suffix) for suffix in formal_suffixes):
            # Check if it's describing an abstract process/state in definition
            if 'reproduction' in definition or 'duplication' in definition or 'replication' in definition:
                continue

        return True

    return False

def is_valid_word(word):
    """
    Check if a word is valid (no special characters, numbers, or proper nouns).
    """
    # Must be all lowercase letters (no numbers, special characters)
    if not word.isalpha():
        return False

    # Must be all lowercase (filter out proper nouns)
    if word[0].isupper():
        return False

    # Check if ALL synsets are proper nouns (filter only if exclusively a proper noun)
    synsets = wn.synsets(word, pos=wn.NOUN)
    if synsets:
        all_proper = all(synset.instance_hypernyms() for synset in synsets)
        if all_proper:
            return False

    return True

def get_concrete_nouns(min_length=2, max_length=10):
    """
    Get all concrete nouns from WordNet within the specified length range.
    """
    concrete_nouns = set()

    # Get all noun lemmas from WordNet
    all_nouns = set()
    for synset in wn.all_synsets(pos=wn.NOUN):
        for lemma in synset.lemmas():
            word = lemma.name().replace('_', ' ')
            # Only single words (no phrases or hyphenated words)
            if ' ' not in word and '-' not in word:
                word = word.lower()
                if min_length <= len(word) <= max_length:
                    # Check if valid (no special chars, proper nouns, etc.)
                    if is_valid_word(word):
                        all_nouns.add(word)

    print(f"Found {len(all_nouns)} valid nouns")
    print("Filtering for concrete nouns (this may take a minute)...")

    # Filter for concrete nouns
    for i, word in enumerate(sorted(all_nouns)):
        if (i + 1) % 500 == 0:
            print(f"Processed {i + 1}/{len(all_nouns)} words...")

        if is_concrete_noun(word):
            concrete_nouns.add(word)

    return sorted(concrete_nouns)

def main():
    print("Generating concrete noun list...")

    # Get concrete nouns
    nouns = get_concrete_nouns(min_length=2, max_length=10)

    print(f"\nFound {len(nouns)} concrete nouns")

    # Show a sample
    print("\nSample nouns:")
    print(", ".join(nouns[:20]))

    # Save to JavaScript file format
    js_content = f"const WORD_LIST = {json.dumps(nouns, indent=2)};\n"
    js_content += f"const WORD_SET = new Set(WORD_LIST);\n"

    with open('words.js', 'w') as f:
        f.write(js_content)

    print(f"\nSaved {len(nouns)} words to words.js")

    # Also save as plain text for review
    with open('nouns_list.txt', 'w') as f:
        f.write('\n'.join(nouns))

    print(f"Saved word list to nouns_list.txt for review")

if __name__ == '__main__':
    main()
