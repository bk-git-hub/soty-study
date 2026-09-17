import { useEffect } from 'react';
import Button from '../components/Button';
import HelmetSpin from '../gl/HelmetSpin';
import Contours from '../sections/shared/Contours';

/** 404: dark green, huge lime "4  4" behind a spinning gold helmet, "PAGE NOT FOUND / Veered off track". */
export default function NotFound() {
  useEffect(() => { document.documentElement.dataset.navTheme = 'light'; }, []);
  return (
    <section className="relative bg-dark-green text-white w-full flex items-center justify-center overflow-clip" style={{ height: '100svh' }}>
      <Contours className="absolute inset-0 text-[#3f4633]" />
      <div className="absolute left-[var(--gap)] top-[var(--gap)] z-10">
        <Button to="/" rotate>Go to Home</Button>
      </div>
      <div className="relative w-[62.5rem] flex justify-between items-center text-lime" style={{ height: 'min(100svh, 1200px)' }}>
        <span className="t-number-gigantic" style={{ fontSize: '30rem' }}>4</span>
        <span className="t-number-gigantic" style={{ fontSize: '30rem' }}>4</span>
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="w-[80%] aspect-square"><HelmetSpin className="!w-full !h-full" /></div>
        </div>
      </div>
      <div className="absolute bottom-[var(--gap)] inset-x-0 z-40 text-center">
        <h2 className="t-title-reg">Page Not Found</h2>
        <div className="t-title-reg-serif text-lime-off">Veered off track</div>
      </div>
    </section>
  );
}
