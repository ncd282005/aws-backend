const Joi = require("joi");
const moment = require("moment");

const registerDemoClientSchema = Joi.object({
  id: Joi.string().hex().length(24).optional(),
  name: Joi.string()
    .pattern(/^[a-zA-Z0-9\s]+$/)
    .min(1)
    .max(50)
    .required()
    .custom((value, helpers) => {
      return value;
    }

    )
    .messages({
      "string.base": `"name" must be a string.`,
      "string.empty": `"name" is required.`,
      "string.max": `"name" must be less than or equal to 50 characters.`,
    }),
  ttl: Joi.string()
    .custom((value, helper) => {
      const formattedDate = moment(value, "MM/DD/YYYY hh:mmA", true);
      if (!formattedDate.isValid()) {
        return helper.message(`"ttl" must be a valid date in MM/DD/YYYY hh:mmA format.`);
      }
      return formattedDate.toDate();
    })
    .optional(),
  email_ids: Joi.array().items(Joi.string().email()).optional().default([]),
  url: Joi.string().optional(),
  title: Joi.string().optional(),
  status: Joi.string()
    .valid("Completed", "Active", "Expired", "Error")
    .default("Completed")
    .optional(),
});

module.exports = {
  registerDemoClientSchema,
};
