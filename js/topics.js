/* HABITERM — topics.js : maps a habit to the underlying skills/science it trains.

   Discover searches these *facets* instead of the literal habit, so a hobby like
   solving a Rubik's cube surfaces real research on spatial reasoning, pattern
   recognition and working memory — not whatever biomedical noise shares a word
   with "cube".

   A facet = { label, why, q } where q is a precise PubMed query (Title/Abstract
   phrases). Users can override the auto-derived list per habit (habit.facets). */
window.HT = window.HT || {};

HT.topics = (function () {

  /* signal words (matched as substrings of name + keywords) → skill facets */
  const MAP = [
    { sig: ['rubik', 'cube', 'speedcub', 'puzzle', 'sudoku', 'chess', 'jigsaw'], facets: [
      { label: 'Spatial reasoning', why: 'visualizing 3D moves', q: '"mental rotation"[tiab] OR "visuospatial ability"[tiab] OR "spatial reasoning"[tiab]' },
      { label: 'Pattern recognition', why: 'spotting sequences', q: '"sequence learning"[tiab] OR "statistical learning"[tiab] OR "implicit learning"[tiab]' },
      { label: 'Working memory', why: 'holding move sequences', q: '"working memory training"[tiab] OR "working memory"[tiab]' }
    ] },
    { sig: ['meditat', 'mindful', 'breath', 'breathe'], facets: [
      { label: 'Attention', why: 'sustained focus', q: '"attention training"[tiab] OR "sustained attention"[tiab]' },
      { label: 'Stress reduction', why: 'calming the nervous system', q: '"mindfulness based stress reduction"[tiab] OR "perceived stress"[tiab]' },
      { label: 'Emotion regulation', why: 'steadier moods', q: '"emotion regulation"[tiab]' }
    ] },
    { sig: ['run', 'jog', '5k', '10k', 'marathon', 'sprint', 'cardio'], facets: [
      { label: 'Cardiorespiratory fitness', why: 'a stronger heart & lungs', q: '"aerobic exercise"[tiab] OR "cardiorespiratory fitness"[tiab]' },
      { label: 'Endurance', why: 'lasting longer', q: '"endurance training"[tiab] OR "VO2 max"[tiab]' },
      { label: 'Mental health', why: 'mood & anxiety', q: '"exercise"[tiab] AND ("depression"[tiab] OR "anxiety"[tiab])' }
    ] },
    { sig: ['walk', 'steps', 'hike'], facets: [
      { label: 'Physical activity', why: 'movement adds up', q: '"physical activity"[tiab] OR "step count"[tiab]' },
      { label: 'Longevity', why: 'living longer', q: '"physical activity"[tiab] AND "all-cause mortality"[tiab]' }
    ] },
    { sig: ['lift', 'gym', 'weight', 'strength', 'resistance', 'pushup', 'push-up'], facets: [
      { label: 'Strength', why: 'building force', q: '"resistance training"[tiab] OR "strength training"[tiab]' },
      { label: 'Muscle growth', why: 'adding muscle', q: '"muscle hypertrophy"[tiab] OR "skeletal muscle"[tiab]' }
    ] },
    { sig: ['yoga', 'stretch', 'mobility', 'flexib'], facets: [
      { label: 'Flexibility', why: 'range of motion', q: '"flexibility"[tiab] OR "range of motion"[tiab]' },
      { label: 'Stress & anxiety', why: 'unwinding', q: '"yoga"[tiab] AND ("stress"[tiab] OR "anxiety"[tiab])' }
    ] },
    { sig: ['read', 'book', 'pages', 'reading'], facets: [
      { label: 'Reading comprehension', why: 'understanding more', q: '"reading comprehension"[tiab]' },
      { label: 'Vocabulary', why: 'words stick', q: '"vocabulary acquisition"[tiab]' },
      { label: 'Cognitive reserve', why: 'a sharper older brain', q: '"cognitive reserve"[tiab] OR "cognitive decline"[tiab]' }
    ] },
    { sig: ['code', 'program', 'leetcode', 'develop', 'software', 'ship'], facets: [
      { label: 'Problem solving', why: 'untangling hard problems', q: '"complex problem solving"[tiab] OR "problem solving"[tiab]' },
      { label: 'Deliberate practice', why: 'getting better on purpose', q: '"deliberate practice"[tiab] OR "skill acquisition"[tiab]' },
      { label: 'Deep focus', why: 'flow & concentration', q: '"cognitive control"[tiab] OR "flow state"[tiab]' }
    ] },
    { sig: ['language', 'vocab', 'duolingo', 'spanish', 'french', 'german', 'japanese', 'mandarin', 'korean'], facets: [
      { label: 'Language learning', why: 'a second language', q: '"second language acquisition"[tiab]' },
      { label: 'Spaced repetition', why: 'remembering long-term', q: '"spaced repetition"[tiab] OR "spaced learning"[tiab]' }
    ] },
    { sig: ['guitar', 'piano', 'music', 'instrument', 'sing', 'violin', 'drum'], facets: [
      { label: 'Motor learning', why: 'training the hands', q: '"motor sequence learning"[tiab] OR "motor skill learning"[tiab]' },
      { label: 'Auditory processing', why: 'a trained ear', q: '"music training"[tiab] OR "auditory processing"[tiab]' }
    ] },
    { sig: ['draw', 'sketch', 'paint', 'art', 'design'], facets: [
      { label: 'Visual perception', why: 'seeing accurately', q: '"visual perception"[tiab]' },
      { label: 'Creativity', why: 'generating ideas', q: '"divergent thinking"[tiab] OR "creativity"[tiab]' }
    ] },
    { sig: ['sleep', 'lights out', 'bed', 'wake'], facets: [
      { label: 'Sleep quality', why: 'deeper rest', q: '"sleep quality"[tiab] OR "sleep hygiene"[tiab]' },
      { label: 'Circadian rhythm', why: 'a steady body clock', q: '"circadian rhythm"[tiab]' },
      { label: 'Memory consolidation', why: 'sleep locks in learning', q: '"sleep dependent memory"[tiab] OR "memory consolidation"[tiab]' }
    ] },
    { sig: ['water', 'hydrat', 'drink'], facets: [
      { label: 'Hydration', why: 'fluid balance', q: '"hydration"[tiab] OR "water intake"[tiab]' },
      { label: 'Cognition', why: 'staying sharp', q: '"dehydration"[tiab] AND "cognition"[tiab]' }
    ] },
    { sig: ['journal', 'gratitude', 'diary'], facets: [
      { label: 'Wellbeing', why: 'feeling good', q: '"gratitude"[tiab] OR "subjective well-being"[tiab]' },
      { label: 'Expressive writing', why: 'processing emotions', q: '"expressive writing"[tiab]' }
    ] },
    { sig: ['diet', 'eat', 'nutrition', 'veg', 'fasting', 'sugar', 'calorie'], facets: [
      { label: 'Nutrition', why: 'fueling well', q: '"dietary intervention"[tiab] OR "dietary pattern"[tiab]' },
      { label: 'Metabolic health', why: 'steadier energy', q: '"metabolic health"[tiab] OR "insulin sensitivity"[tiab]' }
    ] }
  ];

  function text(h) {
    if (!h) return '';
    return (String(h.name || '') + ' ' + ((h.keywords || []).join(' '))).toLowerCase();
  }

  /* the skills the map infers from a habit's name + keywords */
  function suggest(h) {
    const t = text(h);
    const out = [], seen = {};
    MAP.forEach(g => {
      if (g.sig.some(s => t.indexOf(s) >= 0)) {
        g.facets.forEach(fct => { if (!seen[fct.label]) { seen[fct.label] = 1; out.push(fct); } });
      }
    });
    return out;
  }

  /* a habit with no mapped skills still gets one honest, tightly-scoped facet */
  function fallback(h) {
    const kw = (h.keywords && h.keywords[0]) || h.name || 'habits';
    return [{ label: kw, why: '', q: '"' + String(kw).replace(/"/g, '') + '"[tiab]', generic: true }];
  }

  /* fill in a query for user-typed custom skills that don't carry one */
  function norm(fct) {
    return {
      label: fct.label,
      why: fct.why || '',
      q: fct.q || ('"' + String(fct.label).replace(/"/g, '') + '"[tiab]'),
      generic: !!fct.generic
    };
  }

  /* the effective skills Discover should search: user overrides win, else auto */
  function facetsFor(h) {
    if (h && h.facets && h.facets.length) return h.facets.map(norm);
    const s = suggest(h);
    return (s.length ? s : fallback(h)).map(norm);
  }

  return { MAP, suggest, fallback, facetsFor };
})();
