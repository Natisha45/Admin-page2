// Admin Time Management - minimal
document.addEventListener('DOMContentLoaded', () => {
	// actorKeys will be derived from state so new sections can be added dynamically
	const actorMap = { agent: 'Agent Creation', branch: 'Branch Creation', sales: 'Sales Creation' };

	const bigTimer = document.getElementById('bigTimer');
	const startBtn = document.getElementById('startBtn');
	const pauseBtn = document.getElementById('pauseBtn');
	const completeBtn = document.getElementById('completeBtn');
	const exportBtn = document.getElementById('exportBtn');

	let state = load() || { actors: {
		agent: { name:'Agent Creation', taskStart:null, taskAccum:0, done:false },
		branch: { name:'Branch Creation', taskStart:null, taskAccum:0, done:false },
		sales: { name:'Sales Creation', taskStart:null, taskAccum:0, done:false }
	}, selected: 'agent' };

	let interval = null;

	function save(){ localStorage.setItem('tm_state', JSON.stringify(state)); }
	function load(){ try{return JSON.parse(localStorage.getItem('tm_state')||'null')}catch(e){return null} }

	// activity helpers
	function addActivity(actorKey, action, durationMs){
		state.activities = state.activities || [];
		state.activities.unshift({ time: new Date().toISOString(), actor: actorKey, action, duration: durationMs||0 });
		// keep last 50
		if(state.activities.length>50) state.activities.length=50;
		save();
		renderActivities();
	}

	function renderActivities(){
		const tbody = document.querySelector('#recentActivities tbody');
		if(!tbody) return;
		tbody.innerHTML = '';
		(state.activities||[]).forEach(row => {
			const tr = document.createElement('tr');
			const timeTd = document.createElement('td'); timeTd.textContent = new Date(row.time).toLocaleString(); tr.appendChild(timeTd);
			const actorTd = document.createElement('td'); actorTd.textContent = state.actors[row.actor] ? state.actors[row.actor].name : row.actor; tr.appendChild(actorTd);
			const actionTd = document.createElement('td'); actionTd.textContent = row.action; tr.appendChild(actionTd);
			const durTd = document.createElement('td'); durTd.textContent = row.duration ? fmt(row.duration) : '-'; tr.appendChild(durTd);
			tbody.appendChild(tr);
		});
	}

	function fmt(ms){ const s=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(s/3600).toString().padStart(2,'0'); const m=Math.floor((s%3600)/60).toString().padStart(2,'0'); const sec=(s%60).toString().padStart(2,'0'); return `${h}:${m}:${sec}` }

	function getActorKeys(){ return Object.keys(state.actors); }

	function renderActors(){
		const keys = getActorKeys();
		keys.forEach(k=>{
			const el = document.querySelector(`[data-key="${k}"]`);
			const tEl = document.getElementById('time-'+k);
			const a = state.actors[k];
			const time = a.taskStart ? a.taskAccum + (Date.now()-a.taskStart) : a.taskAccum;
			if(tEl) tEl.textContent = a.done ? fmt(a.taskAccum) : fmt(time);
			if(el) el.classList.toggle('selected', state.selected===k);
		})
	}

	function update(){ const a = state.actors[state.selected]; const time = a.taskStart ? a.taskAccum + (Date.now()-a.taskStart) : a.taskAccum; bigTimer.textContent = fmt(time); renderActors(); }

	function start(){ const a=state.actors[state.selected]; if(!a.taskStart) { a.taskStart = Date.now(); addActivity(state.selected,'Start'); } if(!interval) interval=setInterval(update,250); save(); }
	function pause(){ const a=state.actors[state.selected]; if(a.taskStart){ const dur = Date.now()-a.taskStart; a.taskAccum += dur; a.taskStart=null; addActivity(state.selected,'Pause',dur); } if(interval){ clearInterval(interval); interval=null } save(); update(); }
	function complete(){
		const a = state.actors[state.selected];
		let dur = 0;
		if(a.taskStart){ dur = Date.now()-a.taskStart; a.taskAccum += dur; a.taskStart = null }
		a.done = true;
		addActivity(state.selected,'Complete',dur);
		// start next actor in order, if any
		const keys = getActorKeys();
		const idx = keys.indexOf(state.selected);
		const next = (idx >= 0 && idx < keys.length - 1) ? keys[idx+1] : null;
		if(next){
			state.selected = next;
			state.actors[next].taskStart = Date.now();
			addActivity(next,'Start',0);
		} else {
			// no next - stop interval
			if(interval){ clearInterval(interval); interval=null }
		}
		save(); renderActors(); update();
	}

	// Reset the currently selected actor: clear timings and mark not done
	function resetSection(){ const key = state.selected; const a = state.actors[key]; if(!a) return; a.taskStart = null; a.taskAccum = 0; a.done = false; addActivity(key,'Reset'); save(); renderActors(); update(); }

	// Start a new section: reset tasks and start only the first one so tasks run sequentially
	function addSection(name){
		if(!name || !name.trim()) return;
		const sectionName = name.trim();
		state.currentSection = sectionName;
		const now = Date.now();
		// Reset all existing actors
		const keys = getActorKeys();
		keys.forEach(k=>{
			const a = state.actors[k];
			a.taskStart = null;
			a.taskAccum = 0;
			a.done = false;
		});
		// Start only the first actor in order
		const first = keys[0];
		if(first){
			state.selected = first;
			state.actors[first].taskStart = now;
			addActivity(first,'Section Start',0);
		}
		// ensure update loop is running
		if(!interval) interval = setInterval(update,250);
		save(); renderActors(); update();
	}

	startBtn.addEventListener('click', start); pauseBtn.addEventListener('click', pause); completeBtn.addEventListener('click', complete);

	// Reset and Add Section buttons
	const resetBtn = document.getElementById('resetBtn');
	if(resetBtn) resetBtn.addEventListener('click', resetSection);

	const addSectionBtn = document.getElementById('addSectionBtn');
	if(addSectionBtn){ addSectionBtn.addEventListener('click', ()=>{
		const input = document.getElementById('newSectionName'); if(!input) return; const name = input.value; if(!name.trim()) return alert('Enter a name for the new section'); addSection(name); input.value='';
	}) }

	exportBtn.addEventListener('click', async () => {
		try {
			// Build a report element summarizing tasks and requester
			const reportBy = (document.getElementById('reportBy') || {}).value || '';
			const report = document.createElement('div');
			report.style.padding = '18px';
			report.style.background = '#ffffff';
			report.style.color = '#111';
			report.style.fontFamily = 'Arial, sans-serif';

			const title = document.createElement('h2');
			title.textContent = 'Task Report';
			report.appendChild(title);

			const meta = document.createElement('div');
			meta.style.marginBottom = '8px';
			const sectionLabel = state.currentSection ? `Section: ${state.currentSection}    ` : '';
			meta.textContent = `${sectionLabel}Ordered by: ${reportBy}    Date: ${new Date().toLocaleString()}`;
			report.appendChild(meta);

			const table = document.createElement('table');
			table.style.borderCollapse = 'collapse';
			table.style.width = '100%';
			const thead = document.createElement('thead');
			const hrow = document.createElement('tr');
			['Task','Status','Time'].forEach(h => {
				const th = document.createElement('th');
				th.textContent = h;
				th.style.border = '1px solid #ddd';
				th.style.padding = '8px';
				th.style.textAlign = 'left';
				hrow.appendChild(th);
			});
			thead.appendChild(hrow);
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			getActorKeys().forEach(k => {
				const a = state.actors[k];
				const tr = document.createElement('tr');
				const status = a.done ? 'Completed' : (a.taskStart ? 'In Progress' : 'Not started');
				const time = a.taskAccum + (a.taskStart ? (Date.now() - a.taskStart) : 0);
				[ a.name, status, fmt(time) ].forEach(v => {
					const td = document.createElement('td');
					td.textContent = v;
					td.style.border = '1px solid #ddd';
					td.style.padding = '8px';
					tr.appendChild(td);
				});
				tbody.appendChild(tr);
			});
			table.appendChild(tbody);
			report.appendChild(table);

			// Attach report to DOM offscreen so html2canvas can compute styles
			report.style.position = 'absolute';
			report.style.left = '-9999px';
			report.style.top = '0px';
			document.body.appendChild(report);

			const canvas = await html2canvas(report, {scale:2, backgroundColor:'#ffffff'});
			// remove offscreen node
			document.body.removeChild(report);

			const img = canvas.toDataURL('image/png');
			const { jsPDF } = window.jspdf;
			const pdf = new jsPDF({unit:'pt', format:'a4'});
			const w = pdf.internal.pageSize.getWidth() - 40;
			const h = canvas.height * (w / canvas.width);
			pdf.addImage(img, 'PNG', 20, 20, w, h);
			pdf.save('task-report.pdf');
		} catch (err) {
			console.error('Export failed', err);
			alert('Export failed: ' + (err && err.message));
		}
	});

	// wire existing actor selection
	document.querySelectorAll('.task-card').forEach(card => {
		const key = card.dataset.key;
		card.addEventListener('click', () => { state.selected = key; renderActors(); update(); });
	});

	// initial render
	renderActors(); update(); renderActivities();
});

