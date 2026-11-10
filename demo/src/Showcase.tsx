import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {
  AxisRescaleShock,
  BeforeAfterSlider,
  BurnAway,
  CardStack,
  CameraFlash,
  Confetti,
  CountUp,
  DigitRoll,
  DriftCamera,
  FlyingWords,
  GaugeNeedle,
  Grain,
  HitStop,
  IrisWipe,
  JCutAudio,
  LiveLineChart,
  MaskRise,
  MaskedWipe,
  MotionBlur,
  PageCam,
  PaperGround,
  Parallax,
  PaparazziFlash,
  PunchIn,
  SlashWipe,
  SpotlightSweep,
  TelestratorArrow,
  TelestratorCircle,
  TelestratorLayer,
  TelestratorUnderline,
  TextAsMask,
  Vignette,
  ease,
  expoOut,
  formatNumber,
} from '../../remotion';
import {BakedMarbles, MoneyBars3D, barTopY, barX, moneyCamera, projectPoint, type BakedRace} from '../../remotion/three';
import race from './marbles.json';

const INK = '#1d1a16';
const ACCENT = '#c8452d';
const SAGE = '#8da586';
const SAND = '#d8c9a8';
const FONT = 'Georgia, "Times New Roman", serif';
const THUMP_PEAK_FRAMES = 0.0479 * 30;

const D = {hook: 75, fly: 105, hero: 105, gauge: 90, shock: 105, live: 90, paparazzi: 90, slider: 90, stack: 105, page: 105, mask: 75, bars: 195, coins: 90, marbles: 150, outro: 75};
const order = Object.keys(D) as (keyof typeof D)[];
const T = {} as Record<keyof typeof D, number>;
let acc = 0;
order.forEach((k) => {
  T[k] = acc;
  acc += D[k];
});
export const SHOWCASE_FRAMES = acc;

const TitleBox: React.FC<{text: string; accent: number; size?: number; top?: number; exitAt?: number}> = ({text, accent, size = 124, top = 270, exitAt = 0}) => (
  <MaskRise text={text} accent={accent} start={0} exitAt={exitAt} fontSize={size} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{position: 'absolute', top, left: 0, right: 0, padding: '0 70px'}} />
);

const Hills: React.FC<{color: string; y: number; amp: number; phase: number}> = ({color, y, amp, phase}) => {
  let d = `M 0 1920 L 0 ${y}`;
  for (let x = 0; x <= 1200; x += 60) d += ` L ${x} ${y + Math.sin(x / 190 + phase) * amp}`;
  d += ' L 1200 1920 Z';
  return (
    <svg width={1200} height={1920} style={{position: 'absolute', left: -60}}>
      <path d={d} fill={color} />
    </svg>
  );
};

const Hook: React.FC = () => (
  <AbsoluteFill>
    <Parallax
      travelX={-90}
      layers={[
        {depth: 0.3, node: <Hills color="#e3d6b8" y={1250} amp={50} phase={0} />},
        {depth: 0.6, node: <Hills color="#d3c3a0" y={1420} amp={70} phase={2} />},
        {depth: 1, node: <Hills color="#bfae88" y={1640} amp={90} phase={4} />},
      ]}
    />
    <DriftCamera to={1.04}>
      <PunchIn at={20} to={1.12} origin="50% 44%" hold={22} release={14}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70}}>
          <MaskRise text="Rent is eating your salary" accent={2} start={-5} riseFrames={9} fontSize={142} fontFamily={FONT} accentColor={ACCENT} color={INK} />
        </AbsoluteFill>
      </PunchIn>
    </DriftCamera>
    <TelestratorLayer>
      <TelestratorUnderline x={150} y={1010} width={420} start={30} seed={5} color={ACCENT} />
    </TelestratorLayer>
  </AbsoluteFill>
);

const Fly: React.FC = () => (
  <DriftCamera to={1.04}>
    <FlyingWords words={['Mumbai', 'rent', 'is', 'insane']} accent={3} start={0} gap={20} fontSize={230} accentColor={ACCENT} color={INK} />
  </DriftCamera>
);

const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <DriftCamera to={1.04}>
      <TitleBox text="Rent per year" accent={2} size={120} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10}}>
        <DigitRoll value="1,24,500" start={3} frames={18} stagger={1.5} fontSize={224} color={INK} />
        <div style={{fontFamily: FONT, fontSize: 96, color: ACCENT, opacity: ease(frame, 30, 8), transform: `translateY(${(1 - ease(frame, 30, 8)) * 16}px)`}}>rupees a year</div>
      </AbsoluteFill>
      <TelestratorLayer>
        <TelestratorCircle cx={500} cy={1010} rx={480} ry={170} start={38} seed={3} color={ACCENT} />
        <TelestratorArrow x1={860} y1={1440} x2={700} y2={1210} start={52} color={ACCENT} />
      </TelestratorLayer>
      <div style={{position: 'absolute', left: 150, top: 1420, width: 600, fontFamily: FONT, fontSize: 76, color: INK, opacity: ease(frame, 64, 8)}}>more than a car</div>
    </DriftCamera>
  );
};

const Gauge: React.FC = () => (
  <DriftCamera to={1.035}>
    <TitleBox text="Rent eats most of it" accent={1} />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 160}}>
      <GaugeNeedle value={62} max={100} start={4} frames={34} size={1040} label="of take-home" unit="%" ink={INK} accent={ACCENT} />
    </AbsoluteFill>
  </DriftCamera>
);

const BARS = [
  {label: 'Food', value: 12000},
  {label: 'Travel', value: 8000},
  {label: 'Phone', value: 1500},
  {label: 'Rent', value: 124500},
];

const Shock: React.FC = () => (
  <HitStop impacts={[40]}>
    <DriftCamera to={1.03}>
      <TitleBox text="Then the scale breaks" accent={3} />
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 340}}>
        <AxisRescaleShock bars={BARS} shockIndex={3} shockAt={32} width={1000} height={1000} accent={ACCENT} ink={INK} barColor="#9a917c" fontFamily={FONT} rescaleFrames={14} />
      </AbsoluteFill>
    </DriftCamera>
  </HitStop>
);

const RENT = [38, 41, 40, 46, 52, 51, 60, 68, 74, 83, 96, 124];

const Live: React.FC = () => (
  <DriftCamera to={1.035}>
    <TitleBox text="Ten years of rent" accent={2} />
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{marginTop: 120}}>
        <LiveLineChart points={RENT} start={4} frames={70} width={940} height={640} color={ACCENT} ink={INK} format={(n) => formatNumber(n) + 'k'} />
      </div>
    </AbsoluteFill>
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 410}}>
      <CountUp to={226} start={4} frames={24} unit="percent" fontSize={220} color={INK} unitColor={ACCENT} fontFamily={FONT} />
    </AbsoluteFill>
  </DriftCamera>
);

const Poster: React.FC<{k: number}> = ({k}) => {
  const origin = k === 2 ? '50% 46%' : '50% 50%';
  const s = k === 0 ? 0.62 : k === 1 ? 1 : 1.9;
  return (
    <AbsoluteFill style={{background: SAND, justifyContent: 'center', alignItems: 'center'}}>
      <div style={{transform: `scale(${s})`, transformOrigin: origin, fontFamily: FONT, color: INK, textAlign: 'center', padding: 60}}>
        <div style={{fontSize: 110, opacity: 0.85}}>Mumbai</div>
        <div style={{fontSize: 210, fontWeight: 800, color: ACCENT, lineHeight: 1}}>1,24,500</div>
        <div style={{fontSize: 110}}>a year</div>
      </div>
    </AbsoluteFill>
  );
};

const Paparazzi: React.FC = () => <PaparazziFlash flashes={[26, 44, 62]} pops={6} shot={(k) => <Poster k={k} />} />;

const Card: React.FC<{bg: string; fg: string; big: string; small: string}> = ({bg, fg, big, small}) => (
  <AbsoluteFill style={{background: bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT, color: fg}}>
    <div style={{fontSize: 90, opacity: 0.8}}>{small}</div>
    <div style={{fontSize: 160, fontWeight: 800, marginTop: 10}}>{big}</div>
  </AbsoluteFill>
);

const Slider: React.FC = () => (
  <AbsoluteFill>
    <TitleBox text="Then and now" accent={2} size={124} />
    <MotionBlur samples={6} shutterAngle={220}>
      <PunchIn at={30} to={1.1} hold={16} release={12} origin="50% 56%">
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', paddingTop: 260}}>
          <div style={{boxShadow: '0 30px 50px rgba(60,40,20,0.28)'}}>
            <BeforeAfterSlider
              width={900}
              height={980}
              start={6}
              frames={60}
              positions={[0.92, 0.12]}
              before={<Card bg={SAND} fg={INK} big="62,000" small="Rs, 2019" />}
              after={<Card bg={INK} fg="#efe6d2" big="1,24,500" small="Rs, 2026" />}
            />
          </div>
        </AbsoluteFill>
      </PunchIn>
    </MotionBlur>
    <SpotlightSweep start={16} frames={34} />
    <CameraFlash at={0} />
  </AbsoluteFill>
);

const FACTS: [string, string][] = [
  ['62%', 'of salary'],
  ['3x', 'in 10 years'],
  ['Rs 0', 'left to save'],
];

const Stack: React.FC = () => (
  <AbsoluteFill>
    <TitleBox text="Three facts" accent={1} />
    <CardStack
      start={4}
      gap={22}
      width={900}
      height={760}
      step={110}
      cards={FACTS.map(([big, small], i) => (
        <AbsoluteFill key={i} style={{justifyContent: 'center', alignItems: 'center', fontFamily: FONT, color: INK, background: i === 2 ? INK : '#f6efdf'}}>
          <div style={{fontSize: 230, fontWeight: 800, color: i === 2 ? '#efe6d2' : ACCENT, lineHeight: 1}}>{big}</div>
          <div style={{fontSize: 100, color: i === 2 ? '#efe6d2' : INK}}>{small}</div>
        </AbsoluteFill>
      ))}
    />
  </AbsoluteFill>
);

const PageContent: React.FC = () => (
  <div style={{position: 'relative', width: 1080, height: 2600, background: '#f6efdf', fontFamily: FONT, color: INK}}>
    <div style={{position: 'absolute', left: 80, top: 120, fontSize: 130, fontWeight: 800}}>Rent report</div>
    <div style={{position: 'absolute', left: 80, top: 300, fontSize: 240, fontWeight: 800, color: ACCENT, lineHeight: 1}}>62%</div>
    <div style={{position: 'absolute', left: 80, top: 560, fontSize: 90}}>of take-home pay</div>
    {[0, 1, 2, 3, 4].map((i) => (
      <div key={i} style={{position: 'absolute', left: 80 + i * 190, bottom: 1500 - 0, top: 900 + (4 - i) * 120, width: 150, height: 520 - (4 - i) * 120, background: i === 4 ? ACCENT : '#9a917c'}} />
    ))}
    <div style={{position: 'absolute', left: 80, top: 1540, fontSize: 120, fontWeight: 800}}>2026 is worse</div>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{position: 'absolute', left: 80, top: 1760 + i * 90, width: 920 - i * 140, height: 28, background: '#d8c9a8'}} />
    ))}
    <div style={{position: 'absolute', left: 80, top: 2200, fontSize: 150, fontWeight: 800}}>Plan it</div>
  </div>
);

const Page: React.FC = () => (
  <PageCam
    pageHeight={2600}
    keys={[
      {frame: 0, cx: 540, cy: 520, zoom: 1.1, rotX: 22, rotZ: 0},
      {frame: 50, cx: 480, cy: 1250, zoom: 1.5, rotX: 12, rotZ: -3},
      {frame: 105, cx: 540, cy: 2000, zoom: 1.15, rotX: 4, rotZ: 0},
    ]}
    dof={{focusY: 520, strength: 6}}
  >
    <PageContent />
  </PageCam>
);

const MaskScene: React.FC = () => (
  <DriftCamera to={1.04}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <TextAsMask text="RENT" fill={`repeating-linear-gradient(135deg, ${ACCENT} 0 70px, ${INK} 70px 140px)`} fontSize={300} start={2} outline={INK} />
      <MaskRise text="was the biggest bar" accent={3} start={14} fontSize={84} fontFamily={FONT} accentColor={ACCENT} color={INK} />
    </AbsoluteFill>
  </DriftCamera>
);

const AX = 150000;
const FMT = (n: number): string => formatNumber(n);
const KFMT = (n: number): string => `${formatNumber(n / 1000, n % 1000 === 0 ? 0 : 1)}k`;
const barsFor = (accent: string, rest: string) => BARS.map((b, i) => ({label: b.label, value: b.value, color: i === 3 ? accent : rest}));

const Bars3D: React.FC = () => {
  const frame = useCurrentFrame();
  const push = {start: 0, frames: 150, from: 27, to: 18.5, orbit: 0.55, elevation: 22};
  const cam = moneyCamera(frame, push);
  const top = projectPoint([barX(3, 4), barTopY(124500, AX) + 0.3, 0], cam, 1080, 1920);
  return (
    <AbsoluteFill>
      <MoneyBars3D bars={barsFor('#b8553a', SAGE)} axisMax={AX} kind="notes" start={4} riseFrames={26} stagger={4} push={push} formatValue={FMT} formatTick={KFMT} ink={INK} fontFamily={FONT} />
      <TitleBox text="Rent beat everything" accent={1} exitAt={52} />
      <Confetti colors={[ACCENT, '#2f2a24']} start={150} seed={11} mode="burst" origin={{x: top.x, y: top.y}} aim={-90} spread={55} count={44} duration={44} size={1.25} />
    </AbsoluteFill>
  );
};

const Coins3D: React.FC = () => (
  <AbsoluteFill>
    <MoneyBars3D
      bars={[
        {label: 'Food', value: 12000, color: '#d1a94a'},
        {label: 'Travel', value: 8000, color: '#d1a94a'},
        {label: 'Phone', value: 1500, color: '#d1a94a'},
        {label: 'Rent', value: 124500, color: '#b8553a'},
      ]}
      axisMax={AX}
      kind="coins"
      maxNotes={40}
      start={0}
      riseFrames={22}
      stagger={3}
      push={{start: 0, frames: 90, from: 25, to: 20.5, orbit: -0.3, elevation: 24}}
      formatValue={FMT}
      formatTick={KFMT}
      ink={INK}
      fontFamily={FONT}
    />
    <TitleBox text="Same data in coins" accent={3} size={120} exitAt={40} />
  </AbsoluteFill>
);

const Marbles: React.FC = () => (
  <AbsoluteFill>
    <BakedMarbles race={race as unknown as BakedRace} offset={96} rate={1} />
    <TitleBox text="Called it" accent={1} size={150} />
  </AbsoluteFill>
);

const Outro: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
    <MaskRise text="Plan it first" accent={2} start={4} exitAt={44} fontSize={150} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{padding: '0 70px'}} />
  </AbsoluteFill>
);

const S: React.FC<{k: keyof typeof D; extra?: number; children: React.ReactNode}> = ({k, extra = 0, children}) => (
  <Sequence from={T[k]} durationInFrames={D[k] + extra}>
    {children}
  </Sequence>
);

const sfx = (event: number): number => Math.round(event - THUMP_PEAK_FRAMES);

export const Showcase: React.FC = () => (
  <AbsoluteFill>
    <PaperGround />
    <S k="hook" extra={D.fly}>
      <MaskedWipe from={<Hook />} to={<Sequence from={D.hook}><Fly /></Sequence>} start={D.hook - 12} frames={14} direction="left" edgeColor={ACCENT} />
    </S>
    <S k="hero" extra={D.gauge}>
      <IrisWipe from={<Hero />} to={<Sequence from={D.hero}><Gauge /></Sequence>} start={D.hero - 6} frames={18} cx={540} cy={1000} ringColor={ACCENT} />
    </S>
    <S k="shock" extra={D.live}>
      <SlashWipe from={<Shock />} to={<Sequence from={D.shock}><Live /></Sequence>} start={D.shock - 8} frames={20} />
    </S>
    <S k="paparazzi">
      <Paparazzi />
    </S>
    <S k="slider">
      <Slider />
    </S>
    <S k="stack">
      <Stack />
    </S>
    <S k="page" extra={D.mask}>
      <BurnAway from={<Page />} to={<Sequence from={D.page}><MaskScene /></Sequence>} start={D.page - 28} frames={54} />
    </S>
    <S k="bars">
      <Bars3D />
    </S>
    <S k="coins">
      <Coins3D />
    </S>
    <S k="marbles">
      <Marbles />
    </S>
    <S k="outro">
      <Outro />
    </S>

    <Vignette strength={0.2} />
    <Grain opacity={0.05} />

    {[T.shock + 40, T.bars + 150, T.marbles + (race.finish.winnerFrame - 96)].map((ev, i) => (
      <Sequence key={i} from={sfx(ev)}>
        <Audio src={staticFile('thump.wav')} volume={0.8} />
      </Sequence>
    ))}
    {[26, 44, 62].map((f) => (
      <Sequence key={f} from={sfx(T.paparazzi + f)}>
        <Audio src={staticFile('thump.wav')} volume={0.35} />
      </Sequence>
    ))}
    {[T.fly, T.gauge, T.paparazzi, T.stack, T.bars, T.coins].map((s) => (
      <JCutAudio key={s} src={staticFile('whoosh.wav')} sceneStart={s} lead={6} volume={0.3} />
    ))}
  </AbsoluteFill>
);
