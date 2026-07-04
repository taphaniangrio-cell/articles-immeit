const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-hash.js <mot-de-passe>');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync(password, salt);
console.log('\nPASSWORD_HASH=' + hash);
console.log('\nAjoute cette ligne dans ton .env ou dans les variables Vercel.');
console.log('Supprime ensuite ADMIN_PASSWORD pour ne plus utiliser le mot de passe en clair.\n');
