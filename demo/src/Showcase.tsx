import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {
  AxisRescaleShock,
  BeforeAfterSlider,
  CameraFlash,
  Confetti,
  CountUp,
  DigitRoll,
  DriftCamera,
  Grain,
  HitStop,
  JCutAudio,
  LiveLineChart,
  MaskRise,
  MaskedWipe,
  MotionBlur,
  PaperGround,
  Parallax,
  PunchIn,
  SpotlightSweep,
  TelestratorArrow,
  TelestratorCircle,
  TelestratorLayer,
  TelestratorUnderline,
  Vignette,
  ease,
  expoOut,
  formatNumber,
} from '../../remotion';
import {MoneyBars3D, barTopY, cameraAt, projectPoint, barX} from '../../remotion/three';

const INK = '#1d1a16';
const ACCENT = '#c8452d';
const SAGE = '#8da586';
const SAND = '#d8c9a8';
const FONT = 'Georgia, "Times New Roman", serif';

const T = {A: 0, B: 105, C: 210, D: 315, E: 420, F: 510, G: 660};
const THUMP_PEAK_FRAMES = 0.0479 * 30;

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
      <PunchIn at={22} to={1.12} origin="62% 40%" hold={26} release={14}>
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70}}>
          <MaskRise text="Rent is eating your salary" accent={2} start={0} fontSize={132} fontFamily={FONT} accentColor={ACCENT} color={INK} />
        </AbsoluteFill>
      </PunchIn>
    </DriftCamera>
    <TelestratorLayer>
      <TelestratorUnderline x={330} y={1000} width={470} start={34} seed={5} color={ACCENT} />
    </TelestratorLayer>
  </AbsoluteFill>
);

const Reveal: React.FC = () => (
  <DriftCamera to={1.04}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontFamily: FONT, fontSize: 52, color: INK, opacity: 0.75 * ease(useCurrentFrame(), 0, 10), marginBottom: 20}}>Rent, per year</div>
      <DigitRoll value="1,24,500" unit="Rs" start={4} frames={24} fontSize={190} color={INK} unitColor={ACCENT} />
    </AbsoluteFill>
    <TelestratorLayer>
      <TelestratorCircle cx={470} cy={955} rx={400} ry={140} start={44} seed={3} color={ACCENT} />
      <TelestratorArrow x1={860} y1={1420} x2={700} y2={1130} start={58} color={ACCENT} />
    </TelestratorLayer>
    <div style={{position: 'absolute', left: 560, top: 1440, width: 420, fontFamily: FONT, fontSize: 46, color: INK, opacity: ease(useCurrentFrame(), 70, 8)}}>
      more than the car
    </div>
  </DriftCamera>
);

const BARS = [
  {label: 'Food', value: 12000},
  {label: 'Travel', value: 8000},
  {label: 'Phone', value: 1500},
  {label: 'Rent', value: 124500},
];

const Shock: React.FC = () => (
  <HitStop impacts={[36]}>
    <DriftCamera to={1.03}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <MaskRise text="Then the scale breaks" accent={3} start={0} fontSize={84} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{position: 'absolute', top: 230, width: '100%', padding: '0 80px'}} />
        <AxisRescaleShock bars={BARS} shockIndex={3} shockAt={30} width={920} height={900} accent={ACCENT} ink={INK} barColor="#9a917c" fontFamily={FONT} />
      </AbsoluteFill>
    </DriftCamera>
  </HitStop>
);

const RENT = [38, 41, 40, 46, 52, 51, 60, 68, 74, 83, 96, 124];

const Live: React.FC = () => (
  <DriftCamera to={1.035}>
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <MaskRise text="Ten years of rent" accent={2} start={0} fontSize={84} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{position: 'absolute', top: 300, width: '100%', padding: '0 80px'}} />
      <LiveLineChart points={RENT} start={6} frames={78} width={880} height={620} color={ACCENT} ink={INK} format={(n) => formatNumber(n) + 'k'} />
      <div style={{position: 'absolute', bottom: 330}}>
        <CountUp to={226} start={6} frames={78} unit="percent" fontSize={110} color={INK} unitColor={ACCENT} fontFamily={FONT} />
      </div>
    </AbsoluteFill>
  </DriftCamera>
);

const Card: React.FC<{bg: string; fg: string; big: string; small: string}> = ({bg, fg, big, small}) => (
  <AbsoluteFill style={{background: bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT, color: fg}}>
    <div style={{fontSize: 56, opacity: 0.8}}>{small}</div>
    <div style={{fontSize: 140, fontWeight: 800, marginTop: 10}}>{big}</div>
  </AbsoluteFill>
);

const Compare: React.FC = () => (
  <AbsoluteFill>
    <MotionBlur samples={6} shutterAngle={220}>
      <PunchIn at={26} to={1.12} hold={20} release={12} origin="50% 55%">
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{boxShadow: '0 30px 50px rgba(60,40,20,0.28)'}}>
            <BeforeAfterSlider
              width={880}
              height={1000}
              start={6}
              frames={60}
              positions={[0.92, 0.12]}
              before={<Card bg={SAND} fg={INK} big="Rs 62,000" small="2019" />}
              after={<Card bg={INK} fg="#efe6d2" big="Rs 1,24,500" small="2026" />}
            />
          </div>
        </AbsoluteFill>
      </PunchIn>
    </MotionBlur>
    <SpotlightSweep start={14} frames={34} />
    <CameraFlash at={0} />
  </AbsoluteFill>
);

const Peak: React.FC = () => {
  const frame = useCurrentFrame();
  const W = 1080;
  const H = 1920;
  const cam = cameraAt(0.35, Math.min(1, frame / 240));
  const AX = 150000;
  return (
    <AbsoluteFill>
      <MoneyBars3D
        bars={BARS.map((b, i) => ({label: b.label, value: b.value, color: i === 3 ? '#b8553a' : SAGE}))}
        axisMax={AX}
        width={W}
        height={H}
        kind="notes"
        start={4}
        riseFrames={26}
        stagger={4}
        tiltShift
        orbit={0.35}
        orbitFrames={240}
      />
      {BARS.map((b, i) => {
        const top = projectPoint([barX(i, BARS.length), barTopY(b.value, AX) + 0.35, 0], cam, W, H);
        const base = projectPoint([barX(i, BARS.length), 0, 0.9], cam, W, H);
        const a = ease(frame, 4 + i * 4 + 14, 8, expoOut);
        return (
          <React.Fragment key={b.label}>
            <div style={{position: 'absolute', left: top.x - 150, width: 300, top: top.y - 60, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 40, color: INK, opacity: a, transform: `translateY(${(1 - a) * 14}px)`}}>
              {formatNumber(b.value)}
            </div>
            <div style={{position: 'absolute', left: base.x - 100, width: 200, top: base.y + 14, textAlign: 'center', fontFamily: FONT, fontSize: 34, color: INK, opacity: a}}>{b.label}</div>
          </React.Fragment>
        );
      })}
      <MaskRise text="Rent beat everything" accent={1} start={30} fontSize={92} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{position: 'absolute', top: 160, width: '100%', padding: '0 80px'}} />
      <Confetti colors={[ACCENT, '#dd8a6e', '#f0c7b4']} start={110} seed={11} mode="cannon" duration={36} count={70} />
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
    <MaskRise text="Plan it first" accent={2} start={4} exitAt={44} fontSize={140} fontFamily={FONT} accentColor={ACCENT} color={INK} style={{padding: '0 70px'}} />
  </AbsoluteFill>
);

const S: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => (
  <Sequence from={from} durationInFrames={to - from}>
    {children}
  </Sequence>
);

const sfx = (event: number): number => Math.round(event - THUMP_PEAK_FRAMES);

export const Showcase: React.FC = () => {
  return (
    <AbsoluteFill>
      <PaperGround />
      <S from={T.A} to={T.B}>
        <Hook />
      </S>
      <S from={T.B} to={T.C}>
        <Reveal />
      </S>
      <S from={T.C} to={T.E}>
        <MaskedWipe from={<Shock />} to={<Sequence from={T.D - T.C}><Live /></Sequence>} start={T.D - T.C - 12} frames={14} direction="left" edgeColor={ACCENT} />
      </S>
      <S from={T.E} to={T.F}>
        <Compare />
      </S>
      <S from={T.F} to={T.G}>
        <Peak />
      </S>
      <S from={T.G} to={720}>
        <Outro />
      </S>

      <Vignette strength={0.2} />
      <Grain opacity={0.05} />

      <Sequence from={sfx(T.C + 36)}>
        <Audio src={staticFile('thump.wav')} volume={0.9} />
      </Sequence>
      <Sequence from={sfx(T.E + 26)}>
        <Audio src={staticFile('thump.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={sfx(T.F + 110)}>
        <Audio src={staticFile('thump.wav')} volume={0.6} />
      </Sequence>
      {[T.B, T.D, T.E, T.F, T.G].map((s) => (
        <JCutAudio key={s} src={staticFile('whoosh.wav')} sceneStart={s} lead={6} volume={0.35} />
      ))}
    </AbsoluteFill>
  );
};
