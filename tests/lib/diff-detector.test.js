const { findChanges } = require('../../lib/diff-detector');

describe('diff-detector.js — findChanges', () => {

  const headers = ['N° BE', 'Site', 'Demandeurs', "État d'avancement", 'Conformité'];

  it('detects additions when new items appear', () => {
    const old = [];
    const newItems = [
      { _row: 2, nbe_gerico_apex: 'BE-001', site: 'Lyon', etat_davance_de_la_demande: 'En cours' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('Ajout');
    expect(changes[0].id).toBe('BE-001');
  });

  it('detects deletions when items disappear', () => {
    const old = [
      { _row: 2, nbe_gerico_apex: 'BE-001', site: 'Lyon' },
    ];
    const newItems = [];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('Suppression');
  });

  it('detects field modifications', () => {
    const old = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'En cours', conformit_de_la_demande: 'Oui' },
    ];
    const newItems = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'Terminée', conformit_de_la_demande: 'Oui' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('Modification');
    expect(changes[0].fields).toHaveLength(1);
    expect(changes[0].fields[0].field).toBe('etat_davance_de_la_demande');
    expect(changes[0].fields[0].oldValue).toBe('En cours');
    expect(changes[0].fields[0].newValue).toBe('Terminée');
  });

  it('returns empty when nothing changed', () => {
    const items = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'En cours' },
    ];
    const changes = findChanges([...items], [...items], headers);
    expect(changes).toHaveLength(0);
  });

  it('ignores unwatched fields', () => {
    const old = [
      { _row: 2, nbe_gerico_apex: 'BE-001', remarque_immeit: 'ancienne', random_field: 'A' },
    ];
    const newItems = [
      { _row: 2, nbe_gerico_apex: 'BE-001', remarque_immeit: 'nouvelle', random_field: 'B' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('Modification');
    const fieldNames = changes[0].fields.map(f => f.field);
    expect(fieldNames).not.toContain('random_field');
    expect(fieldNames).toContain('remarque_immeit');
  });

  it('handles multiple changes on same row', () => {
    const old = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'En cours', conformit_de_la_demande: 'Oui' },
    ];
    const newItems = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'Terminée', conformit_de_la_demande: 'Non' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].fields).toHaveLength(2);
  });

  it('handles mixed additions, modifications, and deletions', () => {
    const old = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'En cours' },
      { _row: 3, nbe_gerico_apex: 'BE-002', etat_davance_de_la_demande: 'Nouvelle' },
    ];
    const newItems = [
      { _row: 2, nbe_gerico_apex: 'BE-001', etat_davance_de_la_demande: 'Terminée' },
      { _row: 4, nbe_gerico_apex: 'BE-003', etat_davance_de_la_demande: 'En attente' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(3);
    const types = changes.map(c => c.type);
    expect(types).toContain('Modification');
    expect(types).toContain('Ajout');
    expect(types).toContain('Suppression');
  });

  it('uses _row fallback when no nbe_gerico_apex', () => {
    const old = [
      { _row: 2, site: 'Lyon' },
    ];
    const newItems = [
      { _row: 2, site: 'Paris' },
    ];
    const changes = findChanges(old, newItems, headers);
    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe('Modification');
  });
});
