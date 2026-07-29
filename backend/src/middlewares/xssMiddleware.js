const xss = require('xss');

/**
 * Clean data recursively
 */
const clean = (data) => {
  if (typeof data === 'string') {
    return xss(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => clean(item));
  }
  if (typeof data === 'object' && data !== null) {
    const cleaned = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleaned[key] = clean(data[key]);
      }
    }
    return cleaned;
  }
  return data;
};

/**
 * Express middleware to sanitize incoming requests against XSS
 */
const xssSanitize = () => {
  return (req, res, next) => {
    if (req.body) req.body = clean(req.body);
    if (req.query) req.query = clean(req.query);
    if (req.params) req.params = clean(req.params);
    next();
  };
};

module.exports = xssSanitize;
