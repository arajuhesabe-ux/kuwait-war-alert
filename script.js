// ------------------------------
// CONFIGURE THESE
// ------------------------------
const SUPABASE_URL = "YOUR_SUPABASE_URL"; // Example: https://abcd.supabase.co
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"; // anon public key
const RSS_FEEDS = [
    "https://news.google.com/rss/search?q=kuwait+missile+drone+siren&hl=en-US&gl=US&ceid=US:en",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "http://feeds.bbci.co.uk/news/world/rss.xml"
];
const KEYWORDS = ["missile", "drone", "siren"];
// ------------------------------

let events = [];

// Fetch events from Supabase
async function loadEvents() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/events?select=*`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        }
    });
    events = await res.json();
    render();
}

// Save a new event to Supabase
async function saveEvent(type, time, date, source) {
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify([{ type, time, date, source }])
    });
}

// Check RSS feeds for new events
async function checkFeeds() {
    for (const feed of RSS_FEEDS) {
        try {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`);
            const text = await res.text();

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const items = xml.querySelectorAll("item");

            for (const item of items) {
                const title = item.querySelector("title").textContent.toLowerCase();
                const source = item.querySelector("link")?.textContent || "unknown";
                const now = new Date();
                const time = now.toLocaleTimeString();
                const date = now.toDateString();

                KEYWORDS.forEach(keyword => {
                    if (title.includes(keyword)) {
                        // Avoid duplicates
                        if (!events.some(e => e.type === keyword && e.time === time && e.date === date && e.source === source)) {
                            events.push({ type: keyword, time, date, source });
                            saveEvent(keyword, time, date, source);
                        }
                    }
                });
            }
        } catch (err) {
            console.log("Error fetching feed:", feed, err);
        }
    }
    render();
}

// Render counts and timeline
function render() {
    let missilesToday = 0, dronesToday = 0, sirensToday = 0;
    let missilesTotal = 0, dronesTotal = 0, sirensTotal = 0;
    const today = new Date().toDateString();

    const list = document.getElementById("alerts");
    list.innerHTML = "";

    events.slice().reverse().forEach(e => {
        if (e.type === "missile") {
            missilesTotal++;
            if (e.date === today) missilesToday++;
        }
        if (e.type === "drone") {
            dronesTotal++;
            if (e.date === today) dronesToday++;
        }
        if (e.type === "siren") {
            sirensTotal++;
            if (e.date === today) sirensToday++;
        }

        const li = document.createElement("li");
        li.innerText = `${e.time} — ${e.type} [${e.source}]`;
        list.appendChild(li);
    });

    document.getElementById("missilesToday").innerText = missilesToday;
    document.getElementById("dronesToday").innerText = dronesToday;
    document.getElementById("sirensToday").innerText = sirensToday;

    document.getElementById("missilesTotal").innerText = missilesTotal;
    document.getElementById("dronesTotal").innerText = dronesTotal;
    document.getElementById("sirensTotal").innerText = sirensTotal;
}

// Initial load
loadEvents();
checkFeeds();
setInterval(checkFeeds, 60000); // check every 1 minute
