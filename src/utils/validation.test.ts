import { validateFields } from './validation';

describe('validateFields', () => {
  it('should return an empty array if all fields are present', () => {
    const fields = {
      field1: 'value1',
      field2: 'value2',
    };
    expect(validateFields(fields)).toEqual([]);
  });

  it('should return an array of missing fields if some fields are missing', () => {
    const fields = {
      field1: 'value1',
      field2: '',
      field3: undefined,
      field4: null,
    };
    expect(validateFields(fields)).toEqual(['field2', 'field3', 'field4']);
  });

  it('should handle an empty object', () => {
    const fields = {};
    expect(validateFields(fields)).toEqual([]);
  });

  it('should handle fields with zero values', () => {
    const fields = {
      field1: 0,
      field2: '',
      field3: false,
    };
    expect(validateFields(fields)).toEqual(['field2', 'field3']);
  });
});