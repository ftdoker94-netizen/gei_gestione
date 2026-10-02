-- Facoltativo: porta nel database il cantiere "Appartamento Trani" già inserito nell'artifact.
insert into public.docs (col,id,data) values
 ('cantieri','trani','{"nome":"Appartamento Trani","contratto":49000,"stato":"in_corso","inizio":"2026-09-22","budget":{}}'),
 ('costi','trani-personale','{"cantiereId":"trani","descrizione":"Personale","categoria":"manodopera","importo":560,"data":"2026-09-30","pagato":true}'),
 ('costi','trani-materiali','{"cantiereId":"trani","descrizione":"Materiali","categoria":"materiali","importo":997.78,"data":"2026-09-30"}'),
 ('costi','trani-macchine','{"cantiereId":"trani","descrizione":"Macchine","categoria":"noli","importo":300,"data":"2026-09-30"}')
on conflict (col,id) do nothing;
