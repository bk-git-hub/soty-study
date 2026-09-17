import Button from '../../components/Button';
import RiveCanvas from '../../components/RiveCanvas';

/** Centred call-to-action block: icon (Rive), short serif intro, lime button. */
export default function Callout({ text, cta, to, icon = 'helmet', className = '' }) {
  return (
    <section className={`container flex items-center justify-center pt-[12rem] pb-[8.75rem] ${className}`}>
      <div className="flex flex-col items-center gap-[calc(var(--gap)*2)]">
        <div className="w-[5.625rem] text-lime">
          {icon === 'helmet'
            ? <RiveCanvas file="reef" artboard="helmet-reef" stateMachine="helmet-reef_scroll" inputs={{ color_lime: true }} className="w-full h-[3rem]" />
            : <RiveCanvas file="reef" artboard="off-icons" stateMachine="off-icons" inputs={{ color_lime: true }} className="w-full h-[3rem]" />}
        </div>
        <div className="text-center max-w-[32.5rem]"><p className="t-cta-intro">{text}</p></div>
        <Button to={to}>{cta}</Button>
      </div>
    </section>
  );
}
