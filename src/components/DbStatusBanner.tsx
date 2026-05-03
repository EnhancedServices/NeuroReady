import { useState, useEffect } from 'react';
import { useDbHealth, MAX_RETRIES } from '../lib/db-health';
import { X, AlertCircle, RefreshCw } from 'lucide-react';

export function DbStatusBanner() {
  const { status, retryCount, checkNow } = useDbHealth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== 'online') {
      setDismissed(false);
    }
  }, [status]);

  if (status === 'online' || status === 'checking') {
    return (
      <div className="fixed top-3 right-3 z-50 pointer-events-none">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-500 ${
            status === 'online'
              ? 'bg-gray-900/70 border-gray-800/60 backdrop-blur-sm'
              : 'bg-gray-900/50 border-gray-800/40 backdrop-blur-sm'
          }`}
        >
          {status === 'online' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-30" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          <span className="text-xs text-gray-500 font-medium">
            {status === 'online' ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>
    );
  }

  if (dismissed) {
    const dotColor = status === 'waking' ? 'bg-amber-500' : 'bg-red-500';
    const pingColor = status === 'waking' ? 'bg-amber-400' : 'bg-red-400';
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900/70 border border-gray-800/60 backdrop-blur-sm"
        title={status === 'waking' ? 'Database waking up...' : 'Database unreachable'}
      >
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-50`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
      </button>
    );
  }

  if (status === 'waking') {
    const pct = Math.round((retryCount / MAX_RETRIES) * 100);
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-gray-900/95 backdrop-blur-md border-b border-amber-800/30">
          <div className="relative overflow-hidden">
            <div
              className="absolute inset-0 bg-amber-500/5 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between px-4 py-2 max-w-7xl mx-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex-shrink-0" />
                <span className="text-xs text-amber-400 font-medium">
                  Database waking up
                  {retryCount > 0 && (
                    <span className="text-amber-600 ml-1">
                      — attempt {retryCount} of {MAX_RETRIES}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline text-xs text-gray-600">
                  This takes 30–60 seconds after inactivity
                </span>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="ml-4 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-gray-900/95 backdrop-blur-md border-b border-red-800/30">
          <div className="flex items-center justify-between px-4 py-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-400 font-medium">
                Unable to reach database
              </span>
              <span className="hidden sm:inline text-xs text-gray-600">
                Check your connection and try again
              </span>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={checkNow}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-gray-600 hover:text-gray-400 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
