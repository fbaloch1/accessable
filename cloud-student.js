(function(){
  if(!window.ACCESSABLE_HAS_SUPABASE)return;
  if(!window.supabase?.createClient){window.dispatchEvent(new CustomEvent('accessable-cloud-error',{detail:'Supabase library could not load. Check internet access.'}));return;}
  const c=window.ACCESSABLE_SUPABASE_CONFIG;
  const client=window.supabase.createClient(c.url,c.publishableKey,{auth:{storageKey:'accessable_student_auth_v5',persistSession:true,autoRefreshToken:true}});
  const run=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};
  let active=false;
  const service={
    enabled:false,
    async createTicket(ticket){if(!active)throw Error('Student sign-in not ready');return run('accessable_submit_ticket',{p_ticket:ticket});},
    async createAppointment(appointment){if(!active)throw Error('Student sign-in not ready');return run('accessable_submit_appointment',{p_appointment:appointment});},
    async updateTicket(ticket){if(!active)throw Error('Student sign-in not ready');const last=ticket.history?.at(-1);const action=last?.title?.startsWith('Student update')?'add-update':ticket.status==='Cancelled'?'cancel-ticket':'reopen-ticket';return run('accessable_student_update_ticket',{p_id:ticket.id,p_action:action,p_note:action==='add-update'?last.message:''});},
    async updateAppointment(appointment){if(!active)throw Error('Student sign-in not ready');return run('accessable_student_cancel_appointment',{p_id:appointment.id});},
    async refresh(){if(!active)throw Error('Student sign-in not ready');const [t,a]=await Promise.all([
       client.from('support_tickets').select('data').order('created_at',{ascending:false}),
       client.from('support_appointments').select('data').order('created_at',{ascending:false})
    ]);if(t.error)throw t.error;if(a.error)throw a.error;return {tickets:(t.data||[]).map(r=>r.data),appointments:(a.data||[]).map(r=>r.data)};}
  };
  window.AccessAbleCloud=service;
  let refreshing=false;
  async function refresh(){if(!active||refreshing)return;refreshing=true;try{const d=await service.refresh();window.dispatchEvent(new CustomEvent('accessable-cloud-data',{detail:d}));}catch(e){console.error('Student cloud sync',e);window.dispatchEvent(new CustomEvent('accessable-cloud-error',{detail:'Cloud sync failed. Check Supabase tables and security policies.'}));}finally{refreshing=false;}}
  async function initialize(){try{
    const {data:session,error:sErr}=await client.auth.getSession();if(sErr)throw sErr;
    if(!session.session){const {error:anonError}=await client.auth.signInAnonymously();if(anonError)throw anonError;}
    active=true;service.enabled=true;window.dispatchEvent(new Event('accessable-cloud-ready'));
    await refresh();
    window.addEventListener('focus',refresh);window.addEventListener('accessable-cloud-refresh',refresh);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  }catch(e){console.error('Supabase student login',e);window.dispatchEvent(new CustomEvent('accessable-cloud-error',{detail:'Supabase student connection failed. Enable Anonymous Sign-Ins and run the provided SQL setup.'}));}}
  initialize();
})();
