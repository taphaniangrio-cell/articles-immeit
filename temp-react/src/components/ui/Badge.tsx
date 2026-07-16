const statusMap: Record<string, { label: string; color: string; dot: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  en_revision: { label: 'En révision', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  valide: { label: 'Validé', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  publie: { label: 'Publié', color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  archive: { label: 'Archivé', color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-400' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
