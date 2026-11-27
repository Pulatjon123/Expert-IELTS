/** Canonical weakness categories shared by Writing and Speaking, so patterns can be tracked across skills. */
export const WEAKNESS_CATALOG = {
  articles: { name: "Article usage (a / an / the)", practice: "Rewrite 10 sentences from your last answer, checking every singular countable noun for an article. Review zero article with general plural/uncountable nouns." },
  prepositions: { name: "Preposition mistakes", practice: "Keep a list of verb/adjective + preposition pairs you got wrong (e.g. 'depend on', 'interested in') and write one new sentence with each." },
  subject_verb_agreement: { name: "Subject–verb agreement", practice: "Underline the subject of every verb in a paragraph you wrote; check singular/plural agreement, especially after 'the number of', 'each', 'people'." },
  verb_tenses: { name: "Verb tense errors", practice: "Practise describing past data (Task 1) in past simple and trends with present perfect; check every verb in one answer." },
  word_forms: { name: "Wrong word forms", practice: "For each error, write the noun / verb / adjective / adverb family (e.g. economy, economic, economical, economically)." },
  plurals_countability: { name: "Plurals and countable/uncountable nouns", practice: "Review common uncountable nouns (information, advice, research, equipment) and fix plural errors in your last answer." },
  sentence_structure: { name: "Fragments and run-on sentences", practice: "Split every sentence over 35 words; make sure each sentence has a main clause with a subject and finite verb." },
  punctuation: { name: "Punctuation", practice: "Check commas after introductory phrases and before non-defining clauses; avoid comma splices." },
  spelling: { name: "Spelling", practice: "List your misspelt words and write each correctly three times; reread for spelling before submitting." },
  limited_vocabulary: { name: "Limited vocabulary range", practice: "Learn 5 topic-specific expressions from the preparation section and use them naturally in your next answer." },
  repetition: { name: "Repetitive wording", practice: "Find words you used 4+ times and prepare 2–3 accurate alternatives or restructure sentences to avoid them." },
  weak_collocations: { name: "Unnatural collocations", practice: "Study the collocations list for this topic; check word partnerships in a learner's dictionary before using them." },
  register: { name: "Informal or inappropriate register", practice: "Replace contractions, phrasal verbs and conversational phrases with neutral academic alternatives." },
  coherence: { name: "Weak coherence / logical flow", practice: "Write one clear topic sentence per paragraph, then check that every following sentence supports it." },
  cohesive_devices: { name: "Mechanical or overused linking words", practice: "Replace sentence-initial 'Moreover / Furthermore' with referencing (this trend, such policies) and varied sentence openings." },
  paragraphing: { name: "Paragraphing", practice: "Plan your answer: introduction, 2–3 body paragraphs with one central idea each, and a conclusion." },
  underdeveloped_ideas: { name: "Underdeveloped arguments", practice: "For each main idea, add explanation → example → consequence. Aim for 2–3 well-extended ideas rather than many brief ones." },
  task_response: { name: "Not fully answering the question", practice: "Before writing, underline every part of the question and check that your plan addresses each one directly." },
  task1_overview: { name: "Missing or weak overview (Task 1)", practice: "Write a two-sentence overview of the most significant trends/features before describing any details." },
  data_accuracy: { name: "Inaccurate data reporting (Task 1)", practice: "Check every figure you mention against the chart; group data and compare rather than listing numbers." },
  word_count: { name: "Under the word limit", practice: "Practise timed planning so you have enough to say; Task 1 needs 150+ words and Task 2 needs 250+ words." },
  complex_structures: { name: "Limited complex sentence structures", practice: "Practise relative clauses, conditionals and concessive clauses (although, whereas) — accurately, not forcedly." },
  hesitation: { name: "Speaking hesitation and long pauses", practice: "Record 1-minute answers on familiar topics daily; use natural fillers ('Well, let me think…') instead of silence." },
  filler_words: { name: "Repeated filler words", practice: "Listen back to recordings and count fillers ('um', 'like', 'you know'); replace with short pauses or discourse markers." },
  short_answers: { name: "Answers too short / not extended", practice: "Use the answer–reason–example pattern: give a direct answer, then explain why and give a personal example." },
  pronunciation_sounds: { name: "Individual sound problems", practice: "Practise minimal pairs for the sounds flagged (e.g. /v/–/w/, /θ/–/s/) and record yourself." },
  word_stress: { name: "Word stress", practice: "Check stress for multi-syllable words in a dictionary; mark the stressed syllable and practise aloud." },
  intonation: { name: "Flat intonation / sentence stress", practice: "Shadow a short native-speaker clip, copying where the voice rises, falls and stresses key words." },
} as const;

export type WeaknessKey = keyof typeof WEAKNESS_CATALOG;
export const WEAKNESS_KEYS = Object.keys(WEAKNESS_CATALOG) as [WeaknessKey, ...WeaknessKey[]];
