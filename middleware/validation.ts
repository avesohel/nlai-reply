import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

interface ValidationError {
  field: string;
  message: string;
}

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      const errors: ValidationError[] = error.details.map(detail => ({
        field: detail.path[0] as string,
        message: detail.message
      }));

      res.status(400).json({
        message: 'Validation error',
        errors
      });
      return;
    }
    next();
  };
};

export const schemas = {
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
  }),

  aiSettings: Joi.object({
    isEnabled: Joi.boolean(),
    replyTone: Joi.string().valid('professional', 'friendly', 'casual', 'enthusiastic', 'informative', 'humorous'),
    replyLength: Joi.string().valid('short', 'medium', 'long'),
    personalityTraits: Joi.object({
      enthusiasmLevel: Joi.number().min(1).max(10),
      formalityLevel: Joi.number().min(1).max(10),
      humorLevel: Joi.number().min(1).max(10),
      helpfulnessLevel: Joi.number().min(1).max(10)
    }),
    customInstructions: Joi.string().max(500),
    replyFilters: Joi.object({
      minimumSentimentScore: Joi.number().min(-1).max(1),
      requiresQuestion: Joi.boolean(),
      excludeSpam: Joi.boolean(),
      minimumWordCount: Joi.number().min(1).max(100)
    }),
    contextSettings: Joi.object({
      useVideoTranscript: Joi.boolean(),
      useChannelDescription: Joi.boolean(),
      useRecentComments: Joi.boolean(),
      maxContextLength: Joi.number().min(500).max(4000)
    }),
    bannedWords: Joi.array().items(Joi.string()),
    requiredWords: Joi.array().items(Joi.string()),
    aiModel: Joi.string().valid('gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'),
    maxTokens: Joi.number().min(50).max(300),
    temperature: Joi.number().min(0).max(2)
  })
};

export default { validateRequest, schemas };