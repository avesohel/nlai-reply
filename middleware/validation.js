const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }
    next();
  };
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    settings: Joi.object({
      emailNotifications: Joi.boolean(),
      replyDelay: Joi.number().min(30).max(3600),
      maxRepliesPerHour: Joi.number().min(1).max(100)
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required()
  }),

  replyTemplate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    content: Joi.string().min(10).max(10000).required(),
    triggers: Joi.array().items(Joi.string().min(2).max(50)),
    conditions: Joi.object({
      keywords: Joi.array().items(Joi.string().max(50)),
      sentiment: Joi.string().valid('positive', 'negative', 'neutral', 'any'),
      minLikes: Joi.number().min(0),
      channelIds: Joi.array().items(Joi.string())
    }),
    isActive: Joi.boolean(),
    variables: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      defaultValue: Joi.string(),
      required: Joi.boolean()
    }))
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).max(128).required()
  })
};

module.exports = {
  validateRequest,
  schemas
};