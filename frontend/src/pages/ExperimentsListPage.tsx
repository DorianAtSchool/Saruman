import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '../components';
import { listExperiments, deleteExperiment, cancelExperiment } from '../api/client';
import type { Experiment } from '../types';

export function ExperimentsListPage() {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExperiments();
  }, []);

  async function loadExperiments() {
    setLoading(true);
    try {
      const data = await listExperiments();
      setExperiments(data);
    } catch (error) {
      console.error('Failed to load experiments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this experiment?')) return;
    try {
      await deleteExperiment(id);
      setExperiments(experiments.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete experiment:', error);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this experiment? This cannot be undone.')) return;
    try {
      await cancelExperiment(id);
      setExperiments(experiments.map((e) => e.id === id ? { ...e, status: 'cancelled' as Experiment['status'] } : e));
    } catch (error) {
      alert('Failed to cancel experiment');
    }
  }

  const statusVariant = (status: Experiment['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getProgressText = (exp: Experiment) => {
    if (exp.status === 'running') {
      const percent = ((exp.completed_trials / exp.total_trials) * 100).toFixed(0);
      return `${exp.completed_trials}/${exp.total_trials} (${percent}%)`;
    }
    if (exp.status === 'completed') {
      return `${exp.total_trials} trials`;
    }
    return `${exp.total_trials} trials planned`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Experiments</h1>
          <p className="text-gray-400 mt-1">
            Red Team vs Blue Team personality analysis
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Back to Home
          </Button>
          <Button onClick={() => navigate('/experiments/new')}>
            New Experiment
          </Button>
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-gray-400">Loading experiments...</p>
        ) : experiments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No experiments yet</p>
            <Button onClick={() => navigate('/experiments/new')}>
              Create Your First Experiment
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-medium text-gray-100">{exp.name}</h3>
                      <p className="text-sm text-gray-400">
                        {new Date(exp.created_at).toLocaleDateString()} -{' '}
                        {getProgressText(exp)}
                      </p>
                    </div>
                    <Badge variant={statusVariant(exp.status)}>{exp.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.status === 'running' && (
                      <span className="text-sm text-yellow-400">
                        {exp.current_red_persona} vs {exp.current_blue_persona}
                      </span>
                    )}
                    {exp.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/experiments/${exp.id}/progress`)}
                      >
                        Start
                      </Button>
                    )}
                    {exp.status === 'running' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/experiments/${exp.id}/progress`)}
                      >
                        View Progress
                      </Button>
                    )}
                    {exp.status === 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/experiments/${exp.id}/results`)}
                      >
                        View Results
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(exp.id)}
                      disabled={exp.status === 'running'}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCancel(exp.id)}
                      disabled={exp.status !== 'running' && exp.status !== 'pending'}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
                {/* Config summary */}
                <div className="mt-3 pt-3 border-t border-gray-600 text-sm text-gray-400 flex gap-6">
                  <span>
                    Red: {exp.config.red_personas?.length || 'All'} personas
                  </span>
                  <span>
                    Blue: {exp.config.blue_personas?.length || 'All'} templates
                  </span>
                  <span>
                    {exp.config.trials_per_combination} trials/combo
                  </span>
                  <span>
                    {exp.config.turns_per_trial} turns/trial
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
