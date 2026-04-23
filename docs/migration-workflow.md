# Migration-Workflow für Claude-Code-Sessions

## Problem

`npx prisma migrate dev` ist interaktiv und erwartet eine Shell, die User-Input entgegennimmt. Claude-Code-Sessions haben keine interaktive Shell — der Befehl scheitert dort mit:

  "Prisma Migrate has detected non-interactive environment"

## Lösung

Statt `migrate dev` nutzen wir in Claude-Code-Sessions diesen Zwei-Schritt-Workflow:

1. SQL generieren (ohne Anwendung):

   npx prisma migrate diff \
     --from-config-datasource \
     --to-schema prisma/schema.prisma \
     --script \
     --output prisma/migrations/<TIMESTAMP>_<NAME>/migration.sql

2. Migration anwenden:

   npx prisma migrate deploy

3. Prisma Client regenerieren:

   npx prisma generate

## Rollback-Scripts

Rollback-SQL liegt NIE unter prisma/migrations/, weil Prisma jeden Unterordner dort als Migration interpretiert. Rollback-Scripts liegen unter prisma/rollback/ mit dem Namensschema:

  NNN_rollback_<migration_name>.sql

## Migrationen auf Prod deployen (Prisma Postgres)

**Hintergrund:** Am 23.04.2026 hat sich herausgestellt, dass lokale
.env.local und Vercel-Production auf zwei verschiedene Prisma-Postgres-
Datenbanken zeigen (gleicher Host `db.prisma.io`, unterschiedliche
Credentials). Zusaetzlich spricht die Prisma CLI intern einen anderen
Management-Layer an als der `PrismaPg`-Runtime-Adapter — trotz
identischer DATABASE_URL. Dadurch kann `prisma migrate deploy` "No
pending migrations" melden, waehrend die App-DB die Migration gar
nicht erhalten hat. Details: TD-Post-Demo-07.

**Folge:** Migrationen muessen fuer Prod mit einem alternativen Ablauf
deployed werden, der DIREKT ueber den `PrismaPg`-Adapter geht — also
exakt denselben Pfad wie die Serverless-Functions auf Vercel. Der hier
dokumentierte 4-Schritt-Workflow hat am 23.04.2026 nachweislich
funktioniert (siehe Commit `0c86baa` + Follow-up).

### Ablauf (4 Schritte)

```bash
# 1. Prod-ENV lokal pullen (wird durch .gitignore geschuetzt: .env.vercel.*)
vercel env pull .env.vercel.production --environment=production --yes

# 2. Migration gegen Prod-DB ausfuehren
#    ERSTE Wahl, sauber: Prisma CLI (klappt, wenn das CLI-Management-Layer
#    mit dem Runtime-Adapter im Einklang ist)
npx dotenv-cli -e .env.vercel.production -- npx prisma migrate deploy

# 3. Verifikation per DIRECT-QUERY (nicht via `migrate status`, weil der
#    CLI-Layer luegen kann — siehe TD-Post-Demo-07). Der Check muss ueber
#    den PrismaPg-Adapter laufen, wie die App:
npx dotenv-cli -e .env.vercel.production -- npx tsx -e "
  import { PrismaClient } from './src/generated/prisma/client';
  import { PrismaPg } from '@prisma/adapter-pg';
  const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
  // Pruefe physisch ob das neue Feld in information_schema auftaucht:
  db.\$queryRawUnsafe(\"SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='<TABLE>' AND column_name='<NEW_COL>'\")
    .then(r => console.log('PROD cols:', r))
    .finally(() => db.\$disconnect());
"

# 4. Aufraeumen
rm .env.vercel.production
```

### Wenn Schritt 2 "No pending migrations" meldet, aber Schritt 3
### zeigt, dass die Spalten fehlen: Manueller Direct-Apply

Das ist der 23.04.-Fallback. Der `PrismaPg`-Adapter fuehrt das ALTER-
TABLE direkt gegen die Runtime-DB aus, dann wird der `_prisma_migrations`-
Tracker manuell konsistent gemacht:

```bash
npx dotenv-cli -e .env.vercel.production -- npx tsx -e "
  import { PrismaClient } from './src/generated/prisma/client';
  import { PrismaPg } from '@prisma/adapter-pg';
  import { randomUUID } from 'node:crypto';
  const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
  (async () => {
    // 4a. Additive ALTER TABLE idempotent (IF NOT EXISTS) ausfuehren:
    await db.\$executeRawUnsafe('ALTER TABLE \"<table>\" ADD COLUMN IF NOT EXISTS \"<col>\" <TYPE>');
    // ... weitere Statements analog
    // 4b. _prisma_migrations konsistent setzen (nur fuer den manuellen Pfad):
    const id = randomUUID();
    await db.\$executeRaw\`INSERT INTO _prisma_migrations
      (id, checksum, migration_name, started_at, applied_steps_count, finished_at)
      VALUES (\${id}, 'manual-apply', '<MIGRATION_NAME>', NOW(), 1, NOW())
      ON CONFLICT (migration_name) DO NOTHING\`;
    await db.\$disconnect();
  })();
"
```

**Regel:** `ADD COLUMN IF NOT EXISTS` bleibt idempotent und brechnet nicht
ab, falls einzelne Statements bereits durchliefen. Neue Migrationen IMMER
additiv halten, solange TD-Post-Demo-07 nicht geschlossen ist — sonst
werden solche Hybride-Pfade unmoeglich.

### Sicherheits-Regeln fuer diesen Workflow

- `.env.vercel.production` wird durch `.gitignore` (`.env.vercel.*`)
  blockiert. Niemals committen.
- Nach Schritt 4 pruefen: `git status` darf die File nicht mehr zeigen.
- Keine DATABASE_URL-Werte in den Terminal-Output leaken. Die Scripts
  oben loggen nur Spalten-Namen und Migration-Metadaten, keine URLs.
