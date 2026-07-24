require('dotenv').config();
const { query } = require('../lib/db');

const CONTRACTIONS = /\b(j'ai|j'suis|j'pense|j'dis|j'vais|j'crois|j'vois|j'fais|c'est|c'que|c'là|c'qui|on fait|y'a|t'as|n'attendez|n'attendons|qu'on|qu'il|qu'elle|qu'elles|qu'ils|s'est|n'est|n'a|y'avait|c'était|j'avais|j'aurais|on a|on a vu|on a constaté)\b/gi;
const PERSONAL_ANCHORS = /\b(\d{1,3}[\s]*%|il y a \d+|en \d{4}|la semaine dernière|ce mois|hier|aujourd'hui|dans mon|de mon|notre client|un client|j'ai \w+|j'y \w+ \w+|m'a \w+|on a \w+|on fait|on travaille avec|on accompagne|je \w+|depuis \d+|pendant \d+|\d+ mois|\d+ semaines|\d+ heures|\d+ jours|\d+ ans|\d+ années)\b/gi;
const HEDGE_WORDS = /\b(arguably|il pourrait être dit|dans certains cas|certains experts|on peut avancer|il est important de noter|il convient de souligner|force est de constater|it could be argued|in some cases|some experts believe|it is important to note)\b/gi;

function score(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length;
  const uw = new Set(words.map(w => w.toLowerCase().replace(/[^a-zà-ÿ]/g, '')));
  const ld = wc > 0 ? uw.size / wc : 0;
  const ldS = Math.min(10, Math.round(ld / 0.80 * 10));
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sLens = sents.map(s => s.split(/\s+/).filter(Boolean).length);
  const avg = sLens.reduce((a,b)=>a+b,0)/(sLens.length||1);
  const v = sLens.reduce((a,b)=>a+Math.pow(b-avg,2),0)/(sLens.length||1);
  const cv = avg > 0 ? Math.sqrt(v)/avg : 0;
  const svS = Math.min(10, Math.round(cv/0.60*10));
  const cm = (text.match(CONTRACTIONS)||[]).length;
  const cd = (cm/(wc||1))*1000;
  const cS = Math.min(10, Math.round(Math.min(cd,8)/8*10));
  const hm = (text.match(HEDGE_WORDS)||[]).length;
  const hd = (hm/(wc||1))*500;
  const hS = Math.min(10, Math.max(0,10-Math.round(hd*3)));
  const pm = (text.match(PERSONAL_ANCHORS)||[]).length;
  const pS = Math.min(10, Math.round(Math.min(pm,5)/5*10));
  const wS = wc>=300&&wc<=500?10:wc>=200&&wc<=600?7:wc>=150?4:2;
  const t = Math.round(ldS*0.2+svS*0.2+cS*0.15+hS*0.15+pS*0.15+wS*0.15);
  return {t,wc,ld:Math.round(ld*100),sv:Math.round(cv*100),cm,pm};
}

(async () => {
  const r = await query("SELECT id, titre_interne, corps FROM articles ORDER BY id DESC LIMIT 10");
  for (const row of r.rows) {
    const s = score(row.corps);
    console.log(`#${row.id} [${s.t}/10] ${row.titre_interne.slice(0,50)}... | w:${s.wc} ld:${s.ld}% sv:${s.sv}% c:${s.cm} a:${s.pm}`);
  }
  process.exit();
})();
