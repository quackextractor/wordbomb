import express from 'express';

const router = express.Router();

/**
 * Create a new game room
 * POST /api/rooms/create
 */
router.post('/create', (req, res) => {
  try {
    const { hostId, hostName, hostAvatar, hostColor, mode } = req.body;
    
    if (!hostId || !hostName || !mode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Generate a random room ID (6 characters)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Return the room ID
    res.status(201).json({ 
      success: true, 
      roomId 
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create room' 
    });
  }
});

/**
 * Join an existing game room
 * POST /api/rooms/join
 */
router.post('/join', (req, res) => {
  try {
    const { roomId, playerId, playerName } = req.body;
    
    if (!roomId || !playerId || !playerName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Note: Actual room joining is handled via socket.io
    // This endpoint is just for validation
    
    res.status(200).json({ 
      success: true, 
      message: 'Room join request validated' 
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process join request' 
    });
  }
});

export default router;