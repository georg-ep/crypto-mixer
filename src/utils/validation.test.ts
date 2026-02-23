import { jest, describe, it, expect } from '@jest/globals';
import { validateFields } from "./validation";

describe('validateFields', () => {
  it('should return an empty array if all fields are present', () => {
    const fields = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 30
    };
    const result = validateFields(fields);
    expect(result).toEqual([]);
  });

  it('should return an array of missing fields if some fields are missing', () => {
    const fields = {
      name: 'John Doe',
      email: '',
      age: undefined
    };
    const result = validateFields(fields);
    expect(result).toEqual(['email', 'age']);
  });

  it('should return an array of missing fields if all fields are missing', () => {
    const fields = {
      name: '',
      email: '',
      age: undefined
    };
    const result = validateFields(fields);
    expect(result).toEqual(['name', 'email', 'age']);
  });

  it('should handle fields with null values as missing', () => {
    const fields = {
      name: 'John Doe',
      email: null,
      age: 30
    };
    const result = validateFields(fields);
    expect(result).toEqual(['email']);
  });

  it('should handle fields with zero values as present', () => {
    const fields = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      age: 0
    };
    const result = validateFields(fields);
    expect(result).toEqual([]);
  });
});