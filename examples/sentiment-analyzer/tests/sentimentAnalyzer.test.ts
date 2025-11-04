import { SentimentAnalyzer } from '../src/services/sentimentAnalyzer';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('Basic Sentiment Analysis', () => {
    test('should analyze very positive text', () => {
      const text = 'I am absolutely thrilled and ecstatic about this amazing opportunity!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0.5);
      expect(result.overall.category).toContain('positive');
      expect(result.emotions.length).toBeGreaterThan(0);
      expect(result.emotions[0].emotion).toBe('joy');
    });

    test('should analyze very negative text', () => {
      const text = 'I am absolutely devastated and furious about this terrible situation.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(-0.5);
      expect(result.overall.category).toContain('negative');
      expect(result.emotions.length).toBeGreaterThan(0);
      expect(['sadness', 'anger']).toContain(result.emotions[0].emotion);
    });

    test('should analyze neutral text', () => {
      const text = 'The meeting is scheduled for tomorrow at 3 PM.';
      const result = analyzer.analyze(text);

      expect(Math.abs(result.overall.polarity)).toBeLessThan(0.2);
      expect(result.overall.category).toBe('Neutral');
    });
  });

  describe('Mixed Emotions', () => {
    test('should detect mixed emotions', () => {
      const text = 'I am happy about the promotion but sad to leave my team.';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.overall.category).toBe('Mixed emotions');

      const emotionTypes = result.emotions.map(e => e.emotion);
      expect(emotionTypes).toContain('joy');
      expect(emotionTypes).toContain('sadness');
    });

    test('should not flag pure positive as mixed', () => {
      const text = 'Everything is wonderful and amazing!';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(false);
    });
  });

  describe('Intensity Measurement', () => {
    test('should detect high intensity with strong words', () => {
      const text = 'I am extremely furious and absolutely outraged!';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeGreaterThan(0.7);
      expect(result.emotions[0].intensity).toBe('high');
    });

    test('should detect low intensity with weak words', () => {
      const text = 'I am slightly bothered by this.';
      const result = analyzer.analyze(text);

      expect(result.intensity).toBeLessThan(0.5);
    });

    test('should boost intensity with intensifiers', () => {
      const text1 = 'I am happy.';
      const text2 = 'I am very extremely happy.';

      const result1 = analyzer.analyze(text1);
      const result2 = analyzer.analyze(text2);

      expect(result2.intensity).toBeGreaterThan(result1.intensity);
    });
  });

  describe('Context Awareness', () => {
    test('should handle negations', () => {
      const text = 'I am not happy about this.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(0);
    });

    test('should handle intensifiers', () => {
      const text1 = 'This is good.';
      const text2 = 'This is very good.';

      const result1 = analyzer.analyze(text1);
      const result2 = analyzer.analyze(text2);

      expect(result2.intensity).toBeGreaterThan(result1.intensity);
    });

    test('should handle diminishers', () => {
      const text1 = 'This is terrible.';
      const text2 = 'This is somewhat terrible.';

      const result1 = analyzer.analyze(text1);
      const result2 = analyzer.analyze(text2);

      expect(Math.abs(result2.overall.polarity)).toBeLessThan(Math.abs(result1.overall.polarity));
    });
  });

  describe('Emotion Detection', () => {
    test('should detect joy', () => {
      const text = 'I am so happy and delighted!';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'joy')).toBe(true);
    });

    test('should detect sadness', () => {
      const text = 'I feel heartbroken and miserable.';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'sadness')).toBe(true);
    });

    test('should detect anger', () => {
      const text = 'I am furious and outraged!';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'anger')).toBe(true);
    });

    test('should detect fear', () => {
      const text = 'I am terrified and anxious about this.';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'fear')).toBe(true);
    });

    test('should detect surprise', () => {
      const text = 'I am absolutely astonished and shocked!';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'surprise')).toBe(true);
    });

    test('should detect disgust', () => {
      const text = 'That is absolutely revolting and disgusting.';
      const result = analyzer.analyze(text);

      expect(result.emotions.some(e => e.emotion === 'disgust')).toBe(true);
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence for clear sentiment', () => {
      const text = 'This is absolutely wonderful and amazing in every way!';
      const result = analyzer.analyze(text);

      expect(result.overall.confidence).toBeGreaterThan(0.6);
    });

    test('should have low confidence for neutral text', () => {
      const text = 'The item is on the table.';
      const result = analyzer.analyze(text);

      expect(result.overall.confidence).toBeLessThan(0.5);
    });

    test('should have lower confidence for mixed emotions', () => {
      const text1 = 'I am very happy!';
      const text2 = 'I am happy but also sad.';

      const result1 = analyzer.analyze(text1);
      const result2 = analyzer.analyze(text2);

      expect(result2.overall.confidence).toBeLessThan(result1.overall.confidence);
    });
  });

  describe('Keyword Extraction', () => {
    test('should extract positive keywords', () => {
      const text = 'I am happy, delighted, and thrilled!';
      const result = analyzer.analyze(text);

      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.positive).toContain('happy');
    });

    test('should extract negative keywords', () => {
      const text = 'This is terrible, horrible, and awful.';
      const result = analyzer.analyze(text);

      expect(result.keywords.negative.length).toBeGreaterThan(0);
    });

    test('should limit keyword count', () => {
      const text = 'happy delighted thrilled ecstatic pleased glad cheerful content satisfied joyful elated overjoyed blissful'.repeat(5);
      const result = analyzer.analyze(text);

      expect(result.keywords.positive.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Subjectivity Analysis', () => {
    test('should detect subjective text', () => {
      const text = 'I think this is good. In my opinion, it works well.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeGreaterThan(0.5);
    });

    test('should detect objective text', () => {
      const text = 'Research shows that the data indicates a positive trend.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeLessThan(0.5);
    });

    test('should detect first-person pronouns as subjective', () => {
      const text = 'I believe we should do this. My opinion is that it works.';
      const result = analyzer.analyze(text);

      expect(result.subjectivity).toBeGreaterThan(0.5);
    });
  });

  describe('Edge Cases', () => {
    test('should throw error for empty text', () => {
      expect(() => analyzer.analyze('')).toThrow('Text cannot be empty');
    });

    test('should handle very long text', () => {
      const longText = 'I am happy. '.repeat(1000);
      const result = analyzer.analyze(longText);

      expect(result).toBeDefined();
      expect(result.overall.confidence).toBeGreaterThan(0);
    });

    test('should handle special characters', () => {
      const text = 'I am happy!!! 😊👍 #blessed @amazing';
      const result = analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.overall.polarity).toBeGreaterThan(0);
    });

    test('should handle multiple sentences', () => {
      const text = 'I am happy. But I am also sad. This is confusing.';
      const result = analyzer.analyze(text);

      expect(result).toBeDefined();
      expect(result.mixed).toBe(true);
    });
  });

  describe('Real-World Examples', () => {
    test('should analyze product review', () => {
      const text = 'This product exceeded my expectations! The quality is outstanding and the price is reasonable. However, shipping was slightly delayed. Overall, I\'m very satisfied with my purchase.';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeGreaterThan(0);
      expect(result.mixed).toBe(true); // Has both positive and slight negative
      expect(result.overall.confidence).toBeGreaterThan(0.5);
    });

    test('should analyze movie review', () => {
      const text = 'The movie was a complete disaster. Terrible acting, boring plot, and awful special effects. I want my money back!';
      const result = analyzer.analyze(text);

      expect(result.overall.polarity).toBeLessThan(-0.5);
      expect(result.intensity).toBeGreaterThan(0.6);
      expect(result.emotions[0].emotion).toMatch(/anger|disgust|sadness/);
    });

    test('should analyze customer service feedback', () => {
      const text = 'The representative was helpful and patient, but the wait time was frustrating. The issue was resolved eventually.';
      const result = analyzer.analyze(text);

      expect(result.mixed).toBe(true);
      expect(result.keywords.positive.length).toBeGreaterThan(0);
      expect(result.keywords.negative.length).toBeGreaterThan(0);
    });
  });
});
