export interface RuleChunk {
  id: string;
  docId: string;
  section: string;
  articleCode: string;
  title: string;
  ruleText: string;
  examples: string[];
  rawBlock: string;
  order: number;
  pageNumber?: number;
}

export interface SparseVector {
  [term: string]: number;
}

export interface IndexedChunk {
  chunk: RuleChunk;
  stemVec: SparseVector;
  bigramVec: SparseVector;
  char3Vec: SparseVector;
  conceptVec: number[];
  surfaceTokens: string[];
  stemToSurface: Map<string, string[]>;
  normalizedSearchBlob: string;
}

export interface VectorIndex {
  docId: string;
  docTitle: string;
  chunks: IndexedChunk[];
  vocabSize: number;
  conceptDimensionCount: number;
  idf: Map<string, number>;
  bigramIdf: Map<string, number>;
  indexedAtMs: number;
}

export interface SearchBreakdown {
  lexical: number;
  semantic: number;
  subword: number;
  bigram: number;
}

export interface SearchResult {
  chunk: RuleChunk;
  concordance: number; // 0 to 100
  rawCosine: number; // 0 to 1
  breakdown: SearchBreakdown;
  matchedTerms: string[];
  matchedConcepts: string[];
  exactPhrasesMatched: string[];
}

const FRENCH_STOPWORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l', 'au', 'aux',
  'et', 'ou', 'où', 'à', 'en', 'dans', 'par', 'pour', 'sur', 'sous', 'avec',
  'sans', 'est', 'sont', 'être', 'été', 'avoir', 'a', 'ont', 'fait', 'faire',
  'peut', 'peuvent', 'doit', 'doivent', 'si', 'que', 'qu', 'qui', 'quoi',
  'quel', 'quelle', 'quels', 'quelles', 'comment', 'quand', 'combien', 'pourquoi',
  'ce', 'cet', 'cette', 'ces', 'se', 'sa', 'son', 'ses', 'leur', 'leurs',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'notre', 'nos', 'votre', 'vos',
  'ne', 'n', 'pas', 'plus', 'moins', 'très', 'tout', 'tous', 'toute', 'toutes',
  'autre', 'autres', 'entre', 'chez', 'vers', 'lors', 'avant', 'après', 'pendant',
  'comme', 'ainsi', 'donc', 'mais', 'car', 'ni', 'y', 'enfin', 'aussi', 'même',
  'il', 'elle', 'ils', 'elles', 'on', 'nous', 'vous', 'je', 'tu', 'me', 'te',
  'celui', 'celle', 'ceux', 'celles', 'dont', 'jusqu', 'depuis', 'chaque', 'aucun',
  'aucune', 'cas', 'règle', 'regle', 'règles', 'regles', 'point', 'article', 'section',
]);

// Important 2-letter JDR acronyms & dice prefixes that must NEVER be filtered out
const KEEP_SHORT_TOKENS = new Set([
  'pv', 'dd', 'ca', 'pa', 'pm', 'pe', 'pf', 'mj', 'pj', 'xp', 'px', 'pc', 'po',
  'd4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'san', 'js', 'cc', 'ct',
]);

interface SemanticConcept {
  id: string;
  label: string;
  roots: string[];
}

// Latent French semantic concept dimensions (general rules + specialized tabletop RPG / JDR lexicon & VO terms)
const SEMANTIC_CONCEPTS: SemanticConcept[] = [
  {
    id: 'jdr_tests_dice',
    label: 'JDR · Tests, Jets & Difficulté',
    roots: [
      'test', 'jet', 'competenc', 'caracteristiqu', 'attribut', 'dd', 'seuil', 'difficult',
      'reussit', 'echec', 'critiqu', 'maladress', 'fumbl', 'avantag', 'desavantag',
      'relanc', 'forc', 'push', 'pouss', 'oppos', 'sauvegard', 'saving', 'throw',
      'modificateur', 'bonus', 'malus', 'de', 'des', 'lancer', 'resultat', 'marge',
    ],
  },
  {
    id: 'jdr_combat_actions',
    label: 'JDR · Combat, Actions & Opportunité',
    roots: [
      'combat', 'attaqu', 'action', 'gratu', 'react', 'opportunit', 'initiativ',
      'surpris', 'embuscad', 'round', 'tour', 'desengag', 'esquiv', 'par', 'ripost',
      'lutt', 'agripp', 'grappl', 'bouscul', 'renvers', 'feint', 'vis', 'mele', 'corps',
      'touch', 'degat', 'critiqu', 'flanqu', 'charge', 'allong', 'deux', 'arm',
    ],
  },
  {
    id: 'jdr_conditions',
    label: 'JDR · États & Conditions',
    roots: [
      'etat', 'condition', 'terr', 'prone', 'etourdi', 'stun', 'aveugl', 'blind',
      'assourd', 'entrav', 'paraly', 'empoison', 'effray', 'peur', 'charm', 'invisibl',
      'inconscient', 'epuis', 'fatigu', 'ralenti', 'immobilis', 'neutralis', 'statut',
    ],
  },
  {
    id: 'jdr_health_stress',
    label: 'JDR · Santé, Mort & Stress',
    roots: [
      'pv', 'vie', 'bless', 'grav', 'agoni', 'mourant', 'mort', 'stabilis', 'soin',
      'gueris', 'repos', 'court', 'long', 'recuper', 'stress', 'paniqu', 'foli',
      'mental', 'san', 'traumat', 'humanit', 'cyberpsychos', 'seuil', 'contre',
    ],
  },
  {
    id: 'jdr_magic_tech',
    label: 'JDR · Magie, Pouvoirs & Cybernétique',
    roots: [
      'sort', 'magi', 'incant', 'emplac', 'niveau', 'mana', 'psi', 'pouvoir',
      'concentr', 'rituel', 'composant', 'port', 'zon', 'con', 'spher', 'ray',
      'dissip', 'contresort', 'implant', 'cybernetiqu', 'pirat', 'netrun', 'iem', 'surcharg',
    ],
  },
  {
    id: 'jdr_stealth_vision',
    label: 'JDR · Discrétion, Vision & Couvert',
    roots: [
      'discret', 'furtiv', 'stealth', 'cach', 'percept', 'detect', 'observ', 'lumier',
      'obscur', 'penombr', 'tenebr', 'vision', 'nocturn', 'infravision', 'lign', 'vue',
      'visibl', 'couvert', 'abri', 'obstacl', 'ombr', 'brouillard', 'dissimul',
    ],
  },
  {
    id: 'jdr_gear_encumbrance',
    label: 'JDR · Équipement, Armures & Encombrement',
    roots: [
      'equip', 'inventair', 'encombr', 'charg', 'poid', 'forc', 'munit', 'recharg',
      'cadenc', 'rafal', 'armur', 'ca', 'protect', 'boucli', 'repar', 'artisan',
      'prix', 'credit', 'piec', 'objet', 'magiqu', 'harmon', 'port', 'degat',
    ],
  },
  {
    id: 'movement',
    label: 'Déplacement, Chute & Exploration',
    roots: [
      'deplac', 'mouv', 'boug', 'avanc', 'recul', 'distanc', 'cas', 'metr', 'pas',
      'trajet', 'vites', 'sprint', 'cour', 'franch', 'terrain', 'difficil', 'chut',
      'saut', 'escalad', 'grimp', 'nag', 'poursuit', 'voyag', 'camp', 'pieg', 'crochet',
    ],
  },
  {
    id: 'priority_exception',
    label: 'Priorité & Exceptions',
    roots: [
      'priorit', 'except', 'conflit', 'contradict', 'prim', 'restrict', 'interdict',
      'permiss', 'annul', 'derog', 'specif', 'general', 'impos', 'contourn', 'cumul',
    ],
  },
  {
    id: 'victory_tie',
    label: 'Victoire, Objectifs & Départage',
    roots: [
      'victoir', 'gagn', 'perdr', 'fin', 'parti', 'score', 'point', 'objectif',
      'egalit', 'departag', 'ex', 'aequo', 'classement', 'podium', 'vainqueur',
    ],
  },
  {
    id: 'setup_deployment',
    label: 'Mise en place & Création',
    roots: [
      'mis', 'plac', 'deploi', 'plateau', 'zon', 'prepar', 'install', 'materiel',
      'compos', 'depart', 'initial', 'creat', 'personnag', 'historiqu', 'class',
    ],
  },
  {
    id: 'time_clock',
    label: 'Temps, Durée & Délais',
    roots: [
      'temp', 'dure', 'delai', 'minut', 'second', 'heur', 'chronometr', 'horair',
      'paus', 'prolong', 'retard', 'expir', 'ech', 'scen', 'quart', 'journ',
    ],
  },
  {
    id: 'foul_penalty',
    label: 'Fautes & Sanctions',
    roots: [
      'faut', 'penal', 'sanction', 'avert', 'carton', 'disqualif', 'exclus', 'expuls',
      'infract', 'manqu', 'amende', 'retrait', 'forfait',
    ],
  },
  {
    id: 'referee_appeal',
    label: 'Arbitrage & Réclamations',
    roots: [
      'arbitr', 'jug', 'decis', 'reclam', 'appel', 'litig', 'contest', 'vide',
      'verif', 'officiel', 'rapport', 'protest', 'mj', 'maitr',
    ],
  },
  {
    id: 'team_players',
    label: 'Groupe, Équipe & Alliés',
    roots: [
      'equip', 'joueur', 'membr', 'remplac', 'substit', 'capitain', 'effectif',
      'alli', 'pj', 'pnj', 'compagnon', 'familier', 'montur', 'aid', 'cooper',
    ],
  },
];

export function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeFrenchWord(raw: string): string {
  const clean = stripAccents(raw.toLowerCase()).replace(/[^a-z0-9+\-]/g, '');
  if (clean.length <= 2) return clean;
  if (/^\d*d\d+$/.test(clean) || /^[+\-]\d+$/.test(clean)) return clean;

  let stem = clean;
  const suffixes = [
    'issements', 'issement', 'ations', 'ation', 'itions', 'ition',
    'ements', 'ement', 'euses', 'euse', 'eurs', 'eur', 'istes', 'iste',
    'antes', 'ante', 'ants', 'ant', 'ables', 'able', 'ibles', 'ible',
    'ieres', 'iere', 'iers', 'ier', 'ences', 'ence', 'ances', 'ance',
    'aient', 'eront', 'erent', 'eriez', 'erons', 'iront',
    'ees', 'ee', 'es', 'er', 'ir', 're', 'ez', 'ons', 'ent', 'aux', 'eaux',
  ];

  for (const suffix of suffixes) {
    if (stem.length > suffix.length + 2 && stem.endsWith(suffix)) {
      stem = stem.slice(0, -suffix.length);
      break;
    }
  }

  if (stem.length > 4 && (stem.endsWith('s') || stem.endsWith('x'))) {
    stem = stem.slice(0, -1);
  }
  if (stem.length > 4 && stem.endsWith('e')) {
    stem = stem.slice(0, -1);
  }

  return stem;
}

interface TokenPair {
  surface: string;
  stem: string;
}

export function tokenizeFrench(text: string): TokenPair[] {
  // Capture words, dice formulas (2d6, 1d10+2), signed modifiers (+2, -5), and thresholds
  const rawMatches =
    text.match(/[+\-]?\d+d\d+(?:[+\-]\d+)?|[+\-]\d+|[A-Za-zÀ-ÖØ-öø-ÿ0-9]+/g) || [];
  const tokens: TokenPair[] = [];

  for (const raw of rawMatches) {
    const lowerNoAccent = stripAccents(raw.toLowerCase());
    if (lowerNoAccent.length < 2 && !/^\d+$/.test(lowerNoAccent)) continue;

    if (
      !KEEP_SHORT_TOKENS.has(lowerNoAccent) &&
      (FRENCH_STOPWORDS.has(raw.toLowerCase()) || FRENCH_STOPWORDS.has(lowerNoAccent))
    ) {
      continue;
    }

    // Dice notation expansion: "2d6+3" -> keeps "2d6+3", base "2d6", and die "d6"
    const diceMatch = lowerNoAccent.match(/^(\d*)(d\d+)([+\-]\d+)?$/);
    if (diceMatch) {
      tokens.push({ surface: raw, stem: lowerNoAccent });
      if (diceMatch[1] && diceMatch[2]) {
        tokens.push({ surface: raw, stem: `${diceMatch[1]}${diceMatch[2]}` });
        tokens.push({ surface: raw, stem: diceMatch[2] });
      }
      continue;
    }

    const stem = normalizeFrenchWord(raw);
    if (stem.length >= 2 || /^\d+$/.test(stem)) {
      tokens.push({ surface: raw, stem });
    }
  }

  // Compound JDR pairs like "DD 15" -> "dd_15", "CA 18" -> "ca_18"
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i].stem;
    const nxt = tokens[i + 1].stem;
    if ((cur === 'dd' || cur === 'ca' || cur === 'seuil' || cur === 'niveau') && /^\d+$/.test(nxt)) {
      tokens.push({
        surface: `${tokens[i].surface} ${tokens[i + 1].surface}`,
        stem: `${cur}_${nxt}`,
      });
    }
  }

  return tokens;
}

function buildChar3Grams(tokens: TokenPair[]): SparseVector {
  const counts: SparseVector = {};
  for (const { surface } of tokens) {
    const clean = `_${stripAccents(surface.toLowerCase())}_`;
    if (clean.length < 4) continue;
    for (let i = 0; i <= clean.length - 3; i++) {
      const gram = clean.slice(i, i + 3);
      counts[gram] = (counts[gram] || 0) + 1;
    }
  }
  return l2Normalize(counts);
}

function buildConceptVector(tokens: TokenPair[]): { vec: number[]; matchedLabels: string[] } {
  const vec = new Array<number>(SEMANTIC_CONCEPTS.length).fill(0);
  const matchedLabels: string[] = [];

  for (let cIdx = 0; cIdx < SEMANTIC_CONCEPTS.length; cIdx++) {
    const concept = SEMANTIC_CONCEPTS[cIdx];
    let score = 0;
    for (const { surface, stem } of tokens) {
      const clean = stripAccents(surface.toLowerCase());
      for (const root of concept.roots) {
        if (
          stem === root ||
          stem.startsWith(root) ||
          clean.startsWith(root) ||
          (root.length >= 4 && clean.includes(root))
        ) {
          score += 1;
          break;
        }
      }
    }
    if (score > 0) {
      vec[cIdx] = 1 + Math.log(score);
      matchedLabels.push(concept.label);
    }
  }

  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] = vec[i] / norm;
    }
  }

  return { vec, matchedLabels };
}

function l2Normalize(vec: SparseVector): SparseVector {
  let sumSq = 0;
  for (const key in vec) {
    sumSq += vec[key] * vec[key];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  const normalized: SparseVector = {};
  for (const key in vec) {
    normalized[key] = vec[key] / norm;
  }
  return normalized;
}

function sparseCosine(a: SparseVector, b: SparseVector): number {
  let dot = 0;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length <= keysB.length) {
    for (const k of keysA) {
      if (b[k] !== undefined) dot += a[k] * b[k];
    }
  } else {
    for (const k of keysB) {
      if (a[k] !== undefined) dot += a[k] * b[k];
    }
  }
  return Math.max(0, Math.min(1, dot));
}

function denseCosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return Math.max(0, Math.min(1, dot));
}

function extractPageNumberFromText(text: string): number | undefined {
  const match = text.match(/(?:\(|^|\b)(?:Page|p\.)\s*(\d{1,4})\b/i);
  if (match) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

/**
 * Parses a raw Markdown or plain-text French rulebook into structured RuleChunks
 * with automatic separation of rule prose, concrete examples, and PDF page numbers.
 */
export function parseRuleDocument(rawText: string, docId: string): RuleChunk[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const chunks: RuleChunk[] = [];

  let currentSection = 'Dispositions générales';
  let currentArticleCode = '';
  let currentTitle = '';
  let currentPageNumber: number | undefined = undefined;
  let bufferLines: string[] = [];
  let order = 0;

  const flushBuffer = () => {
    const joined = bufferLines.join('\n').trim();
    if (!joined) {
      bufferLines = [];
      return;
    }

    const paragraphs = joined.split(/\n{2,}/);
    const ruleParagraphs: string[] = [];
    const examples: string[] = [];

    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const isExample = /^(?:exemples?|cas pratique|illustration)\s*[:—-]/i.test(
        stripAccents(trimmed)
      );
      if (isExample) {
        examples.push(
          trimmed
            .replace(/^(?:Exemples?|Cas pratique|Illustration)\s*[:—-]\s*/i, '')
            .trim()
        );
      } else {
        const subLines = trimmed.split('\n');
        const subRule: string[] = [];
        let collectingExample = false;
        const subEx: string[] = [];
        for (const sl of subLines) {
          if (
            /^(?:[-*•]\s*)?(?:exemples?|cas pratique|illustration)\s*[:—-]/i.test(
              stripAccents(sl.trim())
            )
          ) {
            collectingExample = true;
            subEx.push(
              sl
                .trim()
                .replace(
                  /^(?:[-*•]\s*)?(?:Exemples?|Cas pratique|Illustration)\s*[:—-]\s*/i,
                  ''
                )
                .trim()
            );
          } else if (collectingExample) {
            subEx.push(sl.trim());
          } else {
            subRule.push(sl);
          }
        }
        if (subRule.length > 0) ruleParagraphs.push(subRule.join('\n').trim());
        if (subEx.length > 0) examples.push(subEx.join(' ').trim());
      }
    }

    const ruleText = ruleParagraphs.join('\n\n').trim() || joined;
    const title = currentTitle || `Point réglementaire ${order + 1}`;
    const code =
      currentArticleCode ||
      (currentPageNumber ? `p. ${currentPageNumber}` : `Art. ${order + 1}`);

    const inferredPage =
      currentPageNumber ??
      extractPageNumberFromText(title) ??
      extractPageNumberFromText(currentSection);

    chunks.push({
      id: `${docId}::chunk-${order}`,
      docId,
      section: currentSection,
      articleCode: code,
      title,
      ruleText,
      examples,
      rawBlock: joined,
      order,
      pageNumber: inferredPage,
    });
    order++;
    bufferLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushBuffer();
      currentSection = h1Match[1].trim();
      const pNum = extractPageNumberFromText(currentSection);
      if (pNum) currentPageNumber = pNum;
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushBuffer();
      currentSection = h2Match[1].trim();
      const pNum = extractPageNumberFromText(currentSection);
      if (pNum) currentPageNumber = pNum;
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    const articleMatch = trimmed.match(
      /^(?:Article|Art\.|Règle|Regle|Section|§)\s*([0-9]+(?:\.[0-9]+)*)\s*[:—\-–.]\s*(.+)$/i
    );

    if (h3Match) {
      flushBuffer();
      const fullHeader = h3Match[1].trim();
      const pNum = extractPageNumberFromText(fullHeader);
      if (pNum) currentPageNumber = pNum;

      const pageHeaderMatch = fullHeader.match(/^Page\s+(\d+)\s*[—\-–·]\s*(.+)$/i);
      const codeSplit = fullHeader.match(
        /^((?:Art\.?|Article|Règle|§)?\s*[0-9]+(?:\.[0-9]+)*)\s*[:—\-–·]\s*(.+)$/i
      );

      if (pageHeaderMatch) {
        currentArticleCode = `p. ${pageHeaderMatch[1]}`;
        currentTitle = pageHeaderMatch[2].trim();
      } else if (codeSplit) {
        currentArticleCode = codeSplit[1].trim();
        currentTitle = codeSplit[2].trim();
      } else {
        currentArticleCode = pNum ? `p. ${pNum}` : `Art. ${order + 1}`;
        currentTitle = fullHeader;
      }
      continue;
    }

    if (articleMatch) {
      flushBuffer();
      currentArticleCode = `Art. ${articleMatch[1].trim()}`;
      currentTitle = articleMatch[2].trim();
      const pNum = extractPageNumberFromText(currentTitle);
      if (pNum) currentPageNumber = pNum;
      continue;
    }

    bufferLines.push(line);
  }

  flushBuffer();

  // Fallback for plain text with no headings
  if (chunks.length === 1 && chunks[0].ruleText.length > 750) {
    const single = chunks[0];
    const paras = single.rawBlock.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    if (paras.length > 1) {
      const splitChunks: RuleChunk[] = [];
      let idx = 0;
      for (let i = 0; i < paras.length; i++) {
        const p = paras[i].trim();
        if (
          splitChunks.length > 0 &&
          /^(?:exemples?|cas pratique|illustration)\s*[:—-]/i.test(stripAccents(p))
        ) {
          splitChunks[splitChunks.length - 1].examples.push(
            p
              .replace(/^(?:Exemples?|Cas pratique|Illustration)\s*[:—-]\s*/i, '')
              .trim()
          );
          continue;
        }
        const firstSentence = p.split(/[.!?\n]/)[0].slice(0, 68).trim();
        splitChunks.push({
          id: `${docId}::chunk-${idx}`,
          docId,
          section: single.section,
          articleCode: `§ ${idx + 1}`,
          title: firstSentence + (firstSentence.length >= 68 ? '…' : ''),
          ruleText: p,
          examples: [],
          rawBlock: p,
          order: idx,
          pageNumber: single.pageNumber,
        });
        idx++;
      }
      return splitChunks;
    }
  }

  return chunks;
}

/**
 * Builds an in-memory multi-space vector index for all rule chunks.
 */
export function buildVectorIndex(
  docId: string,
  docTitle: string,
  chunks: RuleChunk[]
): VectorIndex {
  const start = performance.now();
  const N = Math.max(1, chunks.length);

  const df = new Map<string, number>();
  const bigramDf = new Map<string, number>();

  interface RawChunkTokens {
    chunk: RuleChunk;
    titleTokens: TokenPair[];
    sectionTokens: TokenPair[];
    bodyTokens: TokenPair[];
    exampleTokens: TokenPair[];
    allTokens: TokenPair[];
    bigrams: string[];
  }

  const parsed: RawChunkTokens[] = chunks.map((chunk) => {
    const titleTokens = tokenizeFrench(chunk.title);
    const sectionTokens = tokenizeFrench(chunk.section);
    const bodyTokens = tokenizeFrench(chunk.ruleText);
    const exampleTokens = tokenizeFrench(chunk.examples.join(' '));
    const allTokens = [...titleTokens, ...sectionTokens, ...bodyTokens, ...exampleTokens];

    const uniqueStems = new Set(allTokens.map((t) => t.stem));
    for (const s of uniqueStems) {
      df.set(s, (df.get(s) || 0) + 1);
    }

    const bigrams: string[] = [];
    const uniqueBigrams = new Set<string>();
    const addBigrams = (list: TokenPair[]) => {
      for (let i = 0; i < list.length - 1; i++) {
        const bg = `${list[i].stem}_${list[i + 1].stem}`;
        bigrams.push(bg);
        uniqueBigrams.add(bg);
      }
    };
    addBigrams(titleTokens);
    addBigrams(bodyTokens);
    addBigrams(exampleTokens);

    for (const bg of uniqueBigrams) {
      bigramDf.set(bg, (bigramDf.get(bg) || 0) + 1);
    }

    return {
      chunk,
      titleTokens,
      sectionTokens,
      bodyTokens,
      exampleTokens,
      allTokens,
      bigrams,
    };
  });

  const idf = new Map<string, number>();
  for (const [stem, freq] of df.entries()) {
    idf.set(stem, Math.log(1 + (N - freq + 0.5) / (freq + 0.5)) + 0.35);
  }

  const bigramIdf = new Map<string, number>();
  for (const [bg, freq] of bigramDf.entries()) {
    bigramIdf.set(bg, Math.log(1 + (N - freq + 0.5) / (freq + 0.5)) + 0.5);
  }

  const indexedChunks: IndexedChunk[] = parsed.map((p) => {
    const weightedTf: SparseVector = {};
    const stemToSurface = new Map<string, string[]>();

    const accumulate = (list: TokenPair[], weight: number) => {
      for (const { surface, stem } of list) {
        weightedTf[stem] = (weightedTf[stem] || 0) + weight;
        const arr = stemToSurface.get(stem) || [];
        if (!arr.includes(surface)) {
          arr.push(surface);
          stemToSurface.set(stem, arr);
        }
      }
    };

    accumulate(p.titleTokens, 2.2);
    accumulate(p.sectionTokens, 1.3);
    accumulate(p.bodyTokens, 1.0);
    accumulate(p.exampleTokens, 0.85);

    const tfidf: SparseVector = {};
    for (const stem in weightedTf) {
      const sublinearTf = 1 + Math.log(weightedTf[stem]);
      tfidf[stem] = sublinearTf * (idf.get(stem) || 1);
    }

    const bgTf: SparseVector = {};
    for (const bg of p.bigrams) {
      bgTf[bg] = (bgTf[bg] || 0) + 1;
    }
    const bgTfidf: SparseVector = {};
    for (const bg in bgTf) {
      bgTfidf[bg] = (1 + Math.log(bgTf[bg])) * (bigramIdf.get(bg) || 1);
    }

    const char3Vec = buildChar3Grams(p.allTokens);
    const { vec: conceptVec } = buildConceptVector(p.allTokens);

    const normalizedSearchBlob = stripAccents(
      `${p.chunk.title} ${p.chunk.section} ${p.chunk.ruleText} ${p.chunk.examples.join(' ')}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
    );

    return {
      chunk: p.chunk,
      stemVec: l2Normalize(tfidf),
      bigramVec: l2Normalize(bgTfidf),
      char3Vec,
      conceptVec,
      surfaceTokens: p.allTokens.map((t) => t.surface),
      stemToSurface,
      normalizedSearchBlob,
    };
  });

  const elapsed = Math.max(1, Math.round(performance.now() - start));

  return {
    docId,
    docTitle,
    chunks: indexedChunks,
    vocabSize: df.size,
    conceptDimensionCount: SEMANTIC_CONCEPTS.length,
    idf,
    bigramIdf,
    indexedAtMs: elapsed,
  };
}

/**
 * Extracts exact phrases wrapped in "..." or « ... » from the user's query.
 */
export function parseQueryPhrases(query: string): {
  exactPhrases: string[];
  freeText: string;
} {
  const exactPhrases: string[] = [];
  const freeText = query
    .replace(/["«]([^"»]+)["»]/g, (_, inner: string) => {
      const cleaned = inner.trim();
      if (cleaned.length >= 2) exactPhrases.push(cleaned);
      return ` ${cleaned} `;
    })
    .trim();

  return { exactPhrases, freeText };
}

/**
 * Queries the vector index using multi-space cosine similarity + optional exact
 * quoted-phrase filtering and returns ranked answers with concordance percentages.
 */
export function searchVectorIndex(
  index: VectorIndex,
  query: string,
  minConcordance = 14,
  limit = 6,
  allowedSections?: string[]
): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { exactPhrases, freeText } = parseQueryPhrases(trimmed);
  const qTokens = tokenizeFrench(freeText || trimmed);
  if (qTokens.length === 0 && exactPhrases.length === 0) return [];

  // Parse comma-separated thematic segments (e.g., "combat, couvert, ligne de vue")
  const rawSegments = (freeText || trimmed)
    .split(',')
    .map((s) => tokenizeFrench(s.trim()))
    .filter((toks) => toks.length > 0);
  const hasMultipleThemes = rawSegments.length >= 2;

  const qTf: SparseVector = {};
  for (const { stem } of qTokens) {
    qTf[stem] = (qTf[stem] || 0) + 1;
  }
  const qStemVec: SparseVector = {};
  for (const stem in qTf) {
    const idfVal = index.idf.get(stem) ?? Math.log(1 + index.chunks.length + 0.5);
    qStemVec[stem] = (1 + Math.log(qTf[stem])) * idfVal;
  }
  const normQStem = l2Normalize(qStemVec);

  const qBgTf: SparseVector = {};
  for (let i = 0; i < qTokens.length - 1; i++) {
    const bg = `${qTokens[i].stem}_${qTokens[i + 1].stem}`;
    qBgTf[bg] = (qBgTf[bg] || 0) + 1;
  }
  const qBgVec: SparseVector = {};
  for (const bg in qBgTf) {
    const idfVal = index.bigramIdf.get(bg) ?? 1.5;
    qBgVec[bg] = (1 + Math.log(qBgTf[bg])) * idfVal;
  }
  const normQBg = l2Normalize(qBgVec);

  const normQChar3 = buildChar3Grams(qTokens);
  const { vec: qConceptVec, matchedLabels: qConceptLabels } = buildConceptVector(qTokens);

  const normalizedExactPhrases = exactPhrases.map((p) =>
    stripAccents(p.toLowerCase().replace(/\s+/g, ' ').trim())
  );

  const allowedSet =
    allowedSections && allowedSections.length > 0 ? new Set(allowedSections) : null;

  const results: SearchResult[] = [];

  for (const item of index.chunks) {
    if (allowedSet && !allowedSet.has(item.chunk.section)) {
      continue;
    }

    // Enforce exact phrase match if user wrapped terms in "..."
    if (normalizedExactPhrases.length > 0) {
      const allPhrasesMatch = normalizedExactPhrases.every((phrase) =>
        item.normalizedSearchBlob.includes(phrase)
      );
      if (!allPhrasesMatch) continue;
    }

    const lexicalCos = sparseCosine(normQStem, item.stemVec);
    const bigramCos = Object.keys(normQBg).length > 0 ? sparseCosine(normQBg, item.bigramVec) : 0;
    const subwordCos = sparseCosine(normQChar3, item.char3Vec);
    const semanticCos = denseCosine(qConceptVec, item.conceptVec);

    const hasBigrams = Object.keys(normQBg).length > 0;
    const rawCosine = hasBigrams
      ? lexicalCos * 0.44 + semanticCos * 0.24 + subwordCos * 0.18 + bigramCos * 0.14
      : lexicalCos * 0.50 + semanticCos * 0.28 + subwordCos * 0.22;

    if (
      exactPhrases.length === 0 &&
      lexicalCos === 0 &&
      semanticCos < 0.2 &&
      subwordCos < 0.12
    ) {
      continue;
    }

    // Thematic coverage bonus when user separates concepts with commas
    let themeBoost = 0;
    if (hasMultipleThemes) {
      let coveredCount = 0;
      for (const segTokens of rawSegments) {
        const segLexMatch = segTokens.some((t) => item.stemToSurface.has(t.stem));
        if (segLexMatch) {
          coveredCount++;
        } else {
          const { vec: segConceptVec } = buildConceptVector(segTokens);
          if (denseCosine(segConceptVec, item.conceptVec) >= 0.35) {
            coveredCount++;
          }
        }
      }
      const coverageRatio = coveredCount / rawSegments.length;
      themeBoost = coverageRatio >= 1 ? 0.16 : coverageRatio * 0.08;
    }

    const exactBoost = exactPhrases.length > 0 ? 0.24 : 0;
    const amplified = 1 - Math.exp(-3.45 * (rawCosine + exactBoost + themeBoost));
    const exactTitleBonus = qTokens.some((qt) =>
      tokenizeFrench(item.chunk.title).some((tt) => tt.stem === qt.stem)
    )
      ? 0.08
      : 0;
    const concordance = Math.min(
      99.6,
      Math.max(0, Math.round((amplified + exactTitleBonus * (1 - amplified)) * 1000) / 10)
    );

    if (exactPhrases.length === 0 && concordance < minConcordance) continue;

    const matchedTermSet = new Set<string>();
    for (const qt of qTokens) {
      const surfaces = item.stemToSurface.get(qt.stem);
      if (surfaces) {
        for (const s of surfaces) matchedTermSet.add(s);
      }
    }
    for (const phrase of exactPhrases) {
      for (const word of phrase.split(/\s+/)) {
        if (word.length >= 2) matchedTermSet.add(word);
      }
    }

    const { matchedLabels: docConceptLabels } = buildConceptVector(
      tokenizeFrench(`${item.chunk.title} ${item.chunk.ruleText}`)
    );
    const sharedConcepts = qConceptLabels.filter((lbl) => docConceptLabels.includes(lbl));

    results.push({
      chunk: item.chunk,
      concordance,
      rawCosine: Math.round(rawCosine * 1000) / 1000,
      breakdown: {
        lexical: Math.round(lexicalCos * 100),
        semantic: Math.round(semanticCos * 100),
        subword: Math.round(subwordCos * 100),
        bigram: Math.round(bigramCos * 100),
      },
      matchedTerms: Array.from(matchedTermSet),
      matchedConcepts: sharedConcepts,
      exactPhrasesMatched: exactPhrases,
    });
  }

  results.sort((a, b) => b.concordance - a.concordance || b.rawCosine - a.rawCosine);
  return results.slice(0, limit);
}
