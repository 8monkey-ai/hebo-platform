export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthError extends HttpError {
  constructor(message: string, code = "auth_error") {
    super(message, 401, code);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, code = "bad_request") {
    super(message, 400, code);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found", code = "not_found") {
    super(message, 404, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Resource already exists", code = "conflict") {
    super(message, 409, code);
  }
}

const PRISMA_ERROR_MAP: Record<string, new (message?: string) => HttpError> = {
  P2025: NotFoundError,
  P2002: ConflictError,
};

export const identifyPrismaError = (error: unknown): HttpError | undefined => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code in PRISMA_ERROR_MAP
  ) {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : undefined;
    return new PRISMA_ERROR_MAP[error.code](message);
  }
};
