const express = require('express');
const router = express.Router();
const ProductivityLog = require('../models/ProductivityLog');

// Log productivity data
router.post('/log', async (req, res) => {
  try {
    const { userId, date, counters, totalFocusMinutes, completedStreak } = req.body;

    // Upsert the log for the given user and date (stripping time from date)
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const log = await ProductivityLog.findOneAndUpdate(
      { userId, date: logDate },
      {
        $set: { counters, totalFocusMinutes, completedStreak }
      },
      { upsert: true, new: true }
    );

    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's productivity data
router.get('/today', async (req, res) => {
  try {
    const { userId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await ProductivityLog.findOne({ userId, date: today });
    if (!log) {
      return res.status(404).json({ message: 'No log found for today' });
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get productivity history
router.get('/history', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const query = { userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await ProductivityLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics/correlation
router.get('/analytics/correlation', async (req, res) => {
  try {
    const { userId } = req.query;
    // Placeholder for correlation logic (e.g., focus minutes vs. completed streaks)
    const logs = await ProductivityLog.find({ userId }).sort({ date: 1 });

    // Simple correlation example: focus minutes vs streak completion
    const correlationData = logs.map(log => ({
      date: log.date,
      focusMinutes: log.totalFocusMinutes,
      completedStreak: log.completedStreak
    }));

    res.json({
      userId,
      data: correlationData,
      summary: "This endpoint provides data for correlation analysis between focus time and streak completion."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
