import { useRef, useState } from 'react';
import { Calibration } from './Calibration';
import { startGazeTracking, clearGazeCalibration, type GazeClientHandle } from './webgazerClient';
import { emitGaze } from './gazeBus';
import { useLanguage } from '../i18n/LanguageContext';
import type { GazeStatus } from './gazeTypes';

export function GazeTracker({
  onHeatmapResetKeyChange,
  onActiveChange,
  onVisibleChange,
}: {
  onHeatmapResetKeyChange: (key: number) => void;
  onActiveChange: (active: boolean) => void;
  onVisibleChange: (visible: boolean) => void;
}) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<GazeStatus>('idle');
  // Separate from `status`: whether there's anything accumulated worth
  // showing/hiding/clearing. Stays true across stop() (and back into a
  // fresh tracking run) so the result can still be reviewed after the
  // client is done being watched - only "clear" resets it.
  const [hasData, setHasData] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  // The real getUserMedia permission denial and every other possible
  // failure (a missing asset, a WASM load error, a bug) were being
  // collapsed into the same "couldn't access the camera" message - which
  // hides the difference between "the client said no" and "something on
  // our end is actually broken". Keeping the raw error means the failure
  // is visible without needing devtools open.
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const handleRef = useRef<GazeClientHandle | null>(null);
  const resetKeyRef = useRef(0);

  // WebGazer trains its regression model from click events it listens for
  // on `document` itself, only WHILE it's already running - the 9-dot grid
  // below is just an ordinary set of buttons, its clicks only mean
  // anything to WebGazer if its listener is already attached when they
  // happen. So the camera has to be requested and running BEFORE the dots
  // are shown, not after: starting it only once all 9 dots were clicked
  // (the original order here) meant every one of those 45 clicks fired
  // before WebGazer was listening and got silently dropped - the dots
  // would have "completed" without training anything. Asking for camera
  // access first also means a client who's going to deny it finds out
  // immediately, instead of after doing all the clicking for nothing.
  const begin = async () => {
    setStatus('connecting');
    setErrorDetail(null);
    try {
      handleRef.current = await startGazeTracking((sample) => emitGaze(sample));
      setStatus('calibrating');
    } catch (err) {
      console.error('Gaze tracking failed to start', err);
      const name = err instanceof Error ? err.name : '';
      const message = err instanceof Error ? err.message : String(err);
      setErrorDetail(`${name || 'Error'}: ${message}`);
      setStatus('denied');
    }
  };

  const afterCalibration = () => {
    setStatus('tracking');
    setHasData(true);
    onActiveChange(true);
  };

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setStatus('idle');
    onActiveChange(false);
  };

  const toggleVisible = () => {
    const next = !heatmapVisible;
    setHeatmapVisible(next);
    onVisibleChange(next);
  };

  const resetHeatmap = () => {
    resetKeyRef.current += 1;
    onHeatmapResetKeyChange(resetKeyRef.current);
    setHasData(false);
    setHeatmapVisible(false);
    onVisibleChange(false);
  };

  const resetCalibration = async () => {
    await clearGazeCalibration();
  };

  return (
    <div className="control-group">
      <h3>{t('gaze.heading')}</h3>
      <p className="gaze-note">{t('gaze.note')}</p>
      {status === 'idle' && (
        <button className="gaze-button" onClick={begin}>
          {t('gaze.start')}
        </button>
      )}
      {status === 'connecting' && <p className="gaze-note">{t('gaze.connecting')}</p>}
      {status === 'calibrating' && <Calibration onDone={afterCalibration} />}
      {status === 'tracking' && (
        <button className="gaze-button" onClick={stop}>
          {t('gaze.stop')}
        </button>
      )}
      {hasData && (status === 'idle' || status === 'tracking') && (
        <>
          <button className="gaze-button secondary" onClick={toggleVisible}>
            {heatmapVisible ? t('gaze.hide') : t('gaze.show')}
          </button>
          <button className="gaze-button secondary" onClick={resetHeatmap}>
            {t('gaze.clear')}
          </button>
        </>
      )}
      {status === 'tracking' && (
        <button
          className="gaze-button secondary"
          onClick={async () => {
            await resetCalibration();
            setStatus('idle');
            handleRef.current?.stop();
            handleRef.current = null;
            onActiveChange(false);
          }}
        >
          {t('gaze.recalibrate')}
        </button>
      )}
      {status === 'denied' && (
        <>
          <p className="gaze-note">{t('gaze.denied')}</p>
          {errorDetail && <p className="gaze-note gaze-error-detail">{errorDetail}</p>}
          <button className="gaze-button secondary" onClick={begin}>
            {t('gaze.start')}
          </button>
        </>
      )}
    </div>
  );
}
