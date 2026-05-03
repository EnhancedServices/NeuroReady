import { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { User, Lock, Mail, Calendar, Activity } from 'lucide-react';

interface ProfilePageProps {
  onStartTest: () => void;
}

export function ProfilePage({ onStartTest }: ProfilePageProps) {
  const { profile } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);

      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-gray-400 text-lg">Manage your account and start testing</p>
      </div>

      <div className="grid gap-6">
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.full_name || 'Athlete'}</h2>
              <p className="text-gray-400">{profile?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 mb-8">
            <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-sm text-gray-400">Email</div>
                <div className="text-white font-medium">{profile?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
              <Calendar className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm text-gray-400">Member Since</div>
                <div className="text-white font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
              <Activity className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-sm text-gray-400">Baseline Sessions</div>
                <div className="text-white font-medium">{profile?.baseline_sessions_count || 0}</div>
              </div>
            </div>
          </div>

          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">Change Password</span>
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>

                  {passwordError && (
                    <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                      }}
                      className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-8 border border-blue-800/50">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Test?</h2>
          <p className="text-gray-300 mb-6 text-lg">
            Start a new cognitive assessment session to track your readiness.
          </p>
          <button
            onClick={onStartTest}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-colors shadow-lg shadow-blue-900/50"
          >
            Start New Test
          </button>
        </div>
      </div>
    </div>
  );
}
