interface ScoreGaugeProps {
  score: number;
  label: string;
  color?: 'green' | 'blue' | 'yellow' | 'red';
}

const colors = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

export function ScoreGauge({ score, label, color = 'blue' }: ScoreGaugeProps) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={colors[color]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${colors[color]}`}>{percentage}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-400">{label}</span>
    </div>
  );
}
