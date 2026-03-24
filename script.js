// ------------------------------
// CONFIGURATION
// ------------------------------
const SUPABASE_URL = "https://srunqcpfoivygfvnmjky.supabase.co"; // Example: https://abcd.supabase.co
const SUPABASE_KEY = "sb_publishable_ADX5_zP9tcgVqS2dYXR1MA_0H04FgpV"; // anon public key
const RSS_FEEDS = [
    "https://news.google.com/rss/search?q=kuwait+missile+drone+siren&hl=en-US&gl=US&ceid=US:en",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "http://feeds.bbci.co.uk/news/world/rss.xml"
];
const KEYWORDS = ["missile", "drone", "siren"];
// ------------------------------

let events = [];
let isUpdating = false;

// Generate unique ID for each event to prevent duplicates
function generateEventId(type, title, source, date) {
    return `${type}_${title}_${source}_${date}`;
}

// Load existing events from Supabase
async function loadEvents() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*&order=created_at.desc`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        events = await res.json();
        render();
        updateLastUpdated();
    } catch (err) {
        console.error("Error loading events:", err);
        showError("Failed to load events from database");
    }
}

// Save new event to Supabase with duplicate check
async function saveEvent(type, title, source, link, date, time) {
    const eventId = generateEventId(type, title, source, date);
    
    // Check if event already exists locally
    if (events.some(e => e.event_id === eventId)) {
        console.log("Duplicate event prevented:", eventId);
        return false;
    }
    
    try {
        const newEvent = {
            type,
            title: title.substring(0, 200), // Limit title length
            source,
            link,
            date,
            time,
            event_id: eventId,
            created_at: new Date().toISOString()
        };
        
        const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Prefer": "return=representation"
            },
            body: JSON.stringify(newEvent)
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const savedEvent = await res.json();
        events.unshift(savedEvent[0]); // Add to beginning of array
        render();
        return true;
    } catch (err) {
        console.error("Error saving event:", err);
        return false;
    }
}

// Fetch and process RSS feeds with improved duplicate detection
async function checkFeeds() {
    if (isUpdating) {
        console.log("Update already in progress, skipping...");
        return;
    }
    
    isUpdating = true;
    showUpdatingStatus(true);
    
    let newEventsCount = 0;
    
    for (const feed of RSS_FEEDS) {
        try {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const text = await res.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            
            // Check for parsing errors
            if (xml.querySelector("parsererror")) {
                throw new Error("XML parsing error");
            }
            
            const items = xml.querySelectorAll("item");
            const now = new Date();
            const time = now.toLocaleTimeString();
            const date = now.toDateString();
            
            for (const item of items) {
                const titleElement = item.querySelector("title");
                if (!titleElement) continue;
                
                const title = titleElement.textContent;
                const linkElement = item.querySelector("link");
                const link = linkElement?.textContent || "";
                const source = new URL(link).hostname.replace("www.", "") || "unknown";
                
                // Check each keyword
                for (const keyword of KEYWORDS) {
                    if (title.toLowerCase().includes(keyword)) {
                        const saved = await saveEvent(keyword, title, source, link, date, time);
                        if (saved) newEventsCount++;
                        break; // Only save once per item
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching feed:", feed, err);
            showError(`Failed to fetch feed: ${new URL(feed).hostname}`);
        }
    }
    
    if (newEventsCount > 0) {
        console.log(`Added ${newEventsCount} new events`);
    }
    
    isUpdating = false;
    showUpdatingStatus(false);
    updateLastUpdated();
}

// Calculate accurate counts from events array
function calculateCounts() {
    const today = new Date().toDateString();
    let counts = {
        missilesToday: 0, dronesToday: 0, sirensToday: 0,
        missilesTotal: 0, dronesTotal: 0, sirensTotal: 0
    };
    
    events.forEach(event => {
        const type = event.type.toLowerCase();
        const isToday = event.date === today;
        
        if (type === "missile") {
            counts.missilesTotal++;
            if (isToday) counts.missilesToday++;
        } else if (type === "drone") {
            counts.dronesTotal++;
            if (isToday) counts.dronesToday++;
        } else if (type === "siren") {
            counts.sirensTotal++;
            if (isToday) counts.sirensToday++;
        }
    });
    
    return counts;
}

// Render counts and timeline
function render() {
    const counts = calculateCounts();
    
    // Update counter displays
    updateElement("missilesToday", counts.missilesToday);
    updateElement("dronesToday", counts.dronesToday);
    updateElement("sirensToday", counts.sirensToday);
    updateElement("missilesTotal", counts.missilesTotal);
    updateElement("dronesTotal", counts.dronesTotal);
    updateElement("sirensTotal", counts.sirensTotal);
    
    // Render alerts list
    const alertsContainer = document.getElementById("alertsList");
    if (!alertsContainer) return;
    
    if (events.length === 0) {
        alertsContainer.innerHTML = '<div class="loading">No alerts recorded yet</div>';
        return;
    }
    
    const alertsHtml = `
        <ul id="alerts">
            ${events.slice(0, 50).map(event => `
                <li>
                    <div>
                        <span class="alert-time">${event.time || '--:--:--'}</span>
                        <span class="alert-type"> — ${event.type.toUpperCase()}</span>
                    </div>
                    <div class="alert-source">
                        ${event.title ? `📰 ${escapeHtml(event.title.substring(0, 100))}${event.title.length > 100 ? '...' : ''}<br>` : ''}
                        🔗 Source: ${escapeHtml(event.source)}
                    </div>
                </li>
            `).join('')}
        </ul>
        ${events.length > 50 ? '<div style="text-align: center; margin-top: 10px; color: #888;">Showing last 50 alerts</div>' : ''}
    `;
    
    alertsContainer.innerHTML = alertsHtml;
}

// Helper function to safely update DOM elements
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update last updated timestamp
function updateLastUpdated() {
    const element = document.getElementById("lastUpdated");
    if (element) {
        element.innerText = new Date().toLocaleTimeString();
    }
}

// Show updating status with visual feedback
function showUpdatingStatus(isUpdating) {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = isUpdating;
        refreshBtn.textContent = isUpdating ? '🔄 Updating...' : '🔄 Refresh';
    }
    
    const dashboard = document.querySelector('.dashboard-grid');
    if (dashboard && isUpdating) {
        dashboard.classList.add('updating');
        setTimeout(() => dashboard.classList.remove('updating'), 1000);
    }
}

// Show error message to user
function showError(message) {
    const alertsContainer = document.getElementById("alertsList");
    if (alertsContainer && events.length === 0) {
        alertsContainer.innerHTML = `<div class="error">⚠️ ${escapeHtml(message)}</div>`;
    }
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        const errorDiv = document.querySelector('.error');
        if (errorDiv && events.length > 0) {
            errorDiv.remove();
        }
    }, 5000);
}

// Manual refresh function
async function manualRefresh() {
    await checkFeeds();
    await loadEvents();
}

// Initialize dashboard
async function init() {
    await loadEvents();
    await checkFeeds();
    
    // Set up auto-refresh interval
    setInterval(async () => {
        await checkFeeds();
    }, 60000); // Check every minute
}

// Start the application
init().catch(console.error);
