import express from 'express';
import { validateWord } from '../validation/validate.js';

const router = express.Router();

/**
 * Validate a word
 * POST /api/validate
 */
router.post('/', async (req, res) => {
  try {
    const { word, wordpiece } = req.body;
    
    if (!word || !wordpiece) {
      return res.status(400).json({ 
        success: false, 
        message: 'Word and wordpiece are required' 
      });
    }
    
    // Validate the word
    const result = await validateWord(word, wordpiece);
    
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error validating word:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate word' 
    });
  }
});

export default router;