export default function SentinelLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 24, fontSize: '1.125rem' },
    md: { icon: 32, fontSize: '1.5rem' },
    lg: { icon: 48, fontSize: '2.25rem' },
  };

  const sizeConfig = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <img src="/logo.png" alt="SentinelOps Logo" width={sizeConfig.icon} height={sizeConfig.icon} style={{ borderRadius: '50%' }} />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            fontSize: sizeConfig.fontSize,
            background: 'linear-gradient(90deg, #29a399, #e59019)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            SENTINEL
          </span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem',
            letterSpacing: '0.3em',
            color: '#29a399',
            marginTop: '-0.25rem',
          }}>
            OPS
          </span>
        </div>
      )}
    </div>
  );
}
