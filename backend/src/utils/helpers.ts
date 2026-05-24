export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function omitPassword<T extends { password?: string }>(user: T): Omit<T, 'password'> {
  const { password: _, ...rest } = user;
  return rest;
}

export function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
