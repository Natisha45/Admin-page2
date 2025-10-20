// Admin Time Management - minimal
document.addEventListener('DOMContentLoaded', () => {
	const actorKeys = ['agent','branch','sales'];
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

	function fmt(ms){ const s=Math.max(0,Math.floor(ms/1000)); const h=Math.floor(s/3600).toString().padStart(2,'0'); const m=Math.floor((s%3600)/60).toString().padStart(2,'0'); const sec=(s%60).toString().padStart(2,'0'); return `${h}:${m}:${sec}` }

	function renderActors(){ actorKeys.forEach(k=>{ const el = document.querySelector(`[data-key="${k}"]`); const tEl = document.getElementById('time-'+k); const a=state.actors[k]; const time = a.taskStart ? a.taskAccum + (Date.now()-a.taskStart) : a.taskAccum; tEl.textContent = a.done ? fmt(a.taskAccum) : fmt(time); el.classList.toggle('selected', state.selected===k); }) }

	function update(){ const a = state.actors[state.selected]; const time = a.taskStart ? a.taskAccum + (Date.now()-a.taskStart) : a.taskAccum; bigTimer.textContent = fmt(time); renderActors(); }

	function start(){ const a=state.actors[state.selected]; if(!a.taskStart) a.taskStart = Date.now(); if(!interval) interval=setInterval(update,250); save(); }
	function pause(){ const a=state.actors[state.selected]; if(a.taskStart){ a.taskAccum += Date.now()-a.taskStart; a.taskStart=null; } if(interval){ clearInterval(interval); interval=null } save(); update(); }
	function complete(){ const a=state.actors[state.selected]; if(a.taskStart){ a.taskAccum += Date.now()-a.taskStart; a.taskStart=null } a.done=true; save(); update(); }

	startBtn.addEventListener('click', start); pauseBtn.addEventListener('click', pause); completeBtn.addEventListener('click', complete);

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
			meta.textContent = `Ordered by: ${reportBy}    Date: ${new Date().toLocaleString()}`;
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
			actorKeys.forEach(k => {
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

	// wire actor selection
	document.querySelectorAll('.task-card').forEach(card => {
		const key = card.dataset.key;
		card.addEventListener('click', () => { state.selected = key; renderActors(); update(); });
	});

	// initial render
	renderActors(); update();
});

