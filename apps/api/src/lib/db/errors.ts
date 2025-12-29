const prismaErrorsHttpStatusMapping = {
  P2002: { status: 409, message: "Resource already exists" },
  P2025: { status: 404, message: "Resource not found" },
} as const;

type PrismaErrorCode = keyof typeof prismaErrorsHttpStatusMapping;

const isPrismaErrorCode = (code: string): code is PrismaErrorCode =>
  code in prismaErrorsHttpStatusMapping;

export const identifyPrismaError = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "code" in error &&
  typeof error.code === "string" &&
  isPrismaErrorCode(error.code)
    ? prismaErrorsHttpStatusMapping[error.code]
    : undefined;
