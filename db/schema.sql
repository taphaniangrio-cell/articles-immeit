CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  titre_interne TEXT NOT NULL,
  corps TEXT NOT NULL,
  accroche_a TEXT,
  accroche_b TEXT,
  hashtags TEXT[] DEFAULT '{}',
  source_news_titre TEXT,
  source_news_url TEXT,
  source_news_source TEXT,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT now(),
  date_validation TIMESTAMP WITH TIME ZONE,
  date_publication TIMESTAMP WITH TIME ZONE,
  date_modification TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_statut ON articles(statut);
CREATE INDEX IF NOT EXISTS idx_articles_date_creation ON articles(date_creation DESC);
