(function(){
'use strict';
/* ---------- utilità ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fEur=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const fEur0=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const eur=n=>fEur.format(+n||0), eur0=n=>fEur0.format(+n||0);
const pct=(n,d=1)=>new Intl.NumberFormat('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}).format(+n||0)+'%';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const d=new Date((s||'')+'T00:00:00');return isNaN(d)?null:d};
const addDays=(s,n)=>{const d=parse(s)||new Date();d.setDate(d.getDate()+n);return iso(d)};
const dt=s=>{const d=parse(s);return d?d.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}):'—'};
const dts=s=>{const d=parse(s);return d?d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}):'—'};
const today=()=>iso(new Date());
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:0};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sum=(a,f)=>a.reduce((t,x)=>t+(+f(x)||0),0);

const CAT=[
 {k:'manodopera',n:'Manodopera',d:'Operai propri e rapportini',c:'--s1',ic:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 1 0 0-6M21 20c0-2.5-1.5-4.6-3.5-5.5"/>'},
 {k:'materiali',n:'Materiali',d:'Forniture, calcestruzzo, ferro',c:'--s2',ic:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>'},
 {k:'noli',n:'Noli e attrezzature',d:'Noleggi, macchine e utensileria',c:'--s3',ic:'<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-2.6-.6-.6-2.6z"/>'},
 {k:'subappalti',n:'Subappalti',d:'Ditte e squadre esterne',c:'--s4',ic:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'},
 {k:'spese',n:'Spese di cantiere',d:'Smaltimenti, permessi, varie',c:'--s5',ic:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'}
];
const CK=CAT.map(c=>c.k);
const catOf=k=>CAT.find(c=>c.k===k)||CAT[4];
const ICON={
 impresa:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/>',
 cantieri:'<path d="M2 18h20M4 18a8 8 0 0 1 16 0M12 6v4"/>',
 fatture:'<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6"/>',
 cassa:'<path d="M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h2"/>',
 impost:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
 img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/>',
 clienti:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
 chev:'<path d="M6 9l6 6 6-6"/>'
};
const svg=(p,cls='i')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

/* ---------- stato ---------- */
const COLS=['cantieri','costi','sal','sub','ore','operai','regole','scad','clienti','preventivi'];
const S={cantieri:[],costi:[],sal:[],sub:[],ore:[],operai:[],regole:[],scad:[],clienti:[],preventivi:[],config:{}};
const PSTATI=[['bozza','Bozza','mute'],['inviato','Inviato','info'],['trattativa','In trattativa','warn'],['accettato','Accettato','good'],['perso','Perso','bad']];
const pst=k=>PSTATI.find(x=>x[0]===k)||PSTATI[0];
const APERTI=['inviato','trattativa'];
const TCLI={privato:'Privato',azienda:'Azienda',condominio:'Condominio',ente:'Ente pubblico'};
const TIPI={iva:'IVA',acciva:'Acconto IVA',ires:'IRES',irap:'IRAP',f24:'Ritenute e INPS',rata:'Rata o leasing',altro:'Altro'};
/* giorni festivi fissi italiani (mese-giorno) e slittamento al primo giorno lavorativo */
const FESTE=new Set(['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26']);
function lavorativo(y,m,d){const x=new Date(y,m-1,d);for(let i=0;i<10;i++){const k=pad(x.getMonth()+1)+'-'+pad(x.getDate());if(x.getDay()!==0&&x.getDay()!==6&&!FESTE.has(k))break;x.setDate(x.getDate()+1)}return iso(x)}
function canoniche(regime){
  const t0=today(),y0=new Date().getFullYear(),out=[];
  const add=(y,m,d,tipo,titolo)=>{const data=lavorativo(y,m,d);if(data>=addDays(t0,-30)&&data<=addDays(t0,400))out.push({data,tipo,titolo})};
  for(let y=y0;y<=y0+1;y++){
    if(regime==='mens'){for(let m=1;m<=12;m++){const mp=m===1?12:m-1;add(y,m,16,'iva',`IVA di ${['','gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'][mp]}`)}}
    else{
      add(y,3,16,'iva','IVA saldo annuale (IV trimestre)');
      add(y,5,16,'iva','IVA I trimestre');
      add(y,8,20,'iva','IVA II trimestre');
      add(y,11,16,'iva','IVA III trimestre');
    }
    add(y,12,27,'acciva','Acconto IVA');
    add(y,6,30,'ires','IRES saldo e primo acconto');
    add(y,6,30,'irap','IRAP saldo e primo acconto');
    add(y,11,30,'ires','IRES secondo acconto');
    add(y,11,30,'irap','IRAP secondo acconto');
  }
  return out.sort((a,b)=>a.data.localeCompare(b.data));
}
let DB=null, DL=null, loaded=false, SYNC='…';
const ui={view:'impresa',cid:'',tab:'panoramica',open:{},periodoOpen:false,da:addDays(today(),-6),a:today(),pend:'',log:[],catFilter:'',pf:''};
try{const s=JSON.parse(localStorage.getItem('gei-ui')||'{}');if(s.view)ui.view=s.view;if(s.cid)ui.cid=s.cid;if(s.tab)ui.tab=s.tab}catch(e){}
const saveUi=()=>{try{localStorage.setItem('gei-ui',JSON.stringify({view:ui.view,cid:ui.cid,tab:ui.tab}))}catch(e){}};

/* ---------- salvataggio ---------- */
async function put(col,obj,quiet){
  const o={...obj};if(!o.id)o.id=uid();const id=o.id;delete o.id;
  const full={...o,id};const i=S[col].findIndex(x=>x.id===id);
  if(i>=0)S[col][i]=full;else S[col].push(full);
  if(!quiet)render();
  if(DB){try{await DB.collection(col).doc(id).set(o)}catch(e){toast('Salvataggio non riuscito: '+(e&&(e.message||e.code)||'errore'))}}
  return id;
}
async function del(col,id){
  S[col]=S[col].filter(x=>x.id!==id);render();
  if(DB){try{await DB.collection(col).doc(id).delete()}catch(e){toast('Eliminazione non riuscita')}}
}
async function putConfig(patch){
  S.config={...S.config,...patch};render();
  if(DB){try{await DB.doc('config/impresa').set(S.config)}catch(e){toast('Salvataggio non riuscito')}}
}
let tt=0;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,3800)}

/* ---------- calcoli ---------- */
function calc(c){
  const costi=S.costi.filter(x=>x.cantiereId===c.id);
  const subs=S.sub.filter(x=>x.cantiereId===c.id);
  const subNames=new Set(subs.map(s=>norm(s.nome)));
  const cons={},imp={},bud={},eac={},n={};
  CK.forEach(k=>{cons[k]=0;imp[k]=0;n[k]=0;bud[k]=num(c.budget&&c.budget[k])});
  costi.forEach(x=>{
    const k=CK.includes(x.categoria)?x.categoria:'spese';n[k]++;
    if(x.stato==='ordine'){imp[k]+=num(x.importo);return}
    if(k==='subappalti'&&subNames.has(norm(x.fornitore)))return;
    cons[k]+=num(x.importo);
  });
  const ore=S.ore.filter(x=>x.cantiereId===c.id);
  let oreTot=0;
  ore.forEach(o=>{oreTot+=num(o.ore);cons.manodopera+=num(o.ore)*num(o.costoOrario)});
  n.manodopera+=ore.length;
  const subRows=subs.map(s=>{
    const fatt=sum(costi.filter(x=>x.categoria==='subappalti'&&x.stato!=='ordine'&&norm(x.fornitore)===norm(s.nome)),x=>x.importo);
    const acc=Math.max(num(s.maturato),fatt);
    const res=Math.max(0,num(s.importo)-acc);
    cons.subappalti+=acc;imp.subappalti+=res;n.subappalti++;
    return {...s,fatt,acc,res,daPagare:Math.max(0,acc-num(s.pagato))};
  });
  CK.forEach(k=>{eac[k]=Math.max(bud[k],cons[k]+imp[k])});
  const tot=o=>CK.reduce((t,k)=>t+o[k],0);
  const contratto=num(c.contratto),consT=tot(cons),impT=tot(imp),budT=tot(bud),eacT=tot(eac);
  const rit=num(c.ritenutaPct)/100;
  const sal=S.sal.filter(x=>x.cantiereId===c.id).sort((a,b)=>num(a.n)-num(b.n));
  const maturato=sum(sal,s=>s.importo),fatturato=sum(sal.filter(s=>s.fatturato),s=>s.importo);
  const incassato=sum(sal,s=>s.incassato);
  const ritenute=maturato*rit;
  const daIncassare=Math.max(0,sum(sal.filter(s=>s.fatturato),s=>num(s.importo)*(1-rit))-incassato);
  const avanz=contratto?maturato/contratto:0;
  const margine=contratto-eacT;
  const proiezione=avanz>=0.05?consT/avanz:null;
  return {costi,subRows,cons,imp,bud,eac,n,contratto,consT,impT,budT,eacT,sal,maturato,fatturato,incassato,ritenute,
    daFatturare:maturato-fatturato,daIncassare,avanz,margine,marginePct:contratto?margine/contratto*100:0,
    maturatoMargine:maturato-consT,proiezione,oreTot,ore,rit,haBudget:budT>0};
}
function periodo(c,da,a){
  const inR=d=>d&&d>=da&&d<=a;
  const subNames=new Set(S.sub.filter(s=>s.cantiereId===c.id).map(s=>norm(s.nome)));
  const by={};CK.forEach(k=>by[k]=0);const days=new Set();
  S.costi.filter(x=>x.cantiereId===c.id&&x.stato!=='ordine'&&inR(x.data)).forEach(x=>{
    const k=CK.includes(x.categoria)?x.categoria:'spese';
    if(k==='subappalti'&&subNames.has(norm(x.fornitore)))return;
    by[k]+=num(x.importo);days.add(x.data)});
  S.ore.filter(o=>o.cantiereId===c.id&&inR(o.data)).forEach(o=>{by.manodopera+=num(o.ore)*num(o.costoOrario);days.add(o.data)});
  const tot=CK.reduce((t,k)=>t+by[k],0);
  return {by,tot,giorni:days.size,medio:days.size?tot/days.size:0};
}
const cfg=()=>({fissi:num(S.config.costiFissiMensili),cassa:num(S.config.cassaIniziale),cassaData:S.config.cassaData||'',soglia:S.config.margineMin==null?10:num(S.config.margineMin),iva:S.config.ivaRegime||'trim'});
function salStato(s,c){
  const rit=num(c.ritenutaPct)/100,res=num(s.importo)*(1-rit)-num(s.incassato);
  if(!s.fatturato)return {t:'Da fatturare',k:'warn'};
  if(res<=0.5)return {t:'Incassato',k:'good'};
  const sc=s.scadenza||addDays(s.dataFattura||s.data,60);
  if(sc<today())return {t:'Scaduto',k:'bad'};
  return {t:num(s.incassato)>0?'Incasso parziale':'Da incassare',k:'info'};
}
const pill=(t,k)=>`<span class="pill ${k||'mute'}"><i></i>${esc(t)}</span>`;
const daAssegnare=()=>S.costi.filter(x=>!x.cantiereId||!S.cantieri.some(c=>c.id===x.cantiereId));
const cName=id=>{const c=S.cantieri.find(x=>x.id===id);return c?c.nome:'—'};

/* ---------- cassa a 13 settimane ---------- */
function cassa(){
  const mon=d=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
  const start=mon(new Date()),t0=today();
  const W=13,weeks=[];
  for(let i=0;i<W;i++){const d=new Date(start);d.setDate(d.getDate()+7*i);weeks.push({da:iso(d),inc:0,pag:0,tax:0,fix:0,saldo:0})}
  const idx=s=>{if(s<t0)s=t0;const diff=Math.floor((parse(s)-start)/(7*864e5));return diff<0?0:diff};
  let scaduti=0;const incassi=[],pagamenti=[];
  S.cantieri.forEach(c=>{
    const rit=num(c.ritenutaPct)/100;
    S.sal.filter(s=>s.cantiereId===c.id&&s.fatturato).forEach(s=>{
      const res=num(s.importo)*(1-rit)-num(s.incassato);if(res<=0.5)return;
      const d=s.scadenza||addDays(s.dataFattura||s.data,60);
      if(d<t0)scaduti+=res;
      const i=idx(d);if(i<W)weeks[i].inc+=res;
      incassi.push({d,res,c:c.nome,n:s.n});
    });
  });
  let stimati=0;
  S.cantieri.forEach(c=>{
    const rit=num(c.ritenutaPct)/100;
    S.sal.filter(s=>s.cantiereId===c.id&&!s.fatturato&&num(s.importo)>0).forEach(s=>{
      const res=num(s.importo)*(1-rit),d0=addDays(s.data||t0,60),d=d0<t0?t0:d0,i=idx(d);
      stimati+=res;if(i<W)weeks[i].inc+=res;
      incassi.push({d,res,c:c.nome,n:s.n,stim:true});
    });
  });
  S.costi.filter(x=>x.stato!=='ordine'&&!x.pagato).forEach(x=>{
    const d=x.scadenza||addDays(x.data,30),i=idx(d);if(i<W)weeks[i].pag+=num(x.importo);
    pagamenti.push({d,v:num(x.importo),f:x.fornitore});
  });
  const k=cfg(),fixW=k.fissi*12/52,base=k.cassaData,okD=d=>!base||(d&&d>=base);
  let rIn=0,rOut=0;
  S.sal.forEach(x=>{if(num(x.incassato)>0&&okD(x.dataIncasso||x.data))rIn+=num(x.incassato)});
  S.costi.filter(x=>x.stato!=='ordine'&&x.pagato&&okD(x.data)).forEach(x=>{rOut+=num(x.importo)});
  S.scad.filter(x=>x.pagato&&num(x.importo)>0&&okD(x.dataPag||x.data)).forEach(x=>{rOut+=num(x.importo)});
  const attuale=k.cassa+rIn-rOut;
  S.scad.filter(x=>!x.pagato&&num(x.importo)>0).forEach(x=>{const i=idx(x.data);if(i<W)weeks[i].tax+=num(x.importo)});
  let s=attuale;
  weeks.forEach(w=>{w.fix=fixW;s=s+w.inc-w.pag-w.tax-w.fix;w.saldo=s});
  return {weeks,scaduti,start:attuale,iniziale:k.cassa,rIn,rOut,stimati,incassi,pagamenti};
}

/* ---------- fatture elettroniche ---------- */
function parseFattura(text){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('XML non leggibile');
  const all=(el,n)=>Array.from(el.getElementsByTagNameNS('*',n));
  const g=(el,n)=>{const x=el.getElementsByTagNameNS('*',n)[0];return x?x.textContent.trim():''};
  const ced=all(doc,'CedentePrestatore')[0];
  if(!ced){const er=new Error('Non è una fattura elettronica');er.code='NOINV';throw er}
  let forn=g(ced,'Denominazione');if(!forn)forn=(g(ced,'Nome')+' '+g(ced,'Cognome')).trim();
  const piva=g(ced,'IdCodice');
  const out=[];
  all(doc,'FatturaElettronicaBody').forEach(b=>{
    const tipo=g(b,'TipoDocumento');
    let imp=sum(all(b,'DatiRiepilogo'),r=>g(r,'ImponibileImporto'));
    if(!imp)imp=num(g(b,'ImportoTotaleDocumento'));
    out.push({forn,piva,data:g(b,'Data'),numero:g(b,'Numero'),importo:(tipo==='TD04'?-1:1)*imp,
      desc:all(b,'DettaglioLinee').map(l=>g(l,'Descrizione')).filter(Boolean),
      cup:all(b,'CodiceCUP').map(x=>x.textContent.trim()),cig:all(b,'CodiceCIG').map(x=>x.textContent.trim()),
      scad:g(b,'DataScadenzaPagamento')});
  });
  return out;
}
function guessCat(f){
  const t=norm(f.forn+' '+f.desc.join(' '));
  if(/\b(nolo|noleggio|escavator\w*|gru|ponteggi\w*|attrezzatur\w*|autocarr\w*)\b/.test(t))return 'noli';
  if(/\b(smaltiment\w*|discarica|permess\w*|diritti|assicura\w*)\b/.test(t))return 'spese';
  return 'materiali';
}
const kw=c=>String(c.keywords||'').split(',').map(x=>x.trim()).filter(x=>x.length>=3);
function assegna(f){
  const sb=S.sub.find(s=>norm(s.nome)===norm(f.forn)&&S.cantieri.some(c=>c.id===s.cantiereId));
  if(sb)return {cantiereId:sb.cantiereId,categoria:'subappalti',via:'subappaltatore'};
  const r=S.regole.find(x=>norm(x.fornitore)===norm(f.forn)&&S.cantieri.some(c=>c.id===x.cantiereId));
  if(r)return {cantiereId:r.cantiereId,categoria:r.categoria||guessCat(f),via:'regola fornitore'};
  for(const c of S.cantieri){
    if((c.cup&&f.cup.includes(c.cup))||(c.cig&&f.cig.includes(c.cig)))return {cantiereId:c.id,categoria:guessCat(f),via:'CUP/CIG'};
  }
  const text=norm(f.desc.join(' '));
  const hits=S.cantieri.filter(c=>kw(c).some(k=>text.includes(norm(k))));
  if(hits.length===1)return {cantiereId:hits[0].id,categoria:guessCat(f),via:'parola chiave'};
  return {cantiereId:'',categoria:guessCat(f),via:''};
}
async function leggiFile(file){
  const name=file.name.toLowerCase(),res=[];
  const fromBuf=buf=>{
    let t=new TextDecoder('utf-8').decode(buf);
    const a=t.indexOf('<?xml'),tag='FatturaElettronica>',b=t.lastIndexOf(tag);
    if(a<0||b<0)throw new Error('contenuto non riconosciuto');
    return t.slice(a,b+tag.length);
  };
  if(name.endsWith('.zip')){
    if(!window.JSZip)throw new Error('lettura ZIP non disponibile');
    const z=await window.JSZip.loadAsync(await file.arrayBuffer());
    const names=Object.keys(z.files).filter(n=>/\.(xml|p7m)$/i.test(n)&&!z.files[n].dir&&!/metadat|(^|[_\/])mt[_.]/i.test(n));
    for(const n of names){res.push({nome:n,buf:await z.files[n].async('arraybuffer')})}
  }else res.push({nome:file.name,buf:await file.arrayBuffer()});
  return res.map(r=>({nome:r.nome,testo:()=>fromBuf(r.buf)}));
}
async function importa(files){
  ui.log=[];let nuove=0,doppie=0,errori=0,auto=0,emesse=0,ignorati=0;
  const mia=String(S.config.piva||'').replace(/\D/g,'');
  const chiavi=new Set(S.costi.map(x=>x.chiave).filter(Boolean));
  for(const file of files){
    let parti;
    try{parti=await leggiFile(file)}catch(e){ui.log.push({k:'bad',t:`${file.name}: ${e.message}`});errori++;continue}
    for(const p of parti){
      let fatt;
      try{fatt=parseFattura(p.testo())}catch(e){if(e.code==='NOINV'||/non riconosciuto/.test(e.message)){ignorati++;continue}ui.log.push({k:'bad',t:`${p.nome}: ${e.message}`});errori++;continue}
      for(const f of fatt){
        if(mia&&String(f.piva||'').replace(/\D/g,'')===mia){emesse++;continue}
        const chiave=[f.piva||norm(f.forn),f.numero,f.data].join('|');
        if(chiavi.has(chiave)){doppie++;continue}
        chiavi.add(chiave);
        const as=assegna(f);if(as.cantiereId)auto++;
        const d0=f.desc[0]||'Fattura '+f.numero;
        await put('costi',{cantiereId:as.cantiereId,categoria:as.categoria,data:f.data,
          descrizione:(d0.length>120?d0.slice(0,117)+'…':d0)+(f.desc.length>1?` (+${f.desc.length-1} righe)`:''),
          fornitore:f.forn,piva:f.piva,numero:f.numero,importo:Math.round(f.importo*100)/100,stato:'registrato',
          pagato:false,scadenza:f.scad||'',origine:'xml',chiave,cup:f.cup.join(','),cig:f.cig.join(',')},true);
        nuove++;
      }
    }
  }
  ui.log.unshift({k:nuove?'good':'info',t:`${nuove} fatture registrate (${auto} assegnate da sole, ${nuove-auto} da assegnare), ${doppie} già presenti`+(emesse?`, ${emesse} emesse da te (ignorate)`:'')+(ignorati?`, ${ignorati} file non-fattura ignorati`:'')+`, ${errori} con errori.`});
  render();toast(nuove?`${nuove} fatture importate`:'Nessuna fattura nuova');
}

/* ---------- modali ---------- */
const F={
 t:(n,l,v,o={})=>`<label class="f ${o.cls||''}"><span>${l}</span><input name="${n}" id="f-${n}" type="${o.type||'text'}" value="${esc(v==null?'':v)}" ${o.req?'required':''} ${o.step?`step="${o.step}"`:''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.inputmode?`inputmode="${o.inputmode}"`:''}></label>`,
 m:(n,l,v,o={})=>F.t(n,l,v,{type:'number',step:'0.01',inputmode:'decimal',...o}),
 s:(n,l,opts,v,o={})=>`<label class="f ${o.cls||''}"><span>${l}</span><select name="${n}" id="f-${n}">${opts.map(([a,b])=>`<option value="${esc(a)}" ${String(a)===String(v)?'selected':''}>${esc(b)}</option>`).join('')}</select></label>`,
 a:(n,l,v,o={})=>`<label class="f ${o.cls||''}"><span>${l}</span><textarea name="${n}" id="f-${n}" rows="3" ${o.ph?`placeholder="${esc(o.ph)}"`:''}>${esc(v==null?'':v)}</textarea></label>`,
 c:(n,l,on,o={})=>`<label class="f chk ${o.cls||''}"><input type="checkbox" name="${n}" id="f-${n}" ${on?'checked':''}><span>${l}</span></label>`
};
function modal(title,inner,onSave,o={}){
  const ov=$('#ov');
  ov.innerHTML=`<div class="bg" data-act="close"></div><form class="modal" id="mform" autocomplete="off"><h2>${esc(title)}</h2>${inner}<div class="mfoot"><button type="button" class="btn" data-act="close">Annulla</button><button class="btn pri" type="submit">${esc(o.save||'Salva')}</button></div></form>`;
  ov.hidden=false;
  const f=$('#mform');
  f.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(f),d={};fd.forEach((v,k)=>d[k]=v);
    f.querySelectorAll('input[type=checkbox]').forEach(c=>d[c.name]=c.checked);
    const keep=await onSave(d);
    if(keep!==false)closeModal();
  });
  if(o.init)o.init(f);
  const first=f.querySelector('input:not([type=checkbox]),select');if(first)first.focus();
}
const closeModal=()=>{const ov=$('#ov');ov.hidden=true;ov.innerHTML=''};
const catOpts=()=>CAT.map(c=>[c.k,c.n]);
const cantOpts=(blank)=>(blank?[['','— scegli —']]:[]).concat(S.cantieri.map(c=>[c.id,c.nome]));

function mCantiere(id){
  const c=S.cantieri.find(x=>x.id===id)||{stato:'in_corso',inizio:today(),ritenutaPct:0,keywords:''};
  modal(id?'Modifica cantiere':'Nuovo cantiere',`<div class="fields">
    ${F.t('nome','Nome cantiere',c.nome,{req:1,cls:'full',ph:'Es. Appartamento Trani'})}
    ${F.t('descrizione','Descrizione',c.descrizione,{cls:'full'})}
    ${F.t('indirizzo','Indirizzo',c.indirizzo)}${F.t('committente','Committente',c.committente)}
    ${F.m('contratto','Importo di contratto (€)',c.contratto||'',{req:1})}
    ${F.s('stato','Stato',[['da_avviare','Da avviare'],['in_corso','In corso'],['chiuso','Chiuso']],c.stato)}
    ${F.t('inizio','Inizio lavori',c.inizio,{type:'date'})}${F.t('fine','Fine lavori prevista',c.fine,{type:'date'})}
    ${F.m('ritenutaPct','Ritenuta di garanzia (%)',c.ritenutaPct||0)}
    ${F.t('cup','CUP',c.cup)}${F.t('cig','CIG',c.cig)}
    ${F.t('keywords','Parole chiave per riconoscere le fatture',c.keywords,{cls:'full',ph:'Trani, Via Toscana'})}
  </div><p class="hint">Le parole chiave servono a assegnare da sole le fatture XML a questo cantiere, quando compaiono nella descrizione delle righe.</p>`,
  async d=>{
    const base=c.id?c:{budget:{}};
    const nid=await put('cantieri',{...base,id:c.id,nome:d.nome.trim(),descrizione:d.descrizione,indirizzo:d.indirizzo,committente:d.committente,
      contratto:num(d.contratto),stato:d.stato,inizio:d.inizio,fine:d.fine,ritenutaPct:num(d.ritenutaPct),cup:d.cup.trim(),cig:d.cig.trim(),keywords:d.keywords});
    if(!c.id){ui.view='cantiere';ui.cid=nid;ui.tab='panoramica';saveUi()}
  });
}
function mBudget(id){
  const c=S.cantieri.find(x=>x.id===id);if(!c)return;
  modal('Budget costi',`<p class="hint" style="margin:0">Quanto prevedi di spendere per categoria. Il contratto è di ${eur0(c.contratto)}.</p><div class="fields">
    ${CAT.map(t=>F.m('b_'+t.k,t.n+' (€)',(c.budget&&c.budget[t.k])||0)).join('')}
  </div><p class="hint" id="bsum"></p>`,
  async d=>{const b={};CK.forEach(k=>b[k]=num(d['b_'+k]));await put('cantieri',{...c,budget:b,budgetProvvisorio:false})},
  {init:f=>{const up=()=>{const t=CK.reduce((a,k)=>a+num(f.elements['b_'+k].value),0);$('#bsum').textContent=`Totale ${eur0(t)} · margine previsto ${eur0(c.contratto-t)} (${pct(c.contratto?(c.contratto-t)/c.contratto*100:0)})`};f.addEventListener('input',up);up()}});
}
function mCosto(id,cid){
  const x=S.costi.find(y=>y.id===id)||{cantiereId:cid||'',categoria:'materiali',data:today(),stato:'registrato',pagato:false};
  modal(id?'Modifica costo':'Nuovo costo',`<div class="fields">
    ${F.s('cantiereId','Cantiere',cantOpts(true),x.cantiereId)}${F.s('categoria','Categoria',catOpts(),x.categoria)}
    ${F.t('descrizione','Descrizione',x.descrizione,{cls:'full',req:1})}
    ${F.t('fornitore','Fornitore',x.fornitore)}${F.t('numero','N. fattura',x.numero)}
    ${F.t('data','Data',x.data,{type:'date',req:1})}${F.m('importo','Imponibile (€)',x.importo,{req:1})}
    ${F.s('stato','Stato',[['registrato','Registrato (costo maturato)'],['ordine','Ordine non ancora fatturato']],x.stato)}
    ${F.t('scadenza','Scadenza pagamento',x.scadenza,{type:'date'})}
    ${F.c('pagato','Già pagata',x.pagato,{cls:'full'})}
  </div>`,
  d=>put('costi',{...x,cantiereId:d.cantiereId,categoria:d.categoria,descrizione:d.descrizione,fornitore:d.fornitore,numero:d.numero,data:d.data,importo:num(d.importo),stato:d.stato,scadenza:d.scadenza,pagato:!!d.pagato,origine:x.origine||'manuale'}));
}
function mSal(id,cid){
  const c=S.cantieri.find(y=>y.id===cid);if(!c)return;
  const old=S.sal.find(y=>y.id===id);
  const nmax=Math.max(0,...S.sal.filter(y=>y.cantiereId===cid).map(y=>num(y.n)));
  const s=old||{n:nmax+1,data:today(),importo:'',fatturato:false,incassato:0};
  modal(id?`Modifica SAL ${s.n}`:'Nuovo SAL',`<div class="fields">
    ${F.t('n','Numero SAL',s.n,{type:'number',req:1})}${F.t('data','Data SAL',s.data,{type:'date',req:1})}
    ${F.m('importo','Importo maturato nel SAL (€)',s.importo,{req:1,cls:'full'})}
    ${F.c('fatturato','SAL fatturato',s.fatturato,{cls:'full'})}
    ${F.t('dataFattura','Data fattura',s.dataFattura,{type:'date'})}${F.t('scadenza','Scadenza incasso',s.scadenza,{type:'date'})}
    ${F.m('incassato','Incassato finora (€)',s.incassato||0)}${F.t('dataIncasso','Data ultimo incasso',s.dataIncasso,{type:'date'})}
  </div><p class="hint">Se non indichi la scadenza, per la previsione di cassa si assumono 60 giorni dalla fattura.</p>`,
  d=>put('sal',{...s,cantiereId:cid,n:num(d.n),data:d.data,importo:num(d.importo),fatturato:!!d.fatturato,dataFattura:d.dataFattura,scadenza:d.scadenza,incassato:num(d.incassato),dataIncasso:d.dataIncasso}));
}
function mIncasso(id){
  const s=S.sal.find(y=>y.id===id),c=s&&S.cantieri.find(y=>y.id===s.cantiereId);if(!s||!c)return;
  const res=Math.max(0,num(s.importo)*(1-num(c.ritenutaPct)/100)-num(s.incassato));
  modal(`Incasso SAL ${s.n}`,`<div class="fields">${F.m('v','Importo incassato (€)',res.toFixed(2),{req:1})}${F.t('d','Data incasso',today(),{type:'date',req:1})}</div>`,
  d=>put('sal',{...s,fatturato:true,incassato:num(s.incassato)+num(d.v),dataIncasso:d.d}),{save:'Registra'});
}
function mSub(id,cid){
  const s=S.sub.find(y=>y.id===id)||{importo:'',maturato:0,pagato:0};
  modal(id?'Modifica subappalto':'Nuovo subappalto',`<div class="fields">
    ${F.t('nome','Ditta subappaltatrice',s.nome,{req:1,cls:'full'})}${F.t('lavorazione','Lavorazione',s.lavorazione,{cls:'full'})}
    ${F.m('importo','Importo contratto (€)',s.importo,{req:1})}${F.m('maturato','SAL maturato finora (€)',s.maturato||0)}
    ${F.m('pagato','Pagato finora (€)',s.pagato||0)}
  </div><p class="hint">Le fatture XML con lo stesso nome ditta si collegano da sole a questo contratto.</p>`,
  d=>put('sub',{...s,cantiereId:cid,nome:d.nome.trim(),lavorazione:d.lavorazione,importo:num(d.importo),maturato:num(d.maturato),pagato:num(d.pagato)}));
}
function mOra(id,cid,dd){
  if(id)return mOraEdit(id,cid);
  const dflt=8;
  const righe=S.operai.map(p=>`<div class="opr"><label><input type="checkbox" name="op_${esc(p.id)}"><span>${esc(p.nome)}<small>${eur(p.costoOrario)}/h</small></span></label><input type="number" name="h_${esc(p.id)}" value="${dflt}" step="0.5" min="0" inputmode="decimal" aria-label="Ore ${esc(p.nome)}"></div>`).join('');
  modal('Nuovo rapportino',`<div class="fields">
    ${F.t('data','Data',dd||today(),{type:'date',req:1})}${F.m('ore','Ore per tutti',dflt,{step:'0.5'})}
    <div class="f full"><span>Operai presenti <button type="button" class="link" id="opall">Seleziona tutti</button></span><div class="oplist">${righe||'<p class="note" style="margin:0">Nessun operaio in elenco: aggiungine uno qui sotto.</p>'}</div></div>
    ${F.t('nuovo','Aggiungi nuovo operaio',''  ,{ph:'Nome e cognome'})}${F.m('costo','Costo orario nuovo (€/h)','')}
    ${F.a('descrizione','Lavorazioni svolte',"",{cls:'full',ph:'Es. Demolizione tramezzo cucina, posa massetto bagno'})}
  </div><p class="hint">Spunta chi ha lavorato: viene creato un rapportino per ciascuno. Le ore per tutti si possono correggere riga per riga.</p>`,
  async d=>{
    const sel=S.operai.filter(p=>d['op_'+p.id]).map(p=>({op:p,h:num(d['h_'+p.id])}));
    if(d.nuovo.trim()){const nome=d.nuovo.trim(),nid=await put('operai',{nome,costoOrario:num(d.costo)});sel.push({op:{id:nid,nome,costoOrario:num(d.costo)},h:num(d.ore)})}
    if(!sel.length){toast('Spunta almeno un operaio');return false}
    for(const x of sel)await put('ore',{cantiereId:cid,operaioId:x.op.id,operaio:x.op.nome,data:d.data,ore:x.h,descrizione:d.descrizione.trim(),costoOrario:num(x.op.costoOrario)},true);
    toast(sel.length>1?`${sel.length} rapportini registrati`:'Rapportino registrato');
  },{init:f=>{
    const rows=()=>[...f.querySelectorAll('.opr')];
    f.querySelector('[name=ore]').addEventListener('input',e=>rows().forEach(r=>r.querySelector('input[type=number]').value=e.target.value));
    const all=f.querySelector('#opall');
    if(all)all.addEventListener('click',()=>{const cs=rows().map(r=>r.querySelector('input[type=checkbox]'));const on=cs.some(c=>!c.checked);cs.forEach(c=>c.checked=on);all.textContent=on?'Deseleziona tutti':'Seleziona tutti'});
  }});
}
function mOraEdit(id,cid){
  const o=S.ore.find(y=>y.id===id);if(!o)return;
  modal('Modifica rapportino',`<div class="fields">
    ${F.s('operaioId','Operaio',[['','— scegli —']].concat(S.operai.map(p=>[p.id,`${p.nome} (${eur(p.costoOrario)}/h)`])),o.operaioId,{cls:'full'})}
    ${F.t('data','Data',o.data,{type:'date',req:1})}${F.m('ore','Ore lavorate',o.ore,{req:1})}
    ${F.a('descrizione','Lavorazioni svolte',o.descrizione,{cls:'full',ph:'Es. Demolizione tramezzo cucina, posa massetto bagno'})}
  </div>`,
  async d=>{
    const op=S.operai.find(p=>p.id===d.operaioId);
    if(!op){toast('Scegli un operaio');return false}
    await put('ore',{...o,cantiereId:cid,operaioId:op.id,operaio:op.nome,data:d.data,ore:num(d.ore),descrizione:d.descrizione.trim(),costoOrario:o.costoOrario!=null&&o.operaioId===op.id?o.costoOrario:num(op.costoOrario)});
  });
}
function mScad(id){
  const x=S.scad.find(y=>y.id===id)||{data:today(),tipo:'rata',importo:'',pagato:false};
  modal(id?'Modifica scadenza':'Nuova scadenza',`<div class="fields">
    ${F.t('titolo','Descrizione',x.titolo,{req:1,cls:'full',ph:'Es. Rata leasing furgone'})}
    ${F.s('tipo','Tipo',Object.entries(TIPI),x.tipo)}${F.t('data','Data',x.data,{type:'date',req:1})}
    ${F.m('importo','Importo (€)',x.importo||'')}
    ${id?'':F.t('mesi','Ripeti ogni mese per (n. mesi)','1',{type:'number'})}
    ${F.c('pagato','Già pagata',x.pagato,{cls:'full'})}
  </div><p class="hint">Finché l'importo è zero la scadenza resta nell'elenco ma non entra nella previsione di cassa.</p>`,
  async d=>{
    const base={...x,titolo:d.titolo.trim(),tipo:d.tipo,importo:num(d.importo),pagato:!!d.pagato};
    const n=id?1:Math.max(1,Math.min(60,Math.round(num(d.mesi))||1));
    for(let i=0;i<n;i++){
      const dd=parse(d.data);dd.setMonth(dd.getMonth()+i);
      await put('scad',{...base,id:i===0?x.id:undefined,data:iso(dd)});
    }
  });
}
function mCliente(id){
  const c=S.clienti.find(y=>y.id===id)||{tipo:'privato'};
  modal(id?'Modifica cliente':'Nuovo cliente',`<div class="fields">
    ${F.t('nome','Nome o ragione sociale',c.nome,{req:1,cls:'full'})}
    ${F.s('tipo','Tipo',Object.entries(TCLI),c.tipo)}${F.t('origine','Come ci ha conosciuto',c.origine,{ph:'Passaparola, sito, agenzia…'})}
    ${F.t('telefono','Telefono',c.telefono,{inputmode:'tel'})}${F.t('email','Email',c.email,{type:'email'})}
    ${F.t('indirizzo','Indirizzo',c.indirizzo,{cls:'full'})}${F.t('note','Note',c.note,{cls:'full'})}
  </div>`,
  d=>put('clienti',{...c,nome:d.nome.trim(),tipo:d.tipo,origine:d.origine,telefono:d.telefono.trim(),email:d.email.trim(),indirizzo:d.indirizzo,note:d.note}));
}
function mPrev(id,clienteId){
  const p=S.preventivi.find(y=>y.id===id)||{clienteId:clienteId||'',data:today(),stato:'bozza',prossimo:''};
  modal(id?'Modifica preventivo':'Nuovo preventivo',`<div class="fields">
    ${F.s('clienteId','Cliente',[['','— scegli —']].concat(S.clienti.map(c=>[c.id,c.nome])),p.clienteId,{cls:'full'})}
    ${F.t('nuovo','Oppure nuovo cliente',''  ,{ph:'Nome del nuovo cliente',cls:'full'})}
    ${F.t('oggetto','Oggetto dei lavori',p.oggetto,{req:1,cls:'full',ph:'Es. Ristrutturazione appartamento'})}
    ${F.t('indirizzoLavori','Indirizzo dei lavori',p.indirizzoLavori,{cls:'full'})}
    ${F.m('importo','Importo al netto IVA (€)',p.importo||'',{req:1})}${F.s('stato','Stato',PSTATI.map(([k,l])=>[k,l]),p.stato)}
    ${F.t('data','Data preventivo',p.data,{type:'date',req:1})}${F.t('validita','Valido fino al',p.validita,{type:'date'})}
    ${F.t('prossimo','Prossimo ricontatto',p.prossimo,{type:'date',cls:'full'})}
    ${F.t('note','Note',p.note,{cls:'full'})}
  </div><p class="hint">Quando il cliente accetta, imposta lo stato su Accettato: comparirà il pulsante per creare il cantiere.</p>`,
  async d=>{
    let cid=d.clienteId;
    if(d.nuovo.trim())cid=await put('clienti',{nome:d.nuovo.trim(),tipo:'privato'});
    if(!cid){toast('Scegli un cliente o inseriscine uno nuovo');return false}
    await put('preventivi',{...p,clienteId:cid,oggetto:d.oggetto.trim(),indirizzoLavori:d.indirizzoLavori,importo:num(d.importo),stato:d.stato,data:d.data,validita:d.validita,prossimo:d.prossimo,note:d.note});
  });
}
function mOperaio(id){
  const p=S.operai.find(y=>y.id===id)||{};
  modal(id?'Modifica operaio':'Nuovo operaio',`<div class="fields">${F.t('nome','Nome',p.nome,{req:1,cls:'full'})}${F.m('costo','Costo orario aziendale (€/h)',p.costoOrario||'',{req:1})}</div><p class="hint">I rapportini già inseriti mantengono il costo orario di quando sono stati registrati.</p>`,
  d=>put('operai',{...p,nome:d.nome.trim(),costoOrario:num(d.costo)}));
}

/* ---------- viste ---------- */
function kpi(l,v,s,c){return `<div class="kpi" style="--k:var(${c||'--accent'})"><div class="l">${esc(l)}</div><div class="v">${v}</div><div class="s">${s||'&nbsp;'}</div></div>`}
const delBtn=(col,id)=>{const k=col+':'+id,arm=ui.pend===k;return `<button class="btn sm ${arm?'armed':'danger'}" data-act="del" data-col="${col}" data-id="${id}">${arm?'Conferma':'Elimina'}</button>`};
const statoPill=s=>s==='chiuso'?pill('Chiuso','mute'):s==='da_avviare'?pill('Da avviare','info'):pill('In corso','good');


/* ---------- grafici della schermata Impresa ---------- */
const MESI=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
function mensili(n){
  const now=new Date(),ms=[];
  for(let i=n-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);ms.push({k:d.getFullYear()+'-'+pad(d.getMonth()+1),l:MESI[d.getMonth()]+(d.getMonth()===0||i===n-1?" '"+String(d.getFullYear()).slice(2):''),ric:0,cos:0})}
  const at=d=>d&&ms.find(m=>m.k===String(d).slice(0,7));
  S.sal.forEach(x=>{const m=at(x.data);if(m)m.ric+=num(x.importo)});
  S.costi.filter(x=>x.stato!=='ordine').forEach(x=>{const m=at(x.data);if(m)m.cos+=num(x.importo)});
  S.ore.forEach(o=>{const m=at(o.data);if(m)m.cos+=num(o.ore)*num(o.costoOrario)});
  return ms;
}
function chartMesi(ms){
  const main=$('#main'),mw=main?main.clientWidth:640,half=window.innerWidth>1100;
  const W=half?Math.max(300,Math.floor((mw-56-16)/2)-40):Math.max(300,Math.min(860,mw-60)),H=240,L=56,R=10,T=14,B=30;
  const mx0=Math.max(...ms.map(m=>Math.max(m.ric,m.cos)),1);
  const st0=mx0/4,mag=Math.pow(10,Math.floor(Math.log10(st0))),f=st0/mag,step=(f<=1?1:f<=2?2:f<=5?5:10)*mag,hi=Math.ceil(mx0/step)*step;
  const Y=v=>T+(hi-v)/hi*(H-T-B),cf=new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1});
  const gw=(W-L-R)/ms.length,bw=Math.max(6,Math.min(28,(gw-16)/2));
  let g='';for(let v=0;v<=hi+1e-6;v+=step)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?'var(--ink-2)':'var(--line)'}" stroke-width="${v===0?1.5:1}"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${cf.format(v)}</text>`;
  const bar=(x,v,c)=>{if(v<=0)return '';const h=Math.max(2,Y(0)-Y(v)),y=Y(0)-h,r=Math.min(4,bw/2,h);return `<path d="M${x},${Y(0)} V${y+r} Q${x},${y} ${x+r},${y} H${x+bw-r} Q${x+bw},${y} ${x+bw},${y+r} V${Y(0)} Z" fill="var(${c})"/>`};
  let b='';ms.forEach((m,i)=>{const cx=L+gw*i+gw/2;
    b+=bar(cx-bw-1,m.ric,'--s3')+bar(cx+1,m.cos,'--s2');
    if(gw>=58||i%2===ms.length%2)b+=`<text x="${cx}" y="${H-10}" text-anchor="middle">${gw>=58?m.l:m.l.replace(/ '.*/,'')}</text>`;
    b+=`<rect data-m="${i}" x="${L+gw*i}" y="${T}" width="${gw}" height="${H-T-B}" fill="transparent"/>`});
  window.__mesi={ms,W,L,gw};
  return `<div class="chart" id="chartM"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ricavi e costi degli ultimi ${ms.length} mesi">${g}${b}</svg><div class="tip" id="tipM" hidden></div></div>`;
}
function prossime(){
  const t0=today(),lim=addDays(t0,60),out=[];
  S.scad.filter(x=>!x.pagato).forEach(x=>out.push({d:x.data,dir:-1,t:x.titolo,v:num(x.importo),kind:'Imposte',stim:!num(x.importo)}));
  S.costi.filter(x=>x.stato!=='ordine'&&!x.pagato&&num(x.importo)>0).forEach(x=>out.push({d:x.scadenza||addDays(x.data,30),dir:-1,t:'Fattura '+(x.fornitore||'fornitore')+(x.cantiereId?' · '+cName(x.cantiereId):''),v:num(x.importo),kind:'Fornitori'}));
  S.cantieri.forEach(c=>{const rit=num(c.ritenutaPct)/100;S.sal.filter(s=>s.cantiereId===c.id&&s.fatturato).forEach(s=>{const res=num(s.importo)*(1-rit)-num(s.incassato);if(res<=0.5)return;out.push({d:s.scadenza||addDays(s.dataFattura||s.data,60),dir:1,t:`${c.nome} · SAL ${s.n}`,v:res,kind:'Incassi'})})});
  S.cantieri.forEach(c=>{const rit=num(c.ritenutaPct)/100;S.sal.filter(s=>s.cantiereId===c.id&&!s.fatturato&&num(s.importo)>0).forEach(s=>{const d0=addDays(s.data||t0,60);out.push({d:d0<t0?t0:d0,dir:1,t:`${c.nome} · SAL ${s.n} (da fatturare, stima)`,v:num(s.importo)*(1-rit),kind:'Incassi'})})});
  return out.filter(x=>x.d&&x.d<=lim).sort((a,b)=>a.d.localeCompare(b.d));
}
function giorniA(d){const n=Math.round((parse(d)-parse(today()))/864e5);return n<0?{t:`scaduta da ${-n} ${-n===1?'giorno':'giorni'}`,k:'bad'}:n===0?{t:'oggi',k:'warn'}:n<=7?{t:`tra ${n} ${n===1?'giorno':'giorni'}`,k:'warn'}:{t:`tra ${n} giorni`,k:'mute'}}
function impresaGrafici(){
  const ms=mensili(6),tot=ms.some(m=>m.ric||m.cos),c=cassa(),pr=prossime();
  const sRic=sum(ms,m=>m.ric),sCos=sum(ms,m=>m.cos);
  const lg=`<div class="lg"><span><i style="background:var(--s3)"></i>Ricavi (SAL maturati)</span><span><i style="background:var(--s2)"></i>Costi sostenuti</span></div>`;
  const tab=`<details class="alt"><summary>Vedi i numeri</summary><div class="tw"><table><thead><tr><th>Mese</th><th class="n">Ricavi</th><th class="n">Costi</th><th class="n">Differenza</th></tr></thead><tbody>${ms.map(m=>`<tr><td>${m.l}</td><td class="n">${eur0(m.ric)}</td><td class="n">${eur0(m.cos)}</td><td class="n">${eur0(m.ric-m.cos)}</td></tr>`).join('')}</tbody></table></div></details>`;
  const min=Math.min(...c.weeks.map(w=>w.saldo)),neg=c.weeks.find(w=>w.saldo<0);
  return `<div class="grid2 sec">
   <div class="card"><h2>Ricavi e costi, ultimi 6 mesi</h2>${tot?`${lg}${chartMesi(ms)}<p class="note">In 6 mesi: ricavi ${eur0(sRic)}, costi ${eur0(sCos)}, differenza ${eur0(sRic-sCos)}. I ricavi sono i SAL per data, i costi comprendono fatture e ore degli operai.</p>${tab}`:`<div class="empty"><h3>Ancora nessun dato</h3><span>Appena registri SAL e costi con la data, qui compare l'andamento mese per mese.</span></div>`}</div>
   <div class="card"><h2>Cassa prevista, 13 settimane</h2>${chartCassa(c,true)}<p class="note">${neg?`<b>Il saldo scende sotto zero dal ${dt(neg.da)}.</b> `:''}Saldo minimo previsto ${eur0(min)}. <button class="link" data-act="nav" data-v="cassa">Dettaglio cassa</button></p></div>
  </div>
  <div class="sec"><div class="card"><h2>Prossime scadenze, 60 giorni</h2>${pr.length?`<div class="scd">${pr.slice(0,14).map(x=>{const g=giorniA(x.d);return `<div class="r"><span class="d">${dt(x.d)}</span><span class="t">${esc(x.t)}<small>${x.kind}</small></span><span class="g">${pill(g.t,g.k)}</span><span class="v ${x.dir>0?'in':'out'}">${x.stim?'<small>da stimare</small>':(x.dir>0?'+ ':'− ')+eur0(x.v)}</span></div>`}).join('')}</div>${pr.length>14?`<p class="note">Altre ${pr.length-14} scadenze in <button class="link" data-act="nav" data-v="cassa">Cassa</button>.</p>`:''}`:`<div class="empty"><h3>Nessuna scadenza nei prossimi 60 giorni</h3><span>In Cassa puoi generare le scadenze fiscali ordinarie.</span></div>`}<p class="note">Entrate (+) e uscite (−) insieme: imposte e rate, fatture dei fornitori non pagate, incassi dei SAL fatturati.</p></div></div>`;
}
function vImpresa(){
  if(!S.cantieri.length)return `<div class="page-h"><div><h1>Impresa</h1><p>Il quadro di tutti i cantieri.</p></div></div>${emptyCantieri()}`;
  const rows=S.cantieri.map(c=>({c,k:calc(c)}));
  const att=rows.filter(r=>r.c.stato!=='chiuso');
  const con=sum(att,r=>r.k.contratto),mat=sum(att,r=>r.k.maturato),cos=sum(att,r=>r.k.consT);
  const wb=att.filter(r=>r.k.haBudget);
  const mar=sum(wb,r=>r.k.margine),conWb=sum(wb,r=>r.k.contratto);
  const sb=att.length-wb.length;
  const k=cfg();
  const todo=[];
  const da=daAssegnare();
  if(da.length)todo.push({k:'warn',t:`${da.length} fatture da assegnare a un cantiere`,go:'fatture',lab:'Assegna'});
  rows.forEach(({c,k:kk})=>{
    if(kk.daFatturare>1)todo.push({k:'warn',t:`${c.nome}: ${eur0(kk.daFatturare)} di SAL maturati da fatturare`,cid:c.id,tab:'sal'});
    S.sal.filter(s=>s.cantiereId===c.id&&s.fatturato).forEach(s=>{const st=salStato(s,c);if(st.k==='bad')todo.push({k:'bad',t:`${c.nome}: SAL ${s.n} scaduto, da incassare ${eur0(num(s.importo)*(1-kk.rit)-num(s.incassato))}`,cid:c.id,tab:'sal'})});
    if(c.stato!=='chiuso'&&!kk.haBudget)todo.push({k:'info',t:`${c.nome}: imposta il budget costi per vedere il margine previsto`,cid:c.id,tab:'scost'});
    else if(c.stato!=='chiuso'&&kk.contratto&&kk.marginePct<k.soglia)todo.push({k:'bad',t:`${c.nome}: margine previsto ${pct(kk.marginePct)}, sotto la soglia del ${pct(k.soglia,0)}`,cid:c.id,tab:'scost'});
    if(c.budgetProvvisorio)todo.push({k:'info',t:`${c.nome}: il budget costi è un esempio da sostituire con il tuo`,cid:c.id,tab:'scost'});
  });
  const t0=today(),t7=addDays(t0,7);
  const pag=S.costi.filter(x=>x.stato!=='ordine'&&!x.pagato&&(x.scadenza||addDays(x.data,30))<=t7);
  if(pag.length)todo.push({k:'warn',t:`${pag.length} pagamenti ai fornitori in scadenza entro 7 giorni, ${eur0(sum(pag,x=>x.importo))}`,go:'cassa',lab:'Cassa'});
  const rcP=S.preventivi.filter(p=>APERTI.includes(p.stato)&&p.prossimo&&p.prossimo<=t0);
  if(rcP.length)todo.push({k:'warn',t:`${rcP.length} ${rcP.length===1?'preventivo da ricontattare':'preventivi da ricontattare'}`,go:'clienti',lab:'Apri'});
  const senzaC=S.preventivi.filter(p=>p.stato==='accettato'&&!p.cantiereId);
  if(senzaC.length)todo.push({k:'info',t:`${senzaC.length} ${senzaC.length===1?'preventivo accettato senza cantiere':'preventivi accettati senza cantiere'}`,go:'clienti',lab:'Apri'});
  S.scad.filter(x=>!x.pagato&&x.data<=addDays(t0,14)).forEach(x=>todo.push({k:num(x.importo)?(x.data<t0?'bad':'warn'):'info',t:`${x.titolo} il ${dt(x.data)}`+(num(x.importo)?`, ${eur0(x.importo)}`:': importo da stimare'),go:'cassa',lab:'Cassa'}));
  return `<div class="page-h"><div><h1>Impresa</h1><p>${att.length} cantieri attivi su ${S.cantieri.length}.</p></div><div class="row"><button class="btn pri" data-act="new-c">Nuovo cantiere</button></div></div>
  <div class="kpis">
   ${kpi('Portafoglio lavori',eur0(con),'contratti dei cantieri attivi','--s1')}
   ${kpi('SAL maturati',eur0(mat),con?pct(mat/con*100)+' del portafoglio':'','--s3')}
   ${kpi('Costi sostenuti',eur0(cos),con?pct(cos/con*100)+' del portafoglio':'','--s2')}
   ${kpi('Margine previsto',wb.length?eur0(mar):'—',wb.length?`${pct(conWb?mar/conWb*100:0)} su ${wb.length} ${wb.length===1?'cantiere':'cantieri'} con budget`+(sb?`, ${sb} senza`:''):'imposta il budget costi dei cantieri','--s4')}
  </div>
  ${impresaGrafici()}
  <div class="sec"><h2>Cantieri</h2><div class="tw"><table><thead><tr><th>Cantiere</th><th>Stato</th><th class="n">Contratto</th><th>Avanzamento</th><th class="n">Costi sostenuti</th><th class="n">Margine previsto</th><th class="n">Da incassare</th></tr></thead><tbody>
  ${rows.map(({c,k:kk})=>`<tr><td><button class="link" data-act="open-c" data-id="${c.id}">${esc(c.nome)}</button><span class="sub">${esc(c.indirizzo||'')}</span></td><td>${statoPill(c.stato)}</td><td class="n">${eur0(kk.contratto)}</td>
  <td style="min-width:130px"><div class="meter" style="--c:var(--s1)"><span style="width:${Math.min(100,kk.avanz*100)}%"></span></div><small>${pct(kk.avanz*100)}</small></td>
  <td class="n">${eur0(kk.consT)}</td><td class="n">${kk.haBudget?`${eur0(kk.margine)} <span class="sub">${pct(kk.marginePct)}</span>`:'<span class="sub">budget mancante</span>'}</td><td class="n">${eur0(kk.daIncassare)}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="sec"><h2>Da fare</h2><div class="card"><div class="todo">${todo.length?todo.map(i=>`<div class="it">${pill(i.k==='bad'?'Urgente':i.k==='warn'?'Attenzione':'Info',i.k)}<span class="t">${esc(i.t)}</span>${i.cid?`<button class="btn sm" data-act="open-c" data-id="${i.cid}" data-tab="${i.tab}">Apri</button>`:`<button class="btn sm" data-act="nav" data-v="${i.go}">${i.lab}</button>`}</div>`).join(''):`<div class="it"><span class="t">Niente da segnalare.</span></div>`}</div></div></div>`;
}
function emptyCantieri(){
  return `<div class="empty"><h3>Nessun cantiere</h3><span>Crea il primo cantiere con l'importo di contratto, poi imposta il budget dei costi.</span><button class="btn pri" data-act="new-c">Nuovo cantiere</button></div>`;
}
function vCantieri(){
  if(!S.cantieri.length)return `<div class="page-h"><div><h1>Cantieri</h1></div></div>${emptyCantieri()}`;
  return `<div class="page-h"><div><h1>Cantieri</h1><p>Apri un cantiere per vedere costi, SAL, subappalti e scostamenti.</p></div><button class="btn pri" data-act="new-c">Nuovo cantiere</button></div>
  <div class="cantieri-grid">${S.cantieri.map(c=>{const k=calc(c);return `<button class="card cc" data-act="open-c" data-id="${c.id}" style="all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;cursor:pointer;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow);min-width:0">
   <div class="row" style="justify-content:space-between"><h3 style="font:600 22px/1.1 var(--font-d);margin:0">${esc(c.nome)}</h3>${statoPill(c.stato)}</div>
   <div class="meta" style="color:var(--ink-2);font-size:13px">${esc(c.indirizzo||'')}${c.committente?' · '+esc(c.committente):''}</div>
   <div class="meter" style="--c:var(--s1)"><span style="width:${Math.min(100,k.avanz*100)}%"></span></div>
   <div class="row" style="justify-content:space-between;font-size:14px"><span>Avanzamento <b>${pct(k.avanz*100)}</b></span><span>Contratto <b>${eur0(k.contratto)}</b></span></div>
   <div class="row" style="justify-content:space-between;font-size:14px"><span>Costi <b>${eur0(k.consT)}</b></span><span>Margine <b>${k.haBudget?pct(k.marginePct):'—'}</b></span></div></button>`}).join('')}</div>`;
}

function vCantiere(){
  const c=S.cantieri.find(x=>x.id===ui.cid);
  if(!c){ui.view='cantieri';return vCantieri()}
  const k=calc(c);
  const tabs=[['panoramica','Panoramica'],['costi','Costi'],['sal','SAL e ricavi'],['sub','Subappalti'],['ore','Rapportini'],['scost','Scostamenti']];
  const head=`<div class="site-h"><div class="thumb">${svg(ICON.img)}</div><div class="info"><h1>${esc(c.nome)} ${statoPill(c.stato)}</h1>
    <div class="meta">${esc(c.descrizione||'')}</div><div class="meta">${esc(c.indirizzo||'')}${c.committente?' · '+esc(c.committente):''}</div>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-act="edit-c" data-id="${c.id}">Modifica cantiere</button><button class="link" data-act="nav" data-v="cantieri">Tutti i cantieri</button></div></div>
    <div class="mini-kpis"><div class="mini"><small>Importo contratto</small><b>${eur(c.contratto)}</b></div><div class="mini"><small>Inizio lavori</small><b>${dt(c.inizio)}</b></div><div class="mini"><small>Fine lavori</small><b>${c.fine?dt(c.fine):'N/D'}</b></div></div></div>`;
  const per=ui.tab==='panoramica'?`<div class="sp"></div><div class="period"><button class="btn" data-act="per-toggle" aria-expanded="${ui.periodoOpen}">Periodo dal ${dts(ui.da)} al ${dts(ui.a)}</button>${ui.periodoOpen?`<div class="pop">
    <div class="row"><button class="btn sm" data-act="per" data-p="7">Ultimi 7 giorni</button><button class="btn sm" data-act="per" data-p="30">Ultimi 30 giorni</button><button class="btn sm" data-act="per" data-p="all">Da inizio lavori</button></div>
    <label class="f"><span>Dal</span><input type="date" id="per-da" value="${ui.da}"></label><label class="f"><span>Al</span><input type="date" id="per-a" value="${ui.a}"></label></div>`:''}</div>`:'';
  const tabsH=`<div class="tabs" role="tablist">${tabs.map(([t,l])=>`<button class="tab" role="tab" data-act="tab" data-tab="${t}" aria-selected="${ui.tab===t}">${l}</button>`).join('')}${per}</div>`;
  const body={panoramica:tPanoramica,costi:tCosti,sal:tSal,sub:tSub,ore:tOre,scost:tScost}[ui.tab]||tPanoramica;
  return head+tabsH+body(c,k);
}
function previsione(c,k){
  if(!c.inizio||!c.fine||c.fine<=c.inizio)return {ok:false,motivo:!c.fine?'Imposta la data di fine lavori per attivare la previsione.':'Controlla le date: la fine lavori deve essere dopo l\'inizio.'};
  const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
  const tot=dd(c.inizio,c.fine),t=today();
  if(t<c.inizio)return {ok:false,motivo:'Il cantiere non è ancora iniziato: la previsione parte dal primo giorno di lavori.'};
  const el=Math.max(1,Math.min(tot,dd(c.inizio,t)+1)),f=el/tot,ritardo=t>c.fine;
  const cat={};CK.forEach(x=>{cat[x]={cons:k.cons[x],imp:k.imp[x],bud:k.bud[x],prev:Math.max(k.cons[x]+k.imp[x],k.cons[x]*(ritardo?1:tot/el))}});
  const prevT=CK.reduce((a,x)=>a+cat[x].prev,0);
  const perAv=k.avanz>=0.05?Math.max(k.consT+k.impT,k.consT/k.avanz):null;
  const att=f<0.15?['bassa','warn']:f<0.4?['media','info']:['buona','good'];
  const resto=Math.max(0,dd(t,c.fine));
  return {ok:true,tot,el,f,ritardo,cat,prevT,perAv,att,resto,giorno:k.consT/el,mese:k.consT/el*30,
    margT:k.contratto-prevT,margAv:perAv==null?null:k.contratto-perAv};
}
function boxPrevisione(c,k){
  const p=previsione(c,k);
  if(!p.ok)return `<div class="sec"><div class="card"><h2>Previsione di chiusura</h2><p class="note" style="margin:0">${esc(p.motivo)}</p></div></div>`;
  const mx=Math.max(1,p.prevT,k.budT,k.contratto*0)*1.05;
  const righe=CAT.map(t=>{const x=p.cat[t.k];if(!x.cons&&!x.imp&&!x.bud)return '';
    const over=x.bud&&x.prev>x.bud;
    return `<tr><td><span class="catdot" style="--c:var(${t.c})"></span>${t.n}</td><td class="n">${eur0(x.cons)}</td><td class="n">${eur0(x.prev)}</td><td class="n">${x.bud?eur0(x.bud):'—'}</td><td>${x.bud?(over?pill('Oltre budget','bad'):pill('In budget','good')):''}</td></tr>`}).join('');
  const marg=(v)=>v==null?'—':`<b style="color:var(${v<0?"--bad-ink":"--good-ink"})">${eur0(v)}</b>`;
  return `<div class="sec"><h2>Previsione di chiusura ${pill('Attendibilità '+p.att[0],p.att[1])}</h2><div class="card">
   <p class="note" style="margin-top:0">${p.ritardo?'Il cantiere ha superato la fine lavori prevista: la previsione coincide con quanto speso e impegnato.':`Dopo ${p.el} giorni su ${p.tot} (${pct(p.f*100)} del tempo) hai speso ${eur0(k.consT)}: ${eur0(p.giorno)} al giorno, circa ${eur0(p.mese)} al mese. Mancano ${p.resto} giorni alla fine.`}</p>
   <div class="tw"><table><thead><tr><th>Categoria</th><th class="n">Speso</th><th class="n">Previsione a fine</th><th class="n">Budget</th><th></th></tr></thead><tbody>${righe}</tbody>
   <tfoot><tr><td>Totale</td><td class="n">${eur0(k.consT)}</td><td class="n">${eur0(p.prevT)}</td><td class="n">${k.budT?eur0(k.budT):'—'}</td><td></td></tr></tfoot></table></div>
   <dl class="dl" style="margin-top:14px">
    <dt>Margine finale con la media nel tempo</dt><dd>${marg(p.margT)}</dd>
    <dt>Margine finale in base all'avanzamento SAL (${pct(k.avanz*100)})</dt><dd>${p.perAv==null?'<span class="sub">serve almeno il 5% di avanzamento</span>':`${marg(p.margAv)} <span class="sub">costo finale ${eur0(p.perAv)}</span>`}</dd></dl>
   <p class="note">La media nel tempo funziona bene per la manodopera ma non per materiali e subappalti, che pesano a blocchi. Più il lavoro procede, più la stima diventa affidabile. Le voci impegnate (ordini) non sono mai conteggiate meno del loro valore.</p>
  </div></div>`;
}
function tPanoramica(c,k){
  const p=periodo(c,ui.da,ui.a);
  const ban=c.budgetProvvisorio?`<div class="banner">${pill('Esempio','warn')}<span>Il budget costi di questo cantiere è provvisorio. Sostituiscilo con quello del tuo computo per avere un margine affidabile.</span><button class="btn sm" data-act="budget" data-id="${c.id}">Imposta budget</button></div>`:(!k.haBudget?`<div class="banner">${pill('Budget mancante','info')}<span>Senza budget costi non posso stimare il margine finale.</span><button class="btn sm" data-act="budget" data-id="${c.id}">Imposta budget</button></div>`:'');
  const flow=[['Contratto',k.contratto],['Maturato',k.maturato],['Fatturato',k.fatturato],['Incassato',k.incassato]];
  return ban+`<div class="kpis">
   ${kpi('Avanzamento lavori',pct(k.avanz*100),`${eur0(k.maturato)} maturati su ${eur0(k.contratto)}`,'--s1')}
   ${kpi('Costi sostenuti',eur(k.consT),`${pct(k.contratto?k.consT/k.contratto*100:0)} del contratto`,'--s2')}
   ${kpi('Utilizzo budget costi',k.budT?pct(k.consT/k.budT*100,2):'—',k.budT?`su ${eur0(k.budT)} di budget`:'budget non impostato','--s3')}
   ${kpi('Margine previsto',k.haBudget?eur0(k.margine):'—',k.haBudget?`${pct(k.marginePct)} · stima a finire ${eur0(k.eacT)}`:'imposta il budget','--s4')}
  </div>
  <div class="grid2 sec">
   <div class="card"><h2>Dal contratto all'incasso</h2><div class="flow">${flow.map(([l,v])=>`<div class="r"><span>${l}</span><div class="tr"><span style="width:${k.contratto?Math.min(100,v/k.contratto*100):0}%"></span></div><span class="v">${eur0(v)}</span></div>`).join('')}</div>
    <p class="note">${k.ritenute?`Ritenute di garanzia trattenute: ${eur0(k.ritenute)}. `:''}Da incassare ora ${eur0(k.daIncassare)}.</p></div>
   <div class="card"><h2>Margine</h2><dl class="dl">
    <dt>Contratto</dt><dd>${eur0(k.contratto)}</dd>
    <dt>Costi sostenuti</dt><dd>− ${eur0(k.consT)}</dd>
    <dt>Ancora da spendere (impegnato o budget residuo)</dt><dd>− ${eur0(Math.max(0,k.eacT-k.consT))}</dd>
    <dt class="tot">Margine previsto</dt><dd class="tot">${k.haBudget||k.consT?eur0(k.margine):'—'}</dd>
    <dt>Margine maturato oggi (SAL − costi)</dt><dd>${eur0(k.maturatoMargine)}</dd></dl></div>
  </div>
  ${boxPrevisione(c,k)}
  <div class="kpis k3 sm sec">
   ${kpi('Giorni lavorativi',String(p.giorni),`giorni con registrazioni nel periodo`,'--s1')}
   ${kpi('Costo totale periodo',eur(p.tot),'nel periodo selezionato','--s2')}
   ${kpi('Costo medio giornaliero',eur(p.medio),'nel periodo selezionato','--s3')}
  </div>
  <div class="sec"><h2>Analisi dettagliata costi per categoria <button class="btn sm" data-act="add-costo" data-cid="${c.id}">Aggiungi costo</button></h2><div class="cats">
  ${CAT.map(t=>{const open=!!ui.open[t.k];const inc=k.consT?k.cons[t.k]/k.consT*100:0,use=k.bud[t.k]?k.cons[t.k]/k.bud[t.k]*100:0;
   return `<button class="cat" style="--c:var(${t.c})" data-act="cat" data-k="${t.k}" aria-expanded="${open}">
    <span class="nm"><span class="ic">${svg(t.ic)}</span><span><b>${t.n}</b><small>${t.d}</small></span></span>
    ${pill(k.n[t.k]+(k.n[t.k]===1?' voce':' voci'),'mute')}
    <span class="m"><small>Incidenza</small><span class="meter"><span style="width:${Math.min(100,inc)}%"></span></span><span class="num">${pct(inc,2)}</span></span>
    <span class="m"><small>Budget usato</small><span class="meter"><span style="width:${Math.min(100,use)}%"></span></span><span class="num">${k.bud[t.k]?pct(use,2):'—'}</span></span>
    <span class="m"><small>Costo totale</small><span class="num">${eur(k.cons[t.k])}</span></span>
    <span class="chev">${svg(ICON.chev)}</span></button>${open?catDetail(c,k,t,p):''}`}).join('')}</div></div>`;
}
function catDetail(c,k,t,p){
  const list=k.costi.filter(x=>(CK.includes(x.categoria)?x.categoria:'spese')===t.k).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const oreRows=t.k==='manodopera'?k.ore:[];
  return `<div class="cat-d"><div class="chips" style="margin-bottom:10px"><span class="chip">Budget <b>${eur0(k.bud[t.k])}</b></span><span class="chip">Sostenuto <b>${eur0(k.cons[t.k])}</b></span><span class="chip">Impegnato <b>${eur0(k.imp[t.k])}</b></span><span class="chip">Stima a finire <b>${eur0(k.eac[t.k])}</b></span><span class="chip">Nel periodo <b>${eur0(p.by[t.k])}</b></span></div>
  ${list.length||oreRows.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Descrizione</th><th class="n">Importo</th><th>Stato</th></tr></thead><tbody>
  ${list.map(x=>`<tr><td>${dts(x.data)}</td><td>${esc(x.descrizione)}<span class="sub">${esc(x.fornitore||'')}</span></td><td class="n">${eur(x.importo)}</td><td>${x.stato==='ordine'?pill('Impegnato','info'):pill('Registrato','mute')}</td></tr>`).join('')}
  ${oreRows.length?`<tr><td>—</td><td>Rapportini operai (${oreRows.length})<span class="sub">${k.oreTot} ore</span></td><td class="n">${eur(sum(oreRows,o=>num(o.ore)*num(o.costoOrario)))}</td><td>${pill('Da ore','mute')}</td></tr>`:''}
  ${t.k==='subappalti'&&k.subRows.length?k.subRows.map(s=>`<tr><td>—</td><td>${esc(s.nome)}<span class="sub">SAL maturato</span></td><td class="n">${eur(s.acc)}</td><td>${pill('Subappalto','mute')}</td></tr>`).join(''):''}
  </tbody></table></div>`:`<p class="note" style="margin:0">Nessuna voce in questa categoria.</p>`}</div>`;
}
function tCosti(c,k){
  const f=ui.catFilter;
  const list=k.costi.filter(x=>!f||x.categoria===f).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  return `<div class="row" style="margin-bottom:12px;justify-content:space-between"><div class="row"><button class="btn pri" data-act="add-costo" data-cid="${c.id}">Aggiungi costo</button><button class="btn" data-act="budget" data-id="${c.id}">Budget costi</button><button class="btn" data-act="nav" data-v="fatture">Importa fatture XML</button>${DL?`<button class="btn" data-act="csv" data-id="${c.id}">Esporta CSV</button>`:''}</div>
   <label class="f" style="min-width:200px"><span>Categoria</span><select id="catf"><option value="">Tutte</option>${CAT.map(t=>`<option value="${t.k}" ${f===t.k?'selected':''}>${t.n}</option>`).join('')}</select></label></div>
  ${list.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th class="n">Imponibile</th><th>Stato</th><th></th></tr></thead><tbody>
  ${list.map(x=>{const t=catOf(x.categoria);return `<tr><td>${dts(x.data)}</td><td>${esc(x.descrizione)}<span class="sub">${esc(x.fornitore||'')}${x.numero?' · fatt. '+esc(x.numero):''}</span></td><td><span class="catdot" style="--c:var(${t.c})"></span>${t.n}</td><td class="n">${eur(x.importo)}</td>
   <td>${x.stato==='ordine'?pill('Impegnato','info'):x.pagato?pill('Pagata','good'):pill('Da pagare','warn')}</td>
   <td><div class="acts">${x.stato!=='ordine'?`<button class="btn sm" data-act="paid" data-id="${x.id}">${x.pagato?'Segna da pagare':'Segna pagata'}</button>`:''}<button class="btn sm" data-act="edit-costo" data-id="${x.id}">Modifica</button>${delBtn('costi',x.id)}</div></td></tr>`}).join('')}
  </tbody><tfoot><tr><td colspan="3">Totale voci mostrate</td><td class="n">${eur(sum(list,x=>x.importo))}</td><td colspan="2"></td></tr></tfoot></table></div>`
  :`<div class="empty"><h3>Nessun costo registrato</h3><span>Importa le fatture XML oppure aggiungi un costo a mano.</span></div>`}
  <p class="note">Le ore degli operai e il maturato dei subappalti sono nelle rispettive schede e si sommano da soli ai costi.</p>`;
}
function tSal(c,k){
  return `<div class="kpis k6 sm">${kpi('Maturato',eur0(k.maturato),pct(k.avanz*100)+' del contratto','--s1')}${kpi('Fatturato',eur0(k.fatturato),'','--s3')}${kpi('Incassato',eur0(k.incassato),'','--s2')}${kpi('Da fatturare',eur0(k.daFatturare),'SAL non ancora fatturati','--s4')}${kpi('Da incassare',eur0(k.daIncassare),'al netto delle ritenute','--s5')}${kpi('Ritenute',eur0(k.ritenute),pct(c.ritenutaPct||0)+' sul maturato','--s1')}</div>
  <div class="sec"><h2>Stati di avanzamento <button class="btn pri sm" data-act="add-sal" data-cid="${c.id}">Nuovo SAL</button></h2>
  ${k.sal.length?`<div class="tw"><table><thead><tr><th>SAL</th><th>Data</th><th class="n">Importo</th><th class="n">% contratto</th><th>Stato</th><th>Scadenza</th><th class="n">Incassato</th><th></th></tr></thead><tbody>
  ${k.sal.map(s=>{const st=salStato(s,c);return `<tr><td>N° ${s.n}</td><td>${dt(s.data)}</td><td class="n">${eur(s.importo)}</td><td class="n">${pct(k.contratto?num(s.importo)/k.contratto*100:0)}</td><td>${pill(st.t,st.k)}</td><td>${s.fatturato?dt(s.scadenza||addDays(s.dataFattura||s.data,60)):'—'}</td><td class="n">${eur(s.incassato)}</td>
  <td><div class="acts">${s.fatturato&&st.k!=='good'?`<button class="btn sm" data-act="incasso" data-id="${s.id}">Registra incasso</button>`:''}<button class="btn sm" data-act="edit-sal" data-id="${s.id}" data-cid="${c.id}">Modifica</button>${delBtn('sal',s.id)}</div></td></tr>`}).join('')}
  </tbody><tfoot><tr><td colspan="2">Totale</td><td class="n">${eur(k.maturato)}</td><td class="n">${pct(k.avanz*100)}</td><td colspan="2"></td><td class="n">${eur(k.incassato)}</td><td></td></tr></tfoot></table></div>`
  :`<div class="empty"><h3>Nessun SAL registrato</h3><span>Quando emetti il primo stato di avanzamento, registralo qui: da lì seguo maturato, fatturato e incassato.</span><button class="btn pri" data-act="add-sal" data-cid="${c.id}">Registra il primo SAL</button></div>`}</div>`;
}
function tSub(c,k){
  return `<div class="row" style="margin-bottom:12px"><button class="btn pri" data-act="add-sub" data-cid="${c.id}">Nuovo subappalto</button></div>
  ${k.subRows.length?`<div class="tw"><table><thead><tr><th>Ditta</th><th class="n">Contratto</th><th class="n">SAL maturato</th><th class="n">Fatturato (XML)</th><th class="n">Pagato</th><th class="n">Da pagare</th><th class="n">Residuo</th><th></th></tr></thead><tbody>
  ${k.subRows.map(s=>`<tr><td>${esc(s.nome)}<span class="sub">${esc(s.lavorazione||'')}</span></td><td class="n">${eur(s.importo)}</td><td class="n">${eur(s.acc)}<span class="sub">${pct(s.importo?s.acc/s.importo*100:0,0)}</span></td><td class="n">${eur(s.fatt)}</td><td class="n">${eur(s.pagato)}</td><td class="n">${eur(s.daPagare)}</td><td class="n">${eur(s.res)}</td>
  <td><div class="acts"><button class="btn sm" data-act="edit-sub" data-id="${s.id}" data-cid="${c.id}">Modifica</button>${delBtn('sub',s.id)}</div></td></tr>`).join('')}
  </tbody><tfoot><tr><td>Totale</td><td class="n">${eur(sum(k.subRows,s=>s.importo))}</td><td class="n">${eur(sum(k.subRows,s=>s.acc))}</td><td class="n">${eur(sum(k.subRows,s=>s.fatt))}</td><td class="n">${eur(sum(k.subRows,s=>s.pagato))}</td><td class="n">${eur(sum(k.subRows,s=>s.daPagare))}</td><td class="n">${eur(sum(k.subRows,s=>s.res))}</td><td></td></tr></tfoot></table></div>
  <p class="note">Il costo del subappalto è il maggiore tra il SAL maturato e le fatture ricevute. Il residuo del contratto conta come impegnato.</p>`
  :`<div class="empty"><h3>Nessun subappalto</h3><span>Registra il contratto con la ditta: importo, SAL maturato e pagato. Le sue fatture XML si collegano da sole.</span></div>`}`;
}
function tOre(c,k){
  const by={};k.ore.forEach(o=>{const n=o.operaio||'—';by[n]=by[n]||{h:0,v:0};by[n].h+=num(o.ore);by[n].v+=num(o.ore)*num(o.costoOrario)});
  const list=k.ore.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||'')||(a.operaio||'').localeCompare(b.operaio||''));
  const gm={};list.forEach(o=>{const d=o.data||'';(gm[d]=gm[d]||{d,r:[],h:0,v:0});const g=gm[d];g.r.push(o);g.h+=num(o.ore);g.v+=num(o.ore)*num(o.costoOrario)});
  const giorni=Object.values(gm).sort((a,b)=>b.d.localeCompare(a.d));
  return `<div class="row" style="margin-bottom:12px"><button class="btn pri" data-act="add-ora" data-cid="${c.id}">Nuovo rapportino</button><button class="link" data-act="nav" data-v="impost">Gestisci operai e costo orario</button></div>
  ${Object.keys(by).length?`<div class="chips" style="margin-bottom:12px">${Object.entries(by).map(([n,v])=>`<span class="chip">${esc(n)}: <b>${v.h} h</b> · <b>${eur0(v.v)}</b></span>`).join('')}</div>`:''}
  ${list.length?`<div class="tw"><table><thead><tr><th>Operaio</th><th class="n">Ore</th><th class="n">€/h</th><th class="n">Costo</th><th></th></tr></thead><tbody>
  ${giorni.map(g=>`<tr class="dayh"><td colspan="5"><b>${dt(g.d)}</b><span>${g.r.length} ${g.r.length===1?'operaio':'operai'} · ${g.h} h · ${eur(g.v)}</span><button class="btn sm" data-act="add-ora" data-cid="${c.id}" data-d="${esc(g.d)}">Aggiungi a questo giorno</button></td></tr>`+g.r.map(o=>`<tr><td>${esc(o.operaio)}${o.descrizione?`<span class="sub" style="white-space:normal;max-width:340px">${esc(o.descrizione)}</span>`:''}</td><td class="n">${num(o.ore)}</td><td class="n">${eur(o.costoOrario)}</td><td class="n">${eur(num(o.ore)*num(o.costoOrario))}</td><td><div class="acts"><button class="btn sm" data-act="edit-ora" data-id="${o.id}" data-cid="${c.id}">Modifica</button>${delBtn('ore',o.id)}</div></td></tr>`).join('')).join('')}
  </tbody><tfoot><tr><td>Totale</td><td class="n">${k.oreTot}</td><td></td><td class="n">${eur(k.cons.manodopera-sum(k.costi.filter(x=>x.categoria==='manodopera'&&x.stato!=='ordine'),x=>x.importo))}</td><td></td></tr></tfoot></table></div>`
  :`<div class="empty"><h3>Nessun rapportino</h3><span>Registra chi ha lavorato e quante ore. Il costo della manodopera si calcola da solo con il costo orario di ciascuno.</span></div>`}`;
}
function tScost(c,k){
  const mx=Math.max(1,...CAT.map(t=>Math.max(k.bud[t.k],k.cons[t.k]+k.imp[t.k])))*1.08;
  const alerts=[];
  CAT.forEach(t=>{if(k.bud[t.k]>0&&k.cons[t.k]+k.imp[t.k]>k.bud[t.k]){const d=k.cons[t.k]+k.imp[t.k]-k.bud[t.k];alerts.push({k:'bad',t:`${t.n}: la stima a finire supera il budget di ${eur0(d)} (${pct(d/k.bud[t.k]*100)})`})}});
  if(k.proiezione!=null&&k.budT&&k.proiezione>k.budT*1.05)alerts.push({k:'warn',t:`Al ritmo attuale i costi chiuderebbero a ${eur0(k.proiezione)}, sopra il budget di ${eur0(k.budT)}`});
  if(k.haBudget&&k.marginePct<cfg().soglia)alerts.push({k:'bad',t:`Margine previsto ${pct(k.marginePct)}, sotto la soglia del ${pct(cfg().soglia,0)}`});
  return `<div class="row" style="margin-bottom:12px"><button class="btn" data-act="budget" data-id="${c.id}">Budget costi</button></div>
  <div class="kpis k3 sm"><div class="kpi" style="--k:var(--s2)"><div class="l">Budget costi</div><div class="v">${k.budT?eur0(k.budT):'—'}</div><div class="s">${k.budT?'margine di budget '+eur0(k.contratto-k.budT):'non impostato'}</div></div>
   ${kpi('Stima a finire',eur0(k.eacT),'sostenuto + impegnato, o budget se maggiore','--s1')}
   ${kpi('Ritmo attuale',k.proiezione!=null?eur0(k.proiezione):'—',k.proiezione!=null?'costi diviso avanzamento SAL':'serve almeno il 5% di avanzamento','--s4')}</div>
  <div class="card sec"><h2>Budget, sostenuto e impegnato per categoria</h2>
   <div class="leg"><span><i></i>Sostenuto</span><span><i class="h"></i>Impegnato</span><span><i class="t"></i>Budget</span></div>
   <div class="bars">${CAT.map(t=>{const cs=k.cons[t.k],im=k.imp[t.k],bu=k.bud[t.k],d=cs+im-bu;
    return `<div class="b" style="--c:var(${t.c})"><span><span class="catdot"></span>${t.n}</span><div class="trk" role="img" aria-label="${t.n}: sostenuto ${eur0(cs)}, impegnato ${eur0(im)}, budget ${eur0(bu)}">
     <span class="seg i" style="width:${(cs+im)/mx*100}%"></span><span class="seg" style="width:${cs/mx*100}%"></span>${bu?`<span class="tick" style="left:calc(${bu/mx*100}% - 1px)"></span>`:''}</div>
     <div class="cap"><span>Sostenuto <b>${eur0(cs)}</b></span><span>Impegnato <b>${eur0(im)}</b></span><span>Budget <b>${bu?eur0(bu):'—'}</b></span>${bu?(d>0?pill('Sopra di '+eur0(d),'bad'):pill('Entro il budget','good')):''}</div></div>`}).join('')}</div></div>
  <div class="sec"><h2>Segnalazioni</h2><div class="card"><div class="todo">${alerts.length?alerts.map(i=>`<div class="it">${pill(i.k==='bad'?'Urgente':'Attenzione',i.k)}<span class="t">${esc(i.t)}</span></div>`).join(''):`<div class="it">${pill('In linea','good')}<span class="t">Nessuno scostamento oltre il budget.</span></div>`}</div></div></div>`;
}

const cliName=id=>{const c=S.clienti.find(x=>x.id===id);return c?c.nome:'—'};
function vClienti(){
  const P=S.preventivi,t0=today();
  const aperti=P.filter(p=>APERTI.includes(p.stato)),acc=P.filter(p=>p.stato==='accettato'),persi=P.filter(p=>p.stato==='perso');
  const conv=(acc.length+persi.length)?acc.length/(acc.length+persi.length)*100:null;
  const rc=aperti.filter(p=>p.prossimo&&p.prossimo<=t0);
  const f=ui.pf;
  const list=P.filter(p=>!f||p.stato===f).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const chips=[['','Tutti',P.length]].concat(PSTATI.map(([k,l])=>[k,l,P.filter(p=>p.stato===k).length]));
  const cl=S.clienti.slice().sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'it'));
  return `<div class="page-h"><div><h1>Clienti e preventivi</h1><p>Contatti, trattative aperte e passaggio a cantiere.</p></div><div class="row"><button class="btn" data-act="add-cli">Nuovo cliente</button><button class="btn pri" data-act="add-prev">Nuovo preventivo</button></div></div>
  <div class="kpis">
   ${kpi('In trattativa',eur0(sum(aperti,p=>p.importo)),`${aperti.length} ${aperti.length===1?'preventivo inviato o in corso':'preventivi inviati o in corso'}`,'--s1')}
   ${kpi('Accettati',eur0(sum(acc,p=>p.importo)),`${acc.length} ${acc.length===1?'preventivo':'preventivi'}`,'--s3')}
   ${kpi('Tasso di successo',conv==null?'—':pct(conv,0),conv==null?'serve almeno un esito':`${acc.length} accettati su ${acc.length+persi.length} chiusi`,'--s4')}
   ${kpi('Da ricontattare',String(rc.length),rc.length?'contatto previsto oggi o scaduto':'nessun ricontatto in sospeso','--s2')}
  </div>
  <div class="sec"><h2>Preventivi</h2>
  <div class="tabs" role="tablist">${chips.map(([k,l,n])=>`<button class="tab" role="tab" data-act="pf" data-v="${k}" aria-selected="${f===k}">${l} ${n}</button>`).join('')}</div>
  ${list.length?`<div class="tw"><table><thead><tr><th>Oggetto</th><th class="n">Importo</th><th>Stato</th><th>Ricontatto</th><th></th></tr></thead><tbody>
  ${list.map(p=>{const s=pst(p.stato),cant=p.cantiereId&&S.cantieri.some(c=>c.id===p.cantiereId),late=APERTI.includes(p.stato)&&p.prossimo&&p.prossimo<=t0;
   return `<tr><td>${esc(p.oggetto)}<span class="sub">${esc(cliName(p.clienteId))}${p.data?' · '+dt(p.data):''}</span></td><td class="n">${eur0(p.importo)}</td><td>${pill(s[1],s[2])}</td>
   <td>${p.prossimo&&APERTI.includes(p.stato)?`${dt(p.prossimo)} ${late?pill('Da fare','warn'):''}`:'—'}</td>
   <td><div class="acts">${p.stato==='accettato'&&!cant?`<button class="btn sm pri" data-act="to-cantiere" data-id="${p.id}">Crea cantiere</button>`:''}${cant?`<button class="btn sm" data-act="open-c" data-id="${p.cantiereId}">Apri cantiere</button>`:''}<button class="btn sm" data-act="edit-prev" data-id="${p.id}">Modifica</button>${delBtn('preventivi',p.id)}</div></td></tr>`}).join('')}
  </tbody></table></div>`
  :`<div class="empty"><h3>${P.length?'Nessun preventivo in questo stato':'Nessun preventivo'}</h3><span>${P.length?'Cambia filtro per vedere gli altri.':'Registra il primo preventivo: quando il cliente accetta, lo trasformi in cantiere con un click.'}</span>${P.length?'':'<button class="btn pri" data-act="add-prev">Nuovo preventivo</button>'}</div>`}
  <p class="note">Gli importi sono al netto di IVA, come i costi. Il contratto del cantiere parte dall'importo del preventivo accettato.</p></div>
  <div class="sec"><h2>Clienti ${S.clienti.length?pill(String(S.clienti.length),'mute'):''}<button class="btn sm" data-act="pick-cli">Importa da CSV</button><input type="file" id="cin" accept=".csv,text/csv" hidden></h2>
  ${cl.length?`<div class="tw"><table><thead><tr><th>Cliente</th><th>Contatti</th><th class="n">Preventivi</th><th class="n">Accettato</th><th></th></tr></thead><tbody>
  ${cl.map(c=>{const pp=P.filter(p=>p.clienteId===c.id);return `<tr><td>${esc(c.nome)}<span class="sub">${esc(TCLI[c.tipo]||'')}${c.indirizzo?' · '+esc(c.indirizzo):''}</span></td>
   <td>${esc(c.telefono||'')}${c.email?`<span class="sub">${esc(c.email)}</span>`:''}${!c.telefono&&!c.email?'—':''}</td><td class="n">${pp.length}</td><td class="n">${eur0(sum(pp.filter(p=>p.stato==='accettato'),p=>p.importo))}</td>
   <td><div class="acts"><button class="btn sm" data-act="add-prev" data-cid="${c.id}">Nuovo preventivo</button><button class="btn sm" data-act="edit-cli" data-id="${c.id}">Modifica</button>${delBtn('clienti',c.id)}</div></td></tr>`}).join('')}
  </tbody></table></div>`
  :`<div class="empty"><h3>Nessun cliente</h3><span>Aggiungi i clienti a mano oppure importa un file CSV con colonne come Nome, Telefono, Email e Indirizzo, esportato dal tuo vecchio CRM.</span></div>`}
  <p class="note">Nel CSV riconosco le intestazioni Nome (o Ragione sociale), Telefono, Email, Indirizzo e Note. I nomi già presenti non vengono duplicati.</p></div>`;
}
function parseCsv(t){
  t=t.replace(/^﻿/,'');const first=t.split(/\r?\n/)[0]||'';
  const sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
  const rows=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;
    else if(ch===sep){r.push(c);c=''}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x.trim()))rows.push(r);r=[]}
    else c+=ch}
  r.push(c);if(r.some(x=>x.trim()))rows.push(r);return rows;
}
async function importaClienti(file){
  let rows;try{rows=parseCsv(await file.text())}catch(e){toast('Non riesco a leggere il file');return}
  if(rows.length<2){toast('Il file è vuoto o senza intestazioni');return}
  const h=rows[0].map(norm),col=re=>h.findIndex(x=>re.test(x));
  const ci={nome:col(/^(nome|ragione sociale|cliente|denominazione|nominativo)/),tel:col(/(telefono|tel|cellulare|mobile)/),mail:col(/(email|e mail|mail|pec)/),ind:col(/(indirizzo|via|citta)/),note:col(/note/)};
  if(ci.nome<0){toast('Non trovo la colonna del nome: serve un\'intestazione come "Nome" o "Ragione sociale"');return}
  const get=(r,i)=>i>=0?(r[i]||'').trim():'';
  const ex=new Set(S.clienti.map(c=>norm(c.nome)));let n=0,d=0;
  for(const r of rows.slice(1)){
    const nome=get(r,ci.nome);if(!nome)continue;
    if(ex.has(norm(nome))){d++;continue}ex.add(norm(nome));
    await put('clienti',{nome,tipo:'privato',telefono:get(r,ci.tel),email:get(r,ci.mail),indirizzo:get(r,ci.ind),note:get(r,ci.note),origine:''});n++;
  }
  toast(`${n} clienti importati, ${d} già presenti`);
}
function vFatture(){
  const da=daAssegnare().sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const ult=S.costi.filter(x=>x.origine==='xml'&&x.cantiereId&&S.cantieri.some(c=>c.id===x.cantiereId)).sort((a,b)=>(b.data||'').localeCompare(a.data||'')).slice(0,30);
  return `<div class="page-h"><div><h1>Fatture</h1><p>Carica le fatture passive: le assegno ai cantieri e le registro come costi.</p></div><button class="btn" data-act="add-costo" data-cid="">Costo manuale</button></div>
  <div class="drop" id="drop"><b>Trascina qui le fatture elettroniche</b><span>File XML, XML.P7M oppure uno ZIP scaricato dal cassetto fiscale o da chi ti tiene la contabilità.</span><button class="btn pri" data-act="pick">Scegli i file</button><input type="file" id="fin" multiple accept=".xml,.p7m,.zip" hidden></div>
  ${ui.log.length?`<ul class="log">${ui.log.map(l=>`<li>${pill(l.k==='bad'?'Errore':l.k==='good'?'Fatto':'Info',l.k)} ${esc(l.t)}</li>`).join('')}</ul>`:''}
  <details class="alt"><summary>Come scaricare le fatture dal cassetto fiscale</summary><p class="note">Accedi al portale Fatture e Corrispettivi dell'Agenzia delle Entrate con SPID, CIE o CNS, apri la consultazione delle fatture ricevute, imposta il periodo e scarica i file XML (se il portale ti offre l'archivio completo, meglio lo ZIP). Poi trascinali qui. Le fatture che hai emesso tu vengono ignorate se indichi la tua partita IVA in Opzioni. Se un file non si apre, l'Agenzia conserva l'XML solo per chi ha aderito al servizio di consultazione: in quel caso chiedi gli XML al commercialista.</p></details>
  <p class="note">Assegnazione automatica: prima per ditta subappaltatrice o fornitore già associato, poi per CUP/CIG, poi per le parole chiave del cantiere. Le fatture già caricate non si duplicano.</p>
  <div class="sec"><h2>Da assegnare ${da.length?pill(String(da.length),'warn'):''}</h2>
  ${da.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Fornitore</th><th class="n">Imponibile</th><th>Cantiere</th><th>Categoria</th><th>Ricorda</th><th></th></tr></thead><tbody>
  ${da.map(x=>`<tr data-id="${x.id}"><td>${dts(x.data)}</td><td>${esc(x.fornitore||'')}<span class="sub">${esc(x.descrizione||'')}</span></td><td class="n">${eur(x.importo)}</td>
   <td><select class="as-c" aria-label="Cantiere">${cantOpts(true).map(([a,b])=>`<option value="${esc(a)}">${esc(b)}</option>`).join('')}</select></td>
   <td><select class="as-k" aria-label="Categoria">${CAT.map(t=>`<option value="${t.k}" ${t.k===x.categoria?'selected':''}>${t.n}</option>`).join('')}</select></td>
   <td><label class="row" style="gap:6px"><input type="checkbox" class="as-r" checked> per questo fornitore</label></td>
   <td><div class="acts"><button class="btn sm pri" data-act="assign" data-id="${x.id}">Assegna</button>${delBtn('costi',x.id)}</div></td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty"><h3>Tutto assegnato</h3><span>Nessuna fattura in attesa.</span></div>`}</div>
  <div class="sec"><h2>Ultime fatture importate</h2>
  ${ult.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Fornitore</th><th>Cantiere</th><th>Categoria</th><th class="n">Imponibile</th><th>Stato</th></tr></thead><tbody>
  ${ult.map(x=>{const t=catOf(x.categoria);return `<tr><td>${dts(x.data)}</td><td>${esc(x.fornitore||'')}<span class="sub">fatt. ${esc(x.numero||'')}</span></td><td>${esc(cName(x.cantiereId))}</td><td><span class="catdot" style="--c:var(${t.c})"></span>${t.n}</td><td class="n">${eur(x.importo)}</td><td>${x.pagato?pill('Pagata','good'):pill('Da pagare','warn')}</td></tr>`}).join('')}</tbody></table></div>`
  :`<p class="note">Ancora nessuna fattura importata.</p>`}</div>`;
}

function chartCassa(c,half){
  const main=$('#main'),mw=main?main.clientWidth:640,W=half&&window.innerWidth>1100?Math.max(300,Math.floor((mw-56-16)/2)-40):Math.max(300,Math.min(860,mw-60)),H=half?240:270,L=56,R=14,T=14,B=34;
  const vals=c.weeks.map(w=>w.saldo).concat([c.start,0]);
  let mn=Math.min(...vals),mx=Math.max(...vals);if(mx===mn)mx=mn+1000;
  const span=mx-mn,st0=span/4,mag=Math.pow(10,Math.floor(Math.log10(st0))),f=st0/mag,step=(f<=1?1:f<=2?2:f<=5?5:10)*mag;
  const lo=Math.floor(mn/step)*step,hi=Math.ceil(mx/step)*step;
  const X=i=>L+i*(W-L-R)/(c.weeks.length-1),Y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
  const cf=new Intl.NumberFormat('it-IT',{notation:'compact',maximumFractionDigits:1});
  let grid='';for(let v=lo;v<=hi+1e-6;v+=step)grid+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${cf.format(v)}</text>`;
  const every=W<520?3:2;
  const xl=c.weeks.map((w,i)=>i%every===0?`<text x="${X(i)}" y="${H-12}" text-anchor="middle">${dts(w.da)}</text>`:'').join('');
  const pts=c.weeks.map((w,i)=>`${X(i)},${Y(w.saldo)}`).join(' ');
  const area=`${X(0)},${Y(0)} ${pts} ${X(c.weeks.length-1)},${Y(0)}`;
  const last=c.weeks.length-1;
  window.__cassa={weeks:c.weeks,W,L,R,X};
  return `<div class="chart" id="chart"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Saldo di cassa previsto a 13 settimane">
   ${grid}<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-2)" stroke-width="1.5"/>
   <polygon points="${area}" fill="var(--s1)" opacity=".12"/><polyline points="${pts}" fill="none" stroke="var(--s1)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
   <circle cx="${X(last)}" cy="${Y(c.weeks[last].saldo)}" r="5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>
   <text x="${X(last)}" y="${Y(c.weeks[last].saldo)-10}" text-anchor="end">${eur0(c.weeks[last].saldo)}</text>
   <line id="cx" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="var(--ink-2)" stroke-dasharray="3 3" visibility="hidden"/>${xl}</svg><div class="tip" id="tip" hidden></div></div>`;
}
function vCassa(){
  const c=cassa(),min=Math.min(...c.weeks.map(w=>w.saldo)),neg=c.weeks.find(w=>w.saldo<0);
  const tIn=sum(c.weeks,w=>w.inc),tOut=sum(c.weeks,w=>w.pag),tTax=sum(c.weeks,w=>w.tax),tFix=sum(c.weeks,w=>w.fix);
  return `<div class="page-h"><div><h1>Cassa e scadenze</h1><p>Parte dalla cassa attuale (cassa iniziale + incassi − pagamenti già registrati) e prosegue per 13 settimane con i SAL maturati e fatturati, le fatture dei fornitori non pagate, imposte e costi fissi.</p></div><button class="btn" data-act="nav" data-v="impost">Cassa iniziale e costi fissi</button></div>
  <div class="kpis">${kpi('Cassa attuale',eur0(c.start),`iniziale ${eur0(c.iniziale)} + incassato ${eur0(c.rIn)} − pagato ${eur0(c.rOut)} (fornitori, imposte)`,'--s1')}${kpi('Incassi previsti',eur0(tIn),(c.scaduti?`di cui ${eur0(c.scaduti)} già scaduti`:'SAL fatturati')+(c.stimati?` · ${eur0(c.stimati)} di SAL maturati da fatturare, stimati a 60 giorni`:''),'--s3')}${kpi('Uscite previste',eur0(tOut+tTax),`fornitori ${eur0(tOut)} · imposte e rate ${eur0(tTax)}`,'--s2')}${kpi('Saldo minimo previsto',eur0(min),neg?'scende sotto zero dal '+dt(neg.da):'resta positivo','--s4')}</div>
  ${neg?`<div class="banner" style="margin-top:14px;border-left-color:var(--bad)">${pill('Urgente','bad')}<span>Il saldo previsto diventa negativo nella settimana del ${dt(neg.da)}. Valuta di anticipare un incasso o spostare un pagamento.</span></div>`:''}
  <div class="card sec"><h2>Saldo di cassa previsto</h2>${chartCassa(c)}<p class="note">Le ore degli operai non entrano qui: includi stipendi e costi di struttura nei costi fissi mensili (${eur0(cfg().fissi)} al mese, ${eur0(tFix)} nelle 13 settimane).</p></div>
  <div class="sec"><h2>Settimana per settimana</h2><div class="tw"><table><thead><tr><th>Dal</th><th class="n">Incassi</th><th class="n">Fornitori</th><th class="n">Imposte e rate</th><th class="n">Costi fissi</th><th class="n">Saldo</th></tr></thead><tbody>
  ${c.weeks.map(w=>`<tr><td>${dt(w.da)}</td><td class="n">${eur0(w.inc)}</td><td class="n">${eur0(w.pag)}</td><td class="n">${eur0(w.tax)}</td><td class="n">${eur0(w.fix)}</td><td class="n"><b>${eur0(w.saldo)}</b> ${w.saldo<0?pill('Negativo','bad'):''}</td></tr>`).join('')}</tbody></table></div>
  <p class="note">I pagamenti e gli incassi scaduti sono contati nella prima settimana.</p></div>${scadHtml()}`;
}

/* ---------- F24 in PDF ---------- */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',PDFW='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
async function pdfText(file){
  if(!window.pdfjsLib){
    await new Promise((ok,ko)=>{const el=document.createElement('script');el.src=PDFJS;el.onload=ok;el.onerror=()=>ko(new Error('lettura PDF non disponibile'));document.head.appendChild(el)});
    const wc=await (await fetch(PDFW)).text();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([wc],{type:'text/javascript'}));
  }
  const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
  let out='';
  for(let p=1;p<=pdf.numPages;p++){
    const tc=await (await pdf.getPage(p)).getTextContent(),rows={};
    tc.items.forEach(it=>{const t=it.str.trim();if(!t)return;const y=Math.round(it.transform[5]/3);(rows[y]=rows[y]||[]).push({x:it.transform[4],t})});
    Object.keys(rows).map(Number).sort((a,b)=>b-a).forEach(y=>{out+=rows[y].sort((a,b)=>a.x-b.x).map(i=>i.t).join('  ')+'\n'});
  }
  return out;
}
const itNum=x=>parseFloat(String(x).replace(/\./g,'').replace(',','.'))||0;
function parseF24(t){
  const flat=t.replace(/\s+/g,' ');
  const m=flat.match(/Scadenza\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const data=m?`${m[3]}-${m[2]}-${m[1]}`:'';
  const sm=flat.match(/SALDO FINALE.{0,400}?EURO\s*\+?\s*(-?[\d.]+,\d{2})/i)||flat.match(/EURO\s*\+\s*([\d.]+,\d{2})/i);
  const tot=sm?itNum(sm[1]):0;
  const a=flat.search(/SEZIONE ERARIO/i),b=flat.search(/SEZIONE INPS/i);
  const er=a>=0?flat.slice(a,b>a?b:undefined):flat;
  const codes=[];let r;const re=/(?:^|\s)(\d{4})\s+(?:\S{1,6}\s+)?(20\d{2})\s+-?[\d.]+,\d{2}/g;
  while((r=re.exec(er))){if(!codes.some(c=>c.c===r[1]&&c.anno===r[2]))codes.push({c:r[1],anno:r[2]})}
  const iR=flat.match(/SEZIONE INPS(.*?)SEZIONE REGIONI/i);
  const inps=!!(iR&&/\d,\d{2}/.test(iR[1]));
  const ty=new Set();
  codes.forEach(({c})=>{ty.add(c==='6013'?'acciva':/^60\d\d$/.test(c)?'iva':/^200\d$/.test(c)?'ires':['3800','3801','3812','3813'].includes(c)?'irap':/^10\d\d$/.test(c)?'f24':'altro')});
  if(inps)ty.add('f24');
  const tipo=ty.size===1?[...ty][0]:'altro';
  const anno=codes[0]?codes[0].anno:(data?data.slice(0,4):'');
  const nomi={iva:'IVA',acciva:'Acconto IVA',ires:'IRES',irap:'IRAP',f24:'Ritenute e contributi'};
  const cs=codes.map(c=>c.c);
  const nome=nomi[tipo]||(cs.length===1&&cs[0]==='7085'?'Vidimazione libri sociali':cs.length?'codici '+cs.join(', '):'versamento');
  return {data,tot,codes,tipo,titolo:`F24 · ${nome}${anno?' '+anno:''}`,inps};
}
async function importaF24(files,pagati){
  ui.logF=[];let nuovi=0,agg=0,doppi=0,err=0;
  const chiavi=new Set(S.scad.map(x=>x.chiave).filter(Boolean));
  for(const file of files){
    try{
      const f=parseF24(await pdfText(file));
      if(!f.data||!f.tot)throw new Error('non trovo data e importo: non sembra un F24 in formato standard');
      const chiave=['f24',f.data,f.tot.toFixed(2),f.codes.map(c=>c.c).join('+')].join('|');
      if(chiavi.has(chiave)){doppi++;ui.logF.push({k:'info',t:`${file.name}: già caricato`});continue}
      chiavi.add(chiave);
      const ex=f.tipo!=='altro'?S.scad.find(x=>!x.chiave&&x.tipo===f.tipo&&!x.pagato&&Math.abs((parse(x.data)-parse(f.data))/864e5)<=10):null;
      const base={tipo:f.tipo,titolo:ex?ex.titolo:f.titolo,data:f.data,importo:f.tot,pagato:!!pagati,dataPag:pagati?f.data:'',chiave,origine:'f24'};
      await put('scad',ex?{...ex,...base}:base);
      if(ex)agg++;else nuovi++;
      ui.logF.push({k:'good',t:`${file.name}: ${f.titolo}, ${eur(f.tot)}, ${dt(f.data)}${pagati?', pagato':', da pagare'}${ex?' (aggiornata una scadenza già in elenco)':''}`});
    }catch(e){err++;ui.logF.push({k:'bad',t:`${file.name}: ${e.message}`})}
  }
  render();toast(nuovi+agg?`${nuovi+agg} F24 registrati`:(doppi&&!err?'F24 già presenti':'Nessun F24 registrato'));
}
function scadHtml(){
  const list=S.scad.slice().sort((a,b)=>(a.data||'').localeCompare(b.data||'')),t0=today();
  const st=x=>x.pagato?pill('Pagata','good'):!num(x.importo)?pill('Da stimare','warn'):x.data<t0?pill('Scaduta','bad'):pill('Da pagare','info');
  return `<div class="sec"><h2>Scadenziario fiscale e rate <button class="btn pri sm" data-act="gen-scad">Genera scadenze canoniche</button><button class="btn sm" data-act="pick-f24">Carica F24 (PDF)</button><input type="file" id="f24in" multiple accept=".pdf,application/pdf" hidden><button class="btn sm" data-act="add-scad">Aggiungi scadenza</button></h2>
  <label class="row" style="gap:8px;margin:0 0 10px"><input type="checkbox" id="f24pag" checked> Gli F24 che carico sono già pagati (quietanze): registrali come spese pagate</label>
  ${ui.logF&&ui.logF.length?`<ul class="log">${ui.logF.map(l=>`<li>${pill(l.k==='bad'?'Errore':l.k==='good'?'Fatto':'Info',l.k)} ${esc(l.t)}</li>`).join('')}</ul>`:''}
  ${list.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Scadenza</th><th>Tipo</th><th class="n">Importo</th><th>Stato</th><th></th></tr></thead><tbody>
  ${list.map(x=>`<tr><td>${dt(x.data)}</td><td>${esc(x.titolo)}</td><td>${esc(TIPI[x.tipo]||'Altro')}</td><td class="n">${num(x.importo)?eur0(x.importo):'—'}</td><td>${st(x)}</td>
  <td><div class="acts"><button class="btn sm" data-act="paid-scad" data-id="${x.id}">${x.pagato?'Segna da pagare':'Segna pagata'}</button><button class="btn sm" data-act="edit-scad" data-id="${x.id}">Modifica</button>${delBtn('scad',x.id)}</div></td></tr>`).join('')}</tbody></table></div>`
  :`<div class="empty"><h3>Nessuna scadenza</h3><span>Genera le scadenze fiscali ordinarie di una SRL, poi inserisci gli importi stimati. Aggiungi a mano rate di finanziamenti e leasing.</span></div>`}
  <p class="note">Date ordinarie per una SRL con anno solare in contabilità ordinaria, con liquidazione IVA ${cfg().iva==='mens'?'mensile':'trimestrale'} (si cambia in Impostazioni). Se cadono in un festivo slittano al primo giorno lavorativo. Gli importi li stimi tu o il commercialista: a zero restano in elenco ma non entrano nella previsione. Ritenute e INPS mensili mettile qui come rata o nei costi fissi, non in entrambi.</p></div>`;
}
function vImpost(){
  const k=cfg();
  return `<div class="page-h"><div><h1>Impostazioni</h1><p>Valori che usano cassa, margini e rapportini.</p></div></div>
  <div class="grid2"><form class="card" id="cfgf"><h2>Impresa</h2><div class="fields">
   ${F.m('fissi','Costi fissi mensili (€)',k.fissi||'',{cls:'full'})}
   ${F.s('iva','Liquidazione IVA',[['trim','Trimestrale'],['mens','Mensile']],k.iva,{cls:'full'})}
   ${F.m('cassa','Cassa iniziale (€)',k.cassa||'')}${F.m('soglia','Soglia margine minimo (%)',k.soglia)}
   ${F.t('cassaData','Cassa iniziale riferita al giorno',k.cassaData,{type:'date',cls:'full'})}
   ${F.t('piva','Partita IVA di GEI (per ignorare le fatture emesse)',S.config.piva||'',{cls:'full',inputmode:'numeric'})}
  </div><p class="hint">I costi fissi comprendono struttura, stipendi e tutto ciò che esce ogni mese a prescindere dai cantieri. La soglia fa segnalare i cantieri con margine previsto più basso.</p><p class="hint">La cassa attuale è la cassa iniziale più gli incassi dei SAL meno i costi pagati registrati da quel giorno in poi. Se la lasci vuota contano tutti i movimenti registrati: usala se parti da zero. Se invece inserisci il saldo del conto di oggi, indica la data di oggi.</p><div class="mfoot"><button class="btn pri" type="submit">Salva</button></div></form>
  <div class="card"><h2>Operai e costo orario</h2>
   ${S.operai.length?`<div class="tw"><table><thead><tr><th>Nome</th><th class="n">€/h</th><th></th></tr></thead><tbody>${S.operai.map(p=>`<tr><td>${esc(p.nome)}</td><td class="n">${eur(p.costoOrario)}</td><td><div class="acts"><button class="btn sm" data-act="edit-op" data-id="${p.id}">Modifica</button>${delBtn('operai',p.id)}</div></td></tr>`).join('')}</tbody></table></div>`:`<p class="note" style="margin:0 0 10px">Nessun operaio. Aggiungili qui o direttamente dal primo rapportino.</p>`}
   <div class="mfoot" style="margin-top:12px"><button class="btn pri" data-act="add-op">Nuovo operaio</button></div></div></div>
  <div class="sec"><h2>Fornitori ricordati</h2>${S.regole.length?`<div class="tw"><table><thead><tr><th>Fornitore</th><th>Cantiere</th><th>Categoria</th><th></th></tr></thead><tbody>${S.regole.map(r=>`<tr><td>${esc(r.fornitore)}</td><td>${esc(cName(r.cantiereId))}</td><td>${catOf(r.categoria).n}</td><td><div class="acts">${delBtn('regole',r.id)}</div></td></tr>`).join('')}</tbody></table></div>`:`<p class="note">Quando assegni una fattura e lasci spuntato "ricorda", il fornitore compare qui e le sue prossime fatture vanno da sole sul cantiere scelto.</p>`}</div>`;
}

/* ---------- render ---------- */
function render(){
  const main=$('#main');if(!main)return;
  const nav=[['impresa','Impresa'],['cantieri','Cantieri'],['clienti','Clienti'],['fatture','Fatture'],['cassa','Cassa'],['impost','Opzioni']];
  const act=ui.view==='cantiere'?'cantieri':ui.view;const nda=daAssegnare().length;
  $('#rail').innerHTML=nav.map(([v,l])=>`<button data-act="nav" data-v="${v}" ${act===v?'aria-current="page"':''}>${svg(ICON[v])}<span>${l}</span>${v==='fatture'&&nda?`<span class="badge">${nda}</span>`:''}</button>`).join('');
  $('#sync').textContent=SYNC;
  if(!loaded){main.innerHTML=`<div class="empty"><h3>Carico i dati</h3><span>Un attimo.</span></div>`;return}
  const v={impresa:vImpresa,cantieri:vCantieri,cantiere:vCantiere,clienti:vClienti,fatture:vFatture,cassa:vCassa,impost:vImpost}[ui.view]||vImpresa;
  const keep=window.scrollY;
  main.innerHTML=v();
  window.scrollTo(0,keep);
}
let rq=0;const schedule=()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(render)};
function go(v,cid,tab){ui.view=v;if(cid)ui.cid=cid;if(tab)ui.tab=tab;ui.pend='';ui.periodoOpen=false;saveUi();render();window.scrollTo(0,0)}

/* ---------- eventi ---------- */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act,id=el.dataset.id,cid=el.dataset.cid;
  if(a==='close'){closeModal();return}
  if(a!=='del')ui.pend='';
  switch(a){
   case 'nav':go(el.dataset.v);break;
   case 'open-c':go('cantiere',id,el.dataset.tab||'panoramica');break;
   case 'tab':ui.tab=el.dataset.tab;ui.periodoOpen=false;saveUi();render();break;
   case 'new-c':mCantiere();break;
   case 'edit-c':mCantiere(id);break;
   case 'budget':mBudget(id);break;
   case 'cat':ui.open[el.dataset.k]=!ui.open[el.dataset.k];render();break;
   case 'per-toggle':ui.periodoOpen=!ui.periodoOpen;render();break;
   case 'per':{const p=el.dataset.p;ui.a=today();if(p==='all'){const c=S.cantieri.find(x=>x.id===ui.cid);ui.da=(c&&c.inizio)||addDays(today(),-90)}else ui.da=addDays(today(),-(+p-1));render();break}
   case 'add-costo':mCosto('',cid||(ui.view==='cantiere'?ui.cid:''));break;
   case 'edit-costo':mCosto(id);break;
   case 'paid':{const x=S.costi.find(y=>y.id===id);if(x)put('costi',{...x,pagato:!x.pagato});break}
   case 'add-sal':mSal('',cid);break;
   case 'edit-sal':mSal(id,cid);break;
   case 'incasso':mIncasso(id);break;
   case 'add-sub':mSub('',cid);break;
   case 'edit-sub':mSub(id,cid);break;
   case 'add-ora':mOra('',cid,el.dataset.d);break;
   case 'edit-ora':mOra(id,cid);break;
   case 'add-cli':mCliente();break;
   case 'edit-cli':mCliente(id);break;
   case 'add-prev':mPrev('',cid);break;
   case 'edit-prev':mPrev(id);break;
   case 'pf':ui.pf=el.dataset.v;render();break;
   case 'pick-cli':{const f=$('#cin');if(f)f.click();break}
   case 'to-cantiere':{
     const p=S.preventivi.find(y=>y.id===id);if(!p)break;
     const cl=S.clienti.find(y=>y.id===p.clienteId)||{};
     const ncid=await put('cantieri',{nome:p.oggetto,descrizione:p.note||'',indirizzo:p.indirizzoLavori||cl.indirizzo||'',committente:cl.nome||'',clienteId:p.clienteId||'',contratto:num(p.importo),stato:'da_avviare',inizio:'',fine:'',ritenutaPct:0,cup:'',cig:'',keywords:'',budget:{}});
     await put('preventivi',{...p,cantiereId:ncid});
     toast('Cantiere creato dal preventivo: imposta il budget costi');go('cantiere',ncid,'panoramica');break}
   case 'add-scad':mScad();break;
   case 'edit-scad':mScad(id);break;
   case 'paid-scad':{const x=S.scad.find(y=>y.id===id);if(x)put('scad',{...x,pagato:!x.pagato});break}
   case 'gen-scad':{
     const ex=new Set(S.scad.map(x=>x.tipo+'|'+x.data+'|'+x.titolo));let n=0;
     for(const c of canoniche(cfg().iva)){const k=c.tipo+'|'+c.data+'|'+c.titolo;if(ex.has(k))continue;await put('scad',{...c,importo:0,pagato:false,auto:true});n++}
     toast(n?`${n} scadenze aggiunte: inserisci gli importi stimati`:'Le scadenze ordinarie ci sono già');break}
   case 'add-op':mOperaio();break;
   case 'edit-op':mOperaio(id);break;
   case 'pick-f24':{const f=$('#f24in');if(f)f.click();break}
   case 'pick':{const f=$('#fin');if(f)f.click();break}
   case 'assign':{
     const tr=el.closest('tr'),x=S.costi.find(y=>y.id===id);if(!x||!tr)break;
     const cant=tr.querySelector('.as-c').value,cat=tr.querySelector('.as-k').value;
     if(!cant){toast('Scegli il cantiere');break}
     await put('costi',{...x,cantiereId:cant,categoria:cat});
     if(tr.querySelector('.as-r').checked&&x.fornitore&&!S.regole.some(r=>norm(r.fornitore)===norm(x.fornitore)))await put('regole',{fornitore:x.fornitore,cantiereId:cant,categoria:cat});
     toast('Fattura assegnata a '+cName(cant));break}
   case 'csv':{
     const c=S.cantieri.find(y=>y.id===id);if(!c||!DL)break;
     const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"',n=v=>String(+v||0).replace('.',',');
     const rows=[['Data','Fornitore','Numero','Descrizione','Categoria','Imponibile','Stato','Pagata','Scadenza']].concat(S.costi.filter(x=>x.cantiereId===id).sort((a,b)=>(a.data||'').localeCompare(b.data||'')).map(x=>[x.data,x.fornitore,x.numero,x.descrizione,catOf(x.categoria).n,n(x.importo),x.stato==='ordine'?'Impegnato':'Registrato',x.pagato?'Sì':'No',x.scadenza]));
     const csv='﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n');
     try{await DL.save({filename:'costi-'+norm(c.nome).replace(/ /g,'-')+'.csv',data:csv})}catch(err){if(err&&err.code!=='declined')toast('Esportazione non riuscita')}
     break}
   case 'del':{
     if(el.dataset.col==='clienti'&&S.preventivi.some(p=>p.clienteId===id)){toast('Il cliente ha preventivi collegati: eliminali prima');break}
     const k=el.dataset.col+':'+id;
     if(ui.pend===k){ui.pend='';await del(el.dataset.col,id);toast('Eliminato')}
     else{ui.pend=k;render();setTimeout(()=>{if(ui.pend===k){ui.pend='';render()}},3500)}
     break}
  }
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='fin'&&t.files&&t.files.length){importa(Array.from(t.files));t.value=''}
  if(t.id==='f24in'&&t.files&&t.files.length){importaF24(Array.from(t.files),$('#f24pag')?$('#f24pag').checked:true);t.value=''}
  if(t.id==='cin'&&t.files&&t.files.length){importaClienti(t.files[0]);t.value=''}
  if(t.id==='catf'){ui.catFilter=t.value;render()}
  if(t.id==='per-da'){ui.da=t.value||ui.da;render()}
  if(t.id==='per-a'){ui.a=t.value||ui.a;render()}
});
document.addEventListener('submit',e=>{
  if(e.target.id==='cfgf'){
    e.preventDefault();const fd=new FormData(e.target);
    putConfig({costiFissiMensili:num(fd.get('fissi')),cassaIniziale:num(fd.get('cassa')),cassaData:fd.get('cassaData')||'',piva:String(fd.get('piva')||'').trim(),margineMin:num(fd.get('soglia')),ivaRegime:fd.get('iva')==='mens'?'mens':'trim'});toast('Impostazioni salvate');
  }
});
document.addEventListener('dragover',e=>{const d=e.target.closest('#drop');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{const d=e.target.closest('#drop');if(d)d.classList.remove('over')});
document.addEventListener('drop',e=>{const d=e.target.closest('#drop');if(d){e.preventDefault();d.classList.remove('over');if(e.dataTransfer&&e.dataTransfer.files.length)importa(Array.from(e.dataTransfer.files))}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#ov').hidden)closeModal()});
document.addEventListener('pointermove',e=>{
  const tm=$('#tipM'),hm=e.target.closest&&e.target.closest('[data-m]');
  if(tm){
    if(hm&&window.__mesi){const m=window.__mesi.ms[+hm.getAttribute('data-m')],box=$('#chartM').getBoundingClientRect(),sv=$('#chartM svg').getBoundingClientRect();
      tm.innerHTML=`<b>${m.l}</b><div><span>Ricavi</span><span>${eur0(m.ric)}</span></div><div><span>Costi</span><span>${eur0(m.cos)}</span></div><div><span>Differenza</span><b>${eur0(m.ric-m.cos)}</b></div>`;
      tm.hidden=false;const px=(e.clientX-sv.left)+12,tw=tm.offsetWidth;tm.style.left=Math.max(0,Math.min(sv.width-tw,px))+'px';tm.style.top='8px'}
    else tm.hidden=true}
  const ch=e.target.closest&&e.target.closest('#chart');const tip=$('#tip'),cx=$('#cx');
  if(!ch||!window.__cassa||!tip){if(tip)tip.hidden=true;if(cx)cx.setAttribute('visibility','hidden');return}
  const svgEl=ch.querySelector('svg'),r=svgEl.getBoundingClientRect(),c=window.__cassa;
  const x=(e.clientX-r.left)*(c.W/r.width);let best=0,bd=1e9;
  c.weeks.forEach((w,i)=>{const d=Math.abs(c.X(i)-x);if(d<bd){bd=d;best=i}});
  const w=c.weeks[best];cx.setAttribute('x1',c.X(best));cx.setAttribute('x2',c.X(best));cx.setAttribute('visibility','visible');
  tip.innerHTML=`<b>Settimana dal ${dt(w.da)}</b><div><span>Incassi</span><span>${eur0(w.inc)}</span></div><div><span>Fornitori</span><span>${eur0(w.pag)}</span></div><div><span>Imposte e rate</span><span>${eur0(w.tax)}</span></div><div><span>Costi fissi</span><span>${eur0(w.fix)}</span></div><div><span>Saldo</span><b>${eur0(w.saldo)}</b></div>`;
  tip.hidden=false;
  const px=c.X(best)*(r.width/c.W),tw=tip.offsetWidth;
  tip.style.left=Math.max(0,Math.min(r.width-tw,px+12))+'px';tip.style.top='8px';
});
let rz=0;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(ui.view==='cassa'||ui.view==='impresa')render()},150)});

/* ---------- avvio ---------- */
async function boot(){
  render();
  setTimeout(()=>{if(!loaded){loaded=true;render()}},5000);
  let db=null;
  try{if(window.claude&&window.claude.use)db=await window.claude.use('db')}catch(e){}
  DB=db||null;
  if(!DB){SYNC='Dati non salvati';loaded=true;render()}
  else{
    SYNC='Salvato online';
    let pending=COLS.length+1;
    const done=()=>{pending--;if(pending<=0){loaded=true}schedule()};
    COLS.forEach(col=>{
      let first=true;
      DB.collection(col).onSnapshot(snap=>{
        S[col]=snap.docs.map(d=>({...d.data(),id:d.id}));
        if(first){first=false;done()}else schedule();
      },err=>{if(first){first=false;done()}SYNC='Sincronizzazione interrotta';schedule()});
    });
    let f2=true;
    DB.doc('config/impresa').onSnapshot(s=>{S.config=s.exists?{...s.data()}:{};if(f2){f2=false;done()}else schedule()},err=>{if(f2){f2=false;done()}});
  }
  try{if(window.claude&&window.claude.use)DL=await window.claude.use('downloads')}catch(e){}
  render();
}
boot();
})();
