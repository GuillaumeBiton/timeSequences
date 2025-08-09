/* ===== app.js ===== */
const colors = ["tomato","dodgerblue","mediumseagreen","gold","orchid","slategray"];
let selectedColor = colors[0];
let sequence = JSON.parse(localStorage.getItem("sequence")||"[]");
let currentTimer = null;
let pausedRemaining = null;
let currentIndex = 0;

/* ----- DOM refs ----- */
const colorPicker = document.getElementById("colorPicker");
const durationInput = document.getElementById("durationInput");
const labelInput = document.getElementById("labelInput");
const addStepBtn = document.getElementById("addStep");
const sequenceList = document.getElementById("sequenceList");
const startSequenceBtn = document.getElementById("startSequence");

const configScreen = document.getElementById("configScreen");
const timerScreen = document.getElementById("timerScreen");
const progressCircle = document.getElementById("progress");
const timeText = document.getElementById("timeText");
const currentLabel = document.getElementById("currentLabel");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const stopBtn = document.getElementById("stopBtn");

/* Update banner */
const updateBanner = document.getElementById("updateBanner");
const updateBtn = document.getElementById("updateBtn");
const dismissUpdate = document.getElementById("dismissUpdate");
let newWorker = null;

/* init color picker */
colors.forEach(c=>{
  const d = document.createElement("div");
  d.className="color-option"+(c===selectedColor?" selected":"");
  d.style.backgroundColor=c;
  d.onclick=()=>{ document.querySelectorAll(".color-option").forEach(x=>x.classList.remove("selected")); d.classList.add("selected"); selectedColor=c; };
  colorPicker.appendChild(d);
});

/* render sequence */
function renderSequence(){
  sequenceList.innerHTML="";
  sequence.forEach((s,i)=>{
    const item = document.createElement("div");
    item.className="preview-step";
    const left = document.createElement("div");
    left.style.display="flex";left.style.alignItems="center";left.style.gap="10px";
    const dot = document.createElement("div");
    dot.className="dot"; dot.style.backgroundColor=s.color; dot.textContent=s.duration;
    const meta = document.createElement("div"); meta.innerHTML=`<div style="font-weight:600">${s.label||("Étape "+(i+1))}</div><div style="font-size:13px;color:#666">${s.duration}s</div>`;
    left.appendChild(dot); left.appendChild(meta);
    const actions = document.createElement("div");
    const edit = document.createElement("button"); edit.textContent="✏️"; edit.style.marginRight="6px";
    const del = document.createElement("button"); del.textContent="🗑"; del.className="muted";
    edit.onclick=()=>openEdit(i);
    del.onclick=()=>{ sequence.splice(i,1); saveAndRender(); };
    actions.appendChild(edit); actions.appendChild(del);
    item.appendChild(left); item.appendChild(actions);
    sequenceList.appendChild(item);
  });
}

/* add step */
addStepBtn.addEventListener("click", ()=>{
  const duration = parseInt(durationInput.value,10);
  const label = labelInput.value.trim();
  if(!duration || duration<=0) return alert("Durée invalide");
  sequence.push({duration, label, color:selectedColor});
  saveAndRender();
});

/* save */
function saveAndRender(){ localStorage.setItem("sequence", JSON.stringify(sequence)); renderSequence(); }

/* edit modal (simple prompt to keep code small) */
function openEdit(i){
  const s = sequence[i];
  const newDur = prompt("Durée en secondes", s.duration);
  if(newDur===null) return;
  const nd = parseInt(newDur,10);
  if(!nd||nd<=0) return alert("Durée invalide");
  const newLabel = prompt("Label (laisser vide pour aucun)", s.label||"") ?? "";
  // color cycling quick UI
  const color = prompt("Couleur (nom ou hex). Ex: tomato, dodgerblue. Actuelle: "+s.color, s.color) || s.color;
  sequence[i] = {duration:nd,label:newLabel,color};
  saveAndRender();
}

/* start sequence */
startSequenceBtn.addEventListener("click", ()=>{
  if(sequence.length===0) return alert("Aucune étape");
  configScreen.classList.add("hidden");
  timerScreen.classList.remove("hidden");
  currentIndex=0;
  runNext();
});

/* timer engine */
const RADIUS = 110;
const CIRC = 2*Math.PI*RADIUS;

function runNext(){
  if(currentIndex>=sequence.length){
    alert("Séquence terminée !");
    location.reload();
    return;
  }
  const step = sequence[currentIndex];
  currentLabel.textContent = step.label || `Étape ${currentIndex+1}`;
  progressCircle.style.stroke = step.color;
  progressCircle.style.strokeDasharray = CIRC;
  startTimer(step.duration, ()=>{
    currentIndex++;
    runNext();
  });
}

function startTimer(duration, done){
  clearInterval(currentTimer);
  let start = Date.now();
  let end = start + duration*1000;
  function tick(){
    const now = Date.now();
    let remaining = Math.max(0, Math.round((end-now)/1000));
    const progress = (duration - remaining)/duration;
    progressCircle.style.strokeDashoffset = CIRC*(1-progress);
    timeText.textContent = remaining;
    if(remaining<=0){ clearInterval(currentTimer); currentTimer=null; done(); }
  }
  tick();
  currentTimer = setInterval(tick,100);
}

/* pause / resume / stop */
pauseBtn.addEventListener("click", ()=>{
  if(currentTimer){ clearInterval(currentTimer); currentTimer=null; pausedRemaining = parseInt(timeText.textContent,10); }
});
resumeBtn.addEventListener("click", ()=>{
  if(pausedRemaining!=null){
    startTimer(pausedRemaining, ()=>{
      currentIndex++; pausedRemaining=null; runNext();
    });
    pausedRemaining=null;
  }
});
stopBtn.addEventListener("click", ()=>{
  clearInterval(currentTimer); currentTimer=null; pausedRemaining=null;
  timerScreen.classList.add("hidden"); configScreen.classList.remove("hidden");
});

/* initial render */
renderSequence();

/* =================
   Service Worker + update handling
   ================= */

/* register SW */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/service-worker.js').then(reg=>{
    // When an update to the SW is found:
    reg.addEventListener('updatefound', ()=>{
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', ()=>{
        if(newWorker.state === 'installed'){
          // if there's a controller, app is already controlled -> new SW waiting
          if(navigator.serviceWorker.controller){
            showUpdateBanner();
          } else {
            // first install (no previous controller) -> nothing to do
            console.log('Service worker installed for first time');
          }
        }
      });
    });
  }).catch(err=>console.error('SW registration failed',err));

  // Listen to messages from SW (optional)
  navigator.serviceWorker.addEventListener('message', event=>{
    console.log('message from sw', event.data);
  });

  // When the new SW takes control, reload the page so the new assets are used
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/* banner UI functions */
function showUpdateBanner(){
  updateBanner.classList.remove('hidden');
}
function hideUpdateBanner(){
  updateBanner.classList.add('hidden');
}

updateBtn.addEventListener('click', ()=>{
  hideUpdateBanner();
  // ask waiting worker to skipWaiting
  if(newWorker){
    newWorker.postMessage({type:'SKIP_WAITING'});
  } else if(navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage){
    navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'});
  }
});

dismissUpdate.addEventListener('click', ()=>{ hideUpdateBanner(); });

/* Optional: manual check for update (could be bound to UI) */
function checkForUpdates(){
  if(navigator.serviceWorker.controller){
    navigator.serviceWorker.getRegistration().then(reg=>{
      if(reg) reg.update();
    });
  }
}
