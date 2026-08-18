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
    
    // Check if URL is already an itch.zone link
    if (url.includes('html-classic.itch.zone')) {
        log('Direct itch.zone URL detected, fetching HTML directly...');
        gameURL = url;
        fetchExtractedHTML(url);
        return;
    }
    
    if (!isValidURL(url)) {
        showError('Please enter a valid URL (e.g., https://talihi.itch.io/music-life) or an itch.zone HTML URL.', debugLog);
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
    progressText.textContent = `Step 1: Fetching game page...\n(Note: If this fails, you can open DevTools (F12) in the game page, go to Network tab, find the request to html-classic.itch.zone and copy that URL here)`;
    
    log(`Fetching game page from: ${url}`);
    
    const proxyURL = CORS_PROXIES[currentProxyIndex] + encodeURIComponent(url);
    log(`Using proxy: ${CORS_PROXIES[currentProxyIndex]}`);
    
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
                    log(`Found itch.zone link: ${htmlZoneLink}`, 'success');
                    progressText.textContent = `Step 2: Fetching extracted HTML from itch.zone...`;
                    fetchExtractedHTML(htmlZoneLink);
                } else {
                    log('No itch.zone link found in page HTML', 'warning');
                    log('HTML content sample (first 1000 chars): ' + htmlContent.substring(0, 1000));
                    
                    if (currentProxyIndex < CORS_PROXIES.length - 1) {
                        log(`Trying next proxy (${currentProxyIndex + 1}/${CORS_PROXIES.length})...`);
                        currentProxyIndex++;
                        fetchGamePage(gameURL);
                    } else {
                        showError(
                            'Could not find itch.zone HTML link in the page.\n\n' +
                            'ALTERNATIVE METHOD:\n' +
                            '1. Open the game page in your browser\n' +
                            '2. Open DevTools (F12 or Right-click → Inspect)\n' +
                            '3. Go to the Network tab\n' +
                            '4. Reload the page (F5)\n' +
                            '5. Look for a request to "html-classic.itch.zone" (it will look like: https://html-classic.itch.zone/html/NUMBERS/index.html?v=NUMBERS)\n' +
                            '6. Copy that full URL and paste it in the input field above\n' +
                            '7. Click Extract HTML',
                            debugLog
                        );
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
                log(`Proxy ${currentProxyIndex + 1} failed, trying next proxy...`);
                currentProxyIndex++;
                fetchGamePage(gameURL);
            } else {
                showError(
                    `Failed to fetch the game page using all available proxies.\n\n` +
                    `Error: ${error.message}\n\n` +
                    `ALTERNATIVE METHOD:\n` +
                    `1. Open the game page in your browser\n` +
                    `2. Open DevTools (F12 or Right-click → Inspect)\n` +
                    `3. Go to the Network tab\n` +
                    `4. Reload the page (F5)\n` +
                    `5. Look for a request to "html-classic.itch.zone"\n` +
                    `6. Copy that full URL (like: https://html-classic.itch.zone/html/NUMBERS/index.html?v=NUMBERS)\n` +
                    `7. Paste it in the input field above\n` +
                    `8. Click Extract HTML`,
                    debugLog
                );
            }
        });
}

function fetchExtractedHTML(htmlZoneLink) {
    log(`Fetching extracted HTML from itch.zone: ${htmlZoneLink}`);
    progressText.textContent = `Fetching HTML from itch.zone...`;
    
    // Try direct fetch first
    fetch(htmlZoneLink, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    })
        .then(response => {
            log(`Direct fetch response status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then(htmlContent => {
            log(`HTML received from itch.zone, length: ${htmlContent.length} characters`, 'success');
            log('Content starts with: ' + htmlContent.substring(0, 200));
            
            // Verify it's actually HTML game content, not the itch.io page
            if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
                log('Valid HTML structure detected', 'success');
                extractedHTML = htmlContent;
                showResult();
            } else {
                log('Content does not appear to be valid HTML', 'warning');
                extractedHTML = htmlContent;
                showResult();
            }
        })
        .catch(error => {
            log(`Direct fetch failed: ${error.message}`, 'warning');
            log(`Attempting with CORS proxy...`);
            
            // Fall back to CORS proxy
            const proxyURL = CORS_PROXIES[0] + encodeURIComponent(htmlZoneLink);
            log(`Using CORS proxy: ${proxyURL}`);
            
            fetch(proxyURL)
                .then(response => {
                    log(`CORS proxy response status: ${response.status}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(htmlContent => {
                    log(`HTML received via CORS proxy, length: ${htmlContent.length} characters`, 'success');
                    extractedHTML = htmlContent;
                    showResult();
                })
                .catch(proxyError => {
                    log(`CORS proxy also failed: ${proxyError.message}`, 'error');
                    showError(
                        `Failed to fetch extracted HTML from itch.zone.\n\n` +
                        `Direct fetch error: ${error.message}\n` +
                        `CORS proxy error: ${proxyError.message}\n\n` +
                        `The itch.zone server may be blocking requests. Please try again later or use a different game.`,
                        debugLog
                    );
                });
        });
}

function extractItchZoneLink(htmlContent) {
    log('Searching for itch.zone HTML link in page content...');
    
    // Pattern 1: Direct itch.zone HTML links
    const pattern = /https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html(?:\?v=\d+)?/gi;
    const matches = htmlContent.match(pattern);
    
    if (matches && matches.length > 0) {
        log(`Found ${matches.length} direct itch.zone link(s)`, 'success');
        matches.forEach((link, index) => {
            log(`  [${index + 1}] ${link}`);
        });
        return matches[0];
    }
    
    log('No direct itch.zone links found');
    
    // Pattern 2: In script src attributes
    const scriptSrcPattern = /src=["']([^"']*html-classic\.itch\.zone[^"']*)["']/gi;
    const scriptMatches = htmlContent.match(scriptSrcPattern);
    
    if (scriptMatches && scriptMatches.length > 0) {
        log(`Found ${scriptMatches.length} script tag(s) with itch.zone`);
        scriptMatches.forEach((match, index) => {
            log(`  [${index + 1}] ${match}`);
            const urlMatch = match.match(/src=["']([^"']+)["']/);
            if (urlMatch) {
                log(`    Extracted: ${urlMatch[1]}`);
            }
        });
        const srcMatch = scriptMatches[0].match(/src=["']([^"']+)["']/);
        if (srcMatch) {
            return srcMatch[1];
        }
    }
    
    // Pattern 3: In iframe src attributes
    const iframeSrcPattern = /src=["']([^"']*html-classic\.itch\.zone[^"']*)["']/gi;
    const iframeMatches = htmlContent.match(iframeSrcPattern);
    
    if (iframeMatches && iframeMatches.length > 0) {
        log(`Found ${iframeMatches.length} iframe(s) with itch.zone`, 'success');
        const srcMatch = iframeMatches[0].match(/src=["']([^"']+)["']/);
        if (srcMatch) {
            log(`Extracted iframe src: ${srcMatch[1]}`);
            return srcMatch[1];
        }
    }
    
    log('No itch.zone links found in any pattern', 'warning');
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
    
    // Pattern 3: Look for large base64 blocks
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
    
    log('No embedded HTML found', 'warning');
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
