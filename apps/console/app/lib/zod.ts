import { z } from "zod";

export const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.toString();

export function initZod() {
  z.config({
    customError(issue) {
      if (issue.code === "too_small" && issue.minimum === 1 && issue.origin === "string") {
        return { message: "Required" };
      }
      if (issue.code === "invalid_value") {
        return { message: "Required" };
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
