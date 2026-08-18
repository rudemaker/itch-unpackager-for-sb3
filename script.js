// CORS Proxy services (multiple fallbacks)
const CORS_PROXIES = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://proxy.cors.sh/'
];

let currentProxyIndex = 0;

// DOM Elements
const urlInput = document.getElementById('urlInput');
const extractBtn = document.getElementById('extractBtn');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const result = document.getElementById('result');
const resultContent = document.getElementById('resultContent');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const errorResetBtn = document.getElementById('errorResetBtn');

// State
let extractedHTML = null;
let gameURL = '';

// Event Listeners
extractBtn.addEventListener('click', handleExtract);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleExtract();
});
downloadBtn.addEventListener('click', downloadExtractedHTML);
resetBtn.addEventListener('click', resetUI);
errorResetBtn.addEventListener('click', resetUI);

// Functions
function handleExtract() {
    const url = urlInput.value.trim();
    
    if (!url) {
        showError('Please enter a valid URL.');
        return;
    }
    
    if (!isValidURL(url)) {
        showError('Please enter a valid URL (e.g., https://example.itch.io/your-game).');
        return;
    }
    
    gameURL = url;
    currentProxyIndex = 0;
    fetchGameHTML(url);
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function fetchGameHTML(url) {
    hideAllSections();
    progress.style.display = 'block';
    progressText.textContent = `Fetching game HTML (attempt ${currentProxyIndex + 1})...`;
    
    const proxyURL = CORS_PROXIES[currentProxyIndex] + encodeURIComponent(url);
    
    fetch(proxyURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(htmlContent => {
            try {
                const extracted = extractHTMLFromGame(htmlContent);
                
                if (extracted) {
                    extractedHTML = extracted;
                    showResult();
                } else {
                    if (currentProxyIndex < CORS_PROXIES.length - 1) {
                        // Try next proxy
                        currentProxyIndex++;
                        fetchGameHTML(url);
                    } else {
                        showError('Could not extract HTML from this URL. It may not be a valid itch.io HTML5 game or the format is not supported.');
                    }
                }
            } catch (error) {
                showError(`Error processing content: ${error.message}`);
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            
            // Try next proxy if available
            if (currentProxyIndex < CORS_PROXIES.length - 1) {
                currentProxyIndex++;
                fetchGameHTML(url);
            } else {
                showError(`Failed to fetch the game HTML. Error: ${error.message}. Make sure the URL is correct and accessible.`);
            }
        });
}

function extractHTMLFromGame(htmlContent) {
    // Strategy 1: Look for embedded HTML in script tags or data attributes
    
    // Try to find data in common patterns
    // Pattern 1: Look for script tag with type="text/html" or similar
    let scriptMatch = htmlContent.match(/<script[^>]*type="?text\/html"?[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch && scriptMatch[1]) {
        return scriptMatch[1].trim();
    }
    
    // Pattern 2: Look for base64 encoded HTML in data attributes or variables
    // Search for window.gameHTML or similar patterns
    let varMatch = htmlContent.match(/window\.gameHTML\s*=\s*['"`]([\s\S]*?)['"`]/i);
    if (varMatch && varMatch[1]) {
        try {
            return decodeBase64IfNeeded(varMatch[1]);
        } catch (e) {
            // If decoding fails, return as is
            return varMatch[1];
        }
    }
    
    // Pattern 3: Look for data URLs or embedded content
    let dataMatch = htmlContent.match(/data:text\/html[^,]*,([^"'`]+)/i);
    if (dataMatch && dataMatch[1]) {
        try {
            return decodeURIComponent(dataMatch[1]);
        } catch (e) {
            return dataMatch[1];
        }
    }
    
    // Pattern 4: Look for large base64 blocks that might be HTML
    let base64Match = htmlContent.match(/['"]((?:[A-Za-z0-9+/]{100,}={0,2})+)['"]/);
    if (base64Match && base64Match[1]) {
        try {
            const decoded = atob(base64Match[1]);
            if (decoded.includes('<!DOCTYPE') || decoded.includes('<html')) {
                return decoded;
            }
        } catch (e) {
            // Not base64 or not HTML
        }
    }
    
    // Pattern 5: Look for iframe src with game content
    let iframeMatch = htmlContent.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1]) {
        // Try to fetch iframe content
        return iframeMatch[1];
    }
    
    // Pattern 6: Extract the entire HTML if it seems to be a game container
    // Sometimes the whole file IS the game HTML wrapped
    if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
        // Check if this looks like a TurboWarp or similar packaged game
        if (htmlContent.includes('canvas') || htmlContent.includes('WebGL') || htmlContent.includes('itch') || htmlContent.includes('game')) {
            // Try to extract just the game HTML part
            let htmlMatch = htmlContent.match(/<!DOCTYPE[^>]*>([\s\S]*)<\/html>/i);
            if (htmlMatch) {
                return htmlMatch[0];
            }
        }
    }
    
    return null;
}

function decodeBase64IfNeeded(str) {
    try {
        // Try to decode as base64
        const decoded = atob(str);
        // Check if result looks like HTML
        if (decoded.includes('<') && decoded.includes('>')) {
            return decoded;
        }
    } catch (e) {
        // Not base64, return original
    }
    return str;
}

function showResult() {
    hideAllSections();
    result.style.display = 'block';
    
    // Show a preview of the extracted HTML
    const preview = extractedHTML.substring(0, 500) + (extractedHTML.length > 500 ? '...' : '');
    resultContent.textContent = preview;
    
    // Scroll to result
    result.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    hideAllSections();
    errorDiv.style.display = 'block';
    errorMessage.textContent = message;
    
    // Scroll to error
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideAllSections() {
    progress.style.display = 'none';
    result.style.display = 'none';
    errorDiv.style.display = 'none';
}

function downloadExtractedHTML() {
    if (!extractedHTML) return;
    
    // Create a blob from the extracted HTML
    const blob = new Blob([extractedHTML], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputFileName = `extracted_${timestamp}.html`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', outputFileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

function resetUI() {
    urlInput.value = '';
    urlInput.focus();
    hideAllSections();
    extractBtn.style.display = 'inline-block';
    extractedHTML = null;
    gameURL = '';
}
