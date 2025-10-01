# Comment obtenir un Personal Access Token Supabase CLI

## Méthode 1 : Via le Dashboard Supabase (Recommandé)

1. **Aller sur la page des Access Tokens**
   ```
   https://supabase.com/dashboard/account/tokens
   ```

2. **Créer un nouveau token**
   - Cliquer sur "Generate New Token"
   - Donner un nom au token (ex: "CLI Access Token")
   - Sélectionner les permissions nécessaires (cocher "All access")
   - Cliquer sur "Generate Token"

3. **Copier le token**
   - Le token commence par `sbp_`
   - Format: `sbp_0102...1920`
   - ⚠️ **Important**: Copier immédiatement, il ne sera affiché qu'une seule fois !

4. **Configurer le token dans le terminal**
   ```bash
   export SUPABASE_ACCESS_TOKEN="sbp_votre_token_ici"
   ```

   Ou l'ajouter dans votre `.env`:
   ```bash
   echo "SUPABASE_ACCESS_TOKEN=sbp_votre_token_ici" >> .env
   ```

## Méthode 2 : Via la ligne de commande

1. **Lancer la commande de login**
   ```bash
   supabase login
   ```

2. **Suivre le flow OAuth dans le navigateur**
   - Une page web va s'ouvrir automatiquement
   - Se connecter avec votre compte Supabase
   - Autoriser l'accès CLI

3. **Le token sera automatiquement sauvegardé**
   - Stocké dans `~/.supabase/access-token`

## Après avoir le token

### Lier le projet
```bash
export SUPABASE_ACCESS_TOKEN="sbp_votre_token"
supabase link --project-ref lcsidczjexcfxajuoaiw
```

### Exécuter les migrations
```bash
supabase db push
```

Ou pour des migrations spécifiques:
```bash
supabase migration up
```

## Vérification

Pour vérifier que le token fonctionne:
```bash
supabase projects list
```

Vous devriez voir la liste de vos projets, incluant `lcsidczjexcfxajuoaiw`.

## Notes importantes

- Le **Personal Access Token** (commence par `sbp_`) est différent de:
  - **Anon Key** (pour le frontend)
  - **Service Role Key** (pour le backend)
- Le Personal Access Token donne accès à la **Management API** et au **CLI**
- Garder ce token secret et sécurisé
- Ne jamais le commiter dans git

## Liens utiles

- Dashboard Tokens: https://supabase.com/dashboard/account/tokens
- Documentation CLI: https://supabase.com/docs/guides/cli
- Project Dashboard: https://supabase.com/dashboard/project/lcsidczjexcfxajuoaiw
