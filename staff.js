(function(){
const page=document.body.dataset.page;
const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyDate=v=>{const n=new Date(v||0);return Number.isNaN(n.getTime())?'—':n.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})};
const categories={technical:'Technical',academic:'Academic',career:'Career',accessibility:'Accessibility'};
const statuses=['Pending','In progress','Resolved','Cancelled'];
const badge=v=>`<span class="status ${escapeHTML(String(v||'Pending').toLowerCase().replaceAll(' ','-'))}">${escapeHTML(v||'Pending')}</span>`;
const noData=label=>`<div class="empty-row">${escapeHTML(label)}</div>`;
if(!window.ACCESSABLE_HAS_SUPABASE||!window.supabase?.createClient){
 if(page==='login'){$('#staff-message').textContent='Setup required: add your Supabase URL and publishable key to supabase-config.js, run supabase-schema.sql, and authorize a staff account.';$('#staff-message').classList.add('error');$('#sign-in').disabled=true;}
 if(page==='dashboard'){$('#staff-loading').innerHTML='<div class="loading-badge">✦</div><h2>Staff dashboard is not configured</h2><p>Complete your Supabase setup before signing in.</p><a href="staff-login.html">Go to staff sign-in</a>';}
 return;
}
const cfg=window.ACCESSABLE_SUPABASE_CONFIG;
const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{storageKey:'accessable_staff_auth_v5',storage:window.sessionStorage,persistSession:true,autoRefreshToken:true}});
async function permitted(user){if(!user||user.is_anonymous)return false;const {data,error}=await client.from('staff_accounts').select('active').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?.active===true;}
async function call(name,args){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
if(page==='login'){
 const message=$('#staff-message');
 $('#password-toggle').addEventListener('click',()=>{const input=$('#staff-password');const visible=input.type==='password';input.type=visible?'text':'password';$('#password-toggle').textContent=visible?'Hide':'Show';});
 $('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();$('#sign-in').disabled=true;message.classList.remove('error','success');message.textContent='Verifying your account and staff role…';
  try{const {data,error}=await client.auth.signInWithPassword({email:$('#staff-email').value.trim(),password:$('#staff-password').value});if(error)throw error;
    if(!await permitted(data.user)){await client.auth.signOut();throw Error('This account does not have an active staff role.');}
    message.textContent='Welcome! Opening staff dashboard…';message.classList.add('success');location.replace('staff-dashboard.html');
  }catch(err){console.error('Staff login',err);message.textContent=err.message?.includes('active staff role')?err.message:'Login unsuccessful. Check staff email, password, connection, and role permissions.';message.classList.add('error');$('#sign-in').disabled=false;}
 });
 return;
}
if(page!=='dashboard')return;
let currentUser=null,tickets=[],appointments=[],selectedTicket=null,lastRefresh=0,refreshing=false;
const loading=$('#staff-loading'),appEl=$('#staff-private');
const error=text=>{const el=$('#app-error');el.hidden=!text;el.textContent=text||''};
const stats=()=>({total:tickets.length,pending:tickets.filter(t=>t.status==='Pending').length,progress:tickets.filter(t=>t.status==='In progress').length,resolved:tickets.filter(t=>t.status==='Resolved').length,appointments:appointments.length});
const metrics=(includeApt=false)=>{const s=stats();return [{label:'Total requests',value:s.total,icon:'▤',desc:'All support tickets'},{label:'Waiting for review',value:s.pending,icon:'◷',desc:'Pending incidents'},{label:'In progress',value:s.progress,icon:'⌁',desc:'Active investigations'},{label:includeApt?'Session requests':'Resolved issues',value:includeApt?s.appointments:s.resolved,icon:includeApt?'▦':'✓',desc:includeApt?'Preferred session times':'Completed support requests'}].map(m=>`<div class="metric"><div class="metric-top"><span class="metric-label">${m.label}</span><span class="metric-icon">${m.icon}</span></div><strong>${m.value}</strong><small>${m.desc}</small></div>`).join('')};
const ticketRow=t=>`<tr><td><button class="table-link" data-ticket="${escapeHTML(t.id)}">${escapeHTML(t.id)}</button><small>${prettyDate(t.createdAt)}</small></td><td><strong>${escapeHTML(t.subject)}</strong><small>${escapeHTML(t.name)}</small></td><td>${escapeHTML(categories[t.category]||t.category||'Other')}</td><td>${escapeHTML(t.priority||'Normal')}</td><td>${badge(t.status)}</td><td><button class="table-link" data-ticket="${escapeHTML(t.id)}">View →</button></td></tr>`;
function render(){const s=stats();$('#metric-grid').innerHTML=metrics(true);$('#analytics-metrics').innerHTML=metrics(false);$('#ticket-pill').textContent=s.pending;
 $('#recent-tickets').innerHTML=tickets.length?tickets.slice(0,5).map(t=>`<button class="queue-item" data-ticket="${escapeHTML(t.id)}"><span class="queue-icon">▤</span><span class="queue-main"><strong>${escapeHTML(t.subject)}</strong><small>${escapeHTML(t.id)} · ${escapeHTML(t.name)} · ${prettyDate(t.createdAt)}</small></span>${badge(t.status)}</button>`).join(''):noData('No tickets yet. Student submissions will appear here after cloud setup.');
 $('#next-actions').innerHTML=`<div class="action-item"><span class="action-icon">◷</span><div><strong>${s.pending} awaiting first review</strong><p>Open new requests and set a next step.</p></div></div><div class="action-item"><span class="action-icon">⌁</span><div><strong>${s.progress} active investigations</strong><p>Document troubleshooting and follow-up.</p></div></div><div class="action-item"><span class="action-icon">▦</span><div><strong>${s.appointments} session requests</strong><p>Review preferred appointment times.</p></div></div>`;
 const query=$('#ticket-search').value.toLowerCase().trim(),status=$('#ticket-filter').value;
 const filtered=tickets.filter(t=>(status==='all'||t.status===status)&&(!query||[t.id,t.subject,t.description,t.name,t.category].some(v=>String(v||'').toLowerCase().includes(query))));
 $('#tickets-table').innerHTML=filtered.length?`<table class="staff-table"><thead><tr><th>Reference</th><th>Request</th><th>Category</th><th>Impact</th><th>Status</th><th></th></tr></thead><tbody>${filtered.map(ticketRow).join('')}</tbody></table>`:noData('No matching support tickets.');
 $('#appointments-table').innerHTML=appointments.length?`<table class="staff-table"><thead><tr><th>Reference</th><th>Student</th><th>Session</th><th>Preferred date</th><th>Status</th><th></th></tr></thead><tbody>${appointments.map(a=>`<tr><td><strong>${escapeHTML(a.id)}</strong></td><td>${escapeHTML(a.name)}</td><td><strong>${escapeHTML(categories[a.category]||a.category||'Support')}</strong><small>${escapeHTML(a.agenda)}</small></td><td>${escapeHTML(a.date||'—')} ${escapeHTML(a.time||'')}</td><td>${badge(a.status)}</td><td><select class="appointment-status" data-appointment="${escapeHTML(a.id)}" aria-label="Update appointment status"><option value="">Update status…</option><option value="Under review">Under review</option><option value="Accepted">Accepted</option><option value="Declined">Declined</option><option value="Cancelled">Cancelled</option></select></td></tr>`).join('')}</tbody></table>`:noData('No appointment requests yet.');
 const bars=rows=>rows.map(([k,v])=>`<div class="bar-line"><div class="bar-label"><span>${escapeHTML(k)}</span><span>${v}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(100*v/Math.max(1,tickets.length))}%"></div></div></div>`).join('');
 $('#category-chart').innerHTML=bars(Object.keys(categories).map(c=>[categories[c],tickets.filter(t=>t.category===c).length]));
 $('#status-chart').innerHTML=bars(statuses.map(v=>[v,tickets.filter(t=>t.status===v).length]));
}
const panels={overview:'Support overview',tickets:'Support tickets',appointments:'Appointment requests',analytics:'Service analytics'};
function show(panel){const active=panels[panel]?panel:'overview';$$('[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===active));$$('[data-section]').forEach(s=>s.hidden=s.dataset.section!==active);$('#panel-heading').textContent=panels[active];}
function openTicket(id){const t=tickets.find(x=>x.id===id);if(!t)return;selectedTicket=id;
 const history=(t.history||[]).slice().reverse().map(h=>`<div class="editor-timeline-entry"><strong>${escapeHTML(h.title)}</strong><small>${prettyDate(h.at)}</small><p>${escapeHTML(h.message)}</p></div>`).join('')||'<p>No actions yet.</p>';
 $('#ticket-editor').innerHTML=`<span class="editor-id">SUPPORT REQUEST · ${escapeHTML(t.id)}</span><h2 class="editor-title">${escapeHTML(t.subject)}</h2>${badge(t.status)}<p class="editor-sub">Submitted ${prettyDate(t.createdAt)} · ${escapeHTML(t.name)}</p><div class="editor-data"><div><small>Category</small><strong>${escapeHTML(categories[t.category]||t.category)}</strong></div><div><small>Impact</small><strong>${escapeHTML(t.priority)}</strong></div><div><small>Preferred channel</small><strong>${escapeHTML(t.preference)}</strong></div><div><small>Reference</small><strong>${escapeHTML(t.id)}</strong></div></div><h3>Student's issue</h3><div class="editor-description">${escapeHTML(t.description)}</div><label class="editor-label" for="editor-status">Ticket status</label><select id="editor-status">${statuses.map(x=>`<option ${x===t.status?'selected':''}>${x}</option>`).join('')}</select><label class="editor-label" for="editor-note">Troubleshooting or follow-up note</label><textarea id="editor-note" maxlength="1200" placeholder="What was checked? What should the student do next?"></textarea><button class="staff-btn primary editor-save" id="save-ticket">Save staff update →</button><p class="modal-error" id="editor-error" role="status"></p><div class="editor-timeline"><h3>Request history</h3>${history}</div>`;
 $('#ticket-modal').hidden=false;$('#save-ticket').addEventListener('click',saveTicket);$('#editor-status').focus();
}
async function saveTicket(){const t=tickets.find(x=>x.id===selectedTicket);if(!t)return;const status=$('#editor-status').value,note=$('#editor-note').value.trim();if(!note&&status===t.status){$('#editor-error').textContent='Change the status or add a note.';return}$('#save-ticket').disabled=true;
 try{await call('accessable_staff_update_ticket',{p_id:t.id,p_status:status,p_note:note});$('#ticket-modal').hidden=true;error('');await refresh();}catch(e){console.error(e);$('#editor-error').textContent='Could not save. Check staff role or Supabase setup.';$('#save-ticket').disabled=false;}
}
async function updateAppointment(e){const select=e.target;if(!select.matches('.appointment-status')||!select.value)return;select.disabled=true;try{await call('accessable_staff_update_appointment',{p_id:select.dataset.appointment,p_status:select.value});error('');await refresh();}catch(e){console.error(e);error('Could not update appointment. Check staff permissions.');}finally{select.disabled=false;}}
function exportCSV(){const fields=['id','name','subject','category','priority','status','createdAt','description','preference'];const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';const csv=[fields.map(quote).join(','),...tickets.map(t=>fields.map(k=>quote(t[k])).join(','))].join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='accessable-staff-tickets.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);}
document.addEventListener('click',e=>{const panel=e.target.closest('[data-panel]');if(panel)show(panel.dataset.panel);const goto=e.target.closest('[data-open]');if(goto)show(goto.dataset.open);const selected=e.target.closest('[data-ticket]');if(selected)openTicket(selected.dataset.ticket);if(e.target.closest('[data-close="ticket"]'))$('#ticket-modal').hidden=true;});
$('#ticket-search').addEventListener('input',render);$('#ticket-filter').addEventListener('change',render);$('#appointments-table').addEventListener('change',updateAppointment);$('#export-csv').addEventListener('click',exportCSV);
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#ticket-modal').hidden=true;});
$('#logout').addEventListener('click',async()=>{await client.auth.signOut();location.replace('staff-login.html');});
async function refresh(){if(refreshing)return;refreshing=true;try{const [t,a]=await Promise.all([
 client.from('support_tickets').select('data').order('created_at',{ascending:false}),
 client.from('support_appointments').select('data').order('created_at',{ascending:false})
]);if(t.error)throw t.error;if(a.error)throw a.error;tickets=(t.data||[]).map(x=>x.data);appointments=(a.data||[]).map(x=>x.data);render();error('');lastRefresh=Date.now();}
 catch(e){console.error(e);error('Could not load the staff queue. Verify Supabase tables, security policies, and network.');}finally{refreshing=false;}}
(async()=>{try{
 const {data,error:e}=await client.auth.getSession();if(e)throw e;
 const user=data.session?.user;
 if(!user||!await permitted(user)){if(user)await client.auth.signOut();location.replace('staff-login.html');return;}
 currentUser=user;$('#staff-user').textContent=user.email||'Staff';$('#staff-avatar').textContent=(user.email||'IT').slice(0,2).toUpperCase();loading.hidden=true;appEl.hidden=false;show('overview');render();await refresh();
 setInterval(()=>{if(!document.hidden)refresh()},12000);
 window.addEventListener('focus',refresh);
}catch(e){console.error(e);loading.innerHTML='<div class="loading-badge">✦</div><h2>Staff access could not be verified</h2><p>Check your Supabase settings and staff permissions.</p><a href="staff-login.html">Return to staff login</a>';}})();
})();
