const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'cookie', 'secret', 'otp'];

const maskSensitiveData = (args) => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        const masked = JSON.parse(JSON.stringify(arg));
        const maskRecursive = (obj) => {
          for (let key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              maskRecursive(obj[key]);
            } else if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
              obj[key] = '***MASKED***';
            }
          }
        };
        maskRecursive(masked);
        return masked;
      } catch (e) {
        return arg;
      }
    }
    return arg;
  });
};

const logger = {
  info: (...args) => {
    console.log(`[INFO] ${new Date().toISOString()} -`, ...maskSensitiveData(args));
  },
  error: (...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} -`, ...maskSensitiveData(args));
  },
  warn: (...args) => {
    console.warn(`[WARN] ${new Date().toISOString()} -`, ...maskSensitiveData(args));
  }
};

module.exports = logger;
