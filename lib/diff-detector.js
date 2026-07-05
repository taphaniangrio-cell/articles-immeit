const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

const DIFF_FILE = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'IMMEIT', 'dash-cache-prev.json')
  : path.join(__dirname, '..', '.immeit-logs', 'dash-cache-prev.json');

const ID_FIELD = 'nbe_gerico_apex';
const FALLBACK_ID = '_row';

const WATCHED_FIELDS = [
  'etat_davance_de_la_demande',
  'conformit_de_la_demande',
  'remarque_immeit',
  'stockage_adveso',
  'stockage',
  'mise__jour_kpi',
  'date_de_validation_p2m',
  'date_dernire_maj_immeit',
  'conformit__la_premire_diffusion',
  'commentaire_p2m',
  'date_dvaluation_en_cas_de_non_conformit',
  'explication_en_cas_de_nonconformit',
];

const LABEL_MAP = {
  nbe_gerico_apex: 'N° BE/GERICO/APEX',
  _row: 'Ligne Excel',
  etat_davance_de_la_demande: 'Avancement',
  conformit_de_la_demande: 'Conformité demande',
  remarque_immeit: 'Remarque IMMEIT',
  stockage_adveso: 'Stockage ADVESO',
  stockage: 'Stockage',
  mise__jour_kpi: 'Mise à jour KPI',
  date_de_validation_p2m: 'Validation P2M',
  date_dernire_maj_immeit: 'Dernière MAJ IMMEIT',
  conformit__la_premire_diffusion: 'Conformité 1ère diffusion',
  commentaire_p2m: 'Commentaire P2M',
  date_dvaluation_en_cas_de_non_conformit: "Date d'évaluation NC",
  explication_en_cas_de_nonconformit: 'Explication NC',
  site: 'Site',
  demandeurs: 'Demandeur',
  type_de_demande: 'Type',
  nature_de_la_demande: 'Nature',
  nom_du_banc_nom_entreprise: 'Banc / Entreprise',
};

function getRowId(item) {
  const id = item[ID_FIELD] || item[FALLBACK_ID];
  return id != null ? String(id).trim() : null;
}

function formatLabel(field) {
  return LABEL_MAP[field] || field.replace(/_/g, ' ');
}

function findChanges(oldItems, newItems) {
  const oldMap = new Map();
  for (const item of oldItems) {
    const id = getRowId(item);
    if (id) oldMap.set(id, item);
  }

  const added = [];
  const removed = [];
  const modified = [];

  for (const item of newItems) {
    const id = getRowId(item);
    if (!id) continue;

    const oldItem = oldMap.get(id);
    if (!oldItem) {
      added.push(item);
    } else {
      const changes = [];
      for (const field of WATCHED_FIELDS) {
        const oldVal = (oldItem[field] || '').trim();
        const newVal = (item[field] || '').trim();
        if (oldVal !== newVal) {
          changes.push({
            field,
            label: formatLabel(field),
            oldValue: oldVal || '(vide)',
            newValue: newVal || '(vide)',
          });
        }
      }
      if (changes.length > 0) {
        modified.push({ id, item, changes });
      }
    }
    oldMap.delete(id);
  }

  for (const item of oldMap.values()) {
    const id = getRowId(item);
    if (id) removed.push(item);
  }

  return { added, removed, modified, hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0 };
}

function loadPreviousState() {
  try {
    if (fs.existsSync(DIFF_FILE)) {
      const raw = fs.readFileSync(DIFF_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && data.items && data.items.length > 0) return data;
    }
  } catch (e) {
    log('warn', 'diff_prev_load_failed', { error: e?.message });
  }
  return null;
}

function saveCurrentState(data) {
  try {
    const dir = path.dirname(DIFF_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DIFF_FILE, JSON.stringify({
      items: data.items,
      headers: data.headers,
      syncedAt: data.syncedAt,
    }));
  } catch (e) {
    log('warn', 'diff_prev_save_failed', { error: e?.message });
  }
}

function buildDiffReport(newData, lastModifiedBy) {
  const prev = loadPreviousState();

  if (!prev) {
    saveCurrentState(newData);
    return null;
  }

  const diff = findChanges(prev.items, newData.items);

  if (!diff.hasChanges) {
    saveCurrentState(newData);
    return null;
  }

  const report = {
    detectedAt: new Date().toISOString(),
    syncedAt: newData.syncedAt,
    lastModifiedBy: lastModifiedBy || 'Inconnu',
    totalBefore: prev.items.length,
    totalAfter: newData.items.length,
    added: diff.added.length,
    removed: diff.removed.length,
    modified: diff.modified.length,
    addedRows: diff.added.map(item => ({
      id: getRowId(item),
      site: item.site || '',
      demandeur: item.demandeurs || '',
      nature: item.nature_de_la_demande || '',
      banc: item.nom_du_banc_nom_entreprise || '',
      etat: item.etat_davance_de_la_demande || '',
    })),
    removedRows: diff.removed.map(item => ({
      id: getRowId(item),
      site: item.site || '',
      demandeur: item.demandeurs || '',
      banc: item.nom_du_banc_nom_entreprise || '',
    })),
    modifiedRows: diff.modified.map(m => ({
      id: m.id,
      site: m.item.site || '',
      demandeur: m.item.demandeurs || '',
      banc: m.item.nom_du_banc_nom_entreprise || '',
      changes: m.changes,
    })),
  };

  saveCurrentState(newData);

  return report;
}

module.exports = { buildDiffReport, findChanges, loadPreviousState };
