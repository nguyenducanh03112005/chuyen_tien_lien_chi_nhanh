// Amounts are whole VND. Accept a JSON number or a numeric string, and reject
// anything that is not a positive safe integer (negative, zero, NaN, decimals).
const parseAmount = (value) => {
  const amount = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
};

module.exports = { parseAmount };
