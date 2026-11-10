import React from 'react';
import {Composition} from 'remotion';
import {Showcase, SHOWCASE_FRAMES} from './Showcase';

export const Root: React.FC = () => (
  <Composition id="Showcase" component={Showcase} durationInFrames={SHOWCASE_FRAMES} fps={30} width={1080} height={1920} />
);
