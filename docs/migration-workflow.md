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
