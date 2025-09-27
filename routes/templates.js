const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const ReplyTemplate = require('../models/ReplyTemplate');
const router = express.Router();

// Get all templates for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const templates = await ReplyTemplate.find({ user: req.user._id })
      .sort({ updatedAt: -1 });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new template
router.post('/', auth, async (req, res) => {
  try {
    const { name, content, triggers, conditions, variables } = req.body;

    if (!name || !content) {
      return res.status(400).json({ message: 'Name and content are required' });
    }

    const template = new ReplyTemplate({
      user: req.user._id,
      name,
      content,
      triggers: triggers || [],
      conditions: conditions || {},
      variables: variables || []
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a template
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, content, triggers, conditions, variables, isActive } = req.body;

    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: req.user._id
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a template
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Preview template with variables
router.post('/:id/preview', auth, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const variables = req.body.variables || {};
    const processedContent = template.processTemplate(variables);

    res.json({ content: processedContent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle template active status
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const template = await ReplyTemplate.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    template.isActive = !template.isActive;
    await template.save();

    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;