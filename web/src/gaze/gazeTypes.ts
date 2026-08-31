export interface GazeSample {
  /** viewport pixel coordinates, same space as MouseEvent.clientX/clientY */
  x: number;
  y: number;
  timestamp: number;
}

export type GazeStatus = 'idle' | 'connecting' | 'calibrating' | 'tracking' | 'unsupported' | 'denied';
