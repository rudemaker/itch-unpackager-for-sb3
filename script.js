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
let debugLog = [];

// Event Listeners
extractBtn.addEventListener('click', handleExtract);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleExtract();
});
downloadBtn.addEventListener('click', downloadExtractedHTML);
resetBtn.addEventListener('click', resetUI);
errorResetBtn.addEventListener('click', resetUI);

// Functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    debugLog.push(logEntry);
    console.log(logEntry);
}

function handleExtract() {
    const url = urlInput.value.trim();
    debugLog = [];
    
    log('Extract button clicked');
    log(`Input URL: ${url}`);
    
    if (!url) {
        showError('Please enter a valid URL.', debugLog);
        return;
    }
    
    if (!isValidURL(url)) {
        showError('Please enter a valid URL (e.g., https://talihi.itch.io/music-life).', debugLog);
        return;
    }
    
    gameURL = url;
    currentProxyIndex = 0;
    fetchGamePage(url);
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function fetchGamePage(url) {
    hideAllSections();
    progress.style.display = 'block';
    progressText.textContent = `Step 1: Fetching game page...`;
    
    log(`Fetching game page from: ${url}`);
    
    const proxyURL = CORS_PROXIES[currentProxyIndex] + encodeURIComponent(url);
    log(`Using proxy: ${CORS_PROXIES[currentProxyIndex]}`);
    log(`Proxy URL: ${proxyURL}`);
    
    fetch(proxyURL)
        .then(response => {
            log(`Response status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(htmlContent => {
            log(`Received HTML content, length: ${htmlContent.length} characters`);
            
            try {
                // Look for itch.zone HTML link
                const htmlZoneLink = extractItchZoneLink(htmlContent);
                
                if (htmlZoneLink) {
                    log(`Found itch.zone link: ${htmlZoneLink}`);
                    progressText.textContent = `Step 2: Fetching extracted HTML...`;
                    fetchExtractedHTML(htmlZoneLink);
                } else {
                    log('No itch.zone link found in page HTML', 'warning');
                    
                    // Try alternative: look for data in the page itself
                    const extracted = extractHTMLFromGame(htmlContent);
                    if (extracted) {
                        log('Found embedded HTML in page', 'success');
                        extractedHTML = extracted;
                        showResult();
                    } else {
                        log('No extractable content found', 'error');
                        
                        if (currentProxyIndex < CORS_PROXIES.length - 1) {
                            log(`Trying next proxy (${currentProxyIndex + 1}/${CORS_PROXIES.length})...`);
                            currentProxyIndex++;
                            fetchGamePage(gameURL);
                        } else {
                            showError('Could not find itch.zone HTML link or embedded content in the page. This game may not be a packaged HTML5 game.', debugLog);
                        }
                    }
                }
            } catch (error) {
                log(`Error processing page: ${error.message}`, 'error');
                showError(`Error processing page: ${error.message}`, debugLog);
            }
        })
        .catch(error => {
            log(`Fetch error: ${error.message}`, 'error');
            
            // Try next proxy if available
            if (currentProxyIndex < CORS_PROXIES.length - 1) {
                log(`Proxy failed, trying next proxy (${currentProxyIndex + 2}/${CORS_PROXIES.length})...`);
                currentProxyIndex++;
                fetchGamePage(gameURL);
            } else {
                showError(`Failed to fetch the game page. Error: ${error.message}. Make sure the URL is correct and the page is accessible.`, debugLog);
            }
        });
}

function fetchExtractedHTML(htmlZoneLink) {
    log(`Fetching extracted HTML from: ${htmlZoneLink}`);
    
    // Try direct fetch first (may not work due to CORS)
    fetch(htmlZoneLink, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    })
        .then(response => {
            log(`Extracted HTML response status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(htmlContent => {
            log(`Extracted HTML received, length: ${htmlContent.length} characters`, 'success');
            extractedHTML = htmlContent;
            showResult();
        })
        .catch(error => {
            log(`Direct fetch failed: ${error.message}`, 'warning');
            log(`Attempting with CORS proxy...`);
            
            // Fall back to CORS proxy
            const proxyURL = CORS_PROXIES[0] + encodeURIComponent(htmlZoneLink);
            fetch(proxyURL)
                .then(response => {
                    log(`CORS proxy response status: ${response.status}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(htmlContent => {
                    log(`Extracted HTML via CORS proxy received, length: ${htmlContent.length} characters`, 'success');
                    extractedHTML = htmlContent;
                    showResult();
                })
                .catch(proxyError => {
                    log(`CORS proxy also failed: ${proxyError.message}`, 'error');
                    showError(`Failed to fetch extracted HTML. Direct error: ${error.message}. CORS proxy error: ${proxyError.message}`, debugLog);
                });
        });
}

function extractItchZoneLink(htmlContent) {
    log('Searching for itch.zone HTML link in page content...');
    
    // Pattern: https://html-classic.itch.zone/html/numbers/index.html
    const pattern = /https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html(?:\?v=\d+)?/gi;
    const matches = htmlContent.match(pattern);
    
    if (matches && matches.length > 0) {
        log(`Found ${matches.length} itch.zone link(s)`);
        matches.forEach((link, index) => {
            log(`  [${index + 1}] ${link}`);
        });
        return matches[0]; // Return the first match
    }
    
    log('No itch.zone links found', 'warning');
    
    // Also try searching in iframe src attributes
    const iframePattern = /src=["']([^"']*html-classic\.itch\.zone[^"']*)["']/gi;
    const iframeMatches = htmlContent.match(iframePattern);
    
    if (iframeMatches && iframeMatches.length > 0) {
        log(`Found ${iframeMatches.length} iframe(s) with itch.zone`);
        const srcMatch = iframeMatches[0].match(/src=["']([^"']+)["']/);
        if (srcMatch) {
            log(`Extracted iframe src: ${srcMatch[1]}`);
            return srcMatch[1];
        }
    }
    
    return null;
}

function extractHTMLFromGame(htmlContent) {
    log('Attempting to extract HTML from embedded content...');
    
    // Pattern 1: Look for script tag with type="text/html"
    let scriptMatch = htmlContent.match(/<script[^>]*type="?text\/html"?[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch && scriptMatch[1]) {
        log('Found HTML in text/html script tag', 'success');
        return scriptMatch[1].trim();
    }
    log('No text/html script tag found');
    
    // Pattern 2: Look for base64 encoded HTML in variables
    let varMatch = htmlContent.match(/window\.gameHTML\s*=\s*['"`]([\s\S]*?)['"`]/i);
    if (varMatch && varMatch[1]) {
        log('Found gameHTML variable, attempting to decode...');
        try {
            return decodeBase64IfNeeded(varMatch[1]);
        } catch (e) {
            log(`Failed to decode gameHTML: ${e.message}`, 'warning');
            return varMatch[1];
        }
    }
    log('No gameHTML variable found');
    
    // Pattern 3: Look for data URLs
    let dataMatch = htmlContent.match(/data:text\/html[^,]*,([^"'`]+)/i);
    if (dataMatch && dataMatch[1]) {
        log('Found data URL, attempting to decode...');
        try {
            return decodeURIComponent(dataMatch[1]);
        } catch (e) {
            log(`Failed to decode data URL: ${e.message}`, 'warning');
            return dataMatch[1];
        }
    }
    log('No data URL found');
    
    // Pattern 4: Look for large base64 blocks
    let base64Match = htmlContent.match(/['"]((?:[A-Za-z0-9+/]{100,}={0,2})+)['"]/);
    if (base64Match && base64Match[1]) {
        log('Found potential base64 block, attempting to decode...');
        try {
            const decoded = atob(base64Match[1]);
            if (decoded.includes('<!DOCTYPE') || decoded.includes('<html')) {
                log('Base64 decoded to valid HTML', 'success');
                return decoded;
            }
        } catch (e) {
            log(`Base64 decode failed: ${e.message}`, 'warning');
        }
    }
    log('No valid base64 blocks found');
    
    return null;
}

function decodeBase64IfNeeded(str) {
    try {
        const decoded = atob(str);
        if (decoded.includes('<') && decoded.includes('>')) {
            return decoded;
        }
    } catch (e) {
        log(`Base64 decode error: ${e.message}`, 'warning');
    }
    return str;
}

function showResult() {
    hideAllSections();
    result.style.display = 'block';
    
    const preview = extractedHTML.substring(0, 500) + (extractedHTML.length > 500 ? '...' : '');
    resultContent.textContent = preview;
    
    log('HTML extraction successful!', 'success');
    result.scrollIntoView({ behavior: 'smooth' });
}

function showError(message, logs = []) {
    hideAllSections();
    errorDiv.style.display = 'block';
    
    let fullErrorMessage = message + '\n\n--- Debug Log ---\n';
    fullErrorMessage += logs.join('\n');
    
    errorMessage.textContent = fullErrorMessage;
    
    log(`Error shown to user: ${message}`, 'error');
    errorDiv.scrollIntoView({ behavior: 'smooth' });
}

function hideAllSections() {
    progress.style.display = 'none';
    result.style.display = 'none';
    errorDiv.style.display = 'none';
}

function downloadExtractedHTML() {
    if (!extractedHTML) return;
    
    log('Downloading extracted HTML...');
    
    const blob = new Blob([extractedHTML], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputFileName = `extracted_${timestamp}.html`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', outputFileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    log(`File downloaded as: ${outputFileName}`, 'success');
}

function resetUI() {
    urlInput.value = '';
    urlInput.focus();
    hideAllSections();
    extractedHTML = null;
    gameURL = '';
    debugLog = [];
    log('UI reset');
}
