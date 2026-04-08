function nowMs() {
  return Number(process.hrtime.bigint()) / 1e6;
}

async function withPerfSpan(label, fn, options = {}) {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    const durationMs = Number((nowMs() - start).toFixed(1));
    const thresholdMs = Number(options.thresholdMs || 150);
    if (durationMs >= thresholdMs || options.alwaysLog) {
      const level = durationMs >= thresholdMs ? 'warn' : 'info';
      console[level](`[perf] ${label}`, {
        durationMs,
        ...(options.meta || {})
      });
    }
  }
}

module.exports = {
  nowMs,
  withPerfSpan
};
