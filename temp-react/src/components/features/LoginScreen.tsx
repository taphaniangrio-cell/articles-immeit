import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function LoginScreen({ onLogin, error }: { onLogin: (pw: string) => void; error: string }) {
  const [pw, setPw] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(pw);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] via-[#1a2d4a] to-[#0F2A44] flex items-center justify-center p-4">
      <div className="bg-surface-elevated rounded-2xl shadow-xl w-full max-w-sm p-8 text-center animate-scale-in">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-50 flex items-center justify-center">
          <img src="/logo-immeit.webp" alt="IMMEIT" className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-1">IMMEIT Hub</h1>
        <p className="text-sm text-text-secondary mb-6">Plateforme interne</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            label="Mot de passe"
            placeholder="Entrez votre mot de passe"
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoFocus
          />
          {error && (
            <p className="text-sm text-danger bg-danger-light rounded-lg px-3 py-2">{error}</p>
          )}
          <Button type="submit" className="w-full" size="lg">
            <Lock size={16} />
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}
