# GEI · Controllo di gestione

Gestionale online di Gruppo Edile Immobiliare: cantieri, costi, SAL, subappalti, ore operai, fatture XML,
cassa e scadenze fiscali, clienti e preventivi. Sito statico (nessuna build) + database Supabase con login.

## Messa online (una volta sola)

1. **Database** – In Supabase apri *SQL Editor → New query*, incolla `supabase/migrations/001_init.sql` ed esegui.
   (Facoltativo: poi `supabase/seed_trani.sql` per il cantiere Trani.)
2. **Utenti** – *Authentication → Users → Add user*: crea email e password per te e per chi deve entrare.
   In *Authentication → Sign In / Providers* disattiva **Allow new users to sign up**.
3. **Chiave** – *Project Settings → API Keys*: copia la chiave **publishable** (inizia con `sb_publishable_`)
   e incollala in `config.js`. Non usare mai la chiave `secret`/`service_role`.
4. **Sito** – GitHub → *Settings → Pages → Source: GitHub Actions*. Ad ogni push su `main` il sito si aggiorna.
   Poi in Supabase *Authentication → URL Configuration* imposta il Site URL con l'indirizzo del sito.

## Struttura
- `index.html`, `style.css`, `app.js` – interfaccia e calcoli
- `db.js` – collegamento a Supabase (tabella `docs`, aggiornamento in tempo reale)
- `main.js` – login
- `config.js` – URL e chiave pubblica del progetto
