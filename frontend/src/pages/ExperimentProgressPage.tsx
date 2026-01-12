import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '../components';
import {
  getExperiment,
  getExperimentStatus,
  startExperiment,
  cancelExperiment,
} from '../api/client';
import type { Experiment, ExperimentStatus } from '../types';

export function ExperimentProgressPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [status, setStatus] = useState<ExperimentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    if (!experimentId) return;
    try {
      const [exp, stat] = await Promise.all([
        getExperiment(experimentId),
        getExperimentStatus(experimentId),
      ]);
      setExperiment(exp);
      setStatus(stat);
    } catch (error) {
      console.error('Failed to load experiment:', error);
    } finally {
      setLoading(false);
    }
  }, [experimentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for status updates while running
  useEffect(() => {
    if (status?.status !== 'running') return;

    const interval = setInterval(async () => {
      if (!experimentId) return;
      try {
        const stat = await getExperimentStatus(experimentId);
        setStatus(stat);
        if (stat.status === 'completed' || stat.status === 'failed') {
          // Redirect to results when done
          if (stat.status === 'completed') {
            navigate(`/experiments/${experimentId}/results`);
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [experimentId, status?.status, navigate]);

  async function handleStart() {
    if (!experimentId) return;
    setStarting(true);
    try {
      await startExperiment(experimentId);
      await loadData();
    } catch (error) {
      console.error('Failed to start experiment:', error);
      alert('Failed to start experiment');
    } finally {
      setStarting(false);
    }
  }

  async function handleCancelExperiment() {
    if (!experimentId) return;
    if (!window.confirm('Cancel this experiment? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await cancelExperiment(experimentId);
      navigate('/experiments');
    } catch (error) {
      alert('Failed to cancel experiment');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!experiment || !status) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-400">Experiment not found</p>
        <Button onClick={() => navigate('/experiments')} className="mt-4">
          Back to Experiments
        </Button>
      </div>
    );
  }

  const progressPercent = status.progress_percent;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{experiment.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant={
                status.status === 'completed'
                  ? 'success'
                  : status.status === 'running'
                  ? 'warning'
                  : status.status === 'failed'
                  ? 'danger'
                  : 'neutral'
              }
            >
              {status.status}
            </Badge>
            <span className="text-gray-400">
              {status.completed_trials} / {status.total_trials} trials
            </span>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/experiments')}>
          Back to Experiments
        </Button>
      </div>

      {status.status === 'pending' && (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-300 mb-4">
              This experiment is ready to run.
            </p>
            <Button onClick={handleStart} disabled={starting} size="lg">
              {starting ? 'Starting...' : 'Start Experiment'}
            </Button>
          </div>
        </Card>
      )}

      {status.status === 'running' && (
        <Card title="Progress">
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <span className="text-xs font-semibold inline-block text-blue-400">
                  {progressPercent.toFixed(1)}% Complete
                </span>
                <span className="text-xs font-semibold inline-block text-gray-400">
                  {status.completed_trials} / {status.total_trials}
                </span>
              </div>
              <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-700">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                />
              </div>
            </div>

            {/* Current trial */}
            {status.current_red_persona && status.current_blue_persona && (
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Red Team</p>
                  <p className="text-lg font-medium text-red-400">
                    {status.current_red_persona.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-2xl text-gray-500">vs</div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Blue Team</p>
                  <p className="text-lg font-medium text-blue-400">
                    {status.current_blue_persona.replace('_', ' ')}
                  </p>
                </div>
              </div>
            )}

            {/* Animated dots */}
            <div className="flex justify-center gap-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <Button
                variant="danger"
                onClick={handleCancelExperiment}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Experiment'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {status.status === 'completed' && (
        <Card>
          <div className="text-center py-8">
            <p className="text-green-400 text-xl mb-4">Experiment Complete!</p>
            <Button onClick={() => navigate(`/experiments/${experimentId}/results`)}>
              View Results
            </Button>
          </div>
        </Card>
      )}

      {status.status === 'failed' && (
        <Card>
          <div className="text-center py-8">
            <p className="text-red-400 text-xl mb-4">Experiment Failed</p>
            <p className="text-gray-400 mb-4">
              The experiment encountered an error after completing{' '}
              {status.completed_trials} trials.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate('/experiments')}>
                Back to Experiments
              </Button>
              {status.completed_trials > 0 && (
                <Button
                  onClick={() => navigate(`/experiments/${experimentId}/results`)}
                >
                  View Partial Results
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card title="Configuration">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Red Personas</p>
            <p className="text-gray-100">
              {experiment.config.red_personas?.join(', ') || 'All'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Blue Personas</p>
            <p className="text-gray-100">
              {experiment.config.blue_personas?.join(', ') || 'All'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Trials per Combination</p>
            <p className="text-gray-100">{experiment.config.trials_per_combination}</p>
          </div>
          <div>
            <p className="text-gray-400">Turns per Trial</p>
            <p className="text-gray-100">{experiment.config.turns_per_trial}</p>
          </div>
          <div>
            <p className="text-gray-400">Defender Model</p>
            <p className="text-gray-100">{experiment.config.defender_model}</p>
          </div>
          <div>
            <p className="text-gray-400">Attacker Model</p>
            <p className="text-gray-100">{experiment.config.attacker_model}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
