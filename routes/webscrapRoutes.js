import express from 'express';
// Import the processing function from ProductService
import { processScrapeRequest } from '../ProductService/webscrap.js';

const router = express.Router();

// Define POST endpoint: /api/scrape
router.post('/scrape', async (req, res) => {
  const { url } = req.body;

  // 1. Basic validation
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please provide a valid URL.' 
    });
  }

  try {
    // 2. Call your business logic in ProductService
    const result = await processScrapeRequest(url);

    // 3. Return success response to webscrap.html
    return res.json({
      success: true,
      title: result.title,
      totalCount: result.totalCount
    });

  } catch (err) {
    console.error('Scraping Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      error: err.message || 'Failed to extract product data.' 
    });
  }
});

export default router;