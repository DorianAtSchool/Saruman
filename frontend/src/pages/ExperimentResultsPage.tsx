import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, SpiderChart } from '../components';
import type { SpiderDataPoint, PersonaRadar } from '../components';
import {
  getExperiment,
  getExperimentResults,
  getExperimentExportUrl,
} from '../api/client';
import type { Experiment, ExperimentResults } from '../types';
import { RED_PERSONA_COLORS, BLUE_PERSONA_COLORS } from '../types';

function formatPersonaName(id: string): string {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ExperimentResultsPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'red' | 'blue' | 'summary'>('summary');

  useEffect(() => {
    async function loadData() {
      if (!experimentId) return;
      setLoading(true);
      try {
        const [exp, res] = await Promise.all([
          getExperiment(experimentId),
          getExperimentResults(experimentId),
        ]);
        setExperiment(exp);
        setResults(res);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [experimentId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-gray-400">Loading results...</p>
      </div>
    );
  }

  if (!experiment || !results) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-red-400">Results not found</p>
        <Button onClick={() => navigate('/experiments')} className="mt-4">
          Back to Experiments
        </Button>
      </div>
    );
  }

  // Build spider chart data for red team
  const redPersonas = Object.keys(results.red_team_performance);
  const bluePersonas = Object.keys(results.blue_team_performance);

  // Summary rankings
  const redRankings = Object.entries(results.aggregated.red_overall)
    .map(([id, stats]) => ({
      id,
      name: formatPersonaName(id),
      successRate: stats.overall_success_rate || 0,
      leakRate: stats.avg_leak_rate || 0,
    }))
    .sort((a, b) => b.successRate - a.successRate);

  const blueRankings = Object.entries(results.aggregated.blue_overall)
    .map(([id, stats]) => ({
      id,
      name: formatPersonaName(id),
      defenseRate: stats.overall_defense_rate || 0,
      protectedRate: stats.avg_secrets_protected || 0,
    }))
    .sort((a, b) => b.defenseRate - a.defenseRate);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{experiment.name}</h1>
          <p className="text-gray-400 mt-1">Experiment Results</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = getExperimentExportUrl(experimentId!);
            }}
          >
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => navigate('/experiments')}>
            Back to Experiments
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['summary', 'red', 'blue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab === 'summary'
              ? 'Summary'
              : tab === 'red'
              ? 'Red Team Analysis'
              : 'Blue Team Analysis'}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-2 gap-6">
          <Card title="Red Team Rankings (Best Attackers)">
            <div className="space-y-3">
              {redRankings.map((persona, i) => (
                <div
                  key={persona.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                          ? 'text-gray-300'
                          : i === 2
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RED_PERSONA_COLORS[persona.id] }}
                    />
                    <span className="font-medium text-gray-100">{persona.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-medium">
                      {(persona.successRate * 100).toFixed(1)}% success
                    </p>
                    <p className="text-sm text-gray-400">
                      {(persona.leakRate * 100).toFixed(1)}% avg leak
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Blue Team Rankings (Best Defenders)">
            <div className="space-y-3">
              {blueRankings.map((persona, i) => (
                <div
                  key={persona.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold ${
                        i === 0
                          ? 'text-yellow-400'
                          : i === 1
                          ? 'text-gray-300'
                          : i === 2
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}
                    >
                      #{i + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: BLUE_PERSONA_COLORS[persona.id] }}
                    />
                    <span className="font-medium text-gray-100">{persona.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 font-medium">
                      {(persona.defenseRate * 100).toFixed(1)}% defense
                    </p>
                    <p className="text-sm text-gray-400">
                      {(persona.protectedRate * 100).toFixed(1)}% protected
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'red' && (
        <div className="space-y-4">
          <p className="text-gray-400">
            Attack success rate of each red team persona against blue team defenders.
            Higher values mean more successful attacks.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {redPersonas.map((red) => {
              // Build data for this single attacker vs all defenders
              const singleRedChartData: SpiderDataPoint[] = bluePersonas.map((blue) => {
                const stats = results.red_team_performance[red]?.[blue];
                return {
                  axis: formatPersonaName(blue),
                  [red]: stats ? stats.attack_success_rate * 100 : 0,
                };
              });

              const singleRedRadar: PersonaRadar[] = [{
                name: formatPersonaName(red),
                color: RED_PERSONA_COLORS[red] || '#FF6B6B',
                dataKey: red,
              }];

              const avgSuccessRate = results.aggregated.red_overall[red]?.overall_success_rate || 0;

              return (
                <Card key={red} title={formatPersonaName(red)}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: RED_PERSONA_COLORS[red] }}
                    />
                    <span className="text-sm text-red-400 font-medium">
                      {(avgSuccessRate * 100).toFixed(1)}% avg success
                    </span>
                  </div>
                  <SpiderChart
                    data={singleRedChartData}
                    personas={singleRedRadar}
                    valueLabel="Attack Success"
                  />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'blue' && (
        <div className="space-y-4">
          <p className="text-gray-400">
            Defense success rate of each blue team persona against red team attackers.
            Higher values mean better defense.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {bluePersonas.map((blue) => {
              // Build data for this single defender vs all attackers
              const singleBlueChartData: SpiderDataPoint[] = redPersonas.map((red) => {
                const stats = results.blue_team_performance[blue]?.[red];
                // Defense rate = 1 - attack success rate
                return {
                  axis: formatPersonaName(red),
                  [blue]: stats ? (1 - stats.attack_success_rate) * 100 : 100,
                };
              });

              const singleBlueRadar: PersonaRadar[] = [{
                name: formatPersonaName(blue),
                color: BLUE_PERSONA_COLORS[blue] || '#4FC3F7',
                dataKey: blue,
              }];

              const avgDefenseRate = results.aggregated.blue_overall[blue]?.overall_defense_rate || 0;

              return (
                <Card key={blue} title={formatPersonaName(blue)}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: BLUE_PERSONA_COLORS[blue] }}
                    />
                    <span className="text-sm text-blue-400 font-medium">
                      {(avgDefenseRate * 100).toFixed(1)}% avg defense
                    </span>
                  </div>
                  <SpiderChart
                    data={singleBlueChartData}
                    personas={singleBlueRadar}
                    valueLabel="Defense Success"
                  />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed matchup table */}
      <Card title="Matchup Details">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 text-gray-400">Red vs Blue</th>
                {bluePersonas.map((blue) => (
                  <th
                    key={blue}
                    className="text-center py-3 px-4 text-gray-400"
                    style={{ minWidth: '100px' }}
                  >
                    {formatPersonaName(blue)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {redPersonas.map((red) => (
                <tr key={red} className="border-b border-gray-700">
                  <td className="py-3 px-4 font-medium text-gray-100">
                    {formatPersonaName(red)}
                  </td>
                  {bluePersonas.map((blue) => {
                    const stats = results.red_team_performance[red]?.[blue];
                    if (!stats) {
                      return (
                        <td key={blue} className="text-center py-3 px-4 text-gray-500">
                          -
                        </td>
                      );
                    }
                    const successPct = (stats.attack_success_rate * 100).toFixed(0);
                    const bgColor =
                      stats.attack_success_rate > 0.5
                        ? 'bg-red-500/20'
                        : stats.attack_success_rate > 0.2
                        ? 'bg-yellow-500/20'
                        : 'bg-green-500/20';
                    return (
                      <td
                        key={blue}
                        className={`text-center py-3 px-4 ${bgColor}`}
                      >
                        <span className="font-medium">{successPct}%</span>
                        <br />
                        <span className="text-xs text-gray-400">
                          ({stats.trial_count} trials)
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
