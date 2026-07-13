const { buildHtml } = require('../../lib/email-alert');

describe('email-alert.js — buildHtml', () => {

  const baseReport = {
    detectedAt: '2025-07-13T10:30:00Z',
    lastModifiedBy: 'Test User',
    totalBefore: 100,
    totalAfter: 101,
    changes: [],
  };

  it('returns valid HTML string', () => {
    const html = buildHtml(baseReport);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('</html>');
  });

  it('includes the modifier name', () => {
    const html = buildHtml(baseReport);
    expect(html).toContain('Test User');
  });

  it('renders AJOUT rows in green', () => {
    const report = {
      ...baseReport,
      changes: [
        { type: 'Ajout', row: 2, id: 'BE-001', site: 'Lyon', demandeur: 'Jean', fields: [] },
      ],
    };
    const html = buildHtml(report);
    expect(html).toContain('AJOUT');
    expect(html).toContain('BE-001');
    expect(html).toContain('#f0fdf4');
  });

  it('renders SUPPR rows in red', () => {
    const report = {
      ...baseReport,
      changes: [
        { type: 'Suppression', row: 3, id: 'BE-002', site: 'Paris', demandeur: '', fields: [] },
      ],
    };
    const html = buildHtml(report);
    expect(html).toContain('SUPPR.');
    expect(html).toContain('BE-002');
    expect(html).toContain('#fef2f2');
  });

  it('renders MODIF rows in yellow with field details', () => {
    const report = {
      ...baseReport,
      changes: [
        {
          type: 'Modification', row: 4, id: 'BE-003', site: '', demandeur: 'Paul',
          fields: [
            { field: 'etat_davance_de_la_demande', label: "État d'avancement", colonne: 'E', oldValue: 'En cours', newValue: 'Terminée' },
          ],
        },
      ],
    };
    const html = buildHtml(report);
    expect(html).toContain('MODIF.');
    expect(html).toContain("État d'avancement");
    expect(html).toContain('En cours');
    expect(html).toContain('Terminée');
  });

  it('escapes HTML in values', () => {
    const report = {
      ...baseReport,
      changes: [
        { type: 'Ajout', row: 2, id: '<script>alert("xss")</script>', site: '', demandeur: '', fields: [] },
      ],
    };
    const html = buildHtml(report);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles multiple change types in one report', () => {
    const report = {
      ...baseReport,
      changes: [
        { type: 'Ajout', row: 2, id: 'BE-10', site: '', demandeur: '', fields: [] },
        { type: 'Modification', row: 3, id: 'BE-11', site: '', demandeur: '', fields: [{ field: 'site', label: 'Site', colonne: 'B', oldValue: 'A', newValue: 'B' }] },
        { type: 'Suppression', row: 4, id: 'BE-12', site: '', demandeur: '', fields: [] },
      ],
    };
    const html = buildHtml(report);
    expect(html).toContain('1 ajout(s)');
    expect(html).toContain('1 modification(s)');
    expect(html).toContain('1 suppression(s)');
  });
});
