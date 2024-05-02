"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFields = void 0;
function validateFields(fields) {
    const missingFields = [];
    for (const key in fields) {
        if (!fields[key]) {
            missingFields.push(key);
        }
    }
    return missingFields;
}
exports.validateFields = validateFields;
