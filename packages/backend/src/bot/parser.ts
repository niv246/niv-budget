export interface ParsedExpense {
  description: string;
  amount: number;
}

export function parseExpenseMessage(text: string): ParsedExpense | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Match a number (integer or decimal) anywhere in the text
  const numberMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;

  const amount = parseFloat(numberMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  // Remove the number from the text to get the description
  const description = trimmed
    .replace(numberMatch[0], '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!description) return null;

  return { description, amount };
}

export function isHighAmount(amount: number): boolean {
  return amount > 10000;
}
