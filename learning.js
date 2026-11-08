'use strict';
(() => {
  const STORAGE = 'accessable_v53_learning';
  const $local = (s, root = document) => root.querySelector(s);
  const byId = id => guides.find(g => g.id === id);
  const safe = value => escapeHTML(String(value ?? ''));
  const exercises = [
    {
      id: 'dns', area:'Networking', title:'Find out why a website will not load', kind:'choice', guide:'dnsguide',
      scenario:'A student has Wi-Fi, but one website will not open. Other websites work normally. What is the best first check?',
      options:['Reinstall Windows immediately','Check the URL and try the website in another browser','Change the laptop MAC address','Delete all files in Downloads'], answer:1,
      explanation:'Testing the address and another browser narrows the issue before changing network settings.',
      tryNext:'Next, use nslookup to check whether the website name resolves to an IP address.'
    },
    {
      id:'routing', area:'Networking', title:'Choose a network diagnostic command', kind:'command', guide:'networkguide',
      scenario:'You want to see the path packets take from your computer to example.com. Type the Windows command you would try.',
      placeholder:'Type a command...', answers:['tracert example.com', 'tracert example.com.'], hint:'On Windows, the command starts with tracert.',
      explanation:'tracert example.com displays a sequence of network hops toward the destination.',
      tryNext:'Compare the results with a ping test and note where connectivity may stop.'
    },
    {
      id:'windows', area:'Windows', title:'Investigate a slow application', kind:'choice', guide:'slowguide',
      scenario:'An application becomes unresponsive on a Windows laptop. What should you check first to see whether it is consuming excessive resources?',
      options:['Windows Task Manager','The Recycle Bin','The system clock','The screen resolution'], answer:0,
      explanation:'Task Manager shows CPU, memory, disk and process usage, helping identify the source of the slowdown.',
      tryNext:'Check for recurring spikes, then record what happens before restarting the application.'
    },
    {
      id:'ipconfig', area:'Windows', title:'Inspect your Windows IP configuration', kind:'command', guide:'networkguide',
      scenario:'Your laptop cannot reach a school website. Enter the Windows command that shows its current IP addressing information.',
      placeholder:'e.g. a Windows command', answers:['ipconfig','ipconfig /all'], hint:'Think: IP + configuration.',
      explanation:'ipconfig shows basic addressing; ipconfig /all adds DNS, DHCP and adapter details.',
      tryNext:'Look for a missing default gateway or an unexpected self-assigned 169.254.x.x address.'
    },
    {
      id:'linux', area:'Linux', title:'Find your current directory', kind:'command', guide:'linuxguide',
      scenario:'You just opened a Linux terminal and want to display the full path of your current working directory. What command do you enter?',
      placeholder:'Linux command', answers:['pwd'], hint:'Three letters, short for print working directory.',
      explanation:'pwd prints the absolute path of the folder you are currently using.',
      tryNext:'Use ls to list files, then cd to move between directories.'
    },
    {
      id:'linuxlog', area:'Linux', title:'Read recent Linux log entries', kind:'choice', guide:'linuxguide',
      scenario:'A service failed recently. You need to inspect the last few lines of a log file. Which command is designed for this?',
      options:['tail -n 30 logfile.log','mkdir logfile.log','rm logfile.log','cd logfile.log'], answer:0,
      explanation:'tail -n 30 shows the last 30 log lines without modifying the file.',
      tryNext:'If using a real server, use your authorized log file path and avoid pasting secrets into support tickets.'
    },
    {
      id:'python', area:'Programming', title:'Print a line with Python', kind:'command', guide:'pythonguide',
      scenario:'Write a valid Python statement that prints Hello to the terminal.',
      placeholder:'Type Python code...', answers:['print("Hello")',"print('Hello')"], hint:'Use print(), with the word inside quotation marks.',
      explanation:'Python uses the print() function to display a string. Strings can use single or double quotation marks.',
      tryNext:'Modify the text in the quotes and try the command in a local Python interpreter.'
    },
    {
      id:'javascript', area:'Programming', title:'Track down a JavaScript error', kind:'choice', guide:'jsguide',
      scenario:'A website button does nothing when clicked. Where should you first look for a JavaScript error?',
      options:['Browser Developer Tools → Console','The computer wallpaper settings','The Downloads folder','The printer queue'], answer:0,
      explanation:'The browser console displays JavaScript errors and often points to the file and line number.',
      tryNext:'Read the first meaningful error, then use a breakpoint or console.log to isolate the issue.'
    }
  ];
  const exerciseForGuide = id => exercises.find(e => e.guide === id) ||
      (/linux|terminal|bash/i.test(id) ? exercises[4] :
      /py|js|html|node|debug|code|sql|github|vscode/i.test(id) ? exercises[6] :
      /wifi|dns|vpn|network|browser/i.test(id) ? exercises[0] :
      /windows|device|slow|printer|software/i.test(id) ? exercises[2] : exercises[0]);

  function load(){
    try {const item = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      return {guides: item && typeof item.guides === 'object' && item.guides ? item.guides : {},
              exercises: item && typeof item.exercises === 'object' && item.exercises ? item.exercises : {}};
    } catch { return {guides:{}, exercises:{}}; }
  }
  let learning = load();
  function persist(){try{localStorage.setItem(STORAGE, JSON.stringify(learning))}catch{toast('Progress could not be saved in this browser.')} renderSummaries();}
  function progressOf(id){return learning.guides[id] || {checked:[], complete:false};}
  const totalComplete = () => Object.values(learning.guides).filter(g => g && g.complete).length;
  const totalPractice = () => exercises.filter(e => learning.exercises[e.id]).length;
  const stepsDone = (id) => Array.isArray(progressOf(id).checked) ? progressOf(id).checked.length : 0;
  function progressBadge(id){const record=progressOf(id);return record.complete ? '<span class="mini-progress done">✓ Completed</span>' : stepsDone(id)>0 ? `<span class="mini-progress started">${stepsDone(id)} steps tried</span>`:'';}
  function renderSummaries(){
    const summary=$local('#learning-progress');
    if(summary){summary.innerHTML=`<div class="learn-progress-icon">${icon('book')}</div><div class="learn-progress-info"><b>Your learning progress</b><span>${totalComplete()} guides completed · ${totalPractice()} of ${exercises.length} practical challenges finished</span><small>Saved privately on this browser. No support request is created by completing a guide.</small></div><button class="btn btn-ghost btn-small" data-learn="jump-practice">Practice now ${icon('arrow')}</button>`;}
    const workspace=$local('#workspace-learning');
    if(workspace){workspace.innerHTML=`<div class="workspace-learning-icon">${icon('check')}</div><div><strong>Keep building your skills</strong><p>${totalComplete()} completed help guides · ${totalPractice()} completed practice challenges</p></div><button class="text-link" data-learn="jump-practice">View challenges ${icon('arrow')}</button>`;}
    const cards=$local('#practice-cards');
    if(cards){cards.innerHTML=exercises.map(e=>`<button type="button" class="practice-card" data-learn="open-exercise" data-id="${e.id}"><span class="practice-card-top"><span class="practice-area">${safe(e.area)}</span><span class="practice-state ${learning.exercises[e.id]?'done':''}">${learning.exercises[e.id]?'✓ Practiced':'3–5 min'}</span></span><b>${safe(e.title)}</b><span class="practice-card-foot">${e.kind==='command'?'Try a real command':'Solve a real-world scenario'} ${icon('arrow')}</span></button>`).join('');}
    const c=$local('#practice-count');if(c)c.textContent=`${totalPractice()} / ${exercises.length} practiced`;
  }
  function linksFor(g){const links=(typeof practiceLinks==='object' ? practiceLinks[g.id] : null) || [];
    return links.length?`<div class="practice-sources"><strong>More practice resources</strong><p>Independent platforms (not affiliated with AccessAble).</p>${links.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${safe(name)} ${icon('arrow')}</a>`).join('')}</div>`:'';
  }
  function guideModal(id){
    const g=byId(id);if(!g)return;
    const saved=progressOf(id);const count=stepsDone(id);
    modal(`<span class="modal-kicker">INTERACTIVE TROUBLESHOOTING · ${safe(allCategories[g.category])}</span>
      <h2 id="modal-title">${safe(g.title)}</h2><p>${safe(g.description)}</p>
      <div class="lesson-progress-head"><strong>Check off steps as you try them</strong><span id="lesson-progress-text">${count} of ${g.steps.length} steps tried</span></div>
      <div class="lesson-progress-bar"><div id="lesson-progress-bar" style="width:${Math.round(100*count/g.steps.length)}%"></div></div>
      <ol class="lesson-step-list">${g.steps.map((step,i)=>`<li><label><input type="checkbox" data-learn-step="${safe(id)}" data-step="${i}" ${Array.isArray(saved.checked)&&saved.checked.includes(i)?'checked':''}><span>${safe(step)}</span></label></li>`).join('')}</ol>
      <div class="note-box"><strong>Keep in mind:</strong> ${safe(g.note)}</div>
      <div id="lesson-feedback" class="lesson-feedback" aria-live="polite">${saved.complete?'<div class="lesson-success">✓ You marked this guide as solved. You can revisit it any time.</div>':''}</div>
      <div class="lesson-actions"><button class="btn btn-primary" data-learn="guide-solved" data-id="${safe(id)}">${saved.complete?'Mark as solved ✓':'This solved my issue'} ${icon('check')}</button><button class="btn btn-ghost" data-learn="guide-stuck" data-id="${safe(id)}">Still stuck? See other options ${icon('arrow')}</button></div>
      <div class="guide-mini-practice"><div><strong>Try a related mini challenge</strong><p>Practice the concept, then continue learning at your own pace.</p></div><button class="btn btn-ghost btn-small" data-learn="practice-from-guide" data-id="${safe(id)}">Open challenge ${icon('arrow')}</button></div>
      ${linksFor(g)}<div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">Close guide</button></div>`);
  }
  function alternativeIds(id, cat){
    const suggestions=(typeof guideRelations==='object'?guideRelations[id]:[]) || [];
    const related=suggestions.map(byId).filter(Boolean);
    if(related.length<2){
      related.push(...guides.filter(g => g.category===cat && g.id!==id && !related.some(x=>x.id===g.id)).slice(0,2-related.length));
    }
    return related.slice(0,3);
  }
  function alternativeHtml(id, cat, subject){
    const recommended=alternativeIds(id,cat);
    return `<div class="alternate-panel"><h4>Another way forward</h4><p>Not every fix works for every student. Try one of these related guides, or prepare a request for support.</p>
      <div class="alternate-guide-list">${recommended.map(g=>`<button type="button" data-learn="open-guide" data-id="${safe(g.id)}"><span>${safe(g.title)}</span>${icon('arrow')}</button>`).join('')}</div>
      <div class="alternate-action-row"><button type="button" class="btn btn-primary btn-small" data-learn="ask-support" data-id="${safe(id)}" data-category="${safe(cat)}" data-subject="${safe(subject)}">Prepare support request ${icon('arrow')}</button>
      <button type="button" class="btn btn-ghost btn-small" data-learn="ask-appointment" data-id="${safe(id)}" data-category="${safe(cat)}" data-subject="${safe(subject)}">Request appointment ${icon('calendar')}</button></div>
      <small>You will receive a reference number only after submitting a request or appointment form. These learning steps are not submissions.</small></div>`;
  }
  function showAlternatives(id){const g=byId(id);if(!g)return;const region=$local('#lesson-feedback');if(!region)return;region.innerHTML=alternativeHtml(id,g.category,g.title);region.scrollIntoView({block:'nearest',behavior:'smooth'});}
  function refreshLessonProgress(id){
    const g=byId(id);if(!g)return;
    const count=stepsDone(id);
    const p=$local('#lesson-progress-text');if(p)p.textContent=`${count} of ${g.steps.length} steps tried`;
    const bar=$local('#lesson-progress-bar');if(bar)bar.style.width=`${100*count/g.steps.length}%`;
  }
  function showPractice(id){const e=exercises.find(x=>x.id===id);if(!e)return;
    modal(`<span class="modal-kicker">${safe(e.area.toUpperCase())} · HANDS-ON PRACTICE</span><h2 id="modal-title">${safe(e.title)}</h2>
      <p>Choose the next troubleshooting step or type a command. This practice runs entirely in your browser.</p>
      <div class="exercise-scenario"><span>YOUR SCENARIO</span><p>${safe(e.scenario)}</p></div>
      ${e.kind==='choice'?`<div class="exercise-options">${e.options.map((o,i)=>`<button type="button" data-learn="answer-choice" data-id="${safe(e.id)}" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span> ${safe(o)}</button>`).join('')}</div>`:
       `<form id="exercise-command-form" data-exercise-id="${safe(e.id)}"><label for="exercise-command">Your command or code</label><div class="exercise-command-row"><input id="exercise-command" autocomplete="off" spellcheck="false" placeholder="${safe(e.placeholder)}" required><button type="submit" class="btn btn-primary btn-small">Check answer</button></div><small>Nothing is executed on your computer. Your answer is checked as text.</small></form><button type="button" class="exercise-hint" data-learn="show-hint" data-id="${safe(e.id)}">Need a hint?</button><p id="exercise-hint-text" hidden>${safe(e.hint)}</p>`}
      <div id="exercise-feedback" role="status" aria-live="polite"></div>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">Close practice</button></div>`);
  }
  function checkAnswer(id,answer){const e=exercises.find(x=>x.id===id);if(!e)return;const correct=e.kind==='choice'? Number(answer)===e.answer:e.answers.some(a=>a.toLowerCase().replace(/\s+/g,'').replace(/[.;]+$/,'')===String(answer).toLowerCase().trim().replace(/\s+/g,'').replace(/[.;]+$/,''));
    const target=$local('#exercise-feedback');if(!target)return;
    if(!correct){target.innerHTML='<div class="exercise-error">Not quite. Review the scenario and try a different answer. You can also use the hint.</div>';return;}
    learning.exercises[id]=true;persist();
    const next=exercises[(exercises.findIndex(x=>x.id===id)+1)%exercises.length];
    target.innerHTML=`<div class="exercise-correct"><strong>✓ Correct answer</strong><p>${safe(e.explanation)}</p><p><b>Try it in practice:</b> ${safe(e.tryNext)}</p></div><div class="exercise-next"><button type="button" class="btn btn-primary btn-small" data-learn="open-exercise" data-id="${safe(next.id)}">Next challenge ${icon('arrow')}</button><button type="button" class="btn btn-ghost btn-small" data-learn="open-guide" data-id="${safe(e.guide)}">Related guide</button></div>`;
    if(e.kind==='choice')$local('.exercise-options')?.querySelectorAll('button').forEach(btn=>{btn.disabled=true;btn.classList.toggle('correct',Number(btn.dataset.answer)===e.answer)});
    else {const input=$local('#exercise-command');if(input)input.disabled=true;const submit=$local('#exercise-command-form button[type=submit]');if(submit)submit.disabled=true;}
  }
  function goPractice(){closeModal();nav('resources');setTimeout(()=>{$local('.practice-hub')?.scrollIntoView({behavior:'smooth',block:'start'})},30);}
  function prepareSupport(el){const cat=el.dataset.category || 'technical';const issue=el.dataset.subject||'Need help with troubleshooting';closeModal();prefillTicket(cat,issue,`I tried the suggested troubleshooting guide for: ${issue}. I still need help with the issue.`, 'Normal');}
  function prepareAppointment(el){const cat=el.dataset.category || 'technical';const issue=el.dataset.subject||'Technical troubleshooting';closeModal();nav('appointments');const form=$local('#appointment-form');form.elements.category.value=cat;form.elements.agenda.value=`I tried self-service troubleshooting but still need help with: ${issue}.`;form.elements.agenda.focus();}

  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-learn]');if(!btn)return;
    const action=btn.dataset.learn;
    if(action==='open-guide'){guideModal(btn.dataset.id);return;}
    if(action==='guide-solved'){
      const id=btn.dataset.id;const record=progressOf(id);record.complete=true;record.checked=Array.isArray(record.checked)?record.checked:[];record.updatedAt=new Date().toISOString();learning.guides[id]=record;persist();
      const feedback=$local('#lesson-feedback');if(feedback)feedback.innerHTML='<div class="lesson-success">✓ You marked this guide as solved. Your learning progress is saved on this browser.</div>';
      btn.textContent='Marked as solved ✓';renderResources();return;
    }
    if(action==='guide-stuck'){showAlternatives(btn.dataset.id);return;}
    if(action==='wizard-alternatives'){
      const g=selectedGuide();const region=$local('#wizard-alternatives');if(region){region.innerHTML=alternativeHtml(g.id,wizard.category,selectedTitle());region.hidden=false;region.scrollIntoView({block:'nearest',behavior:'smooth'});}return;
    }
    if(action==='ask-support'){prepareSupport(btn);return;}
    if(action==='ask-appointment'){prepareAppointment(btn);return;}
    if(action==='open-exercise'){showPractice(btn.dataset.id);return;}
    if(action==='practice-from-guide'){showPractice(exerciseForGuide(btn.dataset.id).id);return;}
    if(action==='answer-choice'){checkAnswer(btn.dataset.id,btn.dataset.answer);return;}
    if(action==='show-hint'){const hint=$local('#exercise-hint-text');if(hint)hint.hidden=false;return;}
    if(action==='jump-practice'){goPractice();return;}
  });
  document.addEventListener('change',event=>{
    const input=event.target.closest('[data-learn-step]');if(!input)return;
    const id=input.dataset.learnStep;const step=Number(input.dataset.step);
    const record=progressOf(id);const values=new Set(Array.isArray(record.checked)?record.checked:[]);
    if(input.checked)values.add(step);else values.delete(step);
    record.checked=[...values].sort((a,b)=>a-b);record.updatedAt=new Date().toISOString();learning.guides[id]=record;
    persist();refreshLessonProgress(id);
  });
  document.addEventListener('submit',event=>{
    if(event.target.id!=='exercise-command-form')return;
    event.preventDefault();checkAnswer(event.target.dataset.exerciseId,$local('#exercise-command').value);
  });
  document.addEventListener('DOMContentLoaded',renderSummaries);
  window.AccessAbleLearning={showGuide:guideModal,renderSummaries,progressBadge,exercises};
})();
