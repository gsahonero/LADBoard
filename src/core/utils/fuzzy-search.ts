/**
 * Fuzzy Search & Diacritics-Insensitive Normalization Engine for LAD Board
 * Supports accent normalization (e.g. 'Más' <-> 'mas'), typo tolerance, token matching, and scoring.
 */

/**
 * Normalizes text for search by lowercasing, trimming, and stripping diacritics / accents.
 * e.g., "Más" -> "mas", "Médico" -> "medico", "Canción" -> "cancion"
 */
export function normalizeSearchString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Checks if a target string fuzzily matches the query string.
 * Returns a match score > 0 (higher is better match), or -1 if no match.
 */
export function fuzzyMatchScore(target: string, query: string): number {
  const normTarget = normalizeSearchString(target);
  const normQuery = normalizeSearchString(query);

  if (!normQuery) return 100;
  if (!normTarget) return -1;

  // Exact normalized match
  if (normTarget === normQuery) return 1000;

  // Prefix match
  if (normTarget.startsWith(normQuery)) return 500;

  // Substring match
  if (normTarget.includes(normQuery)) return 300;

  // Word-by-word token matching
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  const targetTokens = normTarget.split(/[\s,.;:/-]+/).filter(Boolean);

  let tokensMatched = 0;
  for (const qToken of queryTokens) {
    let matched = false;
    for (const tToken of targetTokens) {
      if (tToken.includes(qToken) || qToken.includes(tToken)) {
        matched = true;
        break;
      }
      // Typo tolerance if length >= 3
      if (qToken.length >= 3 && tToken.length >= 3) {
        const dist = levenshteinDistance(qToken, tToken);
        const maxAllowed = qToken.length > 5 ? 2 : 1;
        if (dist <= maxAllowed) {
          matched = true;
          break;
        }
      }
    }
    if (matched) tokensMatched++;
  }

  if (tokensMatched === queryTokens.length && tokensMatched > 0) {
    return 150 + tokensMatched * 10;
  }

  // Sequence fuzzy match (for longer queries where characters appear in sequence)
  if (normQuery.length >= 4) {
    let qIdx = 0;
    for (let tIdx = 0; tIdx < normTarget.length && qIdx < normQuery.length; tIdx++) {
      if (normTarget[tIdx] === normQuery[qIdx]) {
        qIdx++;
      }
    }
    if (qIdx === normQuery.length && normQuery.length / normTarget.length >= 0.5) {
      return 50 + (normQuery.length / normTarget.length) * 50;
    }
  }

  return -1;
}

/**
 * Helper to match an object against a query across multiple fields
 */
export function matchLADObject(
  obj: {
    title: string;
    description?: string;
    domain?: string;
    tags?: string[];
    assigned_to?: string;
    [key: string]: any;
  },
  query: string
): { matches: boolean; score: number } {
  if (!query || !query.trim()) return { matches: true, score: 0 };

  const scores: number[] = [
    fuzzyMatchScore(obj.title, query) * 2, // Title has highest weight
    obj.description ? fuzzyMatchScore(obj.description, query) : -1,
    obj.domain ? fuzzyMatchScore(obj.domain, query) * 1.5 : -1,
    obj.assigned_to ? fuzzyMatchScore(obj.assigned_to, query) * 1.2 : -1,
    ...(obj.tags?.map((t) => fuzzyMatchScore(t, query) * 1.5) || []),
  ];

  const maxScore = Math.max(...scores);
  return {
    matches: maxScore > 0,
    score: maxScore,
  };
}

/**
 * Filters and sorts an array of LAD objects based on fuzzy match score
 */
export function fuzzyFilterObjects<T extends {
  title: string;
  description?: string;
  domain?: string;
  tags?: string[];
  assigned_to?: string;
  [key: string]: any;
}>(items: T[], query: string): T[] {
  if (!query || !query.trim()) return items;

  const scored: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const { matches, score } = matchLADObject(item, query);
    if (matches) {
      scored.push({ item, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
