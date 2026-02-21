import { validateFields } from './validation';

describe('validateFields', () => {
  it('should return an empty array if all fields are present', () => {
    const fields = {
      name: 'John Doe',
      age: 30,
      city: 'New York',
    };
    expect(validateFields(fields)).toEqual([]);
  });

  it('should return an array of missing fields if some fields are missing', () => {
    const fields = {
      name: 'John Doe',
      age: '',
      city: undefined,
    };
    expect(validateFields(fields)).toEqual(['age', 'city']);
  });

  it('should handle fields with null values as missing', () => {
    const fields = {
      name: 'John Doe',
      age: null,
    };
    expect(validateFields(fields)).toEqual(['age']);
  });

  it('should handle fields with 0 as a valid value', () => {
    const fields = {
      name: 'John Doe',
      age: 0,
    };
    expect(validateFields(fields)).toEqual([]);
  });

  it('should handle an empty object', () => {
    const fields = {};
    expect(validateFields(fields)).toEqual([]);
  });
});