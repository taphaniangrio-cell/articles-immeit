import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-50 text-primary',
  success: 'bg-success-light text-emerald-700',
  warning: 'bg-warning-light text-amber-700',
  danger: 'bg-danger-light text-red-700',
  muted: 'bg-surface-hover text-text-secondary',
};

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', dot, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      variantStyles[variant],
      className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', variant === 'success' && 'bg-success', variant === 'warning' && 'bg-warning', variant === 'danger' && 'bg-danger', variant === 'primary' && 'bg-primary', variant === 'muted' && 'bg-text-muted', variant === 'default' && 'bg-gray-400')} />}
      {children}
    </span>
  );
}

type Status = 'brouillon' | 'en_revision' | 'valide' | 'publie' | 'archive';

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  brouillon: { label: 'Brouillon', variant: 'muted' },
  en_revision: { label: 'En révision', variant: 'primary' },
  valide: { label: 'Validé', variant: 'success' },
  publie: { label: 'Publié', variant: 'warning' },
  archive: { label: 'Archivé', variant: 'danger' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'default' as BadgeVariant };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
