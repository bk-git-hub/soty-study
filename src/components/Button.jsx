import { Link } from 'react-router-dom';
import RiveCanvas from './RiveCanvas';

/**
 * Site buttons: lime pill with Mona Sans 800 condensed text and a Rive arrow.
 * variant: 'primary' (lime fill) | 'tertiary' (outline, currentColor) | 'icon' (square, arrow only)
 * rotate: flips the arrow (used for "previous"/"back" and the OFF TRACK card on home).
 */
export default function Button({ to = '#', children, variant = 'primary', rotate = false, className = '', external = false }) {
  const base = 'btn inline-flex items-center justify-center gap-[calc(var(--gap)*.5)] select-none';
  const variants = {
    primary: 'bg-lime text-dark-green border border-lime h-12 px-4 rounded-[.54rem]',
    tertiary: 'bg-transparent text-current border border-current h-10 px-4 rounded-[.41rem]',
    icon: 'bg-lime text-dark-green border border-lime w-[3.75rem] h-[3.75rem] rounded-[.54rem] p-0',
  };
  const cls = `${base} ${variants[variant]} ${className}`;
  const inner = (
    <>
      {children && <span className="t-btn whitespace-nowrap">{children}</span>}
      <RiveCanvas
        file="btn-ui" artboard="arrow" stateMachine="arrow" hover
        className={variant === 'icon' ? 'w-[13px] h-[13px]' : 'w-[10px] h-[10px]'}
        style={rotate ? { transform: 'rotate(180deg)' } : undefined}
      />
    </>
  );
  if (external) return <a href={to} className={cls} target="_blank" rel="noreferrer">{inner}</a>;
  return <Link to={to} className={cls}>{inner}</Link>;
}
