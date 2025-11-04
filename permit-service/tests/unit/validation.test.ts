/**
 * Validation Tests
 * Tests for Zod schema validation
 */

import {
  validatePermitInfo,
  validateFormGenerator,
  sanitizeInput,
} from '../../src/utils/validation';

describe('Permit Info Validation', () => {
  it('should validate correct permit info request', () => {
    const validRequest = {
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

    const result = validatePermitInfo(validRequest);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(validRequest);
  });

  it('should reject invalid equipment type', () => {
    const invalidRequest = {
      equipmentType: 'invalid-type',
      jobType: 'replacement',
      location: {
        address: '123 Main St',
        city: 'Tampa',
        county: 'hillsborough',
        zipCode: '33602',
      },
    };

    const result = validatePermitInfo(invalidRequest);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Must be one of');
  });

  it('should reject invalid zip code', () => {
    const invalidRequest = {
      equipmentType: 'furnace',
      jobType: 'replacement',
      location: {
        address: '123 Main St',
        city: 'Tampa',
        county: 'hillsborough',
        zipCode: 'invalid',
      },
    };

    const result = validatePermitInfo(invalidRequest);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const minimalRequest = {
      equipmentType: 'ac-unit',
      jobType: 'new-installation',
      location: {
        address: '456 Oak Ave',
        city: 'Tampa',
        county: 'hillsborough',
        zipCode: '33606',
      },
    };

    const result = validatePermitInfo(minimalRequest);
    expect(result.success).toBe(true);
  });
});

describe('Form Generator Validation', () => {
  it('should validate complete form generator request', () => {
    const validRequest = {
      permitInfo: {
        equipmentType: 'heat-pump',
        jobType: 'replacement',
        tonnage: 3.5,
        location: {
          address: '789 Pine Rd',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33610',
        },
      },
      contractor: {
        name: 'HVAC Pros LLC',
        phone: '(813) 555-1234',
        email: 'info@hvacpros.com',
        licenseNumber: 'CAC123456',
      },
      property: {
        ownerName: 'John Doe',
        ownerPhone: '(813) 555-5678',
      },
      equipmentDetails: {
        manufacturer: 'Carrier',
        model: '24ACC636A003',
        efficiency: 'SEER 16',
      },
      installation: {
        estimatedStartDate: '2025-02-01',
        estimatedCost: 5500,
        description: 'Replace existing heat pump with new model',
      },
    };

    const result = validateFormGenerator(validRequest);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should reject missing contractor information', () => {
    const invalidRequest = {
      permitInfo: {
        equipmentType: 'furnace',
        jobType: 'replacement',
        location: {
          address: '123 Main St',
          city: 'Tampa',
          county: 'hillsborough',
          zipCode: '33602',
        },
      },
      contractor: {
        name: '',
        phone: 'invalid',
        email: 'not-an-email',
      },
      property: {
        ownerName: 'John Doe',
        ownerPhone: '(813) 555-5678',
      },
      equipmentDetails: {
        manufacturer: 'Carrier',
        model: 'XYZ',
      },
      installation: {
        estimatedStartDate: '2025-02-01',
        estimatedCost: 5000,
        description: 'Test',
      },
    };

    const result = validateFormGenerator(invalidRequest);
    expect(result.success).toBe(false);
  });
});

describe('Input Sanitization', () => {
  it('should remove HTML tags', () => {
    const input = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
  });

  it('should remove SQL injection characters', () => {
    const input = "'; DROP TABLE users; --";
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain("'");
    expect(sanitized).not.toContain(';');
  });

  it('should trim whitespace', () => {
    const input = '  hello world  ';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toBe('hello world');
  });
});
