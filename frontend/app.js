import { OpeningScene } from './js/scene_opening.js';
import { EarthPreparationScene } from './js/scene_earth.js';
import { SurfaceMissionScene } from './js/scene_surface.js';
import { SpacecraftCabinScene } from './js/scene_spacecraft.js';
import { SpaceTravelScene } from './js/scene_travel.js';
import { SURFACE_LOCATIONS, DAY_MISSION_LOCATIONS, getCurrentLocationName, getMissionLocationForDay, getObjectiveCoords } from './js/locations.js';
import { cosmosAudio } from './js/audio.js';

let currentOpeningScene = null;
let currentEarthScene = null;
let currentSurfaceScene = null;
let currentSpacecraftScene = null;
let currentTravelScene = null;

function destroyActiveScenes() {
  adventureKeys.clear();
  if (currentOpeningScene) { currentOpeningScene.destroy(); currentOpeningScene = null; window.currentOpeningScene = null; }
  if (currentEarthScene) { currentEarthScene.destroy(); currentEarthScene = null; window.currentEarthScene = null; }
  if (currentTravelScene) { currentTravelScene.destroy(); currentTravelScene = null; window.currentTravelScene = null; }
  if (currentSpacecraftScene) { currentSpacecraftScene.destroy(); currentSpacecraftScene = null; window.currentSpacecraftScene = null; }
  if (currentSurfaceScene) { currentSurfaceScene.destroy(); currentSurfaceScene = null; window.currentSurfaceScene = null; }
}

/* COSMOS: a small, dependency-free mission game client. The API remains the
   source of truth for catalogue missions, evidence, terrain and DONKI data. */
const app = document.querySelector('#app');
const API_BASE = window.COSMOS_API_BASE || '';
const CAMPAIGN_KEY = 'cosmos-campaigns-v5';
const PLAYER_KEY = 'cosmos-player-v4';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const player = Object.assign({name:'', voice:false, score:0, coins:250, boosters:2, activeCampaigns:{}}, read(PLAYER_KEY, {}));
const storedCampaigns = read(CAMPAIGN_KEY, null) || read('cosmos-campaigns-v4', {});
const campaigns = storedCampaigns.profiles || {};
const legacyCampaigns = storedCampaigns.profiles ? {} : storedCampaigns;
let config = null;
let missions = [];
let activeScreen = 'landing';
let activeFilter = 'all';
let selectedMission = null;
let game = null;
let animationFrame = 0;

const save = () => { Object.values(player.activeCampaigns||{}).forEach(id=>{if(campaigns[id])campaigns[id].updatedAt=Date.now();}); localStorage.setItem(PLAYER_KEY, JSON.stringify(player)); localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({version:5,profiles:campaigns})); };
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const cleanName = value => String(value || '').replace(/[^a-zA-Z0-9À-ž ._-]/g,'').trim().replace(/\s+/g,' ').slice(0,20);
const api = async (path, options) => { const response = await fetch(`${API_BASE}${path}`, options); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.detail?.detail || body.detail || `Request failed (${response.status})`); return body; };
const titleCase = value => String(value || '').replace(/\b\w/g, c => c.toUpperCase());
const envName = env => env === 'mars' ? 'Mars surface' : 'Deep space';
const makeCampaignId = (env) => `${env}-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const createCampaign = (env, forceNew=false) => {
  const cleanEnv=String(env||'mars').toLowerCase();
  const activeId=player.activeCampaigns?.[cleanEnv];
  if(!forceNew&&activeId&&campaigns[activeId])return campaigns[activeId];
  if(!forceNew&&!activeId&&legacyCampaigns[cleanEnv]){
    const migrated={...legacyCampaigns[cleanEnv],environment:cleanEnv,callSign:player.name||'Astronaut',campaignId:makeCampaignId(cleanEnv)};
    campaigns[migrated.campaignId]=migrated;player.activeCampaigns[cleanEnv]=migrated.campaignId;save();return migrated;
  }
  if(!forceNew&&!activeId){
    const existing=Object.values(campaigns).filter(c=>c.environment===cleanEnv&&c.callSign===player.name).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    if(existing){player.activeCampaigns[cleanEnv]=existing.campaignId;save();return existing;}
  }
  const id=makeCampaignId(cleanEnv);
  const fresh={campaignId:id,environment:cleanEnv,callSign:player.name||'Astronaut',day:1,completed:[],seed:crypto.randomUUID?.()||String(Date.now()),score:0,storyPhase:'prologue',inventory:[],objectiveState:{},createdAt:Date.now(),updatedAt:Date.now()};
  campaigns[id]=fresh;player.activeCampaigns[cleanEnv]=id;save();return fresh;
};
const campaign = env => createCampaign(env, false);
const toast = (title, message) => app.insertAdjacentHTML('beforeend', `<div class="modal"><div class="glass-modal"><button class="icon-btn close" data-action="close-modal">×</button><span class="kicker">MISSION CONTROL</span><h2>${esc(title)}</h2><p>${esc(message)}</p></div></div>`);

function shell(content, extra='') { app.innerHTML = `<div class="site-shell ${extra}">${content}</div>`; }
function nav(active='') { return `<header class="site-nav"><button class="wordmark" data-action="home"><span class="wordmark-orbit"></span>COSMOS</button><nav><button class="nav-link ${active==='missions'?'active':''}" data-action="missions">Mission deck</button><button class="nav-link ${active==='data'?'active':''}" data-action="data">Science feed</button></nav><div class="nav-status"><span class="status-dot"></span> SYSTEMS NOMINAL</div></header>`; }

function legacyRenderLanding() {
  activeScreen='landing'; cancelAnimationFrame(animationFrame);
  shell(`${nav()}<main class="landing-page"><section class="hero-copy"><div class="kicker"><span class="signal"></span> JUNIOR ASTRONAUT MISSION TRAINER</div><h1>YOUR UNIVERSE.<br><em>YOUR MISSION.</em></h1><p class="hero-lede">Explore the cosmos, discover real space science, and become a junior astronaut.</p><div class="hero-actions"><button class="button button-primary" data-action="profile">START YOUR MISSION <span>↗</span></button><button class="button button-quiet" data-action="missions">EXPLORE THE UNIVERSE <span>↓</span></button></div><div class="hero-meta"><div><b>01</b><span>PROFILE<br>CREATED</span></div><i></i><div><b>02</b><span>MISSION<br>SELECTED</span></div><i></i><div><b>03</b><span>UNIVERSE<br>EXPLORED</span></div></div></section><section class="hero-scene" aria-label="Illustrated astronaut looking across Mars toward a spacecraft"><div class="scene-sky"></div><div class="nebula nebula-a"></div><div class="nebula nebula-b"></div><div class="planet planet-large"></div><div class="planet planet-small"></div><div class="constellation"></div><div class="mountain mountain-back"></div><div class="mountain mountain-mid"></div><div class="mars-ground"></div><div class="rover"><i></i><i></i><b></b></div><div class="astronaut"><div class="astronaut-pack"></div><div class="astronaut-helmet"><span></span></div><div class="astronaut-body"></div><div class="astronaut-arm arm-left"></div><div class="astronaut-arm arm-right"></div><div class="astronaut-leg leg-left"></div><div class="astronaut-leg leg-right"></div></div><div class="scene-caption"><span class="caption-line"></span><small>FIELD LOG 001 / JEZERO CRATER</small><b>THE SURFACE IS WAITING</b></div><div class="scroll-cue">SCROLL TO EXPLORE <span>↓</span></div></section></main><section class="preview-strip"><div><span class="kicker">THE COSMOS ARCHIVE</span><h2>Learn by going<br><em>somewhere new.</em></h2></div><div class="preview-card mars-card"><span>01 / TERRAIN</span><b>MARS<br>SURFACE</b><small>Read the landscape. Make your route.</small></div><div class="preview-card orbit-card"><span>02 / SCIENCE</span><b>DEEP<br>SPACE</b><small>Connect evidence to discovery.</small></div><div class="preview-card station-card"><span>03 / COMMAND</span><b>MISSION<br>CONTROL</b><small>Every journey starts here.</small></div></section>`);
}

function renderProfile() {
  activeScreen='profile'; shell(`${nav()}<main class="center-page"><section class="profile-card glass-panel"><div class="profile-art"><div class="planet planet-small"></div><div class="profile-astronaut"></div></div><div class="profile-form"><span class="kicker">CREW INTAKE / 01</span><h1>Choose your<br><em>call sign.</em></h1><p>PICO-7 will use this name during comms. Your progress is saved on this device.</p><label for="pilot-name">Astronaut name</label><input id="pilot-name" maxlength="20" value="${esc(player.name)}" placeholder="Nova" autocomplete="off"><div class="profile-note"><span class="signal"></span><span>MISSION COMMS <b>READY</b></span><button class="toggle ${player.voice?'on':''}" data-action="voice">${player.voice?'ON':'OFF'}</button></div><button class="button button-primary full" data-action="save-profile">ENTER MISSION CONTROL <span>→</span></button></div></section></main>`);
}

function missionArt(mission, index=0) { const text = `${mission?.title||''} ${mission?.gameplay||''}`.toLowerCase(); return text.includes('mars') || text.includes('terrain') || text.includes('rover') || index%3===0 ? 'mars-card' : text.includes('radiation') || text.includes('lunar') ? 'orbit-card' : 'station-card'; }
function renderMissions() {
  activeScreen='missions'; const filtered = missions.filter(m => activeFilter==='all' || (m.data_status||'').toLowerCase().includes(activeFilter));
  const cards = filtered.slice(0,18).map((m,i) => { const c = campaign('mars'); const done = c.completed.includes(m.mission_id) || campaign('moon').completed.includes(m.mission_id); return `<article class="mission-card"><div class="mission-art ${missionArt(m,i)}"><span class="mission-id">${esc(m.mission_id)}</span><span class="art-orbit"></span><span class="art-subject"></span></div><div class="mission-card-body"><div class="mission-card-top"><span class="kicker">${esc((m.data_status||'SCIENCE BRIEF').split(':')[0])}</span>${done?'<span class="complete-pill">COMPLETED</span>':''}</div><h3>${esc(m.title)}</h3><p>${esc(m.gameplay || m.scientific_correction || 'Explore a new chapter of space science.')}</p><div class="mission-card-footer"><span>${m.data_resource_links?.length || 0} source links</span><button class="text-button" data-mission="${esc(m.mission_id)}">BRIEFING <span>↗</span></button></div></div></article>`; }).join('');
  shell(`${nav('missions')}<main class="deck-page"><section class="deck-heading"><div><span class="kicker">MISSION CONTROL / CATALOGUE</span><h1>Choose your<br><em>next horizon.</em></h1><p>Every mission is selected from the COSMOS catalogue. Read the evidence boundary, then launch a learning challenge.</p></div><div class="deck-stats"><div><b>${missions.length || '—'}</b><span>CATALOGUE<br>MISSIONS</span></div><div><b>${player.score || 0}</b><span>TRAINING<br>POINTS</span></div></div></section><div class="filter-row"><button class="filter ${activeFilter==='all'?'active':''}" data-filter="all">ALL MISSIONS</button><button class="filter ${activeFilter==='partial'?'active':''}" data-filter="partial">RESEARCH + SIMULATION</button><button class="filter ${activeFilter==='simulation'?'active':''}" data-filter="simulation">SIMULATION</button><span class="filter-note">SHOWING ${Math.min(filtered.length,18)} OF ${missions.length}</span></div><section class="mission-grid">${cards || '<div class="empty-state">No missions match that filter.</div>'}</section></main>`);
}

async function openBrief(id) {
  try { const [mission,evidence] = await Promise.all([api(`/api/missions/${encodeURIComponent(id)}`), api(`/api/missions/${encodeURIComponent(id)}/evidence`)]); selectedMission=mission; const context = evidence.overall_evidence_status === 'mapped' ? 'Mapped research references available' : 'No direct evidence mapping for this mission'; app.insertAdjacentHTML('beforeend', `<div class="modal"><div class="brief-modal glass-modal"><button class="icon-btn close" data-action="close-modal">×</button><div class="brief-top"><span class="kicker">${esc(mission.mission_id)} / MISSION BRIEFING</span><span class="evidence-pill ${evidence.overall_evidence_status==='mapped'?'mapped':''}">${esc(context)}</span></div><h2>${esc(mission.title)}</h2><p class="brief-lede">${esc(mission.gameplay || mission.scientific_correction)}</p><div class="brief-grid"><div><span class="label">DATA STATUS</span><b>${esc(mission.data_status)}</b></div><div><span class="label">RESOURCES</span><b>${esc((mission.data_resource_links||[]).join(' · ') || 'Catalogue learning')}</b></div></div><div class="science-boundary"><span class="signal"></span><div><b>SCIENCE BOUNDARY</b><p>${esc(mission.scientific_correction || 'Game choices are simulated learning activities, not operational astronaut instructions.')}</p></div></div><div class="brief-actions"><button class="button button-primary" data-action="launch-mission" data-mission="${esc(mission.mission_id)}">PLAY MISSION <span>→</span></button><button class="button button-quiet" data-action="evidence" data-mission="${esc(mission.mission_id)}">VIEW EVIDENCE</button></div></div></div>`); } catch (error) { toast('Briefing unavailable', error.message); }
}

async function showEvidence(id) { try { const e=await api(`/api/missions/${encodeURIComponent(id)}/evidence`); const items=[...(e.evidence||[]),...(e.radlab_evidence||[]),...(e.csa_evidence||[]),...(e.mola_evidence||[])]; app.insertAdjacentHTML('beforeend', `<div class="modal"><div class="glass-modal evidence-modal"><button class="icon-btn close" data-action="close-modal">×</button><span class="kicker">SOURCE LOG / ${esc(id)}</span><h2>Evidence, with boundaries.</h2><p>Research references remain distinct from simulated game outcomes.</p><div class="evidence-list">${items.length?items.slice(0,8).map(item=>`<div class="evidence-row"><b>${esc(item.source_id || item.source?.source_id || 'SOURCE')}</b><span>${esc(item.evidence_role || item.role || 'supporting reference')}</span></div>`).join(''):'<div class="empty-state">No mapped evidence for this mission. The catalogue explanation remains educational content.</div>'}</div></div></div>`); } catch(error) { toast('Evidence unavailable', error.message); } }

function renderData() { activeScreen='data'; shell(`${nav('data')}<main class="data-page"><section class="data-hero"><span class="kicker">SCIENCE FEED / LIVE BOUNDARIES</span><h1>Real data.<br><em>Clear context.</em></h1><p>COSMOS separates observations, educational explanations, and simulated gameplay so young explorers always know what they are seeing.</p></section><section class="data-grid"><article class="data-card mars-card"><span class="data-icon">MOLA</span><h2>Jezero terrain</h2><p>Elevation, slope, classification, roughness, thermal inertia and dust products are available through the existing terrain routes.</p><button class="text-button" data-action="terrain">OPEN TERRAIN CATALOGUE ↗</button></article><article class="data-card orbit-card"><span class="data-icon">DONKI</span><h2>Space weather</h2><p>NASA CCMC event records are fetched through the bounded DONKI integration. They are not oxygen, radiation, or safety forecasts.</p><button class="text-button" data-action="donki">CHECK EVENT FEED ↗</button></article><article class="data-card station-card"><span class="data-icon">OSDR</span><h2>Mission evidence</h2><p>OSDR, RadLab and Canadian Space Agency references support catalogue missions with explicit limitations.</p><button class="text-button" data-action="missions">BROWSE CATALOGUE ↗</button></article></section><div id="data-output"></div></main>`); }

function renderGame(mission, env='mars') {
  cancelAnimationFrame(animationFrame); const c=campaign(env); const category=mission?.game_context?.category || 'Mission science'; const title=mission?.title || 'Spaceflight readiness';
  game={env,mission,campaign:c,score:0,step:0,completed:false,choices:[],started:performance.now()};
  const tasks = env==='mars' ? [{label:'Scan the field beacon',prompt:'The beacon is blinking beside the rover. Inspect the marker.',choices:['Inspect the beacon','Ignore the beacon'],answer:0,feedback:'Correct. A mission begins by checking the marked instrument.'},{label:'Read the terrain',prompt:'The terrain layer is regional context, not a rover safety limit. What should you do?',choices:['Use the map as context and check the route','Call the steepness an official NASA limit'],answer:0,feedback:'Great distinction. Derived categories support learning; they are not official safety thresholds.'},{label:'Transmit your report',prompt:'What belongs in the final report?',choices:['What you observed and what was simulated','A made-up NASA measurement'],answer:0,feedback:'Exactly. Your report keeps evidence and simulation separate.'}] : [{label:'Review the mission brief',prompt:`This mission is categorized as ${category}. What is your first move?`,choices:['Read the objective and data boundary','Invent a measurement to fill the gap'],answer:0,feedback:'A strong astronaut starts with the brief and its evidence limits.'},{label:'Choose a learning action',prompt:'Which statement is safest for this training simulation?',choices:['Use the activity to explore a concept','Treat a game score as a real forecast'],answer:0,feedback:'Nice work. The game can teach a concept without claiming to predict reality.'},{label:'Transmit your report',prompt:'What belongs in the final report?',choices:['What you observed and what was simulated','A made-up NASA measurement'],answer:0,feedback:'Excellent. Clear reporting is part of being mission-ready.'}];
  game.tasks=tasks; shell(`<div class="game-screen"><canvas id="space-canvas"></canvas><div class="game-vignette"></div><header class="game-nav"><button class="wordmark" data-action="home"><span class="wordmark-orbit"></span>COSMOS</button><div class="game-location"><span class="signal"></span>${envName(env).toUpperCase()} / DAY ${c.day}</div><button class="icon-btn" data-action="game-help">?</button></header><section class="game-copy"><span class="kicker">${esc(mission?.mission_id || 'M001')} / ${esc(category)}</span><h1>${esc(title)}</h1><p>Training simulation · science context stays visible in your mission log.</p></section><aside class="game-objectives glass-panel"><div class="objective-head"><span class="kicker">MISSION PROGRESS</span><b id="game-score">0 PTS</b></div><div class="progress-track"><i id="game-progress"></i></div><div id="game-task-list"></div><div class="game-tip"><b>HOW TO PLAY</b><span>Move through each brief, choose an answer, and earn stars for careful science.</span></div></aside><div class="game-console glass-panel" id="game-console"></div><div class="game-footer"><span>SIMULATED GAMEPLAY</span><span>↑ ↓ / touch choices</span><button class="text-button" data-action="game-exit">EXIT TO MISSION DECK ↗</button></div></div>`);
  drawGameScene(); renderTask();
}

function drawGameScene() { const canvas=document.querySelector('#space-canvas'); if(!canvas)return; const ctx=canvas.getContext('2d'); const dpr=Math.min(2,devicePixelRatio||1); canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;ctx.scale(dpr,dpr);const w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);const mars=game.env==='mars';const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,mars?'#100e28':'#050816');sky.addColorStop(.55,mars?'#34203b':'#0b1740');sky.addColorStop(1,mars?'#6f342c':'#101b38');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);for(let i=0;i<110;i++){const x=(i*97+31)%w,y=(i*53+17)%(h*.7),r=(i%3)+.3;ctx.fillStyle=`rgba(220,235,255,${.35+(i%4)/8})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}if(!mars){ctx.fillStyle='#6c4fbc55';ctx.beginPath();ctx.ellipse(w*.68,h*.3,w*.4,h*.12,-.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d7e9ff';ctx.beginPath();ctx.arc(w*.78,h*.22,55,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle='#9a463e';ctx.beginPath();ctx.moveTo(0,h*.72);ctx.lineTo(w*.18,h*.45);ctx.lineTo(w*.36,h*.67);ctx.lineTo(w*.56,h*.4);ctx.lineTo(w*.8,h*.62);ctx.lineTo(w,h*.47);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();}ctx.fillStyle=mars?'#4b2024':'#0e1830';ctx.beginPath();ctx.moveTo(0,h*.77);ctx.quadraticCurveTo(w*.26,h*.58,w*.48,h*.78);ctx.quadraticCurveTo(w*.7,h*.6,w,h*.75);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.fill();ctx.fillStyle=mars?'#b95d42':'#172c58';ctx.fillRect(w*.69,h*.58,3,150);ctx.fillRect(w*.69+18,h*.58+12,3,130);ctx.strokeStyle=mars?'#e99565':'#6ccfff';ctx.lineWidth=2;ctx.strokeRect(w*.69-35,h*.56,74,45);ctx.fillStyle='#dfefff';ctx.beginPath();ctx.arc(w*.25,h*.63,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#7e9ab7';ctx.fillRect(w*.235,h*.65,30,62);ctx.fillStyle='#b9d8ec';ctx.fillRect(w*.25,h*.74,10,55);ctx.fillRect(w*.29,h*.74,10,55);ctx.fillStyle='#202e4b';ctx.fillRect(w*.24,h*.64,20,12); }
function renderTask(){if(!game)return; const task=game.tasks[game.step]; document.querySelector('#game-score').textContent=`${game.score} PTS`;document.querySelector('#game-progress').style.width=`${game.step/game.tasks.length*100}%`;document.querySelector('#game-task-list').innerHTML=game.tasks.map((t,i)=>`<div class="game-task ${i<game.step?'done':''} ${i===game.step?'current':''}"><span>${i<game.step?'✓':String(i+1).padStart(2,'0')}</span><b>${esc(t.label)}</b></div>`).join(''); if(!task){completeGame();return;}document.querySelector('#game-console').innerHTML=`<div class="console-top"><span class="kicker">PICO-7 / ACTIVE BRIEF</span><span class="console-blink">● LIVE</span></div><h2>${esc(task.prompt)}</h2><p>Choose the response that keeps the science clear.</p><div class="choice-grid">${task.choices.map((c,i)=>`<button class="choice-button" data-choice="${i}"><span>${String.fromCharCode(65+i)}</span>${esc(c)}<b>↗</b></button>`).join('')}</div>`;}
function choose(index){const task=game?.tasks[game.step];if(!task)return; const correct=index===task.answer;game.score+=correct?100:25;game.choices.push(correct);document.querySelector('#game-console').innerHTML=`<div class="feedback ${correct?'correct':'retry'}"><span class="feedback-mark">${correct?'✓':'!'}</span><span class="kicker">${correct?'MISSION LOG UPDATED':'TRY AGAIN WITH CARE'}</span><h2>${correct?'Excellent call.':'Good instinct to check.'}</h2><p>${esc(task.feedback)}</p><button class="button button-primary" data-action="next-task">${game.step===game.tasks.length-1?'OPEN MISSION REPORT':'NEXT BRIEF'} <span>→</span></button></div>`;}
function completeGame(){if(game.completed)return;game.completed=true;game.campaign.score=(game.campaign.score||0)+game.score;player.score=(player.score||0)+game.score;game.campaign.completed.push(game.mission?.mission_id || 'M001');game.campaign.day=Math.min(30,(game.campaign.day||1)+1);save();document.querySelector('#game-progress').style.width='100%';document.querySelector('#game-console').innerHTML=`<div class="feedback complete"><span class="feedback-mark">✦</span><span class="kicker">MISSION COMPLETE / ${game.score} POINTS</span><h2>Report accepted,<br><em>${esc(player.name || 'Astronaut')}.</em></h2><p>You kept the evidence boundary clear and completed the training challenge. That is real mission discipline.</p><div class="reward-row"><span>★</span><b>${game.score} TRAINING POINTS</b><small>DAY ${game.campaign.day-1} COMPLETE</small></div><button class="button button-primary" data-action="missions">RETURN TO MISSION DECK <span>→</span></button></div>`;}

async function launchSelected(id){try{const env=selectedMission?.game_context?.environment || 'mars';const mission=selectedMission || await api(`/api/missions/${encodeURIComponent(id)}`);mission.game_context={...(mission.game_context||{}),environment:env,category:mission.game_context?.category || 'Mission science'};renderGame(mission,env);}catch(error){toast('Launch held',error.message);}}
async function loadMissions(){try{const result=await api('/api/missions');missions=result.missions||[];renderMissions();}catch(error){toast('Catalogue offline',error.message);renderMissions();}}

document.addEventListener('click', async event => { const b=event.target.closest('button'); if(!b)return; const a=b.dataset.action; if(a!=='home')return; try { renderLanding(); } catch(error){toast('Mission control error',error.message);} });
document.addEventListener('click', event => { const card=event.target.closest('[data-mission]'); if(card && !event.target.closest('[data-action]'))openBrief(card.dataset.mission); const filter=event.target.closest('[data-filter]'); if(filter){activeFilter=filter.dataset.filter;renderMissions();} const choice=event.target.closest('[data-choice]'); if(choice)choose(Number(choice.dataset.choice)); });
window.addEventListener('resize',()=>{if(game)drawGameScene();if(currentOpeningScene)currentOpeningScene.resize();if(currentEarthScene)currentEarthScene.resize();if(currentTravelScene)currentTravelScene.resize();if(currentSpacecraftScene)currentSpacecraftScene.resize();if(currentSurfaceScene)currentSurfaceScene.resize();});
(async()=>{try{config=await api('/api/game/config');renderLanding();}catch(error){shell(`${nav()}<main class="center-page"><section class="glass-panel error-panel"><span class="kicker">MISSION CONTROL OFFLINE</span><h1>We lost the uplink.</h1><p>${esc(error.message)}</p><button class="button button-primary" data-action="home">RETRY <span>↻</span></button></section></main>`);}})();

/* Adventure repair layer.  The catalogue UI above remains available, while
   this layer restores the playable WebGL journey that the game is built for. */
Object.assign(player,{lives:Number.isFinite(player.lives)?player.lives:5,livesAt:player.livesAt||Date.now()});
const adventureKeys=new Set(); let adventureGL=null; let adventureLast=0;
const regenLives=()=>{const now=Date.now(); if(player.lives<5){const amount=Math.min(5-player.lives,Math.floor((now-(player.livesAt||now))/600000));if(amount){player.lives+=amount;player.livesAt+=amount*600000;save();}}};
const speakAdventure=text=>{if(!player.voice||!('speechSynthesis' in window))return;speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text));};
// Shared ground movement for the spacecraft cabin and planetary surface. The
// scene render loops own rendering; this function owns only game-state motion,
// so keyboard input remains usable after every scene transition.
function moveAdventure(dt){
  if(!game)return;
  if(game.vehicle==='rover'){
    moveRover(dt);
    return;
  }

  const forward=adventureKeys.has('w')||adventureKeys.has('arrowup');
  const reverse=adventureKeys.has('s')||adventureKeys.has('arrowdown');
  const left=adventureKeys.has('a')||adventureKeys.has('arrowleft');
  const right=adventureKeys.has('d')||adventureKeys.has('arrowright');
  const dx=(right?1:0)-(left?1:0);
  const dz=(forward?-1:0)+(reverse?1:0);
  const inputLength=Math.hypot(dx,dz);
  const moving=inputLength>0;
  const speed=adventureKeys.has('shift') ? 4.8 : 2.8;
  let moveX=0;
  let moveZ=0;

  if(moving){
    const nx=dx/inputLength;
    const nz=dz/inputLength;
    const yaw=game.yaw||0;
    const forwardX=-Math.sin(yaw);
    const forwardZ=-Math.cos(yaw);
    const rightX=-forwardZ;
    const rightZ=forwardX;
    moveX=(forwardX*-nz+rightX*nx)*speed*dt;
    moveZ=(forwardZ*-nz+rightZ*nx)*speed*dt;
    const current=game.player;
    const obstacles=currentSurfaceScene?.obstacles||[];
    const radius=0.48;
    const blocked=(x,z)=>obstacles.some(([ox,oz,r])=>Math.hypot(x-ox,z-oz)<r+radius);
    const bounds=game.phase==='surface'
      ? {minX:-110,maxX:110,minZ:-110,maxZ:110}
      : {minX:-6.2,maxX:6.2,minZ:-5.6,maxZ:6.4};
    const candidateX=Math.max(bounds.minX,Math.min(bounds.maxX,current.x+moveX));
    const candidateZ=Math.max(bounds.minZ,Math.min(bounds.maxZ,current.z+moveZ));
    // Resolve each axis independently so an obstacle slides the astronaut
    // instead of trapping them or cancelling both directions.
    if(!blocked(candidateX,current.z))current.x=candidateX;
    if(!blocked(current.x,candidateZ))current.z=candidateZ;

    const target=Math.atan2(moveX,moveZ);
    let difference=target-(game.facing||0);
    while(difference>Math.PI)difference-=Math.PI*2;
    while(difference<-Math.PI)difference+=Math.PI*2;
    game.facing=(game.facing||0)+difference*Math.min(1,dt*12);
  }

  if(adventureKeys.has(' ')&&!game.jumpHeld&&game.player.y<=0.001){
    game.player.vy=5.2;
    game.jumpHeld=true;
  }
  if(!adventureKeys.has(' '))game.jumpHeld=false;
  game.player.vy=(game.player.vy||0)-14*dt;
  game.player.y=Math.max(0,(game.player.y||0)+game.player.vy*dt);
  if(game.player.y===0)game.player.vy=0;
  game.moving=moving;
  game.moveSpeed=moving?speed:0;
  updateLifeSupport(dt);
}

function updateLifeSupport(dt){
  if (!game?.campaign?.resources) return;
  const res = game.campaign.resources;
  if (typeof res.oxygen !== 'number') res.oxygen = 78;
  if (typeof res.energy !== 'number') res.energy = 72;

  const isRover = game.vehicle === 'rover' && game.rover;
  const px = isRover ? game.rover.position.x : game.player.x;
  const pz = isRover ? game.rover.position.z : game.player.z;
  const moving = isRover ? Math.abs(game.rover.speed) > 0.1 : Boolean(game.moving);
  const sprinting = !isRover && moving && adventureKeys.has('shift');

  if (game.phase === 'surface') {
    const nearGreenhouse = Math.hypot(px - (-22), pz - (-14)) < 6.5;
    const nearHabitat = Math.hypot(px - (-12), pz - 4) < 5.0 || Math.hypot(px, pz) < 4.5;
    const nearSolar = Math.hypot(px - 14, pz - 8) < 5.5;

    if (nearGreenhouse) {
      res.oxygen = Math.min(100, res.oxygen + dt * 4.5);
      if (!game.lastReplenishAlert || performance.now() - game.lastReplenishAlert > 10000) {
        sayAdventure('Biodome atmosphere detected. Life support oxygen actively replenishing.');
        game.lastReplenishAlert = performance.now();
      }
    } else if (nearHabitat) {
      res.oxygen = Math.min(100, res.oxygen + dt * 3.5);
      res.energy = Math.min(100, res.energy + dt * 3.0);
    } else {
      const oxDrain = sprinting ? 0.35 : (moving ? 0.16 : 0.06);
      res.oxygen = Math.max(5, res.oxygen - dt * oxDrain);
    }

    if (nearSolar) {
      res.energy = Math.min(100, res.energy + dt * 5.0);
      if (!game.lastPowerAlert || performance.now() - game.lastPowerAlert > 10000) {
        sayAdventure('Solar substation inductive coupling active. Battery power recharging.');
        game.lastPowerAlert = performance.now();
      }
    } else if (!nearHabitat) {
      const pwrDrain = isRover ? (moving ? 0.40 : 0.08) : (sprinting ? 0.22 : (moving ? 0.12 : 0.04));
      res.energy = Math.max(5, res.energy - dt * pwrDrain);
    }

    if (res.oxygen < 20 && (!game.lastLowOxAlert || performance.now() - game.lastLowOxAlert > 18000)) {
      sayAdventure('Warning: Suit oxygen low (<20%). Return to the Biodome greenhouse or habitat!');
      activePicoScene()?.setPicoEmotion?.('alert');
      game.lastLowOxAlert = performance.now();
    }
  } else if (game.phase === 'spacecraft') {
    res.oxygen = Math.min(100, res.oxygen + dt * 2.0);
    res.energy = Math.min(100, res.energy + dt * 2.0);
  }

  game.hudTimer = (game.hudTimer || 0) + dt;
  if (game.hudTimer > 0.12) {
    game.hudTimer = 0;
    updateAdventureHud();
  }
}
const adventureProfile=(env,forceNew=false)=>{const profile=createCampaign(env,forceNew);if(!profile.resources&&config?.starting_resources)profile.resources={...config.starting_resources};if(!profile.inventory)profile.inventory=[];if(!profile.objectiveState)profile.objectiveState={};return profile;};
const campaignHistory=c=>{
  const day = Math.max(1, Math.min(30, c.day || 1));
  const expected = Array.from({length: day - 1}, (_, i) => `M${String(i + 1).padStart(3, '0')}`);
  if (!Array.isArray(c.completed) || c.completed.length !== expected.length || !expected.every((m, i) => c.completed[i] === m)) {
    c.completed = expected.slice();
    save();
  }
  return c.completed.slice();
};
async function selectCampaignMission(env,c){
  const cleanEnv = String(env || 'mars').toLowerCase();
  return api('/api/game/select-mission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({environment:cleanEnv,day:c.day||1,player_seed:c.seed,history:campaignHistory(c)})});
}
async function getGeneratedMission(env,c,day,mission){
  c.generatedMissions=c.generatedMissions||{};
  const key=mission?.mission_id||`M${String(day).padStart(3,'0')}`;
  if(c.generatedMissions[key])return c.generatedMissions[key];
  const generated=await api('/api/game/generate-mission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({environment:String(env||'mars').toLowerCase(),day,player_seed:c.seed,history:campaignHistory(c)})});
  c.generatedMissions[key]=generated;save();return generated;
}
function surfaceTasks(mission,env){
  const objectives=mission?.game_context?.objectives||[];
  const day = mission?.game_context?.day || game?.campaign?.day || 10;
  const location = getMissionLocationForDay(day, env);
  const coords = getObjectiveCoords(mission?.mission_id || `M${String(day).padStart(3,'0')}`, env);
  return objectives.map((objective,index)=>{
    const pos = coords[index] || [location.coords[0] + index * 2 - 2, location.coords[1]];
    return {
      id:objective.id,
      objectiveId:objective.id,
      label:objective.description,
      kind:objective.interaction||'interact',
      interaction:objective.interaction,
      completionAction:objective.completion_action,
      activity:objective.activity,
      targetName:objective.target,
      locationId:location.id,
      locationName:location.name,
      pos:pos,
      hint:`${objective.description} [${location.name}] Approach the ${objective.target||'marked station'} and press E.`,
      state:{},
    };
  });
}
let picoConversationOpen=false;
function activePicoScene(){
  if(game?.phase==='prologue') return currentEarthScene;
  if(game?.phase==='spacecraft'||game?.phase==='landing') return currentSpacecraftScene;
  return currentSurfaceScene;
}
function picoPosition(){return activePicoScene()?.getPicoPosition?.()||null;}
function picoNearby(){const position=picoPosition();return Boolean(position&&game&&Math.hypot(position.x-game.player.x,position.z-game.player.z)<1.35);}
function nextPicoObjective(){return activeAdventureTasks().find(task=>!task.done)||null;}
function picoContext(){
  const mission=game?.mission||{};
  const context=mission.game_context||{};
  return {
    destination:game?.destination||game?.env||'Earth facility',
    day:game?.phase==='spacecraft'||game?.phase==='landing'?(game.spaceDay||1):game?.campaign?.day||context.day||1,
    missionId:game?.phase==='spacecraft'||game?.phase==='landing'?`SPACE-${game.spaceDay||9}`:game?.missionId||mission.mission_id||'M001',
    title:game?.aiMission?.title||(game?.phase==='spacecraft'||game?.phase==='landing'?spaceDayMission(game.spaceDay||8).title:mission.title||'Spaceflight readiness'),
    gameplay:game?.aiMission?.scenario||mission.gameplay||'',
    science:game?.aiMission?.science||mission.scientific_correction||'',
    completed:activeAdventureTasks().filter(task=>task.done).map(task=>task.label),
    incomplete:activeAdventureTasks().filter(task=>!task.done).map(task=>task.label),
    inventory:game?.campaign?.inventory||[],
    resources:game?.campaign?.resources||null,
    vehicle:game?.vehicle||null,
    hazards:context.hazards||[],
    history:game?.campaign?.completed||[],
  };
}
function guidePicoToObjective(task){
  if(!task)return;
  game.guidedObjectiveId=task.id;
  activePicoScene()?.setPicoGuideTarget?.(task.pos);
  updateAdventureHud();
}
function clearPicoGuide(task){
  if(game.guidedObjectiveId===task.id){game.guidedObjectiveId=null;activePicoScene()?.setPicoGuideTarget?.(null);}
}
function persistMissionState(){
  if(!game?.campaign||game.phase==='prologue'||!game.missionId)return;
  game.campaign.activeMissionId=game.missionId;
  game.campaign.objectiveState=Object.fromEntries(activeAdventureTasks().map(t=>[t.id,{done:Boolean(t.done),progress:t.progress||0,state:t.state||{}}]));
  game.campaign.inventory=[...(game.campaign.inventory||[])];
  game.campaign.resources={...(game.campaign.resources||{})};
  save();
}
function restoreMissionState(tasks,c){
  const stored=c.activeMissionId===tasks[0]?.id?.split('-')[0].toUpperCase()?(c.objectiveState||{}):{};
  return tasks.map(t=>{const s=stored[t.id];return s?{...t,done:Boolean(s.done),progress:s.progress||0,state:s.state||{}}:t;});
}
function resourceAmount(name){return Number(game?.campaign?.resources?.[name]||0);}
function adjustResources(changes){
  const resources=game.campaign.resources||{};
  for(const [name,value] of Object.entries(changes||{}))if(value<0&&resourceAmount(name)<Math.abs(value))return false;
  for(const [name,value] of Object.entries(changes||{}))resources[name]=Math.max(0,resourceAmount(name)+value);
  game.campaign.resources=resources;return true;
}
function completeTask(task){
  task.done=true;task.progress=task.requiredSteps||1;task.state={...(task.state||{}),completedAction:task.completionAction};
  if(task.completionAction==='deploy_martian_drone'&&game.rover){game.rover.deployed=true;game.rover.position={x:game.player.x,z:game.player.z-1.4};}
  game.objectiveEvidence=game.objectiveEvidence||{};game.objectiveEvidence[task.id]=task.completionAction;
  clearPicoGuide(task);activePicoScene()?.setPicoEmotion?.('happy');persistMissionState();
  sayAdventure(`${task.label} complete. Nice work, ${player.name||'astronaut'}.`);
}
function performTask(task){
  if(task.done)return;
  if(task.completionAction==='request_earth_supply'){
    if(game.campaign.earthSupplyRequestUsed){sayAdventure('The one-time Earth supply request has already been used. We must ration the recorded reserves.');activePicoScene()?.setPicoEmotion?.('concerned');return;}
    game.campaign.earthSupplyRequestUsed=true;
    adjustResources({food:18,water:12,oxygen:10});
  }
  if(task.interaction==='pickup'){
    const item=task.targetName||task.id;
    if(!game.campaign.inventory.includes(item))game.campaign.inventory.push(item);
  }
  const action=task.completionAction||task.id;
  const costs=task.interaction==='resource'?{energy:-3}:task.interaction==='repair'?{equipment:-2}:task.interaction==='observe'?{energy:-1}:{};
  if(!adjustResources(costs)){activePicoScene()?.setPicoEmotion?.('concerned');sayAdventure('We do not have enough recorded resources for that action. Check supplies or ask PICO-7 for a plan.');return;}
  task.requiredSteps=task.requiredSteps||(['repair','plant','experiment','rover','choose'].includes(task.interaction)?2:1);
  task.progress=(task.progress||0)+1;
  task.state={...(task.state||{}),lastAction:action};
  if(task.progress<task.requiredSteps){persistMissionState();sayAdventure(`Step ${task.progress} of ${task.requiredSteps}: ${task.label}`);activePicoScene()?.setPicoEmotion?.('curious');return;}
  completeTask(task);
}
function picoResponse(question){
  const q=String(question||'').trim().toLowerCase();
  const context=picoContext();
  const next=nextPicoObjective();
  const origin=game?.vehicle==='rover'&&game.rover?game.rover.position:(game?.player||{x:0,z:0});
  const dist=next?Math.round(Math.hypot(next.pos[0]-origin.x,next.pos[1]-origin.z)):0;
  const dx=next?next.pos[0]-origin.x:0;
  const dz=next?next.pos[1]-origin.z:0;
  let dir='ahead';
  if(Math.abs(dx)>Math.abs(dz)*2) dir=dx>0?'east':'west';
  else if(Math.abs(dz)>Math.abs(dx)*2) dir=dz>0?'south':'north';
  else if(dx!==0||dz!==0) dir=(dz>0?'south':'north')+'-'+(dx>0?'east':'west');
  const locName=next?.locationName||(game?.phase==='surface'?getCurrentLocationName(next?.pos?.[0]||0,next?.pos?.[1]||0,game.env):'the marked station');

  if(/rover|drive|steer|wheel|crater/.test(q)||context.vehicle==='rover'){
    if(/how|control|drive|steer/.test(q)||context.vehicle==='rover')return {text:context.vehicle==='rover'?'Rover control: W or Up accelerates, S or Down reverses, A and D steer, and Space brakes. Watch the rocks and follow the glowing science marker.':'Approach the rover and press E to enter. W/S drive, A/D steer, Space brakes, and E exits after you are safely parked.',emotion:'curious'};
    if(/instrument|scan|science/.test(q))return {text:'The rover mast camera helps us scan terrain and craters. Reach the glowing science marker, then press E to record the scan and collect evidence.',emotion:'excited'};
  }
  if(/what should i do next|what do i do next|next step|next objective|do next/.test(q)){
    if(!next)return {text:`All required objectives for ${context.missionId} are complete. Mission control is ready to validate the mission report.`,emotion:'happy'};
    guidePicoToObjective(next);
    if(game?.phase==='surface'&&dist>35){
      return {text:`Commander, our next destination is ${locName}, approximately ${dist} metres to the ${dir}. Let's take the rover and investigate the area.`,emotion:'excited'};
    }
    return {text:`We are on Day ${context.day}, ${context.missionId}: ${context.title}. Next: ${next.label} (${dist}m ${dir} at ${locName}). Follow the beacon and press E when close.`,emotion:'curious'};
  }
  if(/where should i go|where do i go|show me|lead me|location/.test(q)){
    if(!next)return {text:'There is no remaining objective location. We are ready for mission validation.',emotion:'happy'};
    guidePicoToObjective(next);
    if(game?.phase==='surface'&&dist>35){
      return {text:`Follow the glowing beacon toward ${locName}, approximately ${dist} metres to the ${dir}. The rover is recommended for this distance!`,emotion:'excited'};
    }
    return {text:`Follow me toward ${locName} (${dist}m ${dir}) for: ${next.label}`,emotion:'excited'};
  }
  if(/explain (this )?mission|what is this mission|mission about/.test(q)){
    return {text:`This is ${context.missionId}, “${context.title},” on Day ${context.day} in the ${context.destination} campaign. ${context.gameplay||'We will complete each marked objective and keep the science evidence separate from the simulation.'}`,emotion:'curious'};
  }
  if(/equipment|gear|tool/.test(q)){
    const inventory=context.inventory.length?context.inventory.join(', '):'no carried equipment is recorded';
    return {text:`Your recorded inventory contains ${inventory}. I will not claim equipment is available unless mission control records it.`,emotion:'calm'};
  }
  if(/science|why is this happening|why/.test(q)){
    return {text:context.science||`This mission teaches ${context.title.toLowerCase()}. I can explain the marked objective, but I will not invent a NASA measurement or safety limit.`,emotion:'curious'};
  }
  if(/hint|help|stuck/.test(q)){
    if(!next)return {text:'You are not stuck: every required objective is complete. Mission control is ready for the report.',emotion:'happy'};
    guidePicoToObjective(next);
    return {text:`Hint: start with “${next.label}” and look for its glowing objective marker.`,emotion:'excited'};
  }
  if(context.day===20)return {text:`Happy birthday, ${player.name||'astronaut'}! We still have a mission to complete, so let’s make the ration plan carefully.`,emotion:'happy'};
  if(context.day===27)return {text:'A second explorer is joining the mission. Let’s make space, check the habitat, and welcome them safely.',emotion:'excited'};
  if(context.day===28)return {text:'This is a team-science day. We will compare observations, share the work, and report what the experiment actually showed.',emotion:'curious'};
  if(context.day===30)return {text:'This is our final mission day. We will complete the report, preserve the evidence, and prepare a careful hand-over together.',emotion:'calm'};
  return {text:`I’m tracking ${context.missionId}, “${context.title}.” Ask me what to do next, where to go, or ask for a hint.`,emotion:'curious'};
}
function openPicoConversation(question=''){
  const panel=document.querySelector('#pico-conversation');
  if(!panel)return;
  picoConversationOpen=true; panel.hidden=false;
  const input=document.querySelector('#pico-input');
  if(question){if(input)input.value=question;showPicoResponse(question);}
  else if(input)input.focus();
  activePicoScene()?.setPicoTalking?.(true);
}
function closePicoConversation(){
  picoConversationOpen=false;
  document.querySelector('#pico-conversation')?.setAttribute('hidden','');
  activePicoScene()?.setPicoTalking?.(false);
}
function showPicoResponse(question){
  const answer=picoResponse(question);
  const output=document.querySelector('#pico-response');
  if(output)output.textContent=answer.text;
  activePicoScene()?.setPicoEmotion?.(answer.emotion);
  sayAdventure(answer.text);
}
function sendPicoMessage(){
  const input=document.querySelector('#pico-input');
  const question=input?.value.trim();
  if(!question)return;
  showPicoResponse(question);
  if(input)input.value='';
}
function startPicoMic(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){sayAdventure('Voice input is not available in this browser. You can always type your question.');return;}
  const recognition=new Recognition();
  recognition.lang='en-US'; recognition.interimResults=false; recognition.maxAlternatives=1;
  recognition.onresult=event=>{const input=document.querySelector('#pico-input');if(input)input.value=event.results[0][0].transcript;sendPicoMessage();};
  recognition.onerror=()=>sayAdventure('I could not hear that clearly. Please type the question or try the microphone again.');
  recognition.start();
}
function picoGreeting(){
  const context=picoContext();
  if(context.day===20)return `Happy birthday, ${player.name||'astronaut'}! I saved a little celebration for after we finish today's ration plan.`;
  if(context.day===27)return 'I detect a new explorer on the mission schedule. We will welcome them and check the habitat together.';
  if(context.day===28)return 'Team science day! I will compare our observations while you lead the experiment.';
  if(context.day===30)return 'This is our final mission day, friend. We will make the hand-over report precise and meaningful.';
  if(game?.phase==='prologue')return `Welcome to Earth, ${player.name||'astronaut'}. I am PICO-7. Prepare the launch checklist, then I will stay with you for the campaign.`;
  if(game?.phase==='transit')return 'Navigation is ready. Walk to the route console, choose Mars or the Moon, and I will guide you through eight short space days.';
  if(game?.phase==='spacecraft')return game.aiMission?.scenario||spaceDayMission(game.spaceDay||1).dialogue;
  if(game?.phase==='landing')return `Day 9 touchdown: ${game.env==='mars'?'Mars':'the Moon'} is below us. Begin the landing sequence.`;
  return `Welcome to ${context.destination}, ${player.name||'astronaut'}. We are on ${context.missionId}: ${context.title}. Ask me what to do next at any time.`;
}
function findActiveExpedition(){
  const active=Object.values(player.activeCampaigns||{}).map(id=>campaigns[id]).filter(Boolean).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  for (const c of active) {
    if ((c.completed && c.completed.length > 0) || (c.spaceDay && c.spaceDay > 1) || (c.day && c.day > 1) || c.storyPhase === 'surface' || c.storyPhase === 'spacecraft') {
      const day = c.day > 1 ? c.day : (c.spaceDay ? c.spaceDay : 1);
      return { env:c.environment, day, name:c.callSign||player.name||'Astronaut', campaignId:c.campaignId };
    }
  }
  return null;
}
function savedExpeditions(){return Object.values(campaigns).filter(c=>c&&c.callSign&&c.environment&&((c.completed?.length||0)>0||c.day>1||c.spaceDay>1||c.storyPhase==='surface'||c.storyPhase==='spacecraft')).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));}
function renderLanding(){
  activeScreen='landing';
  cancelAnimationFrame(animationFrame);
  if(currentOpeningScene){ currentOpeningScene.destroy(); currentOpeningScene=null; }
  if(currentEarthScene){ currentEarthScene.destroy(); currentEarthScene=null; }
  if(currentSurfaceScene){ currentSurfaceScene.destroy(); currentSurfaceScene=null; }
  cosmosAudio.setScene('title');
  const active = findActiveExpedition();
  const saved=savedExpeditions();
  const resumeBtn = saved.length ? `<div class="saved-expeditions">${saved.slice(0,3).map(c=>`<button class="button-resume-glow" data-action="resume-landing" data-env="${c.environment}" data-campaign-id="${esc(c.campaignId)}"><span>${esc(c.callSign)}</span><small>${c.environment==='mars'?'MARS':'MOON'} · DAY ${Math.min(30,c.day||1)}</small><b>CONTINUE ↗</b></button>`).join('')}</div>` : '';

  shell(`<main class="cosmos-title-stage"><canvas id="opening-canvas"></canvas><div class="title-scanlines"></div><div class="title-brand"><span class="kicker"><span class="signal"></span> JUNIOR SPACE EXPEDITION</span><h1>COS<br><em>MOS</em></h1><p>Every great discovery starts with one small step beyond the airlock.</p><div class="title-actions"><button class="button-primary-glow" data-action="setup">START NEW MISSION <span>↗</span></button><button class="button-quiet-glow" data-action="audio">${player.voice?'AUDIO ON':'ENABLE AUDIO'}</button></div></div><aside class="expedition-dock"><div class="dock-head"><span>EXPEDITION LOG</span><b>01 — 30</b></div><h2>Earth orbit<br><em>is calling.</em></h2><p>Choose a callsign, prepare your suit, board the expedition craft and travel to a world you can study.</p><div class="dock-route"><span class="route-node active"><i></i><b>EARTH</b><small>PREPARE</small></span><span class="route-line"></span><span class="route-node"><i></i><b>DEEP SPACE</b><small>TRAVEL</small></span><span class="route-line"></span><span class="route-node"><i></i><b>MARS / MOON</b><small>EXPLORE</small></span></div><div class="dock-stat"><span>SIMULATION</span><b>3D / SCIENCE-LED</b></div><div class="dock-stat"><span>COMPANION</span><b>PICO-7 ONLINE</b></div>${resumeBtn}<div class="life-note">${'♥'.repeat(player.lives)}${'♡'.repeat(5-player.lives)} &nbsp; <span class="landing-coins">✦ ${player.coins||0}</span> &nbsp; <span class="landing-boosters">✚ ${player.boosters||0}</span></div></aside><div class="title-footer"><span>EARTH / LOW ORBIT</span><span>MISSION CONTROL // READY</span></div></main>`);
  const canvas=document.querySelector('#opening-canvas');
  if(canvas){
    try{ currentOpeningScene=new OpeningScene(canvas); window.currentOpeningScene=currentOpeningScene; }
    catch(err){ console.error('OpeningScene init error:', err); }
  }
}
function renderSetup(){
  if(currentOpeningScene){ currentOpeningScene.destroy(); currentOpeningScene=null; window.currentOpeningScene=null; }
  shell(`<main class="intake-screen"><div class="intake-stars"></div><div class="intake-orbit orbit-a"></div><div class="intake-orbit orbit-b"></div><section class="intake-copy"><span class="intake-kicker">COSMOS / CREW INTAKE</span><h1>Choose the name<br>we call you <em>out there.</em></h1><p>Your callsign appears in PICO-7's comms and your expedition log. The first stop is always the Earth launch facility.</p><div class="intake-rule"><i></i><span>EARTH DEPARTURE / FLIGHT CANDIDATE 01</span></div></section><section class="callsign-console"><div class="console-screw"></div><span class="console-label">PICO-7 COMMUNICATION LINK</span><div class="pico-mini"><span></span><i></i><b>PICO-7</b></div><label for="pilot-name">CALLSIGN</label><input id="pilot-name" maxlength="20" value="${esc(player.name)}" placeholder="NOVA" autocomplete="off"><p>Use 2–20 letters, numbers, spaces, or hyphens.</p><div class="console-actions"><button class="console-submit" data-action="save-profile">ENTER EARTH FACILITY <span>↗</span></button><button class="console-audio" data-action="audio">${player.voice?'VOICE ON':'VOICE OFF'}</button></div></section><div class="intake-footer"><span>NO DESTINATION CHOSEN YET</span><span>COMMS ${player.voice?'ENABLED':'STANDBY'}</span></div></main>`);
}
function renderDestination(){
  regenLives();
  destroyActiveScenes();
  const destinations = [
    {
      id: 'mars',
      name: 'Mars Expedition',
      badge: 'NASA PERSEVERANCE // MASTCAM-Z',
      coords: '18.38° N, 77.58° E · JEZERO CRATER',
      tagline: 'Read the ancient lacustrine delta terrain, deploy the scout drone, and collect core samples.'
    },
    {
      id: 'moon',
      name: 'Lunar Artemis Expedition',
      badge: 'NASA APOLLO 11 // TRANQUILITY BASE',
      coords: '0.674° N, 23.473° E · SEA OF TRANQUILITY',
      tagline: 'Traverse the impact-cratered regolith, inspect the lander, and conduct seismic surface telemetry.'
    }
  ];

  const cards = destinations.map(e => {
    const c = campaign(e.id);
    const hasProgress = c && ((c.completed && c.completed.length > 0) || (c.day && c.day > 1) || (c.spaceDay && c.spaceDay > 1));
    const currentDay = c ? (c.day > 1 ? c.day : (c.spaceDay ? c.spaceDay : 1)) : 1;
    const btnText = hasProgress ? `CONTINUE ${c.callSign||player.name||'ASTRONAUT'} · DAY ${currentDay} ↗` : `BEGIN NEW EXPEDITION ↗`;

    return `
      <article class="destination ${e.id}">
        <div class="destination-art">
          <span class="destination-badge">${esc(e.badge)}</span>
          <span class="destination-coords">${esc(e.coords)}</span>
        </div>
        <div class="destination-content">
          <span class="kicker">${esc(e.coords.split('·')[1]?.trim() || e.id.toUpperCase())}</span>
          <h2>${esc(e.name)}</h2>
          <p>${esc(e.tagline)}</p>
          <button class="destination-launch" data-env="${e.id}" data-new="${hasProgress?'false':'true'}"><strong>${btnText}</strong></button>
          ${hasProgress?`<button class="destination-new" data-env="${e.id}" data-new="true">START A FRESH ${e.id.toUpperCase()} CAMPAIGN</button>`:''}
        </div>
      </article>
    `;
  }).join('');

  shell(`<main class="route-screen"><header class="route-header"><button class="route-wordmark" data-action="home">COSMOS <span>/ SELECT A WORLD</span></button><span class="route-callsign">CALLSIGN <b>${esc(player.name||'ASTRONAUT')}</b></span></header><section class="route-intro"><span>EARTH FLIGHT CONTROL / OUTBOUND ROUTE</span><h1>Where will<br>we land?</h1><p>Both expeditions begin in the same Earth facility. Your route changes the view, the terrain and the questions PICO-7 brings along.</p></section><div class="route-choice-grid">${destinations.map(e=>{const c=campaign(e.id);const has=Boolean(c?.completed?.length||c?.day>1||c?.spaceDay>1);const day=c?.day>1?c.day:(c?.spaceDay||1);return `<article class="route-choice route-${e.id}"><div class="route-image"><span class="route-coordinate">${esc(e.coords)}</span><div class="route-world world-${e.id}"></div><div class="route-horizon"></div></div><div class="route-details"><span class="route-badge">${esc(e.badge)}</span><h2>${e.id==='mars'?'MARS':'THE MOON'}</h2><p>${esc(e.tagline)}</p><button class="route-enter" data-env="${e.id}" data-new="${has?'false':'true'}">${has?`CONTINUE ${esc(c.callSign||player.name)} · DAY ${day}`:'BEGIN NEW EXPEDITION'} <span>↗</span></button>${has?`<button class="route-fresh" data-env="${e.id}" data-new="true">START A DIFFERENT ${e.id.toUpperCase()} CAMPAIGN</button>`:''}</div></article>`;}).join('')}</div><footer class="route-footer"><span>01 / EARTH PREPARATION</span><i></i><span>02 / SPACEFLIGHT</span><i></i><span>03 / SURFACE EXPEDITION</span></footer></main>`);
}

function earthTasks(mission){
  const fallback=[
    {id:'m001-oxygen',label:'Install the oxygen canister',kind:'pickup',visualId:'oxygen',pos:[-4,-3],target:[-2.2,-3],hint:'1. Press E at the blue canister. 2. Walk to the glowing oxygen station. 3. Press E to install it.'},
    {id:'m001-suit',label:'Check suit readiness',kind:'diagnostic',pos:[2,-2],hint:'Walk to the suit station and press E for the quick readiness scan.'},
    {id:'m001-board',label:'Board the spacecraft',kind:'board',pos:[8,0],hint:'When the two checks are green, walk to the spacecraft hatch and press E.'},
  ];
  return fallback.map(objective=>({...objective,objectiveId:objective.id,state:{}}));
}

const SPACE_DAY_MISSIONS={
  1:{title:'Welcome Aboard',objective:'Find the flight console and learn the cabin.',hint:'Walk to the glowing flight console and press E.',kind:'console',pos:[0,-4.5],reward:35,dialogue:'Welcome aboard! Find the flight console so we can learn this ship together.'},
  2:{title:'Life Support Systems',objective:'Stabilise the life-support monitor.',hint:'Inspect the blue life-support panel and press E to stabilise the cabin.',kind:'life',pos:[-4.5,-2],reward:40,dialogue:'Oxygen, pressure and temperature keep every astronaut safe. Let’s make the cabin nominal.'},
  3:{title:'Grow Food in Space',objective:'Plant seeds and activate the grow light.',hint:'Approach the greenhouse station and press E to plant, water and light the seeds.',kind:'greenhouse',pos:[4.5,-2],reward:45,dialogue:'Tiny plants, huge mission value. Food grown onboard helps long journeys stay sustainable.'},
  4:{title:'Spacecraft Maintenance',objective:'Repair the highlighted cabin component.',hint:'Approach the orange maintenance panel and press E to inspect and repair it.',kind:'repair',pos:[-4.5,2],reward:45,dialogue:'That orange indicator means a small fault. We can repair it with the right tool.'},
  5:{title:'Space Science Experiment',objective:'Run the microgravity water experiment.',hint:'Approach the experiment bench and press E to release the water globe.',kind:'experiment',pos:[4.5,2],reward:50,dialogue:'In microgravity, water behaves differently. Watch closely and record what you observe.'},
  6:{title:'Astronaut Birthday Mission',objective:'Prepare a surprise celebration with PICO-7.',hint:'Walk to the crew nook and press E to decorate and celebrate.',kind:'birthday',pos:[0,4.5],reward:60,dialogue:'Mission control approved one important activity: a birthday surprise. W crew energy.'},
  7:{title:'Navigation and Communication',objective:'Send the route check to mission control.',hint:'Approach the navigation display and press E to confirm the route.',kind:'navigation',pos:[-2.5,-4],reward:50,dialogue:'A clear route and a clear message keep a crew connected across space.'},
  8:{title:'Prepare for Landing',objective:'Complete the destination landing check.',hint:'Approach the landing console and press E. The destination appears beyond the window.',kind:'landing',pos:[2.5,-4],reward:65,dialogue:'Arrival is close. Run the final landing check and get ready for the view.'}
};

function spaceDayMission(day){return SPACE_DAY_MISSIONS[day]||SPACE_DAY_MISSIONS[1];}
function spacecraftTasks(day){const m=spaceDayMission(day);return[{id:`space-day-${day}`,objectiveId:`space-day-${day}`,label:m.objective,kind:m.kind,interaction:'spacecraft',completionAction:m.kind,pos:m.pos,hint:m.hint,state:{}}];}

function renderAdventure(){
  destroyActiveScenes();
  const c=game.campaign;
  const earth=game.phase==='prologue';
  const spacecraft=game.phase==='spacecraft'||game.phase==='landing';
  const travel=game.phase==='travel';
  cosmosAudio.setScene(earth ? 'hangar' : (spacecraft ? 'cabin' : (travel ? 'travel' : 'surface')));

  let locationStr = 'EARTH LAUNCH FACILITY';
  let missionTitle = 'DAY 1 · M001 / MISSION PREPARATION';
  let missionSubtitle = 'Complete pre-flight checklist and board the launch vehicle';

  if (travel) {
    locationStr = 'EARTH DEPARTURE / DEEP SPACE CRUISE';
    missionTitle = `TRANSIT TO ${game.env === 'mars' ? 'MARS' : 'THE MOON'}`;
    missionSubtitle = 'Interplanetary cruise trajectory locked · Ion drives active';
  } else if (game.phase === 'landing') {
    locationStr = `DAY 9 · TOUCHDOWN APPROACH`;
    missionTitle = `DESCENT TO ${game.env === 'mars' ? 'MARS' : 'THE MOON'}`;
    missionSubtitle = 'Approach the forward flight deck console to initiate descent';
  } else if (spacecraft) {
    locationStr = `CREW CABIN · DAY ${game.spaceDay || 1}`;
    missionTitle = `DAY ${String(game.spaceDay || 1).padStart(2,'0')} / 30 · ${(game.aiMission?.title||spaceDayMission(game.spaceDay || 1).title).toUpperCase()}`;
    missionSubtitle = game.aiMission?.objective||spaceDayMission(game.spaceDay || 1).objective;
  } else if (game.phase === 'surface') {
    locationStr = game.env === 'mars' ? 'MARS SURFACE · JEZERO CRATER' : 'MOON SURFACE · TRANQUILITY BASE';
    missionTitle = `DAY ${String(c.day || 10).padStart(2,'0')} / 30 · ${esc(game.aiMission?.title||game.missionId || 'SURFACE EXPLORATION')}`;
    missionSubtitle = game.aiMission?.objective||`${game.env === 'mars' ? 'Mars' : 'Moon'} science campaign · Ground reconnaissance`;
  }

  shell(`
    <div class="immersion-shell">
      <canvas id="webgl-world" aria-label="COSMOS 3D Mission Environment"></canvas>
      <div class="immersion-top">
        <button class="world-mark" data-action="home">COSMOS</button><span class="world-location">${locationStr}</span>
        <div class="flight-chip"><b>${esc(player.name||'ASTRONAUT')}</b><span>${'♥'.repeat(player.lives)}${'♡'.repeat(5-player.lives)}</span><button data-action="pause">PAUSE</button><button data-action="store">STORE</button></div>
      </div>
      <div class="mission-ribbon">
        <span class="ribbon-day">${game.phase==='prologue'?'EARTH / DAY 01':game.phase==='landing'?'DAY 09 / DESCENT':`DAY ${String(game.spaceDay||c.day||1).padStart(2,'0')} / 30`}</span><strong>${missionTitle.replace(/DAY \d+ \/ 30 · /,'')}</strong><small>${missionSubtitle}</small>
      </div>
      <aside class="mission-ribbon objectives-ribbon">
        <div class="ribbon-label">NEXT ACTION</div>
        <div id="objective-list"></div>
        <div class="control-line">WASD / ARROWS MOVE &nbsp; · &nbsp; E INTERACT</div>
      </aside>
      <div class="companion-caption">
        <div class="pico-face"><i></i><i></i></div>
        <div><b>PICO-7</b><p id="dialogue-text"></p></div>
      </div>
      <button class="companion-button" data-action="pico-talk">COMMS <span> E </span></button>
      <div id="pico-conversation" class="pico-conversation" hidden>
        <div class="pico-conversation-head">
          <div><span class="kicker">PICO-7 / MISSION COMMS</span><strong>Ask your companion</strong></div>
          <button class="icon-btn close" data-action="pico-close">×</button>
        </div>
        <p id="pico-response" class="pico-response">Ask me about your current mission.</p>
        <div class="pico-suggestions">
          <button data-pico-question="What should I do next?">What should I do next?</button>
          <button data-pico-question="Where should I go?">Where should I go?</button>
          <button data-pico-question="Explain this mission.">Explain this mission.</button>
          <button data-pico-question="How do I complete this objective?">How do I complete this objective?</button>
          <button data-pico-question="What equipment do I need?">What equipment do I need?</button>
          <button data-pico-question="Why is this happening?">Why is this happening?</button>
          <button data-pico-question="Give me a hint.">Give me a hint.</button>
        </div>
        <div class="pico-input-row">
          <input id="pico-input" type="text" maxlength="240" placeholder="Ask PICO-7 anything about this mission" autocomplete="off">
          <button class="pico-mic" data-action="pico-mic" title="Use microphone if available">🎙</button>
          <button class="button button-primary" data-action="pico-send">SEND</button>
        </div>
        <button class="pico-replay" data-action="pico-replay">REPLAY LAST RESPONSE</button>
      </div>
      <div class="world-status"><span>OXYGEN <b>${Math.round(c.resources?.oxygen||78)}%</b></span><i style="--meter:${Math.min(100,c.resources?.oxygen||78)}%"></i><span>POWER <b>${Math.round(c.resources?.energy||72)}%</b></span><i style="--meter:${Math.min(100,c.resources?.energy||72)}%"></i><span>✦ <b>${player.coins||0}</b></span></div>
      <div id="prompt" class="interaction-prompt"></div>
    </div>
  `);

  updateAdventureHud();

  if (earth) {
    initEarth3D();
  } else if (spacecraft) {
    initSpacecraft3D();
  } else {
    initSurface3D();
  }

  sayAdventure(picoGreeting());
}

function initSpacecraft3D(){
  const canvas=document.querySelector('#webgl-world');
  if(!canvas)return;
  destroyActiveScenes();
  try {
    currentSpacecraftScene=new SpacecraftCabinScene(canvas,game);
    window.currentSpacecraftScene=currentSpacecraftScene;
    canvas.addEventListener('pointerdown',()=>canvas.requestPointerLock?.());
    cancelAnimationFrame(animationFrame);
    let last=performance.now();
    const loop=(now)=>{
      if(!currentSpacecraftScene||!game||(game.phase!=='spacecraft'&&game.phase!=='landing'))return;
      const dt=Math.min(.04,(now-last)/1000);
      last=now;
      if(!game.paused)moveAdventure(dt);
      animationFrame=requestAnimationFrame(loop);
    };
    animationFrame=requestAnimationFrame(loop);
  } catch(err){
    console.error('SpacecraftCabinScene init error:', err);
  }
}

function initSurface3D(){
  const canvas=document.querySelector('#webgl-world');
  if(!canvas)return;
  destroyActiveScenes();
  try {
    currentSurfaceScene=new SurfaceMissionScene(canvas,game);
    window.currentSurfaceScene=currentSurfaceScene;
    canvas.addEventListener('pointerdown',()=>canvas.requestPointerLock?.());
    cancelAnimationFrame(animationFrame);
    let last=performance.now();
    const loop=(now)=>{
      if(!currentSurfaceScene||!game||game.phase!=='surface')return;
      const dt=Math.min(.04,(now-last)/1000);
      last=now;
      if(!game.paused)moveAdventure(dt);
      animationFrame=requestAnimationFrame(loop);
    };
    animationFrame=requestAnimationFrame(loop);
  } catch(err){
    console.error('SurfaceMissionScene init error:', err);
    notice('3D unavailable','The surface scene could not start. Please refresh and try again.');
  }
}

function initEarth3D(){
  const canvas=document.querySelector('#webgl-world');
  if(!canvas)return;
  destroyActiveScenes();
  try {
    currentEarthScene=new EarthPreparationScene(canvas,{game,player});
    window.currentEarthScene=currentEarthScene;
    currentEarthScene.player.x=game.player.x||0;
    currentEarthScene.player.z=game.player.z||3.8;
    currentEarthScene.mouseLook.yaw=game.yaw||0;
    currentEarthScene.mouseLook.pitch=game.pitch||0.28;
    if(game.carried) currentEarthScene.setCarried(game.carried);
    canvas.addEventListener('pointerdown',()=>canvas.requestPointerLock?.());
    const syncLoop=()=>{
      if(!currentEarthScene||!game||game.phase!=='prologue')return;
      game.player.x=currentEarthScene.player.x;
      game.player.z=currentEarthScene.player.z;
      game.player.y=currentEarthScene.player.y;
      updateAdventureHud();
      requestAnimationFrame(syncLoop);
    };
    requestAnimationFrame(syncLoop);
  } catch(err){
    console.error('EarthPreparationScene init error, falling back:', err);
    initAdventureGL();
  }
}
function activeAdventureTasks(){return game?.tasks||[];}
function updateAdventureHud(){
  const list=document.querySelector('#objective-list');
  if(list)list.innerHTML=activeAdventureTasks().map((t,i)=>`<div class="objective ${t.done?'done':''} ${game.guidedObjectiveId===t.id?'guided':''}"><span>${t.done?'✓':String(i+1).padStart(2,'0')}</span><div><b>${esc(t.label)}</b><small>${t.done?'DONE':esc(t.hint||'Explore the marked station and press E when close.')}</small></div></div>`).join('');
  const next=nextPicoObjective();
  activePicoScene()?.setPicoGuideTarget?.(next?(game.carried===next.id&&next.target?next.target:next.pos):null);

  const statusElem=document.querySelector('.world-status');
  if(statusElem && game?.campaign?.resources){
    const ox=Math.max(0,Math.min(100,Math.round(game.campaign.resources.oxygen||78)));
    const pw=Math.max(0,Math.min(100,Math.round(game.campaign.resources.energy||72)));
    const spans=statusElem.querySelectorAll('span');
    const meters=statusElem.querySelectorAll('i');
    if(spans[0])spans[0].innerHTML=`OXYGEN <b>${ox}%</b>`;
    if(meters[0])meters[0].style.setProperty('--meter',`${ox}%`);
    if(spans[1])spans[1].innerHTML=`POWER <b>${pw}%</b>`;
    if(meters[1])meters[1].style.setProperty('--meter',`${pw}%`);
  }

  const origin=game?.vehicle==='rover'&&game.rover?game.rover.position:(game?.player||{x:0,z:0});
  const near=nearbyAdventure();
  const roverDist=game?.rover?Math.hypot(origin.x-game.rover.position.x,origin.z-game.rover.position.z):999;

  if(game?.phase==='surface'){
    const locName=getCurrentLocationName(origin.x,origin.z,game.env);
    const locElem=document.querySelector('.world-location');
    if(locElem) locElem.textContent=`${game.env==='mars'?'MARS':'MOON'} · ${locName}`;
  }

  const prompt=document.querySelector('#prompt');
  if(prompt){
    const dist=next?Math.round(Math.hypot(next.pos[0]-origin.x,next.pos[1]-origin.z)):0;
    const destName=next?.locationName||(game?.phase==='surface'?getCurrentLocationName(next?.pos?.[0]||0,next?.pos?.[1]||0,game.env):'');

    if(game.vehicle==='rover'){
      prompt.innerHTML=near
        ? `<b>PRESS E · ${near.label}</b><span>(OR PRESS E TO EXIT ROVER)</span>`
        : `<b>ROVER ACTIVE · ${dist}m TO ${destName}</b><span>W/S drive · A/D steer · Space brake · E exit</span>`;
    } else if(picoNearby()&&!near){
      prompt.innerHTML='<b>PRESS E</b><span>Talk to PICO-7</span>';
    } else if(game.phase==='surface'&&roverDist<2.8&&!near){
      prompt.innerHTML=`<b>PRESS E TO ENTER ROVER</b><span>${dist}m to ${destName}</span>`;
    } else if(near){
      prompt.innerHTML=`<b>PRESS E</b><span>${near.done?'Review objective':esc(near.label)}</span>`;
    } else if(next&&game.phase==='surface'){
      prompt.innerHTML=`<span>WAYPOINT: ${dist}m to ${destName} · WASD move · Shift run · Space jump</span>`;
    } else {
      prompt.innerHTML='<span>WASD or arrow keys move · Shift run · Space jump · E interact</span>';
    }
  }
}
function sayAdventure(text){const n=document.querySelector('#dialogue-text');if(n)n.textContent=text;speakAdventure(text);activePicoScene()?.setPicoTalking?.(true);clearTimeout(window.picoTalkTimer);window.picoTalkTimer=setTimeout(()=>activePicoScene()?.setPicoTalking?.(false),Math.min(5000,Math.max(900,String(text).length*28)));}
function nearbyAdventure(){
  const isRover=game?.vehicle==='rover'&&game.rover;
  const origin=isRover?game.rover.position:game.player;
  const maxReach=isRover?3.8:3.2;
  return activeAdventureTasks().filter(t=>{
    if(t.done)return false;
    const point=game?.carried===t.id&&t.target?t.target:t.pos;
    return Math.hypot(point[0]-origin.x,point[1]-origin.z)<maxReach;
  }).sort((a,b)=>{
    const ap=game?.carried===a.id&&a.target?a.target:a.pos;
    const bp=game?.carried===b.id&&b.target?b.target:b.pos;
    return Math.hypot(ap[0]-origin.x,ap[1]-origin.z)-Math.hypot(bp[0]-origin.x,bp[1]-origin.z);
  })[0];
}
async function interactAdventure(){
  if (!game || game.paused) return;

  // 1. Rover Exit
  if (game.vehicle === 'rover' && game.rover) {
    const item = nearbyAdventure();
    if (item) {
      performTask(item);
      updateAdventureHud();
      if (activeAdventureTasks().every(t => t.done)) {
        await completeAdventureMission();
      }
      return;
    }
    game.vehicle = null;
    game.player.x = game.rover.position.x + 2.0;
    game.player.z = game.rover.position.z;
    sayAdventure('Exited rover. Continuing exploration on foot.');
    updateAdventureHud();
    return;
  }

  // 2. Rover Entry when on foot
  if (game.phase === 'surface' && game.rover) {
    const roverDist = Math.hypot(game.player.x - game.rover.position.x, game.player.z - game.rover.position.z);
    const item = nearbyAdventure();
    const isRoverTask = item && ['rover', 'enter_rover'].includes(item.completionAction);
    if (isRoverTask || (roverDist < 2.8 && !item)) {
      game.vehicle = 'rover';
      sayAdventure('Entered rover. W/S drive, A/D steer, Space brake, E exit.');
      if (isRoverTask) completeTask(item);
      updateAdventureHud();
      return;
    }
  }

  const item = nearbyAdventure();
  if (!item) {
    if (picoNearby()) { openPicoConversation(); return; }
    sayAdventure('Walk closer to the marked station. Physical proximity matters here.');
    return;
  }
  if (game.phase === 'prologue') {
    if (item.kind === 'pickup') {
      if (game.carried !== item.id) {
        game.carried = item.id;
        if (currentEarthScene) currentEarthScene.setCarried(item.id);
        sayAdventure(`Picked up ${item.label}. Carry it to the glowing installation station.`);
      } else {
        const target = activeAdventureTasks().find(t => t.id === game.carried);
        if (target && target.target && Math.hypot(game.player.x - target.target[0], game.player.z - target.target[1]) < 1.95) {
          target.done = true;
          game.carried = null;
          if (currentEarthScene) currentEarthScene.setCarried(null);
          sayAdventure(`${target.label} installed successfully. Systems nominal.`);
          activePicoScene()?.setPicoEmotion?.('happy');
        } else {
          sayAdventure('That is not the correct installation destination. Look for the marked target station.');
        }
      }
    } else if (item.kind === 'diagnostic') {
      item.done = true;
      sayAdventure('Suit readiness scan complete. All seals and telemetry nominal.');
      activePicoScene()?.setPicoEmotion?.('happy');
    } else if (item.kind === 'board') {
      const others = activeAdventureTasks().filter(t => t.id !== item.id);
      if (others.every(t => t.done)) {
        item.done = true;
        sayAdventure('Boarding clearance granted. Welcome aboard the launch vehicle!');
        activePicoScene()?.setPicoEmotion?.('excited');
        await completeAdventureMission();
        return;
      } else {
        sayAdventure('Complete all pre-flight readiness checks before boarding.');
        return;
      }
    } else {
      item.done = true;
      sayAdventure(`${item.label} complete.`);
    }
  } else if (game.phase === 'spacecraft') {
    item.done = true;
    activePicoScene()?.setPicoEmotion?.('happy');
    await completeAdventureMission();
    return;
  } else if (game.phase === 'landing') {
    if (item.kind === 'touchdown') {
      item.done = true;
      sayAdventure('Descent thrusters firing! Initiating touchdown sequence.');
      await completeAdventureMission();
      return;
    }
  } else {
    performTask(item);
  }
  updateAdventureHud();
  if (activeAdventureTasks().every(t => t.done) && item.kind !== 'board') {
    await completeAdventureMission();
  }
}
window.interactAdventure = interactAdventure;

function roverObstacleAt(x,z){
  const obs = currentSurfaceScene?.obstacles || [[-5,-2,1.4],[2,-3,1],[6,-1,1.8],[-2,-5,.8]];
  return obs.some(([ox,oz,r])=>Math.hypot(x-ox,z-oz)<r+1.1);
}
function moveRover(dt){
  const rover=game.rover;if(!rover)return;
  const forward=adventureKeys.has('w')||adventureKeys.has('arrowup');
  const reverse=adventureKeys.has('s')||adventureKeys.has('arrowdown');
  const left=adventureKeys.has('a')||adventureKeys.has('arrowleft');
  const right=adventureKeys.has('d')||adventureKeys.has('arrowright');
  const throttle=forward?1:reverse?-1:0;
  const braking=adventureKeys.has(' ');
  const acceleration=throttle?6.0:0;
  if(throttle)rover.speed+=throttle*acceleration*dt;
  else rover.speed*=Math.pow(.06,dt);
  if(braking)rover.speed*=Math.pow(.001,dt);
  rover.speed=Math.max(-3.4,Math.min(7.8,rover.speed));
  const steer=(right?1:0)-(left?1:0);
  rover.heading+=(steer*1.9*(Math.abs(rover.speed)/7.8)*dt)*(rover.speed<0?-1:1);
  const nx=rover.position.x+Math.sin(rover.heading)*rover.speed*dt;
  const nz=rover.position.z+Math.cos(rover.heading)*rover.speed*dt;
  if(nx<-105||nx>105||nz<-105||nz>105||roverObstacleAt(nx,nz)){
    rover.speed=0;
    if(!game.lastRoverCollision||performance.now()-game.lastRoverCollision>1200){sayAdventure('Rover collision avoided. Reverse, steer around the obstacle, and try a safer route.');game.lastRoverCollision=performance.now();}
  }else{rover.position.x=nx;rover.position.z=nz;}
  game.player.x=rover.position.x;
  game.player.z=rover.position.z;
  const next=nextPicoObjective();
  if(next&&['drive_to_crater','locate_stopped_rover'].includes(next.completionAction)&&Math.hypot(next.pos[0]-rover.position.x,next.pos[1]-rover.position.z)<3.5){
    completeTask(next);
    activePicoScene()?.setPicoEmotion?.('excited');
    sayAdventure(next.completionAction==='locate_stopped_rover'?'Drone lock acquired: the stopped rover is here. Inspect diagnostic port.':'Crater route reached. Scan the science location before collecting evidence.');
  }
  updateLifeSupport(dt);
}

async function completeAdventureMission(){
  if(!game||game.missionCompleting||game.missionCompleted)return;
  if(!activeAdventureTasks().every(task=>task.done))return;
  game.missionCompleting=true;
  if(game.phase==='spacecraft'){
    const day=game.spaceDay||1;
    player.coins=(player.coins||0)+(spaceDayMission(day).reward||35);
    const spaceMissionId=`M${String(day).padStart(3,'0')}`;
    game.campaign.completed=Array.isArray(game.campaign.completed)?game.campaign.completed:[];
    if(!game.campaign.completed.includes(spaceMissionId))game.campaign.completed.push(spaceMissionId);
    game.campaign.spaceDay=day<8?day+1:9;
    game.campaign.day=day+1;
    game.campaign.storyPhase=day<8?'spacecraft':'touchdown';
    game.campaign.completedSpaceDays=[...(game.campaign.completedSpaceDays||[]),day];
    save();
    activePicoScene()?.setPicoEmotion?.(day===6?'excited':'happy');
    sayAdventure(day===6?'Birthday mission complete! Cake protocol: extremely successful.':`Day ${day} complete. You earned ${spaceDayMission(day).reward} coins. W mission.`);
    setTimeout(async()=>{
      game.missionCompleting=false;
      if(day<8){
        game.spaceDay=day+1;
        game.tasks=spacecraftTasks(game.spaceDay);
        try{game.aiMission=await getGeneratedMission(game.env,game.campaign,game.spaceDay,{mission_id:`M${String(game.spaceDay).padStart(3,'0')}`});}catch(error){game.aiMission={source:'local_fallback',ai_generated:false,title:spaceDayMission(game.spaceDay).title,objective:spaceDayMission(game.spaceDay).objective,scenario:'A short spacecraft training simulation.',science:'Game-generated simulation; no live NASA telemetry is being shown.'};}
        renderAdventure();
        sayAdventure(spaceDayMission(game.spaceDay).dialogue);
      } else {
        game.phase='landing';
        game.spaceDay=9;
        game.tasks=[{id:'touchdown',label:`Touch down safely on ${game.env==='mars'?'Mars':'the Moon'}`,kind:'touchdown',interaction:'landing',completionAction:'touchdown',pos:[0,-4.5],hint:'Approach the flight deck console and press E to begin planetary descent.'}];
        renderAdventure();
        sayAdventure(`Day 9. ${game.env==='mars'?'Mars':'the Moon'} is dead ahead. Walk to the flight deck console to initiate descent.`);
      }
    },500);
    return;
  }
  const completedObjectives=activeAdventureTasks().map(task=>task.objectiveId||task.id);
  if(game.phase==='landing'){
    game.missionCompleting=false;
    launchLandingSequence();
    return;
  }
  if(game.phase==='prologue'){
    game.missionCompleting=false;
    launchSpaceTravel();
    return;
  }
  try{
    const result=await api('/api/game/complete-mission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({environment:game.env,day:game.campaign.day,mission_id:game.missionId,player_seed:game.campaign.seed,history:campaignHistory(game.campaign),completed_objectives:completedObjectives,objective_evidence:game.objectiveEvidence||{}})});
    if(!game.campaign.completed.includes(game.missionId))game.campaign.completed.push(game.missionId);
    game.campaign.day=result.next_day;
    player.coins=(player.coins||0)+50;
    game.campaign.storyPhase='complete';
    game.campaign.activeMissionId=null;game.campaign.objectiveState={};game.objectiveEvidence={};
    game.missionCompleted=true;
    save();
    activePicoScene()?.setPicoEmotion?.('happy');
    sayAdventure(`${game.missionId} complete. Mission control has unlocked the next day.`);
    if(game.missionId==='M030'){
      game.campaign.day=30;
      game.campaign.storyPhase='return';
      save();
      setTimeout(()=>launchReturnJourney(),900);
    }else setTimeout(()=>renderDestination(),700);
  }catch(error){
    game.missionCompleting=false;
    activePicoScene()?.setPicoEmotion?.('concerned');
    sayAdventure(`Mission validation failed: ${error.message}`);
  }
}

function launchLandingSequence(){
  if(!game)return;
  destroyActiveScenes();
  game.phase='landing-cinematic';
  shell(`<div class="journey-screen landing-journey"><canvas id="webgl-world" aria-label="COSMOS planetary landing sequence"></canvas><div class="journey-overlay"><span class="kicker">DESCENT PROFILE / DAY 09</span><h1>TOUCHDOWN<br><em>SEQUENCE.</em></h1><p>${game.env==='mars'?'Atmospheric entry and dust-braked descent toward Mars.':'Controlled lunar descent with engine braking toward the regolith.'}</p><div class="journey-readout"><span>DESTINATION <b>${game.env==='mars'?'MARS':'MOON'}</b></span><span>FLIGHT MODE <b>DESCENT</b></span><span>STATUS <b>GUIDANCE NOMINAL</b></span></div></div></div>`);
  const canvas=document.querySelector('#webgl-world');
  try{currentTravelScene=new SpaceTravelScene(canvas,{destination:game.env,duration:6.5,landing:true,onComplete:finishLandingSequence});window.currentTravelScene=currentTravelScene;}
  catch(error){console.error('Landing sequence error:',error);finishLandingSequence();}
  sayAdventure(`Descent initiated. ${game.env==='mars'?'Mars':'the Moon'} is below us. Brace for touchdown.`);
}

async function finishLandingSequence(){
  if(!game)return;
  game.campaign.spaceDay=10;game.campaign.storyPhase='surface';game.campaign.day=10;
  game.campaign.completed=Array.isArray(game.campaign.completed)?game.campaign.completed:[];
  if(!game.campaign.completed.includes('M009'))game.campaign.completed.push('M009');
  try{
    const mission=await selectCampaignMission(game.env,game.campaign);
    game.mission=mission;game.missionId=mission.mission_id;game.aiMission=await getGeneratedMission(game.env,game.campaign,10,mission);
    game.phase='surface';game.tasks=surfaceTasks(mission,game.env);game.objectiveEvidence={};game.player.x=0;game.player.z=0;save();
    activePicoScene()?.setPicoEmotion?.('excited');
    setTimeout(()=>{renderAdventure();sayAdventure(`Touchdown confirmed! Welcome to the surface of ${game.env==='mars'?'Mars':'the Moon'}.`);},500);
  }catch(error){console.error('Error fetching surface mission:',error);sayAdventure(`Touchdown confirmed, but surface mission loading failed: ${error.message}`);}
}

function launchReturnJourney(){
  if(!game)return;
  destroyActiveScenes();
  game.phase='return';
  game.campaign.storyPhase='return';
  save();
  shell(`<div class="journey-screen return-journey"><canvas id="webgl-world" aria-label="COSMOS return journey to Earth"></canvas><div class="journey-overlay"><span class="kicker">SIMULATED RETURN FLIGHT / MISSION M030</span><h1>HOMEWARD<br><em>TO EARTH.</em></h1><p>Your expedition report is complete. Watch the destination recede as COSMOS begins the return flight.</p><div class="journey-readout"><span>DEPARTURE <b>${game.env==='mars'?'MARS':'MOON'}</b></span><span>DESTINATION <b>EARTH</b></span><span>STATUS <b>TRAJECTORY LOCKED</b></span></div></div></div>`);
  const canvas=document.querySelector('#webgl-world');
  try{
    currentTravelScene=new SpaceTravelScene(canvas,{destination:game.env,duration:9,returning:true,onComplete:completeReturnJourney});
    window.currentTravelScene=currentTravelScene;
  }catch(error){console.error('Return journey scene error:',error);completeReturnJourney();}
  sayAdventure(`Final report accepted. We are leaving ${game.env==='mars'?'Mars':'the Moon'} and heading home to Earth.`);
}

function completeReturnJourney(){
  destroyActiveScenes();
  if(game?.campaign){game.phase='complete';game.campaign.storyPhase='complete';game.campaign.day=30;save();}
  shell(`<main class="return-complete"><div class="return-stars"></div><section><span class="kicker">EXPEDITION COMPLETE / EARTH TOUCHDOWN</span><h1>WELCOME HOME,<br><em>${esc(player.name||'ASTRONAUT')}.</em></h1><p>You completed all 30 COSMOS missions, preserved the evidence boundary and returned safely in this educational simulation.</p><div class="return-stats"><b>30 / 30 <small>DAYS COMPLETE</small></b><b>${game?.campaign?.completed?.length||30} <small>MISSIONS LOGGED</small></b><b>✦ ${player.coins||0}<small>COINS EARNED</small></b></div><button class="button-primary-glow" data-action="home">RETURN TO COSMOS <span>↗</span></button></section></main>`);
  sayAdventure(`Touchdown confirmed. Welcome home, ${player.name||'astronaut'}! W mission.`);
}

function launchSpaceTravel(){
  destroyActiveScenes();
  game.phase='travel';
  game.campaign.storyPhase='travel';
  cosmosAudio.setScene('travel');
  save();

  shell(`
    <div class="game-shell">
      <canvas id="webgl-world" aria-label="COSMOS Earth-to-Space Travel"></canvas>
      <div class="hud-top">
        <div class="hud-brand">COSMOS <span>/ EARTH DEPARTURE &amp; DEEP SPACE CRUISE</span></div>
        <div class="crew"><strong>${esc(player.name)}</strong><span>${'♥'.repeat(player.lives)}${'♡'.repeat(5-player.lives)}</span></div>
      </div>
      <div class="travel-cinematic-banner">
        <div class="travel-badge"><span class="pulse-dot"></span> ORBITAL DEPARTURE // TRAJECTORY ACQUIRED</div>
        <h1>EN ROUTE TO ${game.env === 'mars' ? 'MARS (JEZERO CRATER)' : 'THE MOON (TRANQUILITY)'}</h1>
        <p>Atmospheric escape achieved · Twin ion drives ignited · Cruising toward destination</p>
        <button class="button button-primary travel-skip-btn" data-action="proceed-cabin">ENTER CABIN FLIGHT DECK <span>↗</span></button>
      </div>
    </div>
  `);

  const canvas = document.querySelector('#webgl-world');
  if (canvas) {
    try {
      currentTravelScene = new SpaceTravelScene(canvas, {
        destination: game.env || 'mars',
        duration: 8.0,
        onComplete: () => proceedToSpacecraftCabin()
      });
      window.currentTravelScene = currentTravelScene;
    } catch(err) {
      console.error('SpaceTravelScene init error:', err);
    }
  }

  sayAdventure(`Launch clearance nominal. We have left Earth and are cruising toward ${game.env === 'mars' ? 'Mars' : 'the Moon'}.`);
}

async function proceedToSpacecraftCabin(){
  if (!game) return;
  const c = game.campaign;
  game.phase = 'spacecraft';
  game.spaceDay = Math.max(1, Math.min(8, c.spaceDay || 1));
  game.campaign.storyPhase = 'spacecraft';
  game.tasks = spacecraftTasks(game.spaceDay);
  game.player.x = 0;
  game.player.z = 2.8;
  try {
    const mission=await selectCampaignMission(game.env,c);
    game.mission=mission;game.missionId=mission.mission_id;
    game.aiMission=await getGeneratedMission(game.env,c,game.spaceDay,mission);
  } catch(error) {
    game.aiMission={source:'local_fallback',ai_generated:false,title:spaceDayMission(game.spaceDay).title,objective:spaceDayMission(game.spaceDay).objective,scenario:'A short spacecraft training simulation.',science:'Game-generated simulation; no live NASA telemetry is being shown.'};
    console.warn('Mission package unavailable; using labelled local fallback.',error);
  }
  save();renderAdventure();sayAdventure(game.aiMission?.scenario||spaceDayMission(game.spaceDay).dialogue);
}

async function selectDestination(rawEnv,forceNew=false,campaignId=''){
  const env = String(rawEnv || 'mars').toLowerCase();
  if(campaignId&&campaigns[campaignId]&&campaigns[campaignId].environment===env){player.activeCampaigns[env]=campaignId;save();}
  const c = adventureProfile(env,forceNew);
  if(campaignId&&c.callSign){player.name=c.callSign;save();}
  if (c.completed && c.completed.length >= 30) {
    notice('Campaign complete', 'All 30 missions in this campaign are complete.');
    return;
  }
  if (c.storyPhase === 'surface' || (c.spaceDay && c.spaceDay >= 10) || (c.day && c.day >= 10)) {
    beginAdventure(env);
    return;
  }
  if (c.storyPhase === 'spacecraft' || (c.spaceDay && c.spaceDay > 1 && c.spaceDay < 9)) {
    game = {
      env,
      destination: env,
      campaign: c,
      spaceDay: c.spaceDay || 1,
      phase: 'spacecraft',
      player: { x: 0, z: 2.8, y: 0, vy: 0 },
      yaw: 0,
      pitch: 0.28,
      paused: false,
      tasks: spacecraftTasks(c.spaceDay || 1)
    };
    await proceedToSpacecraftCabin();
    return;
  }
  if (c.storyPhase === 'landing' || c.spaceDay === 9) {
    game = {
      env,
      destination: env,
      campaign: c,
      spaceDay: 9,
      phase: 'landing',
      player: { x: 0, z: 2.8, y: 0, vy: 0 },
      yaw: 0,
      pitch: 0.28,
      paused: false,
      tasks: [{ id: 'touchdown', label: `Touch down safely on ${env === 'mars' ? 'Mars' : 'the Moon'}`, kind: 'touchdown', interaction: 'landing', completionAction: 'touchdown', pos: [0, -4.5], hint: 'Approach the flight deck console and press E to begin planetary descent.' }]
    };
    try {
      const mission = await selectCampaignMission(env, c);
      game.mission = mission;
      game.missionId = mission.mission_id;
      game.aiMission = await getGeneratedMission(env, c, 9, mission);
    } catch (error) {
      game.aiMission = {source:'local_fallback',ai_generated:false,title:'Touchdown Mission',objective:game.tasks[0].label,scenario:'A short simulated landing sequence.',science:'Game-generated simulation; no live NASA telemetry is being shown.'};
      console.warn('Landing package unavailable; using labelled local fallback.', error);
    }
    save();
    renderAdventure();
    sayAdventure(game.aiMission?.scenario||`Day 9. ${env === 'mars' ? 'Mars' : 'the Moon'} is dead ahead. Walk to the flight deck console to initiate descent.`);
    return;
  }
  if (c.storyPhase === 'travel') {
    launchSpaceTravel();
    return;
  }
  beginEarthPreparation(env);
}

function beginEarthPreparation(rawEnv='mars'){
  regenLives();
  if(player.lives<=0){notice('Mission unavailable','A life will regenerate in ten minutes.');return;}
  const env = String(rawEnv || 'mars').toLowerCase();
  const c = adventureProfile(env);
  c.storyPhase = 'prologue';
  game = {
    env: env,
    destination: env,
    campaign: c,
    mission: { mission_id: 'M001', title: 'Earth Preparation & Flight Suit Checklist', gameplay: 'Prepare the oxygen system, inspect the flight suit, and board the gantry.' },
    missionId: 'M001',
    phase: 'prologue',
    player: { x: 0, z: 3.8, y: 0, vy: 0 },
    yaw: 0,
    pitch: .28,
    carried: null,
    paused: false,
    tasks: earthTasks()
  };
  save();
  renderAdventure();
}

async function beginAdventure(rawEnv){
  regenLives();if(player.lives<=0){notice('Mission unavailable','A life will regenerate in ten minutes.');return;}
  const env = String(rawEnv || 'mars').toLowerCase();
  const c=adventureProfile(env);
  if (c.storyPhase === 'surface' && (!c.day || c.day < 10)) {
    c.day = 10;
  }
  try{
    const mission=await selectCampaignMission(env,c);
    const aiMission=await getGeneratedMission(env,c,c.day,mission);
    const previousMissionId=c.activeMissionId;
    const spaceDay=c.spaceDay||(c.day ? c.day : 10);
    const isSurface = Boolean(c.storyPhase === 'surface' || spaceDay >= 10);
    const isLanding = Boolean(spaceDay === 9);
    const phase = isSurface ? 'surface' : (isLanding ? 'landing' : (c.storyPhase === 'prologue' ? 'prologue' : 'spacecraft'));

    game={
      env:env,
      destination:env,
      campaign:c,
      mission,
      missionId:mission.mission_id,
      aiMission,
      spaceDay:isLanding?9:spaceDay,
      phase:phase,
      player:{x:0,z:phase==='prologue'?3.8:phase==='spacecraft'?2.8:0,y:0,vy:0},
      yaw:0,
      pitch:.28,
      carried:null,
      paused:false,
      objectiveEvidence:{},
      tasks:isSurface?surfaceTasks(mission,env):isLanding?[{id:'touchdown',label:`Touch down safely on ${env==='mars'?'Mars':'the Moon'}`,kind:'touchdown',interaction:'landing',completionAction:'touchdown',pos:[0,-4.5],hint:'Approach the flight deck console and press E to begin planetary descent.'}]:phase==='prologue'?earthTasks(mission):spacecraftTasks(spaceDay)
    };
    if (phase === 'surface') {
      game.tasks=restoreMissionState(game.tasks,{...c,activeMissionId:previousMissionId});
    }
    c.activeMissionId=mission.mission_id;
    save();
    renderAdventure();
    if (phase === 'surface') {
      const loc = getMissionLocationForDay(c.day || 10, env);
      const startDist = Math.round(Math.hypot((game.tasks[0]?.pos[0] || 0) - game.player.x, (game.tasks[0]?.pos[1] || 0) - game.player.z));
      sayAdventure(`Day ${c.day || 10} · ${loc.name}. ${loc.vehicleRecommended === 'rover' ? `Destination is ${startDist}m ahead. Let's take the rover across the terrain.` : `Destination is ${startDist}m ahead. Follow the glowing waypoint.`}`);
    }
  }catch(error){toast('Mission unavailable',error.message);}
}
function notice(title,message){app.insertAdjacentHTML('beforeend',`<div class="modal notice-modal"><div class="glass-modal"><button class="icon-btn close" data-action="close-modal">×</button><span class="kicker">MISSION CONTROL</span><h2>${esc(title)}</h2><p>${esc(message)}</p></div></div>`);}
const STORE_ITEMS={oxygen:{label:'Oxygen refill',description:'Adds 10 recorded oxygen units.',cost:35,effect:'oxygen',amount:10},energy:{label:'Power boost',description:'Adds 10 recorded energy units.',cost:40,effect:'energy',amount:10},shield:{label:'Hazard shield',description:'One-use protection for a critical hazard.',cost:75,effect:'shield',amount:1},explore:{label:'Explorer booster',description:'Temporary movement boost for the current mission.',cost:60,effect:'explore',amount:1}};
function renderStore(){const items=Object.entries(STORE_ITEMS).map(([id,item])=>`<article class="store-item"><div class="store-icon">${id==='oxygen'?'◉':id==='energy'?'ϟ':id==='shield'?'◇':'✦'}</div><div><h3>${item.label}</h3><p>${item.description}</p><b class="store-price">✦ ${item.cost}</b></div><button class="button button-primary" data-action="buy-upgrade" data-upgrade="${id}">BUY</button></article>`).join('');app.insertAdjacentHTML('beforeend',`<div class="modal store-modal"><div class="glass-modal store-panel"><button class="icon-btn close" data-action="close-modal">×</button><span class="kicker">MISSION SUPPLY / SHOP</span><h2>Use your coins<br><em>with purpose.</em></h2><p>Upgrades are optional. Every campaign mission remains completable without spending coins.</p><div class="store-balance">CURRENT BALANCE <b>✦ ${player.coins||0}</b></div><div class="store-list">${items}</div></div></div>`);}
function buyUpgrade(id){const item=STORE_ITEMS[id];if(!item)return;if((player.coins||0)<item.cost){sayAdventure('Not enough coins yet. Complete a mission or optional activity to earn more.');return;}player.coins-=item.cost;player.upgrades=player.upgrades||{};player.upgrades[item.effect]=(player.upgrades[item.effect]||0)+item.amount;save();document.querySelector('.store-modal')?.remove();sayAdventure(`${item.label} purchased. Inventory updated. Big brain move!`);if(game){renderAdventure();}}
function useBooster(){const upgrades=player.upgrades||{};if((upgrades.explore||0)>0){upgrades.explore-=1;game.boostUntil=performance.now()+15000;save();sayAdventure('Explorer booster active for 15 seconds. Zoom zoom, astronaut!');renderAdventure();return;}if((upgrades.oxygen||0)>0&&game?.campaign){upgrades.oxygen-=1;game.campaign.resources=game.campaign.resources||{};game.campaign.resources.oxygen=(game.campaign.resources.oxygen||0)+10;save();sayAdventure('Oxygen refill applied. Life support is looking nominal.');updateAdventureHud();return;}sayAdventure('No usable booster is available yet. Open the store after earning more coins.');}
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===document.querySelector('#webgl-world')&&game){
    if(currentEarthScene&&game.phase==='prologue'){
      currentEarthScene.mouseLook.yaw-=e.movementX*0.003;
      currentEarthScene.mouseLook.pitch=Math.max(-0.2,Math.min(0.7,currentEarthScene.mouseLook.pitch-e.movementY*0.002));
      game.yaw=currentEarthScene.mouseLook.yaw;
      game.pitch=currentEarthScene.mouseLook.pitch;
    } else {
      game.yaw-=e.movementX*.003;
      game.pitch=Math.max(-.2,Math.min(.7,game.pitch-e.movementY*.002));
    }
  }
});
document.addEventListener('keydown',e=>{
  if(!game||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','e','tab','escape'].includes(k))e.preventDefault();
  if(k==='escape'){game.paused=!game.paused;return;}
  if(k==='tab'){notice('Inventory',`Carried item: ${game.carried||'none'} · Earth gear stays with you.`);return;}
  if(k==='e'){if(picoNearby()&&!nearbyAdventure()){openPicoConversation();}else interactAdventure();return;}
  adventureKeys.add(k);
  if(currentEarthScene&&game.phase==='prologue') currentEarthScene.keys.add(k);
  if(currentSpacecraftScene&&(game.phase==='spacecraft'||game.phase==='landing')) currentSpacecraftScene.keys.add(k);
  if(currentSurfaceScene&&game.phase==='surface') currentSurfaceScene.keys.add(k);
});
document.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  adventureKeys.delete(k);
  if(currentEarthScene&&game.phase==='prologue') currentEarthScene.keys.delete(k);
  if(currentSpacecraftScene&&(game.phase==='spacecraft'||game.phase==='landing')) currentSpacecraftScene.keys.delete(k);
  if(currentSurfaceScene&&game.phase==='surface') currentSurfaceScene.keys.delete(k);
});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.action;if(a==='setup'){e.stopImmediatePropagation();renderSetup();}else if(a==='resume-landing'){e.stopImmediatePropagation();selectDestination(b.dataset.env,false,b.dataset.campaignId||'');}else if(a==='audio'){e.stopImmediatePropagation();player.voice=!player.voice;save();if(!cosmosAudio.isPlaying){cosmosAudio.start();}else{cosmosAudio.toggle();}if(game)sayAdventure(cosmosAudio.isMuted?'Music muted. Comms only.':'Mission music and comms online.');else renderSetup();}else if(a==='save-profile'){e.stopImmediatePropagation();const name=cleanName(document.querySelector('#pilot-name')?.value);if(name.length<2){notice('Call sign needed','Use at least two readable characters.');return;}player.name=name;player.activeCampaigns={};save();renderDestination();}else if(a==='proceed-cabin'){e.stopImmediatePropagation();proceedToSpacecraftCabin();}else if(b.dataset.env){e.stopImmediatePropagation();selectDestination(b.dataset.env,b.dataset.new==='true',b.dataset.campaignId||'');}else if(a==='pause'&&game){e.stopImmediatePropagation();game.paused=!game.paused;}else if(a==='pico-talk'){e.stopImmediatePropagation();openPicoConversation();}else if(a==='pico-close'){e.stopImmediatePropagation();closePicoConversation();}else if(a==='pico-send'){e.stopImmediatePropagation();sendPicoMessage();}else if(a==='pico-mic'){e.stopImmediatePropagation();startPicoMic();}else if(a==='pico-replay'){e.stopImmediatePropagation();const response=document.querySelector('#pico-response')?.textContent;if(response)sayAdventure(response);}else if(b.dataset.picoQuestion){e.stopImmediatePropagation();openPicoConversation(b.dataset.picoQuestion);}},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&document.activeElement?.id==='pico-input'){e.preventDefault();sendPicoMessage();}});
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action==='store'){e.stopPropagation();renderStore();}if(b.dataset.action==='buy-upgrade'){e.stopPropagation();buyUpgrade(b.dataset.upgrade);}if(b.dataset.action==='use-booster'){e.stopPropagation();useBooster();}},false);
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="launch-mission"]');if(b){e.stopImmediatePropagation();b.closest('.modal')?.remove();beginAdventure(selectedMission?.game_context?.environment||'mars');}},true);

/* Keeps the gameplay HUD readable while the WebGL scene remains the visual focus. */
function decorateAdventureHud(){
  const shell=document.querySelector('.game-shell');
  if(!shell||shell.querySelector('.resource-corner'))return;
  const hud=shell.querySelector('.hud-top');
  hud?.querySelector('.hud-actions')?.insertAdjacentHTML('afterbegin','<button class="hud-btn" data-action="store">✦ STORE</button>');
  hud?.insertAdjacentHTML('beforeend',`<div class="resource-corner" aria-label="Mission resources"><div class="resource-chip coin-chip"><span class="coin-glyph">✦</span><span><small>COINS</small><b>${player.coins||0}</b></span></div><div class="resource-chip booster-chip"><span class="booster-glyph">✚</span><span><small>BOOSTERS</small><b>${Object.values(player.upgrades||{}).reduce((a,v)=>a+Number(v||0),player.boosters||0)}</b></span><button data-action="use-booster" title="Use a booster">USE</button></div></div>`);
  const face=shell.querySelector('.pico-face');
  if(face)face.innerHTML='<div class="pico-visor"><i></i><i></i><span></span></div><div class="pico-collar"></div>';
  shell.insertAdjacentHTML('beforeend','<div class="facility-legend"><span class="legend-dot cyan"></span> INTERACTABLE STATION <span class="legend-dot coral"></span> REQUIRED OBJECTIVE</div>');
  if(['M014','M024'].includes(game?.missionId)&&game?.env==='mars')shell.insertAdjacentHTML('beforeend','<div class="rover-controls"><b>ROVER CONTROLS</b><span>W / ↑ accelerate</span><span>S / ↓ reverse</span><span>A D / ← → steer</span><span>SPACE brake · E exit</span></div>');
}
const baseRenderAdventure=renderAdventure;
renderAdventure=function(){baseRenderAdventure();decorateAdventureHud();};

window.renderLanding = renderLanding;
window.renderDestination = renderDestination;
window.launchSpaceTravel = launchSpaceTravel;
window.proceedToSpacecraftCabin = proceedToSpacecraftCabin;
window.launchLandingSequence = launchLandingSequence;
window.beginLandingSequence = launchLandingSequence;
window.finishLandingSequence = finishLandingSequence;
window.launchReturnJourney = launchReturnJourney;
window.completeReturnJourney = completeReturnJourney;
window.renderAdventure = renderAdventure;
window.selectDestination = selectDestination;
window.spacecraftTasks = spacecraftTasks;
window.surfaceTasks = surfaceTasks;
window.beginAdventure = beginAdventure;
window.findActiveExpedition = findActiveExpedition;
window.interactAdventure = interactAdventure;
window.updateAdventureHud = updateAdventureHud;
window.campaigns = campaigns;
window.createCampaign = createCampaign;
window.campaign = campaign;
window.getGame = () => game;
window.setGame = g => { game = g; };
window.player = player;
