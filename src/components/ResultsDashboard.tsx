import { BatteryScore, Light } from '../lib/scoring';
import { CheckCircle, AlertTriangle, XCircle, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

interface ResultsDashboardProps {
  score: BatteryScore;
  onContinue: () => void;
}

function getLightIcon(light: Light) {
  if (light === 'green') return <CheckCircle className="w-10 h-10 text-green-400" />;
  if (light === 'amber') return <AlertTriangle className="w-10 h-10 text-yellow-400" />;
  return <XCircle className="w-10 h-10 text-red-400" />;
}

function getLightColor(light: Light) {
  if (light === 'green') return 'bg-green-500/20 border-green-500';
  if (light === 'amber') return 'bg-yellow-500/20 border-yellow-500';
  return 'bg-red-500/20 border-red-500';
}

function getLightText(light: Light) {
  if (light === 'green') return 'text-green-400';
  if (light === 'amber') return 'text-yellow-400';
  return 'text-red-400';
}

export function ResultsDashboard({ score, onContinue }: ResultsDashboardProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full mb-6 border-4"
               style={{
                 borderColor: score.overallLight === 'green' ? '#10B981' :
                             score.overallLight === 'amber' ? '#EAB308' : '#EF4444',
                 backgroundColor: score.overallLight === 'green' ? 'rgba(16, 185, 129, 0.1)' :
                                 score.overallLight === 'amber' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)'
               }}>
            {getLightIcon(score.overallLight)}
          </div>
          <h1 className={`text-6xl font-bold mb-3 ${getLightText(score.overallLight)}`}>
            {score.overallScore}
          </h1>
          <p className="text-2xl text-gray-300 font-medium">{score.headline}</p>
        </div>

        <div className="grid gap-4 mb-8">
          {score.tests.map((test) => (
            <div
              key={test.name}
              className={`rounded-xl p-6 border-2 ${getLightColor(test.light)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  {getLightIcon(test.light)}
                  <div>
                    <h3 className="text-2xl font-bold text-white">{test.label}</h3>
                    <p className="text-sm text-gray-400">
                      {test.name === 'stroop' ? 'Stroop Test' :
                       test.name === 'taskSwitch' ? 'Task Switch' : 'PVT-3'}
                    </p>
                  </div>
                </div>
                <div className={`text-4xl font-bold ${getLightText(test.light)}`}>
                  {test.score}
                </div>
              </div>
              <p className="text-gray-300 text-lg">{test.summary}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Today's Actions</h3>
          <ul className="space-y-4">
            {score.actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white font-bold">{idx + 1}</span>
                </div>
                <span className="text-gray-300 text-lg">{action}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-bold rounded-xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
