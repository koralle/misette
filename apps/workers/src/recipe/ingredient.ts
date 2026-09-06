const WHITESPACE = /\s+/gu;

export const foldIngredientName = (name: string): string =>
  name.trim().replace(WHITESPACE, " ").toLowerCase();
