const { buildHtml, buildProHtml, classifyChangePriority } = require('../../lib/email-alert');

describe('email-alert.js', () => {

  const baseReport = {
    detectedAt: '2025-07-13T10:30:00Z',
    lastModifiedBy: 'Test User',
    totalBefore: 100,
    totalAfter: 101,
    changes: [],
  };

  describe('buildHtml', () => {
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
  });

  describe('classifyChangePriority', () => {
    it('returns critical for Ajout', () => {
      expect(classifyChangePriority({ type: 'Ajout', fields: [] })).toBe('critical');
    });

    it('returns critical for Suppression', () => {
      expect(classifyChangePriority({ type: 'Suppression', fields: [] })).toBe('critical');
    });

    it('returns critical when any field is critical', () => {
      expect(classifyChangePriority({
        type: 'Modification',
        fields: [{ priority: 'low' }, { priority: 'critical' }],
      })).toBe('critical');
    });

    it('returns normal when highest field is normal', () => {
      expect(classifyChangePriority({
        type: 'Modification',
        fields: [{ priority: 'low' }, { priority: 'normal' }],
      })).toBe('normal');
    });

    it('returns low when all fields are low', () => {
      expect(classifyChangePriority({
        type: 'Modification',
        fields: [{ priority: 'low' }, { priority: 'low' }],
      })).toBe('low');
    });

    it('returns low for empty fields', () => {
      expect(classifyChangePriority({ type: 'Modification', fields: [] })).toBe('low');
    });
  });

  describe('buildProHtml', () => {
    it('returns valid HTML', () => {
      const html = buildProHtml(baseReport);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('sorts critical changes first', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Modification', row: 2, id: 'BE-001', site: '', demandeur: '', fields: [
            { field: 'remarque_immeit', label: 'Remarque', colonne: 'Z', oldValue: 'a', newValue: 'b', priority: 'low' },
          ]},
          { type: 'Ajout', row: 3, id: 'BE-002', site: '', demandeur: '', fields: [] },
        ],
      };
      const html = buildProHtml(report);
      const ajoutPos = html.indexOf('N° BE-002');
      const modifPos = html.indexOf('N° BE-001');
      expect(ajoutPos).toBeGreaterThan(0);
      expect(modifPos).toBeGreaterThan(0);
      expect(ajoutPos).toBeLessThan(modifPos);
    });

    it('shows URGENT badge for critical changes', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Ajout', row: 2, id: 'BE-001', site: '', demandeur: '', fields: [] },
        ],
      };
      const html = buildProHtml(report);
      expect(html).toContain('URGENT');
    });

    it('shows action requise section for critical changes', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Ajout', row: 2, id: 'BE-001', site: 'Lyon', demandeur: '', fields: [] },
        ],
      };
      const html = buildProHtml(report);
      expect(html).toContain('Action requise');
      expect(html).toContain('BE-001');
    });

    it('escapes HTML in values', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Ajout', row: 2, id: '<script>alert("xss")</script>', site: '', demandeur: '', fields: [] },
        ],
      };
      const html = buildProHtml(report);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('shows priority counts in summary', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Ajout', row: 2, id: 'BE-01', site: '', demandeur: '', fields: [] },
          { type: 'Modification', row: 3, id: 'BE-02', site: '', demandeur: '', fields: [
            { field: 'site', label: 'Site', colonne: 'B', oldValue: 'A', newValue: 'B', priority: 'normal' },
          ]},
        ],
      };
      const html = buildProHtml(report);
      expect(html).toContain('1 urgent(s)');
      expect(html).toContain('1 modifie');
    });

    it('renders field details with priority-colored borders', () => {
      const report = {
        ...baseReport,
        changes: [
          { type: 'Modification', row: 4, id: 'BE-003', site: '', demandeur: 'Paul', fields: [
            { field: 'etat_davance_de_la_demande', label: "État d'avancement", colonne: 'E', oldValue: 'En cours', newValue: 'Terminée', priority: 'critical' },
          ]},
        ],
      };
      const html = buildProHtml(report);
      expect(html).toContain("État d'avancement");
      expect(html).toContain('En cours');
      expect(html).toContain('Terminée');
      expect(html).toContain('#dc2626');
    });
  });
});
