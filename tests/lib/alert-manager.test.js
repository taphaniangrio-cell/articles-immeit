import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const diffDetector = require('../../lib/diff-detector');
const emailAlert = require('../../lib/email-alert');
const alertManager = require('../../lib/alert-manager');

describe('alert-manager.js', () => {
  let buildDiffReportOrig;
  let sendAlertOrig;

  beforeEach(() => {
    buildDiffReportOrig = diffDetector.buildDiffReport;
    sendAlertOrig = emailAlert.sendAlert;
    diffDetector.buildDiffReport = vi.fn();
    emailAlert.sendAlert = vi.fn();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    diffDetector.buildDiffReport = buildDiffReportOrig;
    emailAlert.sendAlert = sendAlertOrig;
  });

  describe('processDiff', () => {
    it('returns no_changes when diff report is null', async () => {
      diffDetector.buildDiffReport.mockResolvedValue(null);
      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live' });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe('no_changes');
    });

    it('returns no_changes when changes array is empty', async () => {
      diffDetector.buildDiffReport.mockResolvedValue({ changes: [] });
      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live' });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe('no_changes');
    });

    it('sends alert when there are fresh changes', async () => {
      diffDetector.buildDiffReport.mockResolvedValue({
        changes: [
          { type: 'Ajout', id: 'BE-001', hash: 'h1', fields: [] },
          { type: 'Modification', id: 'BE-002', hash: 'h2', fields: [{ field: 'site', priority: 'normal' }] },
        ],
        lastModifiedBy: 'Test',
        source: 'live',
      });
      emailAlert.sendAlert.mockResolvedValue(true);

      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live', lastModifiedBy: 'Test' });
      expect(result.sent).toBe(true);
      expect(result.counts.total).toBe(2);
      expect(result.counts.critical).toBe(1);
      expect(result.counts.normal).toBe(1);
      expect(emailAlert.sendAlert).toHaveBeenCalled();
    });

    it('counts Ajout as critical', async () => {
      diffDetector.buildDiffReport.mockResolvedValue({
        changes: [
          { type: 'Ajout', id: 'BE-001', hash: 'h1', fields: [] },
        ],
        lastModifiedBy: 'Test',
        source: 'live',
      });
      emailAlert.sendAlert.mockResolvedValue(true);

      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live', lastModifiedBy: 'Test' });
      expect(result.counts.critical).toBe(1);
      expect(result.counts.normal).toBe(0);
      expect(result.counts.low).toBe(0);
    });

    it('counts Suppression as critical', async () => {
      diffDetector.buildDiffReport.mockResolvedValue({
        changes: [
          { type: 'Suppression', id: 'BE-001', hash: 'h1', fields: [] },
        ],
        lastModifiedBy: 'Test',
        source: 'live',
      });
      emailAlert.sendAlert.mockResolvedValue(true);

      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live', lastModifiedBy: 'Test' });
      expect(result.counts.critical).toBe(1);
    });

    it('classifies field priorities in modifications', async () => {
      diffDetector.buildDiffReport.mockResolvedValue({
        changes: [
          { type: 'Modification', id: 'BE-001', hash: 'h1', fields: [
            { field: 'etat_davance_de_la_demande', priority: 'critical', label: 'Etat', colonne: 'E', oldValue: 'A', newValue: 'B' },
            { field: 'site', priority: 'normal', label: 'Site', colonne: 'B', oldValue: 'Lyon', newValue: 'Paris' },
            { field: 'remarque_immeit', priority: 'low', label: 'Remarque', colonne: 'Z', oldValue: 'a', newValue: 'b' },
          ]},
        ],
        lastModifiedBy: 'Test',
        source: 'live',
      });
      emailAlert.sendAlert.mockResolvedValue(true);

      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live', lastModifiedBy: 'Test' });
      expect(result.counts.critical).toBe(1);
      expect(result.counts.normal).toBe(1);
      expect(result.counts.low).toBe(1);
    });

    it('skips when buildDiffReport returns null (no prev state)', async () => {
      diffDetector.buildDiffReport.mockResolvedValue(null);

      const result = await alertManager.processDiff({ items: [], headers: [], source: 'live' });
      expect(result.sent).toBe(false);
      expect(result.reason).toBe('no_changes');
    });
  });
});
