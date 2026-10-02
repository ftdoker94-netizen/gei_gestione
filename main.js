/* Accesso: se non c'è una sessione mostra il login, poi carica l'app. */
(function(){
  const cfg = window.GEI_CONFIG || {};
  const box = document.getElementById('login');
  const form = document.getElementById('login-form');
  const msg = document.getElementById('login-msg');
  const configured = cfg.key && !/INCOLLA/.test(cfg.key);
  let started = false;

  function startApp(){
    if (started) return; started = true;
    box.hidden = true;
    document.getElementById('appwrap').hidden = false;
    const s = document.createElement('script'); s.src = 'app.js?v=1'; document.body.appendChild(s);
  }
  window.geiLogout = async () => { await window.GEI_SB.auth.signOut(); location.reload(); };

  async function init(){
    if (!configured){ box.hidden = false; msg.textContent = 'Manca la chiave Supabase in config.js.'; form.hidden = true; return; }
    const { data } = await window.GEI_SB.auth.getSession();
    if (data && data.session) startApp(); else box.hidden = false;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); msg.textContent = 'Accesso…';
    const { error } = await window.GEI_SB.auth.signInWithPassword({
      email: form.email.value.trim(), password: form.password.value
    });
    if (error){ msg.textContent = 'Email o password non corrette.'; return; }
    msg.textContent = ''; startApp();
  });
  init();
})();
