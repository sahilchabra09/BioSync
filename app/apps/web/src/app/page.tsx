// app/page.tsx
'use client';

import FeatureCard from '../components/pages/FeatureCard';
const features = [
  {
    id: 1,
    icon: '👁️',
    title: 'Eye Tracking',
    description: 'Real-time eye movement detection and analysis'
  },
  {
    id: 2,
    icon: '📊',
    title: 'Live Monitoring',
    description: 'Monitor attention patterns and focus metrics'
  },
  {
    id: 3,
    icon: '🎯',
    title: 'Precision Analysis',
    description: 'High-accuracy gaze point detection'
  },
  {
    id: 4,
    icon: '⚡',
    title: 'Fast Processing',
    description: 'Ultra-low latency tracking performance'
  },
  {
    id: 5,
    icon: '🧠',
    title: 'AI Insights',
    description: 'Machine learning powered behavior analysis'
  },
  {
    id: 6,
    icon: '📈',
    title: 'Analytics',
    description: 'Comprehensive data visualization and reports'
  }
];

export default function Home() {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000000', margin: 0, padding: 0, overflow: 'hidden' }}>
      {/* Top Half - 3 Boxes */}
      <div style={{ 
        height: '50%', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px', 
        padding: '16px',
        boxSizing: 'border-box'
      }}>
        {features.slice(0, 3).map((feature) => (
          <FeatureCard 
            key={feature.id} 
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>

      {/* Bottom Half - 3 Boxes */}
      <div style={{ 
        height: '50%', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px', 
        padding: '16px',
        boxSizing: 'border-box'
      }}>
        {features.slice(3, 6).map((feature) => (
          <FeatureCard 
            key={feature.id} 
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </div>
  );
}
