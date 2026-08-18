// Configuration
const API_BASE_URL = window.location.origin;
const API_EXTRACT_LINK = `${API_BASE_URL}/api/extract-itch-zone-link`;
const API_FETCH_HTML = `${API_BASE_URL}/api/fetch-html`;

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
        fetchHTMLDirectly(url);
        return;
    }
    
    if (!isValidURL(url)) {
        showError('Please enter a valid URL (e.g., https://talihi.itch.io/music-life) or an itch.zone HTML URL.', debugLog);
        return;
    }
    
    gameURL = url;
    extractItchZoneLink(url);
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function extractItchZoneLink(url) {
    hideAllSections();
    progress.style.display = 'block';
    progressText.textContent = `Step 1: Extracting itch.zone link from game page...`;
    
    log(`Calling backend API to extract itch.zone link...`);
    
    fetch(API_EXTRACT_LINK, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
        .then(response => {
            log(`API response status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                log(`Successfully extracted itch.zone link: ${data.itchZoneLink}`, 'success');
                progressText.textContent = `Step 2: Fetching HTML from itch.zone...`;
                fetchHTMLDirectly(data.itchZoneLink);
            } else {
                log(`API error: ${data.error}`, 'error');
                showError(`Failed to extract itch.zone link: ${data.error}`, debugLog);
            }
        })
        .catch(error => {
            log(`Fetch error: ${error.message}`, 'error');
            showError(`Error communicating with server: ${error.message}`, debugLog);
        });
}

function fetchHTMLDirectly(itchZoneUrl) {
    log(`Calling backend API to fetch HTML from: ${itchZoneUrl}`);
    
    fetch(API_FETCH_HTML, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: itchZoneUrl })
    })
        .then(response => {
            log(`HTML fetch response status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                log(`Successfully fetched HTML, length: ${data.html.length} characters`, 'success');
                extractedHTML = data.html;
                showResult();
            } else {
                log(`API error: ${data.error}`, 'error');
                showError(`Failed to fetch HTML: ${data.error}`, debugLog);
            }
        })
        .catch(error => {
            log(`Fetch error: ${error.message}`, 'error');
            showError(`Error fetching HTML: ${error.message}`, debugLog);
        });
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
