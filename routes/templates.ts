import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validateRequest, schemas } from '../middleware/validation';
import ReplyTemplate from '../models/ReplyTemplate';

const router = express.Router();

// Get all templates for the authenticated user
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const templates = await ReplyTemplate.find({ user: user._id })
      .sort({ updatedAt: -1 });

    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific template
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new template
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { name, content, triggers, conditions, variables } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!name || !content) {
      return res.status(400).json({ message: 'Name and content are required' });
    }

    const template = new ReplyTemplate({
      user: user._id,
      name,
      content,
      triggers: triggers || [],
      conditions: conditions || {},
      variables: variables || []
    });

    await template.save();
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update a template
router.put('/:id', auth, async (req: Request, res: Response) => {
  try {
    const { name, content, triggers, conditions, variables, isActive } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (name) template.name = name;
    if (content) template.content = content;
    if (triggers !== undefined) template.triggers = triggers;
    if (conditions !== undefined) template.conditions = conditions;
    if (variables !== undefined) template.variables = variables;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a template
router.delete('/:id', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await ReplyTemplate.findOneAndDelete({
      _id: req.params.id,
      user: user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Preview template with variables
router.post('/:id/preview', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const variables = req.body.variables || {};
    const processedContent = template.processTemplate(variables);

    res.json({ content: processedContent });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle template active status
router.patch('/:id/toggle', auth, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isActive = !template.isActive;
    await template.save();

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;