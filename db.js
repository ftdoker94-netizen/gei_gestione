/* Collega l'app a Supabase: espone window.claude.use('db'|'downloads') con la stessa interfaccia usata da app.js.
   Tutti i documenti stanno nella tabella public.docs (col, id, data jsonb). */
(function(){
  const cfg = window.GEI_CONFIG || {};
  const sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
  window.GEI_SB = sb;

  const subs = {};            // col -> Set di funzioni refetch
  let channel = null;

  async function fetchCol(col){
    const { data, error } = await sb.from('docs').select('id,data').eq('col', col);
    if (error) throw error;
    return data || [];
  }
  function snapOf(rows){
    return { docs: rows.map(r => ({ id: r.id, data: () => r.data })) };
  }
  function ensureChannel(){
    if (channel) return;
    channel = sb.channel('docs-all').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      const col = (p.new && p.new.col) || (p.old && p.old.col);
      (subs[col] || []).forEach(f => f());
    }).subscribe();
  }
  function watch(col, onRows, onErr){
    const run = async () => { try { onRows(await fetchCol(col)); } catch (e) { onErr && onErr(e); } };
    (subs[col] = subs[col] || new Set()).add(run);
    ensureChannel();
    run();
    // rete di sicurezza se il realtime è spento: riallinea ogni 60 s
    const t = setInterval(run, 60000);
    return () => { clearInterval(t); subs[col].delete(run); };
  }
  async function setDoc(col, id, obj){
    const { error } = await sb.from('docs').upsert({ col, id, data: obj }, { onConflict: 'col,id' });
    if (error) throw error;
  }
  async function delDoc(col, id){
    const { error } = await sb.from('docs').delete().eq('col', col).eq('id', id);
    if (error) throw error;
  }

  const DB = {
    collection(col){
      return {
        onSnapshot(cb, err){ return watch(col, rows => cb(snapOf(rows)), err); },
        doc(id){ return { set: o => setDoc(col, id, o), delete: () => delDoc(col, id) }; }
      };
    },
    doc(path){
      const [col, id] = path.split('/');
      return {
        set: o => setDoc(col, id, o),
        onSnapshot(cb, err){
          return watch(col, rows => {
            const r = rows.find(x => x.id === id);
            cb({ exists: !!r, data: () => (r ? r.data : undefined) });
          }, err);
        }
      };
    }
  };
  const DL = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return { status: 'saved' };
    }
  };
  window.claude = { use: async name => (name === 'db' ? DB : name === 'downloads' ? DL : null) };
})();
