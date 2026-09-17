// Single place to register GSAP plugins so every module shares one configured instance.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { Flip } from 'gsap/Flip';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Flip, Observer);

// The original site uses long "expo-out"-style eases for reveals (fast start, very slow settle).
// cubic-bezier(.19,1,.22,1) is what its CSS transitions use, so we mirror it for JS tweens too.
CustomEase.create('site', '0.19, 1, 0.22, 1');

gsap.defaults({ ease: 'site', duration: 1.2 });

export { gsap, ScrollTrigger, SplitText, CustomEase, Flip, Observer };
