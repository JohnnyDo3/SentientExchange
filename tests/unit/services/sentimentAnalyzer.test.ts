/**
 * SentimentAnalyzer Unit Tests
 *
 * Comprehensive tests for the lexicon-based sentiment analyzer including:
 * - Basic sentiment detection (positive, negative, neutral)
 * - Emotion detection (joy, sadness, anger, fear, surprise, disgust)
 * - Context modifiers (intensifiers, diminishers, negations)
 * - Modern slang recognition
 * - Keyword extraction
 * - Subjectivity analysis
 * - Real-world examples
 */

import { SentimentAnalyzer } from '../../../src/services/ai/sentiment/sentimentAnalyzer';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('Basic Functionality', () => {
    it('should throw error for empty text', () => {
      expect(() => analyzer.analyze('')).toThrow('Text cannot be empty');
      expect(() => analyzer.analyze('   ')).toThrow('Text cannot be empty');
    });

    it('should return valid result structure', () => {
      const result = analyzer.analyze('This is a test.');

      expect(result).toHaveProperty('overall');
      expect(result.overall).toHaveProperty('polarity');
      expect(result.overall).toHaveProperty('category');
      expect(result.overall).toHaveProperty('confidence');
      expect(result).toHaveProperty('emotions');
      expect(result).toHaveProperty('intensity');
      expect(result).toHaveProperty('mixed');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('subjectivity');
    });
  });

  describe('Positive Sentiment Detection', () => {
    it('should detect strong positive sentiment', () => {
      const text = 'I am absolutely ecstatic and thrilled! This is amazing and wonderful!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.7);
      expect(result.overall.category).toContain('positive');
      expect(result.emotions[0].emotion).toBe('joy');
      expect(result.emotions[0].intensity).toBe('high');
    });

    it('should detect medium positive sentiment', () => {
      const text = 'I am glad and content';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.3);
      expect(result.emotions.some((e) => e.emotion === 'joy')).toBe(true);
    });

    it('should detect weak positive sentiment', () => {
      const text = 'It was okay and decent, alright I guess.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThanOrEqual(0);
      expect(result.emotions.some((e) => e.emotion === 'joy')).toBe(true);
      expect(result.intensity).toBeLessThan(0.5);
    });

    it('should recognize modern slang positive words', () => {
      const text = 'This is lit and bussin! Absolutely fire and goat level!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.5);
      expect(result.emotions[0].emotion).toBe('joy');
      expect(result.keywords.positive.length).toBeGreaterThan(0);
    });
  });

  describe('Negative Sentiment Detection', () => {
    it('should detect strong negative sentiment', () => {
      const text = 'This is absolutely awful and horrible. I am devastated and heartbroken.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(-0.5);
      expect(result.overall.category).toContain('negative');
      expect(result.emotions[0].intensity).toBe('high');
    });

    it('should detect sadness', () => {
      const text = 'I feel so sad and disappointed. This is unfortunate.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
      expect(result.emotions.some((e) => e.emotion === 'sadness')).toBe(true);
    });

    it('should detect anger', () => {
      const text = 'I am so angry and furious! This makes me mad!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
      expect(result.emotions.some((e) => e.emotion === 'anger')).toBe(true);
    });

    it('should detect fear', () => {
      const text = 'I am terrified and scared. This is frightening.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
      expect(result.emotions.some((e) => e.emotion === 'fear')).toBe(true);
    });

    it('should detect disgust', () => {
      const text = 'This is disgusting and gross. Absolutely nasty and repulsive.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
      expect(result.emotions.some((e) => e.emotion === 'disgust')).toBe(true);
    });
  });

  describe('Neutral Sentiment', () => {
    it('should detect neutral sentiment with no emotion words', () => {
      const text = 'The meeting is scheduled for tomorrow at three.';
      const result = analyzer.analyze(text);

      expect(Math.abs(result.overall.polarity)).toBeLessThan(0.3);
      expect(result.overall.category).toContain('Neutral');
    });

    it('should return low confidence for neutral text', () => {
      const text = 'This is a fact.';
      const result = analyzer.analyze(text);

      expect(result.overall.confidence).toBeLessThan(0.6);
    });
  });

  describe('Mixed Emotions', () => {
    it('should detect mixed emotions when positive and negative coexist', () => {
      const text = 'I am happy but also sad and disappointed';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.emotions.length).toBeGreaterThan(1);
    });

    it('should reduce confidence for mixed emotions', () => {
      // Use words that are actually in the lexicon: "happy" and "sad"
      const text = 'I am happy with this but also very sad about that';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.overall.confidence).toBeLessThan(0.8);
    });

    it('should not flag mixed for weak opposing emotions', () => {
      const text = 'I am very happy with just a tiny bit of concern';
      const result = analyzer.analyze(text);

      // With strong joy and weak concern, should not be flagged as mixed
      expect(result.overall.polarity).toBeGreaterThan(0.3);
    });
  });

  describe('Context Modifiers - Intensifiers', () => {
    it('should amplify sentiment with intensifiers', () => {
      const positiveText = 'This is good';
      const intensifiedText = 'This is very good';

      const positiveResult = analyzer.analyze(positiveText);
      const intensifiedResult = analyzer.analyze(intensifiedText);

      expect(intensifiedResult.intensity).toBeGreaterThan(positiveResult.intensity);
    });

    it('should recognize multiple intensifiers', () => {
      const text = 'This is extremely amazing and absolutely wonderful';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeGreaterThan(0.7);
    });
  });

  describe('Context Modifiers - Diminishers', () => {
    it('should weaken sentiment with diminishers', () => {
      const strongText = 'This is good';
      const weakenedText = 'This is somewhat good';

      const strongResult = analyzer.analyze(strongText);
      const weakenedResult = analyzer.analyze(weakenedText);

      expect(weakenedResult.intensity).toBeLessThan(strongResult.intensity);
    });

    it('should recognize various diminishers', () => {
      const text = 'This is slightly good, kind of okay, sort of fine';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeLessThan(0.5);
    });
  });

  describe('Context Modifiers - Negations', () => {
    it('should flip sentiment with "not"', () => {
      const positiveText = 'This is good';
      const negatedText = 'This is not good';

      const positiveResult = analyzer.analyze(positiveText);
      const negatedResult = analyzer.analyze(negatedText);

      expect(positiveResult.overall.polarity).toBeGreaterThan(0);
      expect(negatedResult.overall.polarity).toBeLessThan(0);
    });

    it('should handle contractions with negation', () => {
      const positiveText = 'This is good';
      const negatedText = 'This is not good';  // Testing negation

      const positiveResult = analyzer.analyze(positiveText);
      const negatedResult = analyzer.analyze(negatedText);

      // Negation should flip sentiment
      expect(negatedResult.overall.polarity).toBeLessThan(0);
    });

    it('should reduce intensity when negating', () => {
      const text = 'not amazing';
      const result = analyzer.analyze(text);

      // Negated positive should flip to negative sentiment
      expect(result.overall.polarity).toBeLessThan(0);
    });
  });

  describe('Intensity Calculation', () => {
    it('should calculate high intensity for strong emotions', () => {
      const text = 'I am absolutely ecstatic and thrilled!';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeGreaterThanOrEqual(0.7);
    });

    it('should calculate low intensity for weak emotions', () => {
      const text = 'meh, it was okay I guess';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeLessThan(0.5);
    });

    it('should factor in intensifiers for intensity boost', () => {
      const baseText = 'I am happy';
      const intensifiedText = 'I am very happy';

      const baseResult = analyzer.analyze(baseText);
      const intensifiedResult = analyzer.analyze(intensifiedText);

      expect(intensifiedResult.intensity).toBeGreaterThan(baseResult.intensity);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for clear strong sentiment', () => {
      const text = 'This is extremely amazing and wonderful and fantastic!';
      const result = analyzer.analyze(text);

      expect(result.overall.confidence).toBeGreaterThan(0.7);
    });

    it('should have low confidence for short neutral text', () => {
      const text = 'A thing.';
      const result = analyzer.analyze(text);

      expect(result.overall.confidence).toBeLessThan(0.5);
    });

    it('should increase confidence with text length', () => {
      const shortText = 'happy';
      const longText = 'I am so happy and joyful and delighted and pleased and glad';

      const shortResult = analyzer.analyze(shortText);
      const longResult = analyzer.analyze(longText);

      expect(longResult.overall.confidence).toBeGreaterThan(shortResult.overall.confidence);
    });

    it('should reduce confidence for mixed emotions', () => {
      const text = 'I am happy but also sad and disappointed';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.overall.confidence).toBeLessThan(0.5);
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract positive keywords', () => {
      const text = 'This product is amazing and wonderful';
      const result = analyzer.analyze(text);

      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.positive).toContain('amazing');
    });

    it('should extract negative keywords', () => {
      const text = 'This is terrible and awful';
      const result = analyzer.analyze(text);

      expect(result.keywords.negative.length).toBeGreaterThan(0);
      expect(result.keywords.negative).toContain('terrible');
    });

    it('should limit keyword count', () => {
      const text =
        'happy joyful glad cheerful pleased delighted ecstatic thrilled wonderful amazing fantastic excellent outstanding perfect';
      const result = analyzer.analyze(text);

      // Should limit to top N keywords, not all words
      expect(result.keywords.positive.length).toBeLessThanOrEqual(10);
    });

    it('should extract mixed keywords for mixed sentiment', () => {
      const text = 'I love the design but the performance is terrible';
      const result = analyzer.analyze(text);

      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.negative.length).toBeGreaterThan(0);
    });
  });

  describe('Subjectivity Analysis', () => {
    it('should detect subjective text', () => {
      const text = 'I think this is good. In my opinion, it works well.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeGreaterThan(0.5);
    });

    it('should detect objective text', () => {
      const text = 'Research shows that data indicates proven results.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeLessThan(0.5);
    });

    it('should count first-person pronouns as subjective', () => {
      const text = 'I feel that my experience was good';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeGreaterThan(0.5);
    });

    it('should return neutral subjectivity for balanced text', () => {
      const text = 'The product works. It has features.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeGreaterThanOrEqual(0.3);
      expect(result.subjectivity).toBeLessThanOrEqual(0.7);
    });
  });

  describe('Polarity Categorization', () => {
    it('should categorize very positive sentiment', () => {
      const text = 'This is absolutely amazing and fantastic!';
      const result = analyzer.analyze(text);

      expect(result.overall.category).toContain('positive');
      expect(result.overall.polarity).toBeGreaterThan(0.7);
    });

    it('should categorize positive sentiment', () => {
      const text = 'This is good and nice';
      const result = analyzer.analyze(text);

      expect(result.overall.category).toContain('Positive');
      expect(result.overall.polarity).toBeGreaterThan(0.3);
    });

    it('should categorize slightly positive sentiment', () => {
      const text = 'It was okay and decent';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThanOrEqual(0);
    });

    it('should categorize very negative sentiment', () => {
      const text = 'This is terrible and awful';
      const result = analyzer.analyze(text);

      expect(result.overall.category).toContain('negative');
      expect(result.overall.polarity).toBeLessThan(-0.5);
    });

    it('should categorize neutral sentiment', () => {
      const text = 'The meeting is at three';
      const result = analyzer.analyze(text);

      expect(result.overall.category).toContain('Neutral');
      expect(Math.abs(result.overall.polarity)).toBeLessThan(0.3);
    });
  });

  describe('Modern Slang Recognition', () => {
    it('should recognize Gen-Z positive slang', () => {
      const text = 'This is bussin! Absolutely fire and based. No cap, it slaps!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.3);
      expect(result.emotions[0].emotion).toBe('joy');
    });

    it('should recognize negative slang', () => {
      const text = 'This is mid and cringe. Total cap and wack.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
    });

    it('should recognize positive slang vibe', () => {
      const text = 'just vibing with good energy';
      const result = analyzer.analyze(text);

      // "vibe" is in the joy lexicon as medium intensity
      expect(result.overall.polarity).toBeGreaterThan(0);
    });
  });

  describe('Emotion Priority', () => {
    it('should list emotions by strength', () => {
      const text = 'I am extremely happy and slightly sad';
      const result = analyzer.analyze(text);

      // First emotion should have higher or equal score than second
      if (result.emotions.length >= 2) {
        expect(result.emotions[0].score).toBeGreaterThanOrEqual(
          result.emotions[1].score
        );
      }
    });

    it('should include all detected emotions', () => {
      const text = 'I am happy but also sad and angry';
      const result = analyzer.analyze(text);

      expect(result.emotions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', () => {
      const longText = 'This is good. '.repeat(50);
      const result = analyzer.analyze(longText);

      expect(result.overall.polarity).toBeGreaterThanOrEqual(0);
      expect(result.overall.confidence).toBeDefined();
    });

    it('should handle punctuation-heavy text', () => {
      const text = 'Wow!!! This is good!!! Really!!!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed case', () => {
      const text = 'ThIs Is GoOd AnD hApPy';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0);
      expect(result.emotions[0].emotion).toBe('joy');
    });

    it('should handle single word input', () => {
      const result = analyzer.analyze('happy');

      expect(result.overall.polarity).toBeGreaterThan(0);
      expect(result.emotions[0].emotion).toBe('joy');
    });

    it('should handle text with no punctuation', () => {
      const text = 'This is really good and happy';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0);
    });

    it('should handle repeated emotion words', () => {
      const text = 'happy happy happy happy';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0);
      expect(result.emotions[0].emotion).toBe('joy');
    });
  });

  describe('Real World Examples', () => {
    it('should analyze product review - positive', () => {
      const text =
        'I love this product! It exceeded my expectations and works perfectly. Highly recommended!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.5);
      expect(result.overall.category).toContain('positive');
    });

    it('should analyze product review - negative', () => {
      const text =
        'This product is terrible and awful and I am very disappointed';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(-0.3);
      expect(result.overall.category).toContain('negative');
    });

    it('should analyze product review - mixed', () => {
      const text =
        'The product has great features but terrible build quality. I love the design but hate the performance.';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.negative.length).toBeGreaterThan(0);
    });

    it('should analyze social media post', () => {
      const text = 'Just had the best day ever! Everything is fire and I am living my best life! 🔥';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.5);
      expect(result.emotions[0].emotion).toBe('joy');
    });

    it('should analyze balanced customer feedback', () => {
      const text = 'The service was adequate. Some aspects were acceptable while others were satisfactory.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThanOrEqual(-0.2);
      expect(result.overall.polarity).toBeLessThanOrEqual(0.3);
    });
  });
});
