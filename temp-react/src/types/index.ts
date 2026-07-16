export interface Article {
  id: number;
  titre_interne: string;
  accroche_a: string;
  accroche_b: string;
  accroche_active: 'a' | 'b';
  corps: string;
  hashtags: string[];
  statut: 'brouillon' | 'en_revision' | 'valide' | 'publie' | 'archive';
  image_url: string;
  image_photographer: string;
  image_photographer_url: string;
  image_options: ImageOption[];
  source_news_titre: string;
  source_news_url: string;
  source_news_source: string;
  ia_provider: string;
  ia_model: string;
  generation_type: 'custom' | 'news';
  custom_subject: string;
  date_creation: string;
  date_validation: string;
  date_publication: string;
}

export interface ImageOption {
  url: string;
  thumbnail: string;
  photographer: string;
  photographer_url: string;
  alt: string;
}

export interface NewsItem {
  titre: string;
  url: string;
  source: string;
  resume: string;
}

export interface IaMeta {
  provider: string;
  model: string;
  generation_type: string;
  custom_subject: string;
  image_options: ImageOption[];
}

export interface ModelsResponse {
  models: Record<string, {
    label: string;
    enabled: boolean;
    default: string;
    models: { id: string; label: string; free: boolean }[];
  }>;
}

export interface DashboardData {
  synced: { headers: string[]; items: Record<string, string>[] };
  sharepoint: { connected: boolean; stats: any; headers: string[]; items: Record<string, string>[] };
  syncedAt: string;
  needsBackgroundSync: boolean;
}

export type ArticleStatus = Article['statut'];
export type ToastType = 'success' | 'error' | 'warning' | 'info';
