import { DeviceCodeCredential } from '@azure/identity';
import https from 'https';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TENANT_ID = 'd852d5cd-724c-4128-8812-ffa5db3f8507';

async function graph(url, token, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: 'graph.microsoft.com',
      path: u.pathname + u.search,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ConsistencyLevel': 'eventual',
      },
      timeout: 30000,
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`${res.statusCode}: ${parsed.error?.message || JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch {
          reject(new Error(`Parse failed: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timed out')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log();
  console.log('═'.repeat(58));
  console.log('  CONNEXION AZURE AD');
  console.log('═'.repeat(58));
  console.log();
  console.log('  Ouvre https://login.microsoft.com/device');
  console.log('  et entre le code qui s\'affiche ci-dessous :');
  console.log();

  const cred = new DeviceCodeCredential({
    tenantId: TENANT_ID,
    clientId: '1950a258-227b-4e31-a9cf-717495945fc2',
    userPromptCallback: (d) => {
      const code = d.message.match(/enter the code (\w+)/i)?.[1] || '???';
      console.log('  ┌────────────────────────────────────────────┐');
      console.log(`  │  CODE : ${code.padEnd(36)}│`);
      console.log('  └────────────────────────────────────────────┘');
      console.log();
      console.log('  ⏳ En attente...');
    },
  });

  const tokenResp = await cred.getToken('https://graph.microsoft.com/.default');
  const token = tokenResp.token;
  console.log('  ✅ Connecté\n');

  // Step 1: List apps
  console.log('🔍 Recherche d\'apps existantes...\n');
  const terms = ['immeit', 'dashboard', 'sharepoint', 'sync', 'sp-sync'];
  const all = await graph('https://graph.microsoft.com/v1.0/applications?$top=100', token);
  const candidates = (all.value || []).filter(a =>
    terms.some(t => a.displayName.toLowerCase().includes(t))
  );

  if (candidates.length > 0) {
    console.log(`  ${candidates.length} app(s) trouvée(s) :\n`);
    candidates.forEach(a => console.log(`  📱 ${a.displayName} (${a.appId})  créée: ${a.createdDateTime?.slice(0,10)}`));
    console.log();

    // Use the first matching app
    const app = candidates[0];
    console.log(`  ➡ Utilisation de : ${app.displayName}\n`);

    // Service principal
    console.log('🔍 Vérification du service principal...');
    let sp;
    try {
      const sps = await graph(
        `https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq '${app.appId}'`,
        token
      );
      if (sps.value?.length > 0) sp = sps.value[0];
    } catch { /* */ }
    if (!sp) {
      console.log('🆕 Création du service principal...');
      sp = await graph('https://graph.microsoft.com/v1.0/servicePrincipals', token, 'POST', { appId: app.appId });
      console.log('✅ OK');
    } else {
      console.log('✅ Déjà existant');
    }

    // Generate secret
    console.log('🔑 Génération d\'un client secret...');
    const secret = await graph(
      `https://graph.microsoft.com/v1.0/applications/${app.id}/addPassword`,
      token,
      'POST',
      { passwordCredential: { displayName: 'vercel-sync', endDateTime: new Date(Date.now() + 365*86400000).toISOString() } }
    );
    console.log('✅ Secret généré\n');

    const vars = {
      SHAREPOINT_TENANT_ID: TENANT_ID,
      SHAREPOINT_CLIENT_ID: app.appId,
      SHAREPOINT_CLIENT_SECRET: secret.secretText,
    };

    console.log('═'.repeat(58));
    console.log('  VARIABLES VERCEL À AJOUTER');
    console.log('═'.repeat(58));
    console.log();
    for (const [k, v] of Object.entries(vars)) console.log(`  ${k}=${v}`);
    console.log();
    console.log('═'.repeat(58));
    console.log('  🔗 Admin consent :');
    console.log(`  https://login.microsoftonline.com/${TENANT_ID}/adminconsent?client_id=${app.appId}`);
    console.log('═'.repeat(58));
    console.log();

    writeFileSync(resolve(__dirname, '..', '.azure-app-credentials.json'), JSON.stringify(vars, null, 2));
    console.log('  📄 .azure-app-credentials.json créé\n');
    return;
  }

  // No existing app found — try to create one
  console.log('ℹ Aucune app existante trouvée. Tentative de création...\n');

  try {
    const app = await graph('https://graph.microsoft.com/v1.0/applications', token, 'POST', {
      displayName: 'immeit-dashboard-sp-sync',
      signInAudience: 'AzureADMyOrg',
      requiredResourceAccess: [{
        resourceAppId: '00000003-0000-0000-c000-000000000000',
        resourceAccess: [{ id: '7ab1d382-f21e-4acd-a863-ba3e13f7da61', type: 'Role' }],
      }],
    });
    console.log(`✅ App créée : ${app.appId}\n`);
  } catch (err) {
    console.log(`❌ Création impossible : ${err.message}\n`);
    console.log('═'.repeat(58));
    console.log('  SOLUTION MANUELLE (3 étapes)');
    console.log('═'.repeat(58));
    console.log();
    console.log('  1. Va dans Azure AD :');
    console.log('     https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade');
    console.log('     → Nouvelle inscription');
    console.log('     Nom : immeit-dashboard-sp-sync');
    console.log('     Type de compte : "Comptes dans cet annuaire organisationnel"');
    console.log('     URI de redirection : (laisser vide)');
    console.log('     → Inscrire');
    console.log();
    console.log('  2. Permissions API :');
    console.log('     → Permissions API → Ajouter une permission');
    console.log('     → Microsoft Graph → Permissions application → Sites.Read.All');
    console.log('     → Ajouter les permissions');
    console.log('     → Accorder le consentement administrateur');
    console.log();
    console.log('  3. Certificats & secrets :');
    console.log('     → Certificats & secrets → Nouveau secret client');
    console.log('     Description : vercel-sync');
    console.log('     Expiration : 12 mois');
    console.log('     → Ajouter');
    console.log();
    console.log('  Copie les 3 valeurs et je les ajoute dans Vercel.');
    console.log();
    return;
  }
}

main().catch(err => {
  console.error('\n❌ Erreur:', err.message);
  process.exit(1);
});
