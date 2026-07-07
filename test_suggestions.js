const searchInput = document.getElementById('searchInput');
const apiSelector = document.getElementById('apiSelector');
const suggestionsList = document.getElementById('suggestionsList');
const loadingIndicator = document.getElementById('loadingIndicator');
const rawOutput = document.getElementById('rawOutput');

let debounceTimer;

// Global callback functions for JSONP
window.handleTestResponse = function(data) {
    loadingIndicator.style.display = 'none';
    
    // Display raw output
    rawOutput.style.display = 'block';
    rawOutput.textContent = JSON.stringify(data, null, 2);
    
    let suggestions = [];
    const apiType = apiSelector.value;
    
    try {
        if (apiType === 'duckduckgo') {
            // DuckDuckGo format: [{"phrase":"test"}, {"phrase":"testing"}]
            if (Array.isArray(data)) {
                suggestions = data.map(item => item.phrase);
            }
        } else if (apiType === 'wikipedia') {
            // Wikipedia OpenSearch format: ["query", ["sugg1", "sugg2"], ["desc1", "desc2"], ["url1", "url2"]]
            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
                suggestions = data[1];
            }
        } else if (apiType === 'google') {
            // Google format: ["query", ["sugg1", "sugg2"]]
            if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
                suggestions = data[1];
            }
        }
        
        renderSuggestions(suggestions);
    } catch (e) {
        renderError("Error parsing suggestions: " + e.message);
    }
};

function renderSuggestions(suggestions) {
    suggestionsList.innerHTML = '';
    
    if (!suggestions || suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="loading" style="display:block;">No suggestions found.</div>';
        return;
    }
    
    suggestions.forEach(sugg => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = sugg;
        div.onclick = () => {
            searchInput.value = sugg;
            suggestionsList.innerHTML = '';
            rawOutput.style.display = 'none';
        };
        suggestionsList.appendChild(div);
    });
}

function renderError(message) {
    suggestionsList.innerHTML = `<div class="loading" style="display:block; color: #f38ba8;">${message}</div>`;
}

function fetchSuggestions(query) {
    const apiType = apiSelector.value;
    let url = '';
    
    // Construct the JSONP URL
    if (apiType === 'duckduckgo') {
        url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&callback=handleTestResponse`;
    } else if (apiType === 'wikipedia') {
        url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&format=json&callback=handleTestResponse`;
    } else if (apiType === 'google') {
        url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&callback=handleTestResponse`;
    }
    
    // Remove any existing script tag
    const oldScript = document.getElementById('jsonp-script');
    if (oldScript) {
        oldScript.remove();
    }
    
    loadingIndicator.style.display = 'block';
    suggestionsList.innerHTML = '';
    rawOutput.style.display = 'none';
    
    // Create new script tag for JSONP
    const script = document.createElement('script');
    script.id = 'jsonp-script';
    script.src = url;
    
    // Handle error (JSONP errors are hard to catch, but we can detect if it takes too long or fails to load)
    script.onerror = () => {
        loadingIndicator.style.display = 'none';
        renderError(`Failed to load from ${apiType}. Note: Some APIs block access due to CORS or tracking prevention.`);
    };
    
    document.body.appendChild(script);
    
    // Cleanup script after load
    script.onload = () => {
        if (document.body.contains(script)) {
            document.body.removeChild(script);
        }
    };
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(debounceTimer);
    
    if (!query) {
        suggestionsList.innerHTML = '';
        rawOutput.style.display = 'none';
        loadingIndicator.style.display = 'none';
        return;
    }
    
    debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
    }, 400); // 400ms debounce
});

apiSelector.addEventListener('change', () => {
    const query = searchInput.value.trim();
    if (query) {
        fetchSuggestions(query);
    }
});
