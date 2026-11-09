import { dropOverlapping, findAll, has } from '../patterns.js';
import type { Finding, HostCategory, RuleOutcome, Sentence, Severity, Term } from '../types.js';

interface Category {
  id: HostCategory;
  label: string;
  severity: Severity;
  cues: RegExp[];
}

// Brand names are case-sensitive on purpose ("Railway", "Azure", "Firebase" are also ordinary words or names).
const CATEGORIES: Category[] = [
  {
    id: 'cloud',
    label: 'cloud and hosting',
    severity: 'High',
    cues: [
      /\bhosting\b/gi,
      /\bhosted\s+(?:on|by|with)\b/gi,
      /\bcloud\s+(?:hosting|services?|infrastructure|costs?)\b/gi,
      /\bserver\s+costs?\b/gi,
      /\binfrastructure\s+costs?\b/gi,
      /\b(?:AWS|Azure|GCP|Vercel|Netlify|Railway|Heroku|DigitalOcean|Cloudflare|Firebase|Supabase)\b/g,
      /\bAmazon\s+Web\s+Services\b/g,
      /\bGoogle\s+Cloud\b/g,
    ],
  },
  {
    id: 'ai',
    label: 'AI and model API',
    severity: 'High',
    cues: [
      /\b(?:OpenAI|Anthropic|Gemini)\b/g,
      /\bGPT(?:-?\d\w*)?\b/g,
      /\bLLMs?\b/g,
      /\bAI\s+APIs?\b/g,
      /\bmodel\s+APIs?\b/gi,
      /\b(?:token|inference)\s+(?:costs?|usage|fees)\b/gi,
    ],
  },
  {
    id: 'messaging',
    label: 'messaging',
    severity: 'High',
    cues: [
      /\bSMS\b/g,
      /\btext\s+messag(?:ing|es)\b/gi,
      /\bemail\s+delivery\b/gi,
      /\btransactional\s+emails?\b/gi,
      /\b(?:SendGrid|Mailgun|Twilio)\b/g,
    ],
  },
  {
    id: 'domain',
    label: 'domain and certificate',
    severity: 'Medium',
    cues: [/\bdomain\s+names?\b/gi, /\bdomain\s+registration\b/gi, /\bDNS\b/g, /\bSSL\s+certificates?\b/gi],
  },
  {
    id: 'licences',
    label: 'licence and subscription',
    severity: 'Medium',
    cues: [
      /\bthird[- ]party\s+licen[cs]es?\b/gi,
      /\bsoftware\s+licen[cs]es?\b/gi,
      /\bSaaS\b/g,
      /\bsubscriptions?\b/gi,
    ],
  },
  {
    id: 'store',
    label: 'app store and developer account',
    severity: 'Medium',
    cues: [/\bApp\s+Store\b/g, /\bGoogle\s+Play\b/g, /\bApple\s+Developer\b/g, /\bdeveloper\s+accounts?\b/gi],
  },
  {
    id: 'api',
    label: 'paid third-party API',
    severity: 'Medium',
    cues: [
      /\bGoogle\s+Maps\b/g,
      /\bMapbox\b/g,
      /\bthird[- ]party\s+APIs?\b/gi,
      /\bthird[- ]party\s+services?\b/gi,
    ],
  },
];

/** Senses that look like a cue but are not a paid service. */
const EXCLUSIONS: RegExp[] = [
  /\bdomain[- ](?:driven|model|models|knowledge|expert\w*|specific|logic)\b/gi,
  /\bopen[- ]source\s+(?:software\s+)?licen[cs]es?\b/gi,
  /\bcloud[- ]native\b/gi,
];

/** Words that assign a cost to a party. Either party counts; the rule only needs a payer to be stated. */
const ASSIGNMENT_RE = new RegExp(
  [
    '\\bbilled\\s+(?:directly\\s+)?to\\b',
    '\\bcharged\\s+(?:directly\\s+)?to\\b',
    '\\bpaid\\s+(?:directly\\s+)?by\\b',
    '\\bresponsible\\s+for\\b',
    "\\bat\\s+the\\s+client['\\u2019]?s\\s+expense\\b",
    "\\b(?:client|customer)['\\u2019]?s?\\s+(?:own\\s+)?(?:\\w+\\s+)?account\\b",
    '\\bpass(?:ed)?[- ]?through\\b',
    '\\bpassed\\s+through\\b',
    '\\breimburs\\w+',
    '\\bincluded\\s+in\\s+(?:the\\s+)?(?:[\\w-]+\\s+){0,2}(?:fee|price|quote|retainer|rate)\\b',
    '\\bwe\\s+(?:will\\s+)?(?:cover|pay|absorb|bear)\\b',
    '\\b(?:the\\s+)?(?:client|customer)\\s+(?:will\\s+)?(?:pays?|covers?|provides?|supplies|owns|bears?|is\\s+responsible)\\b',
  ].join('|'),
  'i',
);

/** A generic cost term that, with an assignment phrase, covers every category. */
const GENERIC_RE = new RegExp(
  [
    '\\bthird[- ]party\\s+(?:service\\s+)?(?:costs?|services?|fees?|APIs?|charges)\\b',
    '\\ball\\s+(?:infrastructure|usage|service|running|operating|external|hosting)\\s+(?:and\\s+\\w+(?:[- ]\\w+)?\\s+)?costs?\\b',
    '\\ball\\s+costs\\b',
    '\\bany\\s+(?:fees|costs)\\b',
    '\\bservice\\s+costs?\\b',
  ].join('|'),
  'i',
);

const WHY = 'Usage-based services can cost more than expected, and with no stated payer the cost can land on you.';

function suggestion(label: string): string {
  return `State who pays for ${label} costs, for example: ${label} costs are billed to the client's account at cost, or are included in the fee of [amount].`;
}

/** HOST-02: a paid third-party service is named, and nothing says who pays for that kind of cost. */
export function checkHost02(sentences: Sentence[]): RuleOutcome {
  // Per sentence: category cues (minus excluded senses) and whether it states a payer.
  const perSentence = sentences.map((s) => {
    const excluded = EXCLUSIONS.flatMap((re) => findAll(re, s.masked));
    const byCategory = new Map<HostCategory, Term[]>();
    for (const cat of CATEGORIES) {
      const terms = dropOverlapping(
        cat.cues.flatMap((re) => findAll(re, s.masked)),
        excluded,
      ).sort((a, b) => a.start - b.start);
      if (terms.length > 0) byCategory.set(cat.id, terms);
    }
    const assigns = has(ASSIGNMENT_RE, s.masked);
    const generic = assigns && has(GENERIC_RE, s.masked);
    return { s, byCategory, assigns, generic };
  });

  const findings: Finding[] = [];
  let sawCue = false;

  for (const cat of CATEGORIES) {
    const withCue = perSentence.filter((p) => p.byCategory.has(cat.id));
    if (withCue.length === 0) continue;
    sawCue = true;
    const covered = perSentence.some((p) => p.generic || (p.assigns && p.byCategory.has(cat.id)));
    if (covered) continue;

    const first = withCue[0];
    if (!first) continue;
    const terms = first.byCategory.get(cat.id) as Term[];
    findings.push({
      ruleId: 'HOST-02',
      severity: cat.severity,
      sentence: first.s.text,
      start: first.s.start,
      end: first.s.end,
      terms: terms.map((t) => ({
        text: first.s.text.slice(t.start, t.end),
        start: first.s.start + t.start,
        end: first.s.start + t.end,
      })),
      why: WHY,
      suggestion: suggestion(cat.label),
      category: cat.id,
    });
  }

  return {
    findings,
    status: findings.length > 0 ? 'findings' : sawCue ? 'passed' : 'not applicable',
  };
}
