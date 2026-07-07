type Level = "info" | "warn" | "error";

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = {
    time: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const out = level === "error" ? console.error : console.log;
  out(JSON.stringify(line));
}

export const log = {
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
