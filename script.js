let projects = JSON.parse(localStorage.getItem('pm_pro_local_db')) || [{ id: Date.now(), name: "Main Project", tasks: [] }];
let activeId = projects[0].id;
let currentFilter = 'ALL';

// Modal Management
let modalMode = 'ADD', editingProjId = null;
const modal = document.getElementById('modal-overlay');
const modalInput = document.getElementById('workspace-input');
const modalTitle = document.getElementById('modal-title');

const save = () => localStorage.setItem('pm_pro_local_db', JSON.stringify(projects));

function openProjectModal(mode, id = null, e = null) {
    if(e) e.stopPropagation();
    modalMode = mode; editingProjId = id;
    modalTitle.innerText = mode === 'ADD' ? "CREATE NEW WORKSPACE" : "RENAME WORKSPACE";
    modalInput.value = mode === 'EDIT' ? projects.find(x => x.id === id).name : "";
    modal.style.display = 'flex';
    modalInput.focus();
}

function closeModal() { modal.style.display = 'none'; }

function submitModal() {
    const name = modalInput.value.trim();
    if(!name) return;
    if(modalMode === 'ADD') {
        const p = { id: Date.now(), name: name, tasks: [] };
        projects.push(p);
        activeId = p.id;
    } else {
        const p = projects.find(x => x.id === editingProjId);
        if(p) p.name = name;
    }
    save(); render(); closeModal();
}

function deleteProject(id, e) {
    e.stopPropagation();
    if(projects.length > 1 && confirm("Delete workspace and all tasks?")) {
        projects = projects.filter(x => x.id !== id);
        if(activeId === id) activeId = projects[0].id;
        save(); render();
    }
}

// Render Logic
const changeTheme = (val) => {
    document.body.removeAttribute('data-theme');
    if(val !== 'cyber') document.body.setAttribute('data-theme', val);
    localStorage.setItem('pm_local_theme', val);
    render();
}

function filterByStatus(s) { currentFilter = s; render(); }

function render() {
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    projects.forEach(p => {
        const div = document.createElement('div');
        div.className = `project-item ${p.id === activeId ? 'active' : ''}`;
        div.onclick = () => { activeId = p.id; currentFilter = 'ALL'; render(); };
        div.innerHTML = `<span>${p.name}</span><div class="proj-actions">
            <span onclick="openProjectModal('EDIT', ${p.id}, event)">✎</span>
            <span onclick="deleteProject(${p.id}, event)">×</span>
        </div>`;
        list.appendChild(div);
    });

    const activeProj = projects.find(p => p.id === activeId);
    document.getElementById('active-project-title').innerText = activeProj ? activeProj.name : "Select Workspace";

    const tasks = activeProj ? activeProj.tasks : [];
    const updateStats = (id, status) => {
        const count = tasks.filter(t => t.status === status).length;
        const percent = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
        document.getElementById(`card-${id}`).classList.toggle('active-filter', currentFilter === status);
        document.querySelector(`#card-${id} h2`).innerText = count.toString().padStart(2, '0');
        document.getElementById(`percent-${id}`).innerText = percent + '%';
        document.getElementById(`ring-${id}`).style.strokeDashoffset = 157 - (157 * percent) / 100;
    };
    [['pending','PENDING'],['progress','IN PROGRESS'],['review','FOR REVIEW'],['completed','COMPLETED']].forEach(([id, s]) => updateStats(id, s));

    const ind = document.getElementById('filter-indicator');
    if(currentFilter !== 'ALL') {
        ind.style.display = 'flex';
        ind.innerHTML = `Showing: ${currentFilter} <span style="margin-left:10px; opacity:0.5">×</span>`;
    } else { ind.style.display = 'none'; }

    const tbody = document.getElementById('task-tbody');
    tbody.innerHTML = '';
    const filtered = currentFilter === 'ALL' ? tasks : tasks.filter(t => t.status === currentFilter);
    filtered.forEach((t, i) => {
        const realIdx = tasks.indexOf(t);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${t.name || ''}" onchange="up(${realIdx},'name',this.value)"></td>
            <td><input type="date" value="${t.timeline}" onchange="up(${realIdx},'timeline',this.value)"></td>
            <td><input type="date" value="${t.modified}" onchange="up(${realIdx},'modified',this.value)"></td>
            <td><select onchange="up(${realIdx},'status',this.value)">
                <option ${t.status==='PENDING'?'selected':''}>PENDING</option>
                <option ${t.status==='IN PROGRESS'?'selected':''}>IN PROGRESS</option>
                <option ${t.status==='FOR REVIEW'?'selected':''}>FOR REVIEW</option>
                <option ${t.status==='COMPLETED'?'selected':''}>COMPLETED</option>
            </select></td>
            <td><input type="text" value="${t.remarks || ''}" onchange="up(${realIdx},'remarks',this.value)"></td>
            <td align="center"><button onclick="del(${realIdx})" style="background:none;border:none;color:#f55;cursor:pointer;font-size:18px">×</button></td>`;
        tbody.appendChild(tr);
    });
}

function addTask() { 
    const p = projects.find(x => x.id === activeId); 
    const d = new Date().toISOString().split('T')[0];
    p.tasks.push({name:"", timeline: d, modified: d, status:"PENDING", remarks:""}); 
    save(); render(); 
}

function up(idx, field, value) { 
    const p = projects.find(x => x.id === activeId); 
    p.tasks[idx][field] = value; 
    p.tasks[idx].modified = new Date().toISOString().split('T')[0]; 
    save(); render(); 
}

function del(idx) { 
    if(confirm("Delete task?")) {
        projects.find(x => x.id === activeId).tasks.splice(idx, 1); 
        save(); render();
    }
}

// Excel Export
function exportToExcel() {
    const activeProj = projects.find(p => p.id === activeId);
    const tasks = activeProj ? activeProj.tasks : [];
    
    // Create workbook and add data
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tasks);
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

    // Save the file
    XLSX.writeFile(wb, `${activeProj.name}_tasks.xlsx`);
}

modalInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') submitModal(); });
const savedTheme = localStorage.getItem('pm_local_theme') || 'cyber';
document.getElementById('theme-selector').value = savedTheme;
changeTheme(savedTheme);
