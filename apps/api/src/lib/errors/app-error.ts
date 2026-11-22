import type { FieldError } from "@turftap/contract";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors?: FieldError[]) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class BadRequest extends AppError {
  constructor(code: string, message: string, fieldErrors?: FieldError[]) {
    super(400, code, message, fieldErrors);
  }
}

export class Unauthorized extends AppError {
  constructor(code: string, message: string) {
    super(401, code, message);
  }
}

export class Forbidden extends AppError {
  constructor(code: string, message: string) {
    super(403, code, message);
  }
}

export class NotFound extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class Conflict extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}
