const { decode } = require("../utils/cryptoHelper");
require("dotenv").config();

const CRYPTO_SECRET_KEY = process.env.CRYPTO_SECRET_KEY;

/**
 * Decrypt multiple URL params and inject into req.body
 * @param {Object} mappings - paramName -> bodyKey
 */
function cryptoParamsMiddleware(mappings) {
  return (req, res, next) => {
    try {
      req.body = req.body || {};

      for (const [paramName, bodyKey] of Object.entries(mappings)) {
        const encryptedValue = req.params[paramName];

        if (!encryptedValue) {
          return res.status(400).json({
            error: `Missing encrypted param: ${paramName}`,
          });
        }

        const decodedValue = decode(encryptedValue, CRYPTO_SECRET_KEY);
        req.body[bodyKey] = decodedValue;
      }

      next();
    } catch (err) {
      return res.status(401).json({
        error: "Invalid or corrupted encrypted URL parameters",
      });
    }
  };
}

module.exports = cryptoParamsMiddleware;
