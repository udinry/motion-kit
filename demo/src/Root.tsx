import React from 'react';
import {Composition} from 'remotion';
import {Showcase} from './Showcase';

export const Root: React.FC = () => (
  <Composition id="Showcase" component={Showcase} durationInFrames={720} fps={30} width={1080} height={1920} />
);
