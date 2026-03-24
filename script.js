async function checkAlerts() {

const keywords = [
"war",
"missile",
"attack",
"iran",
"iraq",
"explosion",
"drone",
"airspace",
"siren",
"military"
];

try {

const response = await fetch(
"https://api.allorigins.win/raw?url=https://news.google.com/rss/search?q=kuwait&hl=en-US&gl=US&ceid=US:en"
);

const text = await response.text();

let alertFound = false;

keywords.forEach(word => {
if(text.toLowerCase().includes(word)) {
alertFound = true;
}
});

if(alertFound){
document.getElementById("alert").style.display="block";
document.getElementById("safe").style.display="none";
}

} catch(error){
console.log("Error checking alerts");
}

}

// check every 1 minute
setInterval(checkAlerts, 60000);

// run immediately
checkAlerts();
