// app/components/FeatureCard.tsx
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export default function FeatureCard({ 
  icon, 
  title, 
  description 
}: FeatureCardProps) {
  return (
    <div style={{
      border: '1px solid rgba(6, 182, 212, 0.3)',
      borderRadius: '8px',
      padding: '24px',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgb(6, 182, 212)';
      e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
      e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
      e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.5)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div>
        <div style={{
          fontSize: '32px',
          marginBottom: '16px',
          width: 'fit-content',
          padding: '8px',
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          borderRadius: '8px'
        }}>
          {icon}
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
          {title}
        </h3>
        <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.5' }}>
          {description}
        </p>
      </div>
    </div>
  );
}
