import React from 'react';

export function LoginScreen({ onLogin, error }: { onLogin: (pw: string) => void; error: string }) {
  const [pw, setPw] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(pw);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1B2A] to-[#0F2A44] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <img src="/logo-immeit.webp" alt="IMMEIT" className="w-20 h-20 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">IMMEIT Hub</h1>
        <p className="text-sm text-gray-500 mb-6">Plateforme interne</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
          <button type="submit" className="w-full bg-[#0A66C2] text-white py-2 rounded-lg font-medium hover:bg-[#084a8f] transition-colors">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
