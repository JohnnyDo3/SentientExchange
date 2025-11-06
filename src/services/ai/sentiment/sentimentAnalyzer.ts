/**
 * Sophisticated Sentiment Analyzer
 *
 * **DEMO IMPLEMENTATION NOTE**: This is a lexicon-based proof-of-concept for the hackathon.
 * In production, this should use:
 * - Machine learning models (BERT, RoBERTa, sentiment transformers)
 * - LLM APIs (OpenAI, Claude, Hugging Face) for context-aware analysis
 * - Real-time trend detection from social media
 * - Continuous learning to adapt to evolving language and slang
 *
 * The current implementation demonstrates the x402 micropayment infrastructure,
 * not state-of-the-art NLP. The focus is on the payment protocol integration.
 *
 * Performs multi-dimensional sentiment analysis with:
 * - Emotion detection (joy, sadness, anger, fear, surprise, disgust)
 * - Sentiment polarity and intensity
 * - Confidence scoring
 * - Mixed emotion recognition
 * - Context-aware keyword extraction
 */

interface EmotionScore {
  emotion: string;
  score: number; // 0-1
  intensity: 'low' | 'medium' | 'high';
}

interface SentimentResult {
  overall: {
    polarity: number; // -1 (very negative) to +1 (very positive)
    category: string; // human-readable label
    confidence: number; // 0-1
  };
  emotions: EmotionScore[];
  intensity: number; // 0-1 (how strong the sentiment is)
  mixed: boolean; // true if multiple competing emotions detected
  keywords: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  subjectivity: number; // 0 (objective) to 1 (subjective)
}

// Emotion lexicons with intensity weights (including modern slang)
const EMOTION_LEXICON = {
  joy: {
    strong: [
      'ecstatic',
      'thrilled',
      'delighted',
      'overjoyed',
      'elated',
      'wonderful',
      'amazing',
      'fantastic',
      'excellent',
      'outstanding',
      'perfect',
      'love',
      'fire',
      'lit',
      'goat',
      'legendary',
      'epic',
      'blessed',
      'vibing',
      'hyped',
      'peak',
      'bussin',
      'slaps',
      'chef',
      'immaculate',
    ],
    medium: [
      'happy',
      'pleased',
      'glad',
      'cheerful',
      'content',
      'good',
      'great',
      'nice',
      'enjoy',
      'satisfied',
      'helpful',
      'patient',
      'reasonable',
      'dope',
      'cool',
      'awesome',
      'sick',
      'legit',
      'solid',
      'decent',
      'poggers',
      'based',
      'vibe',
      'king',
      'queen',
      'win',
    ],
    weak: [
      'ok',
      'fine',
      'decent',
      'alright',
      'satisfactory',
      'okay',
      'mid',
      'aight',
      'ight',
      'bet',
      'valid',
    ],
  },
  sadness: {
    strong: [
      'devastated',
      'heartbroken',
      'miserable',
      'depressed',
      'anguished',
      'awful',
      'horrible',
      'dreadful',
      'crushed',
      'destroyed',
      'wrecked',
      'dead',
      'rip',
    ],
    medium: [
      'sad',
      'unhappy',
      'disappointed',
      'blue',
      'melancholy',
      'unfortunate',
      'sucks',
      'bummer',
      'rough',
      'tough',
      'harsh',
      'oof',
      'pain',
      'crying',
    ],
    weak: ['down', 'bummed', 'let down', 'subdued', 'meh', 'bleh', 'yikes'],
  },
  anger: {
    strong: [
      'furious',
      'enraged',
      'livid',
      'outraged',
      'incensed',
      'pissed',
      'heated',
      'tilted',
      'seething',
      'raging',
    ],
    medium: [
      'angry',
      'mad',
      'annoyed',
      'frustrated',
      'irritated',
      'salty',
      'triggered',
      'pressed',
      'heated',
      'sus',
    ],
    weak: [
      'bothered',
      'irked',
      'peeved',
      'displeased',
      'frustrating',
      'bruh',
      'smh',
    ],
  },
  fear: {
    strong: ['terrified', 'petrified', 'horrified', 'panicked', 'nightmare'],
    medium: [
      'afraid',
      'scared',
      'worried',
      'anxious',
      'nervous',
      'sketchy',
      'sus',
      'creepy',
      'spooky',
    ],
    weak: ['uneasy', 'concerned', 'apprehensive', 'uncertain', 'iffy', 'sus'],
  },
  surprise: {
    strong: [
      'astonished',
      'astounded',
      'shocked',
      'stunned',
      'shook',
      'shooketh',
      'wild',
      'insane',
      'crazy',
      'unreal',
      'unbelievable',
    ],
    medium: [
      'surprised',
      'amazed',
      'startled',
      'unexpected',
      'exceeded',
      'whoa',
      'wow',
      'damn',
      'wtf',
      'bruh',
    ],
    weak: ['curious', 'interested', 'intrigued', 'huh', 'wait', 'hmm'],
  },
  disgust: {
    strong: [
      'revolted',
      'repulsed',
      'sickened',
      'disgusted',
      'revolting',
      'disgusting',
      'vile',
      'nasty',
      'foul',
      'trash',
      'garbage',
      'toxic',
      'cringe',
    ],
    medium: [
      'distasteful',
      'unpleasant',
      'gross',
      'nasty',
      'terrible',
      'bad',
      'awful',
      'yuck',
      'ew',
      'nasty',
      'sus',
      'mid',
      'cap',
      'cringe',
      'wack',
      'lame',
    ],
    weak: [
      'off-putting',
      'disagreeable',
      'unappealing',
      'boring',
      'meh',
      'nah',
      'nope',
    ],
  },
};

// Context modifiers that affect sentiment
const INTENSIFIERS = [
  'very',
  'extremely',
  'incredibly',
  'absolutely',
  'totally',
  'really',
];
const DIMINISHERS = [
  'somewhat',
  'slightly',
  'a bit',
  'kind of',
  'sort of',
  'barely',
];
const NEGATIONS = ['not', 'never', "n't", 'no', 'neither', 'nor', 'hardly'];

// Subjective vs objective indicators
const SUBJECTIVE_INDICATORS = [
  'i think',
  'i feel',
  'in my opinion',
  'personally',
  'i believe',
];
const OBJECTIVE_INDICATORS = [
  'research shows',
  'data indicates',
  'studies suggest',
  'evidence',
  'proven',
];

export class SentimentAnalyzer {
  /**
   * Analyze sentiment with multi-dimensional scoring
   */
  analyze(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

    // Detect emotions
    const emotions = this.detectEmotions(normalizedText, words);

    // Calculate polarity
    const polarity = this.calculatePolarity(emotions);

    // Extract keywords
    const keywords = this.extractKeywords(normalizedText, words);

    // Calculate intensity (how strong are the sentiments)
    const intensity = this.calculateIntensity(words, emotions);

    // Check for mixed emotions (conflicting sentiments)
    const mixed = this.detectMixedEmotions(emotions);

    // Calculate confidence based on clarity of sentiment
    const confidence = this.calculateConfidence(emotions, mixed, words.length);

    // Calculate subjectivity
    const subjectivity = this.calculateSubjectivity(normalizedText, words);

    // Determine category
    const category = this.categorizePolarity(polarity, intensity, mixed);

    return {
      overall: {
        polarity,
        category,
        confidence,
      },
      emotions,
      intensity,
      mixed,
      keywords,
      subjectivity,
    };
  }

  private detectEmotions(text: string, words: string[]): EmotionScore[] {
    const emotionScores: {
      [key: string]: { total: number; count: number; maxIntensity: number };
    } = {};

    // Initialize emotion trackers
    Object.keys(EMOTION_LEXICON).forEach((emotion) => {
      emotionScores[emotion] = { total: 0, count: 0, maxIntensity: 0 };
    });

    // Emotion opposites for negation
    const emotionOpposites: { [key: string]: string } = {
      joy: 'sadness',
      sadness: 'joy',
      anger: 'joy',
      fear: 'joy',
      disgust: 'joy',
      surprise: 'surprise', // Surprise doesn't flip
    };

    // Scan for emotion words with context
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : '';
      const nextWord = i < words.length - 1 ? words[i + 1] : '';

      // Check for negation (flips sentiment)
      const isNegated = NEGATIONS.includes(prevWord);

      // Check for intensifiers/diminishers
      const hasIntensifier = INTENSIFIERS.includes(prevWord);
      const hasDiminisher = DIMINISHERS.includes(prevWord);

      // Match against emotion lexicons
      for (const [emotion, intensities] of Object.entries(EMOTION_LEXICON)) {
        let matchedIntensity = 0;

        if (intensities.strong.includes(word)) matchedIntensity = 1.0;
        else if (intensities.medium.includes(word)) matchedIntensity = 0.6;
        else if (intensities.weak.includes(word)) matchedIntensity = 0.3;

        if (matchedIntensity > 0) {
          // Apply context modifiers
          if (hasIntensifier)
            matchedIntensity = Math.min(1.0, matchedIntensity * 1.3);
          if (hasDiminisher) matchedIntensity *= 0.6;

          // Handle negation by flipping to opposite emotion
          let targetEmotion = emotion;
          if (isNegated) {
            targetEmotion = emotionOpposites[emotion];
            matchedIntensity *= 0.7; // Negation weakens intensity
          }

          emotionScores[targetEmotion].total += matchedIntensity;
          emotionScores[targetEmotion].count += 1;
          emotionScores[targetEmotion].maxIntensity = Math.max(
            emotionScores[targetEmotion].maxIntensity,
            matchedIntensity
          );
        }
      }
    }

    // Convert to EmotionScore array
    const emotions: EmotionScore[] = Object.entries(emotionScores)
      .filter(([_, data]) => data.count > 0)
      .map(([emotion, data]) => {
        const avgScore = data.total / Math.max(data.count, 1);
        const normalizedScore = Math.min(1.0, avgScore);

        let intensity: 'low' | 'medium' | 'high';
        if (normalizedScore >= 0.7) intensity = 'high';
        else if (normalizedScore >= 0.4) intensity = 'medium';
        else intensity = 'low';

        return {
          emotion,
          score: Math.round(normalizedScore * 100) / 100,
          intensity,
        };
      })
      .sort((a, b) => b.score - a.score);

    return emotions;
  }

  private calculatePolarity(emotions: EmotionScore[]): number {
    if (emotions.length === 0) return 0;

    const positiveEmotions = ['joy', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];

    let positiveScore = 0;
    let negativeScore = 0;

    emotions.forEach(({ emotion, score }) => {
      if (positiveEmotions.includes(emotion)) {
        positiveScore += score;
      } else if (negativeEmotions.includes(emotion)) {
        negativeScore += score;
      }
    });

    // Normalize to -1 to +1 range
    const totalScore = positiveScore + negativeScore;
    if (totalScore === 0) return 0;

    const polarity = (positiveScore - negativeScore) / totalScore;
    return Math.round(polarity * 100) / 100;
  }

  private calculateIntensity(
    words: string[],
    emotions: EmotionScore[]
  ): number {
    if (emotions.length === 0) return 0;

    // Base intensity on strongest emotion
    const maxEmotionScore = Math.max(...emotions.map((e) => e.score));

    // Factor in intensifiers
    const intensifierCount = words.filter((w) =>
      INTENSIFIERS.includes(w)
    ).length;
    const intensifierBoost = Math.min(0.2, intensifierCount * 0.05);

    const intensity = Math.min(1.0, maxEmotionScore + intensifierBoost);
    return Math.round(intensity * 100) / 100;
  }

  private detectMixedEmotions(emotions: EmotionScore[]): boolean {
    if (emotions.length < 2) return false;

    const positiveEmotions = ['joy', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];

    const hasPositive = emotions.some(
      (e) => positiveEmotions.includes(e.emotion) && e.score > 0.3
    );
    const hasNegative = emotions.some(
      (e) => negativeEmotions.includes(e.emotion) && e.score > 0.3
    );

    return hasPositive && hasNegative;
  }

  private calculateConfidence(
    emotions: EmotionScore[],
    mixed: boolean,
    wordCount: number
  ): number {
    if (emotions.length === 0) return 0.2; // Low confidence for neutral text

    // Base confidence on dominant emotion strength
    const dominantScore = emotions[0]?.score || 0;

    // Reduce confidence for mixed emotions
    const mixedPenalty = mixed ? 0.2 : 0;

    // Reduce confidence for very short texts
    const lengthBonus = Math.min(0.2, wordCount / 100);

    const confidence = Math.max(
      0.1,
      Math.min(1.0, dominantScore - mixedPenalty + lengthBonus)
    );
    return Math.round(confidence * 100) / 100;
  }

  private extractKeywords(
    text: string,
    words: string[]
  ): { positive: string[]; negative: string[]; neutral: string[] } {
    const positive: Set<string> = new Set();
    const negative: Set<string> = new Set();
    const neutral: Set<string> = new Set();

    // Extract emotion-bearing words
    words.forEach((word) => {
      for (const [emotion, intensities] of Object.entries(EMOTION_LEXICON)) {
        const allWords = [
          ...intensities.strong,
          ...intensities.medium,
          ...intensities.weak,
        ];
        if (allWords.includes(word)) {
          if (['joy', 'surprise'].includes(emotion)) {
            positive.add(word);
          } else if (
            ['sadness', 'anger', 'fear', 'disgust'].includes(emotion)
          ) {
            negative.add(word);
          }
        }
      }
    });

    // Common neutral words (filtered from stopwords)
    const commonNeutral = [
      'thing',
      'something',
      'anything',
      'everything',
      'nothing',
    ];
    words.forEach((word) => {
      if (
        commonNeutral.includes(word) &&
        !positive.has(word) &&
        !negative.has(word)
      ) {
        neutral.add(word);
      }
    });

    return {
      positive: Array.from(positive).slice(0, 10),
      negative: Array.from(negative).slice(0, 10),
      neutral: Array.from(neutral).slice(0, 5),
    };
  }

  private calculateSubjectivity(text: string, words: string[]): number {
    let subjectiveCount = 0;
    let objectiveCount = 0;

    SUBJECTIVE_INDICATORS.forEach((indicator) => {
      if (text.includes(indicator)) subjectiveCount++;
    });

    OBJECTIVE_INDICATORS.forEach((indicator) => {
      if (text.includes(indicator)) objectiveCount++;
    });

    // First-person pronouns indicate subjectivity
    const firstPersonCount = words.filter((w) =>
      ['i', 'me', 'my', 'mine', 'we', 'our', 'us'].includes(w)
    ).length;
    subjectiveCount += firstPersonCount;

    const total = subjectiveCount + objectiveCount;
    if (total === 0) return 0.5; // Neutral

    const subjectivity = subjectiveCount / total;
    return Math.round(Math.min(1.0, subjectivity) * 100) / 100;
  }

  private categorizePolarity(
    polarity: number,
    intensity: number,
    mixed: boolean
  ): string {
    if (mixed) {
      return 'Mixed emotions';
    }

    if (Math.abs(polarity) < 0.1) {
      return 'Neutral';
    }

    const isPositive = polarity > 0;

    if (intensity >= 0.7) {
      return isPositive ? 'Very positive' : 'Very negative';
    } else if (intensity >= 0.4) {
      return isPositive ? 'Positive' : 'Negative';
    } else {
      return isPositive ? 'Slightly positive' : 'Slightly negative';
    }
  }
}
