import { z } from "zod";

import { labelize } from "./utils";

export const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.toString();

function required(path: PropertyKey[] | undefined): { message: string } {
  const key = path?.at(-1);
  const label = typeof key === "string" ? labelize(key) : "";
  return { message: label ? `${label} is required` : "Required" };
}

export function initZod() {
  z.config({
    customError(issue) {
      if (issue.code === "too_small" && issue.minimum === 1 && issue.origin === "string") {
        return required(issue.path);
      }
      if (issue.code === "invalid_value") {
        return required(issue.path);
      }
      if (issue.code === "invalid_type" && issue.expected === "string") {
        return required(issue.path);
      }
      if (issue.code === "invalid_format" && issue.format === "email") {
        return { message: "Invalid email address" };
      }
      if (
        issue.code === "invalid_format" &&
        issue.format === "regex" &&
        issue.pattern === identifierPattern
      ) {
        return {
          message: "Only letters, numbers, hyphens, and underscores allowed",
        };
      }
    },
  });
}
