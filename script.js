// DOM Elements
const uploadBox = document.getElementById('uploadBox');
const selectBtn = document.getElementById('selectBtn');
const fileInput = document.getElementById('fileInput');
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
let originalFileName = '';

// Event Listeners
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect({ target: fileInput });
    }
});

downloadBtn.addEventListener('click', downloadExtractedHTML);
resetBtn.addEventListener('click', resetUI);
errorResetBtn.addEventListener('click', resetUI);

// Functions
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!file.name.endsWith('.html')) {
        showError('Please select an HTML file.');
        return;
    }
    
    originalFileName = file.name;
    processFile(file);
}

function processFile(file) {
    hideAllSections();
    progress.style.display = 'block';
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const htmlContent = e.target.result;
            const extracted = extractHTMLFromGame(htmlContent);
            
            if (extracted) {
                extractedHTML = extracted;
                showResult();
            } else {
                showError('Could not extract HTML from this file. It may not be a valid itch.io HTML5 game or the format is not supported.');
            }
        } catch (error) {
            showError(`Error processing file: ${error.message}`);
        }
    };
    
    reader.onerror = () => {
        showError('Failed to read the file.');
    };
    
    reader.readAsText(file);
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
    
    // Pattern 5: Extract the entire HTML if it seems to be a game container
    // Sometimes the whole file IS the game HTML wrapped
    if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
        // Check if this looks like a TurboWarp or similar packaged game
        if (htmlContent.includes('canvas') || htmlContent.includes('WebGL') || htmlContent.includes('itch')) {
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
    fileInput.value = '';
    uploadBox.classList.remove('dragover');
    hideAllSections();
    uploadBox.style.display = 'block';
    extractedHTML = null;
    originalFileName = '';
}
