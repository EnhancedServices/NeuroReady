import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { useDbHealth } from '../lib/db-health';
import logo from '../assets/logo26.png';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const { status: dbStatus } = useDbHealth();
  const dbNotReady = dbStatus === 'waking' || dbStatus === 'checking';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch {
      setError('Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={logo} alt="Logo" className="w-14 h-14" />
            <h1 className="text-4xl font-bold text-white">NeuroReady</h1>
          </div>
          <p className="text-gray-400 text-lg">Athlete cognitive readiness</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 shadow-2xl border border-gray-800">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Login</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {dbNotReady && (
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-800/50">
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <span>
                  Waking up the database... This may take a moment.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || dbNotReady}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : dbNotReady ? 'Waiting for database...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
