

export function validateFields(fields: Record<string, any>): string[] {
    const missingFields: string[] = [];
    for (const key in fields) {
      if (!fields[key]) {
        missingFields.push(key);
      }
    }
    return missingFields;
  }