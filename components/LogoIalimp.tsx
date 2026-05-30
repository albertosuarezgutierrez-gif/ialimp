// ─────────────────────────────────────────────────────────────────
// LogoIalimp — componente único de logo para toda la app
// Uso: <LogoIalimp size={20} />
// Renderiza: "ia" bold + "limp" regular, fuente Syne, color blanco
// ─────────────────────────────────────────────────────────────────
interface Props {
  size?:  number   // font-size en px (default 18)
  color?: string   // color base (default blanco)
  style?: React.CSSProperties
}

export default function LogoIalimp({ size = 18, color = '#ffffff', style }: Props) {
  return (
    <span style={{
      fontFamily: "'Syne', 'Plus Jakarta Sans', sans-serif",
      fontSize:   size,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      color,
      userSelect: 'none',
      ...style,
    }}>
      ia<span style={{ fontWeight: 400 }}>limp</span>
    </span>
  )
}
