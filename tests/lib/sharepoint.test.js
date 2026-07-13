const { computeStats, filterDataRows } = require('../../lib/sharepoint');

describe('sharepoint.js — pure functions', () => {

  // ── filterDataRows ──────────────────────────────────────────────────

  describe('filterDataRows', () => {
    const headers = ['Statut', 'Type', 'Site', 'Date création'];

    it('keeps rows where at least one key column has a real value', () => {
      const rows = [
        { statut: 'En cours', type: 'Maintenance', site: 'Lyon', date_création: '2025-01-01' },
        { statut: '', type: '', site: '', date_création: '' },
        { statut: 'Terminée', type: '', site: '', date_création: '' },
      ];
      const result = filterDataRows(rows, headers);
      expect(result).toHaveLength(2);
    });

    it('removes rows where all key columns are empty', () => {
      const rows = [
        { statut: '', type: '', site: '', date_création: '' },
        { statut: '', type: '', site: '', date_création: '' },
      ];
      const result = filterDataRows(rows, headers);
      expect(result).toHaveLength(0);
    });

    it('treats filler characters as empty', () => {
      const rows = [
        { statut: '-', type: '.', site: 'N/A', date_création: '_' },
        { statut: 'En attente', type: '', site: '', date_création: '' },
      ];
      const result = filterDataRows(rows, headers);
      expect(result).toHaveLength(1);
      expect(result[0].statut).toBe('En attente');
    });

    it('handles case-insensitive header matching', () => {
      const mixedHeaders = ['STATUS', 'Type de demande', 'Site', 'Date'];
      const rows = [
        { status: 'Nouvelle', type_de_demande: 'Urgent', site: 'Paris', date: '2025-03-01' },
        { status: '', type_de_demande: '', site: '', date: '' },
      ];
      const result = filterDataRows(rows, mixedHeaders);
      expect(result).toHaveLength(1);
    });

    it('returns all rows when no key columns match (fallback mode)', () => {
      const unrelatedHeaders = ['Champ A', 'Champ B', 'Champ C', 'Champ D'];
      const rows = [
        { champ_a: 'val1', champ_b: 'val2', champ_c: 'val3', champ_d: 'val4' },
        { champ_a: '', champ_b: '', champ_c: '', champ_d: '' },
      ];
      const result = filterDataRows(rows, unrelatedHeaders);
      expect(result).toHaveLength(1);
    });

    it('handles empty rows array', () => {
      expect(filterDataRows([], headers)).toHaveLength(0);
    });
  });

  // ── computeStats ────────────────────────────────────────────────────

  describe('computeStats', () => {
    const headers = ['Statut', 'Type', 'Priorité', 'Date création', 'Échéance'];

    it('computes basic stats with mixed statuses', () => {
      const items = [
        { 'Statut': 'En cours', 'Type': 'Maintenance', 'Priorité': 'Haute', 'Date création': '2025-06-01', 'Échéance': '2025-12-31' },
        { 'Statut': 'Terminée', 'Type': 'Maintenance', 'Priorité': 'Basse', 'Date création': '2025-06-02', 'Échéance': '2025-07-01' },
        { 'Statut': 'En attente', 'Type': 'Réparation', 'Priorité': 'Moyenne', 'Date création': '2025-06-03', 'Échéance': '' },
        { 'Statut': 'Nouvelle', 'Type': 'Inspection', 'Priorité': 'Haute', 'Date création': '2025-07-01', 'Échéance': '' },
      ];

      const stats = computeStats(items, headers);

      expect(stats.total).toBe(4);
      expect(stats.completedCount).toBe(1);
      expect(stats.completionRate).toBe(25);
      expect(stats.statusDistribution).toEqual(
        expect.arrayContaining([
          { label: 'Nouvelle', count: 1 },
          { label: 'En cours', count: 1 },
          { label: 'En attente', count: 1 },
          { label: 'Terminée', count: 1 },
        ])
      );
      expect(stats.typeDistribution[0].label).toBe('Maintenance');
      expect(stats.typeDistribution[0].count).toBe(2);
      expect(stats.priorityDistribution).toEqual(
        expect.arrayContaining([
          { label: 'Haute', count: 2 },
          { label: 'Moyenne', count: 1 },
          { label: 'Basse', count: 1 },
        ])
      );
      expect(stats.monthlyTrend).toHaveLength(2);
      expect(stats.monthlyTrend).toEqual([
        { month: '2025-06', count: 3 },
        { month: '2025-07', count: 1 },
      ]);
    });

    it('normalizes status values', () => {
      const items = [
        { 'Statut': 'terminée', 'Type': 'A', 'Priorité': 'Haute', 'Date création': '' },
        { 'Statut': 'TERMINE', 'Type': 'B', 'Priorité': 'Basse', 'Date création': '' },
        { 'Statut': 'annulée', 'Type': 'C', 'Priorité': 'Moyenne', 'Date création': '' },
      ];
      const stats = computeStats(items, headers);
      expect(stats.completedCount).toBe(2);
      expect(stats.statusDistribution.find(s => s.label === 'Terminée').count).toBe(2);
    });

    it('returns zero stats for empty items', () => {
      const stats = computeStats([], headers);
      expect(stats.total).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.urgentCount).toBe(0);
    });

    it('counts urgent items with deadline within 7 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 3);
      const soonStr = soon.toISOString().split('T')[0];

      const far = new Date();
      far.setDate(far.getDate() + 30);
      const farStr = far.toISOString().split('T')[0];

      const items = [
        { 'Statut': 'En cours', 'Type': 'A', 'Priorité': 'Haute', 'Date création': '', 'Échéance': soonStr },
        { 'Statut': 'En cours', 'Type': 'B', 'Priorité': 'Basse', 'Date création': '', 'Échéance': farStr },
        { 'Statut': 'Terminée', 'Type': 'C', 'Priorité': 'Haute', 'Date création': '', 'Échéance': soonStr },
      ];
      const stats = computeStats(items, headers);
      expect(stats.urgentCount).toBe(1);
    });

    it('handles missing fields gracefully', () => {
      const items = [
        { 'Statut': 'En cours', 'Type': '', 'Priorité': '', 'Date création': '' },
      ];
      const stats = computeStats(items, headers);
      expect(stats.total).toBe(1);
      expect(stats.statusDistribution.find(s => s.label === 'En cours').count).toBe(1);
    });
  });
});
