import { jest, describe, it, expect } from '@jest/globals';
import { validateFields } from './validation';

describe('validateFields', () => {
  it('should return an empty array if all fields are present', () => {
    const fields = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30,
    };
    const result = validateFields(fields);
    expect(result).toEqual([]);
  });

  it('should return an array of missing fields if some fields are missing', () => {
    const fields = {
      name: 'John Doe',
      email: '',
      age: 30,
    };
    const result = validateFields(fields);
    expect(result).toEqual(['email']);
  });

  it('should return an array of missing fields if all fields are missing', () => {
    const fields = {
      name: '',
      email: '',
      age: '',
    };
    const result = validateFields(fields);
    expect(result).toEqual(['name', 'email', 'age']);
  });

  it('should handle fields with null values', () => {
    const fields = {
      name: null,
      email: 'john.doe@example.com',
      age: 30,
    };
    const result = validateFields(fields);
    expect(result).toEqual(['name']);
  });

  it('should handle fields with undefined values', () => {
    const fields = {
      name: undefined,
      email: 'john.doe@example.com',
      age: 30,
    };
    const result = validateFields(fields);
    expect(result).toEqual(['name']);
  });
});