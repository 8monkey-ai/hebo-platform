export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v));
  } else if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replaceAll(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
    }
    return result;
  }
  return obj;
}

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  } else if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replaceAll(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`,
      );
      result[snakeKey] = toSnakeCase(obj[key]);
    }
    return result;
  }
  return obj;
}
