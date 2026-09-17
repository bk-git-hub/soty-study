import { useEffect } from 'react';
import { useRive, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { rive as riveUrl } from '../lib/assets';

/**
 * Thin wrapper over the Rive runtime.
 * The original site drives ~8 .riv files through data attributes (file / artboard / state machine /
 * boolean "color_*" inputs). We mirror that API as props so sections stay declarative.
 *
 * inputs: { color_lime: true, track: 'baku' } -> boolean/number inputs set once the SM is ready.
 * hover:  when true, toggles a boolean input named "hover" on pointer enter/leave (btn-ui arrows).
 * play:   false keeps the state machine paused until you flip it (used for scroll-triggered plays).
 */
export default function RiveCanvas({
  file, artboard, stateMachine, inputs = {}, fit = 'contain', hover = false, play = true, className = '', style,
}) {
  const { rive, RiveComponent } = useRive({
    src: riveUrl(file),
    artboard,
    stateMachines: stateMachine,
    autoplay: play,
    layout: new Layout({ fit: fit === 'cover' ? Fit.Cover : Fit.Contain, alignment: Alignment.Center }),
  });

  useEffect(() => {
    if (!rive || !stateMachine) return;
    const sm = rive.stateMachineInputs(stateMachine) || [];
    for (const input of sm) {
      if (input.name in inputs) {
        const v = inputs[input.name];
        if (typeof v === 'boolean') input.value = v;
        else if (typeof v === 'number') input.value = v;
        else if (v === 'fire') input.fire();
      }
    }
  }, [rive, stateMachine, JSON.stringify(inputs)]);

  useEffect(() => {
    if (!rive || !stateMachine) return;
    if (play) rive.play(stateMachine); else rive.pause(stateMachine);
  }, [rive, play, stateMachine]);

  const onEnter = () => hover && rive?.stateMachineInputs(stateMachine)?.find((i) => i.name === 'hover') && (rive.stateMachineInputs(stateMachine).find((i) => i.name === 'hover').value = true);
  const onLeave = () => hover && rive?.stateMachineInputs(stateMachine)?.find((i) => i.name === 'hover') && (rive.stateMachineInputs(stateMachine).find((i) => i.name === 'hover').value = false);

  return (
    <div className={className} style={style} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
