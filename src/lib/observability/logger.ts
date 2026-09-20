type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "cookie",
  "authorization",
  "accountnumber",
  "statement",
  "rawbody",
];

function sanitizeContext(obj: unknown, depth = 0): unknown {
  if (depth > 4) return "[Truncated]";
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Redact potential credit card numbers: 16 digits
    return obj.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, "[REDACTED_CARD]");
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeContext(item, depth + 1));
  }

  if (typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive))) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeContext(value, depth + 1);
      }
    }
    return clean;
  }

  return obj;
}

export const logger = {
  log(level: LogLevel, payload: LogPayload) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message: payload.message,
      context: payload.context ? sanitizeContext(payload.context) : undefined,
      error:
        payload.error instanceof Error
          ? {
              name: payload.error.name,
              message: payload.error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? payload.error.stack
                  : undefined,
            }
          : payload.error,
    };

    const out = JSON.stringify(entry);
    if (level === "error") {
      console.error(out);
    } else if (level === "warn") {
      console.warn(out);
    } else {
      console.log(out);
    }
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", { message, context });
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", { message, context });
  },

  warn(message: string, context?: Record<string, unknown>, error?: unknown) {
    this.log("warn", { message, context, error });
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log("error", { message, error, context });
  },
};

