const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Utility function to log
function log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// Extract itch.zone link from HTML content
function extractItchZoneLink(htmlContent) {
    log('Searching for itch.zone HTML link in page content...', 'SEARCH');
    
    // Pattern 1: Direct itch.zone HTML links
    const pattern = /https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html(?:\?v=\d+)?/gi;
    const matches = htmlContent.match(pattern);
    
    if (matches && matches.length > 0) {
        log(`Found ${matches.length} direct itch.zone link(s)`, 'SUCCESS');
        matches.forEach((link, index) => {
            log(`  [${index + 1}] ${link}`);
        });
        return matches[0];
    }
    
    log('No direct itch.zone links found', 'WARNING');
    
    // Pattern 2: In script src attributes
    const scriptSrcPattern = /src=["']([^"']*html-classic\.itch\.zone[^"']*)["']/gi;
    const scriptMatches = htmlContent.match(scriptSrcPattern);
    
    if (scriptMatches && scriptMatches.length > 0) {
        log(`Found ${scriptMatches.length} script tag(s) with itch.zone`, 'SEARCH');
        const srcMatch = scriptMatches[0].match(/src=["']([^"']+)["']/);
        if (srcMatch) {
            log(`Extracted script src: ${srcMatch[1]}`, 'SUCCESS');
            return srcMatch[1];
        }
    }
    
    // Pattern 3: In iframe src attributes
    const iframeSrcPattern = /src=["']([^"']*html-classic\.itch\.zone[^"']*)["']/gi;
    const iframeMatches = htmlContent.match(iframeSrcPattern);
    
    if (iframeMatches && iframeMatches.length > 0) {
        log(`Found ${iframeMatches.length} iframe(s) with itch.zone`, 'SEARCH');
        const srcMatch = iframeMatches[0].match(/src=["']([^"']+)["']/);
        if (srcMatch) {
            log(`Extracted iframe src: ${srcMatch[1]}`, 'SUCCESS');
            return srcMatch[1];
        }
    }
    
    log('No itch.zone links found in any pattern', 'WARNING');
    return null;
}

// API endpoint to fetch game page and extract itch.zone link
app.post('/api/extract-itch-zone-link', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        log('No URL provided', 'ERROR');
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }
    
    log(`Received request to extract itch.zone link from: ${url}`, 'REQUEST');
    
    try {
        // Fetch the itch.io game page
        log(`Fetching game page...`, 'FETCH');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        log(`Page fetched successfully, length: ${response.data.length} characters`, 'SUCCESS');
        
        // Extract itch.zone link
        const itchZoneLink = extractItchZoneLink(response.data);
        
        if (!itchZoneLink) {
            log('No itch.zone link found in page', 'ERROR');
            return res.status(404).json({
                success: false,
                error: 'Could not find itch.zone HTML link in the page. This may not be a packaged HTML5 game, or the page structure is different.'
            });
        }
        
        log(`Successfully extracted itch.zone link: ${itchZoneLink}`, 'SUCCESS');
        return res.json({
            success: true,
            itchZoneLink: itchZoneLink
        });
        
    } catch (error) {
        log(`Error fetching page: ${error.message}`, 'ERROR');
        return res.status(500).json({
            success: false,
            error: `Failed to fetch the game page: ${error.message}`
        });
    }
});

// API endpoint to fetch HTML from itch.zone
app.post('/api/fetch-html', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        log('No URL provided for HTML fetch', 'ERROR');
        return res.status(400).json({
            success: false,
            error: 'URL is required'
        });
    }
    
    log(`Received request to fetch HTML from: ${url}`, 'REQUEST');
    
    try {
        log(`Fetching HTML from itch.zone...`, 'FETCH');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        log(`HTML fetched successfully, length: ${response.data.length} characters`, 'SUCCESS');
        
        // Return the HTML content
        return res.json({
            success: true,
            html: response.data
        });
        
    } catch (error) {
        log(`Error fetching HTML: ${error.message}`, 'ERROR');
        return res.status(500).json({
            success: false,
            error: `Failed to fetch HTML from itch.zone: ${error.message}`
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
    log(`Server is running on http://localhost:${PORT}`, 'START');
    log(`Open http://localhost:${PORT} in your browser`, 'INFO');
});
