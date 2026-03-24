let events = JSON.parse(localStorage.getItem("events")) || [];

function addEvent(type){

const now = new Date();

events.push({
type: type,
time: now.toLocaleTimeString(),
date: now.toDateString()
});

localStorage.setItem("events", JSON.stringify(events));

render();
}

function render(){

let missilesToday = 0;
let dronesToday = 0;
let sirensToday = 0;

let missilesTotal = 0;
let dronesTotal = 0;
let sirensTotal = 0;

const today = new Date().toDateString();

const list = document.getElementById("alerts");
list.innerHTML = "";

events.forEach(e=>{

if(e.type === "missile"){
missilesTotal++;
if(e.date === today) missilesToday++;
}

if(e.type === "drone"){
dronesTotal++;
if(e.date === today) dronesToday++;
}

if(e.type === "siren"){
sirensTotal++;
if(e.date === today) sirensToday++;
}

const li = document.createElement("li");
li.innerText = `${e.time} — ${e.type}`;
list.appendChild(li);

});

document.getElementById("missilesToday").innerText = missilesToday;
document.getElementById("dronesToday").innerText = dronesToday;
document.getElementById("sirensToday").innerText = sirensToday;

document.getElementById("missilesTotal").innerText = missilesTotal;
document.getElementById("dronesTotal").innerText = dronesTotal;
document.getElementById("sirensTotal").innerText = sirensTotal;

}

render();
