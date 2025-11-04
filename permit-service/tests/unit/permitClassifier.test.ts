/**
 * Permit Classifier Tests
 * Tests for AI and rule-based permit classification
 */

import { PermitClassifier } from '../../src/services/permitClassifier';
import { PermitInfoRequest } from '../../src/utils/validation';

describe('Permit Classifier', () => {
  let classifier: PermitClassifier;

  beforeAll(() => {
    classifier = new PermitClassifier();
  });

  describe('Rule-based Classification', () => {
    it('should classify residential replacement correctly', async () => {
      const request: PermitInfoRequest = {
        equipmentType: 'furnace',
        jobType: 'replacement',
        btu: 80000,
        tonnage: 3,
        location: {
          address: '123 Main St',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33602',
        },
        propertyType: 'residential',
      };

      const result = await classifier.classify(request);

      expect(result.permitCategory).toBe('hvac-residential-replacement');
      expect(result.accelaPermitType).toBe('BLD-HVAC-RES-REPL');
      expect(result.estimatedComplexity).toBe('simple');
    });

    it('should classify new installation correctly', async () => {
      const request: PermitInfoRequest = {
        equipmentType: 'hvac-system',
        jobType: 'new-installation',
        tonnage: 4,
        location: {
          address: '456 Oak Ave',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33606',
        },
        propertyType: 'residential',
      };

      const result = await classifier.classify(request);

      expect(result.permitCategory).toBe('hvac-residential-new');
      expect(result.accelaPermitType).toBe('BLD-HVAC-RES-NEW');
      expect(result.estimatedComplexity).toBe('moderate');
      expect(result.specialConsiderations[0]).toContain('Manual J');
    });

    it('should classify commercial permits correctly', async () => {
      const request: PermitInfoRequest = {
        equipmentType: 'ac-unit',
        jobType: 'replacement',
        tonnage: 10,
        location: {
          address: '789 Business Blvd',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33610',
        },
        propertyType: 'commercial',
      };

      const result = await classifier.classify(request);

      expect(result.permitCategory).toBe('hvac-commercial');
      expect(result.accelaPermitType).toBe('BLD-HVAC-COM');
      expect(result.estimatedComplexity).toBe('complex');
      expect(result.specialConsiderations.length).toBeGreaterThan(0);
    });

    it('should classify ductwork permits correctly', async () => {
      const request: PermitInfoRequest = {
        equipmentType: 'ductwork',
        jobType: 'modification',
        location: {
          address: '321 Elm St',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33612',
        },
        propertyType: 'residential',
      };

      const result = await classifier.classify(request);

      expect(result.permitCategory).toBe('hvac-residential-ductwork');
      expect(result.accelaPermitType).toBe('BLD-MECH-DUCTWORK');
      expect(result.estimatedComplexity).toBe('moderate');
    });

    it('should flag large systems', async () => {
      const request: PermitInfoRequest = {
        equipmentType: 'heat-pump',
        jobType: 'replacement',
        tonnage: 6,
        location: {
          address: '555 Large Ave',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33614',
        },
      };

      const result = await classifier.classify(request);

      expect(result.specialConsiderations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Large system'),
        ])
      );
    });
  });
});
