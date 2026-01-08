import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

// 1. 音源のパス指定（public/sounds/ フォルダ内のファイル名と一致させてください）
const DRUM_SAMPLES = {
  kick: '/sounds/drum1_kick.mp3',
  snare: '/sounds/drum1_snare.mp3',
  tom: '/sounds/drum1_tom2.mp3',
  cymbal1: '/sounds/drum1_cymbal.mp3',
  cymbal2: '/sounds/drum2_cymbal.mp3',
};

// 楽器ごとのテーマカラー
const COLORS = {
  kick: '#FF5252',
  snare: '#448AFF',
  tom: '#FFEB3B',
  cymbal1: '#E040FB',
  cymbal2: '#00E676',
};

// --- 個別のマス目コンポーネント (最適化のため分離) ---
const Cell = memo(({ active, isCurrent, color, onClick, width }) => (
  <div
    onClick={onClick}
    style={{
      width: width,
      height: '50px',
      borderRadius: '6px',
      cursor: 'pointer',
      backgroundColor: active ? color : '#2A2A2A',
      border: isCurrent ? '2px solid #FFF' : '1px solid #444',
      boxShadow: isCurrent ? '0 0 10px #FFF' : 'none',
      opacity: isCurrent || active ? 1 : 0.3,
      transition: 'none', // がくつき防止のためアニメーションをオフ
      zIndex: isCurrent ? 10 : 1,
    }}
  />
));

const App = () => {
  const [steps, setSteps] = useState(8);
  const [grid, setGrid] = useState(Object.keys(DRUM_SAMPLES).map(() => Array(16).fill(false)));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(120);

  const canvasRef = useRef(null);
  const ripples = useRef([]);

  // --- リセット処理 ---
  const resetAll = () => {
    if (window.confirm("すべてのリズムをリセットしますか？")) {
      setGrid(Object.keys(DRUM_SAMPLES).map(() => Array(16).fill(false)));
    }
  };

  const resetRow = (index) => {
    setGrid((prev) => {
      const newGrid = [...prev];
      newGrid[index] = Array(16).fill(false);
      return newGrid;
    });
  };

  // --- Canvas 描画ロジック ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;
    const render = () => {
      ctx.fillStyle = 'rgba(18, 18, 18, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ripples.current.forEach((ripple, index) => {
        ripple.radius += 5;
        ripple.opacity -= 0.02;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ripple.color}, ${ripple.opacity})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        if (ripple.opacity <= 0) ripples.current.splice(index, 1);
      });
      animationId = requestAnimationFrame(render);
    };
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    render();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const playSound = useCallback((type) => {
    const audio = new Audio(DRUM_SAMPLES[type]);
    audio.currentTime = 0;
    audio.play().catch(() => {});
    const hex = COLORS[type].replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    ripples.current.push({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, radius: 0, opacity: 1, color: `${r}, ${g}, ${b}` });
  }, []);

  // --- タイマー処理 ---
  useEffect(() => {
    if (!isPlaying) {
      setCurrentStep(-1);
      return;
    }
    const timer = setInterval(() => {
      setCurrentStep((step) => (step + 1) % steps);
    }, (60 / bpm / 2) * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, bpm, steps]);

  useEffect(() => {
    if (isPlaying && currentStep !== -1) {
      Object.keys(DRUM_SAMPLES).forEach((key, index) => {
        if (grid[index][currentStep]) playSound(key);
      });
    }
  }, [currentStep, isPlaying, grid, playSound]);

  const toggleStep = useCallback((row, col) => {
    setGrid((prev) => {
      const newGrid = [...prev];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = !newGrid[row][col];
      return newGrid;
    });
  }, []);

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.uiOverlay}>
        <h1 style={styles.title}>Visual Beat Maker 🥁</h1>
        
        <div style={styles.padContainer}>
          {Object.keys(DRUM_SAMPLES).map((name) => (
            <button key={name} style={{...styles.pad, borderTop: `5px solid ${COLORS[name]}`}} onClick={() => playSound(name)}>
              {name.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={styles.controls}>
          <div style={styles.btnGroup}>
            {[4, 8, 16].map((num) => (
              <button key={num} onClick={() => { setSteps(num); setIsPlaying(false); }} style={{...styles.stepBtn, backgroundColor: steps === num ? '#2196F3' : '#333'}}>
                {num} Steps
              </button>
            ))}
            <button onClick={resetAll} style={{...styles.stepBtn, backgroundColor: '#555', marginLeft: '10px'}}>CLEAR ALL</button>
          </div>
          <div style={styles.playRow}>
            <button style={{...styles.startBtn, backgroundColor: isPlaying ? '#F44336' : '#2196F3'}} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? 'STOP' : 'START'}
            </button>
            <div style={styles.bpmContainer}>
              <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
              <span>BPM: {bpm}</span>
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          {grid.map((row, i) => (
            <div key={i} style={styles.flexRow}>
              <button onClick={() => resetRow(i)} style={styles.rowResetBtn} title="Reset Row">×</button>
              <div style={{...styles.rowLabel, color: COLORS[Object.keys(DRUM_SAMPLES)[i]]}}>
                {Object.keys(DRUM_SAMPLES)[i]}
              </div>
              {row.slice(0, steps).map((active, j) => (
                <Cell 
                  key={j} 
                  active={active} 
                  isCurrent={j === currentStep} 
                  color={COLORS[Object.keys(DRUM_SAMPLES)[i]]} 
                  width={steps === 16 ? '30px' : '50px'} 
                  onClick={() => toggleStep(i, j)} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { position: 'relative', backgroundColor: '#121212', minHeight: '100vh', overflow: 'hidden', color: 'white', fontFamily: '"Segoe UI", sans-serif' },
  canvas: { position: 'absolute', top: 0, left: 0, zIndex: 1 },
  uiOverlay: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px', paddingBottom: '30px' },
  title: { fontSize: '2.5rem', marginBottom: '30px' },
  padContainer: { display: 'flex', gap: '15px', marginBottom: '40px' },
  pad: { width: '100px', height: '100px', borderRadius: '15px', cursor: 'pointer', backgroundColor: '#1A1A1A', color: 'white', fontWeight: 'bold', border: 'none', fontSize: '12px' },
  controls: { marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  btnGroup: { display: 'flex', gap: '5px', alignItems: 'center' },
  stepBtn: { padding: '8px 16px', borderRadius: '20px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  playRow: { display: 'flex', alignItems: 'center', gap: '30px' },
  startBtn: { padding: '15px 45px', borderRadius: '40px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' },
  bpmContainer: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' },
  grid: { display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '20px', borderRadius: '15px' },
  flexRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  rowLabel: { width: '80px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', marginRight: '10px' },
  rowResetBtn: { backgroundColor: 'transparent', border: 'none', color: '#777', cursor: 'pointer', fontSize: '20px', padding: '0 10px' },
};

export default App;