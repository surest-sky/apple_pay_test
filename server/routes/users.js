const express = require('express');
const { User } = require('../models');

const router = express.Router();

// Create or update user
router.post('/', async (req, res) => {
  try {
    const { userId, ...userData } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    const user = await User.findOneAndUpdate(
      { userId: userId },
      { ...userData, userId: userId },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Create/update user error:', error);
    res.status(500).json({ 
      error: 'Internal server error while creating/updating user',
      message: error.message
    });
  }
});

// Get user by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId: userId });
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching user',
      message: error.message
    });
  }
});

// Update user
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;

    const user = await User.findOneAndUpdate(
      { userId: userId },
      userData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Internal server error while updating user',
      message: error.message
    });
  }
});

// Delete user
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOneAndDelete({ userId: userId });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Internal server error while deleting user',
      message: error.message
    });
  }
});

module.exports = router;