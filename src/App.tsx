import { useEffect, useState } from 'react'
import './App.css'
import { PlayScreen } from './screens/Play/PlayScreen'
import { HomeScreen } from './screens/Home/HomeScreen'
import { ModeSelectScreen } from './screens/ModeSelect/ModeSelectScreen'
import { TutorialScreen } from './screens/Tutorial/TutorialScreen'
import { PvpLobbyScreen } from './screens/PvpLobby/PvpLobbyScreen'
import { nshogiEngineService } from './engine/NshogiEngineService'
import { DEFAULT_VARIANT_KEY, type VariantKey } from './domain/variants'
import { DEFAULT_CPU_LEVEL, type CpuLevel } from './domain/cpuLevels'
import type { PvpMatchSession } from './services/pvp/session'
import { clearPvpSession, loadPvpSession } from './services/pvp/storage'

type Screen = 'home' | 'mode-select' | 'play' | 'tutorial' | 'pvp-lobby'
type GameMode = 'quick' | 'pvp' | 'pvc'

const restoredPvpSession = loadPvpSession();

function App() {
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    restoredPvpSession
      ? restoredPvpSession.snapshot.status === 'playing'
        ? 'play'
        : 'pvp-lobby'
      : 'home',
  )
  const [gameMode, setGameMode] = useState<GameMode>(restoredPvpSession ? 'pvp' : 'pvc')
  const [variantKey, setVariantKey] = useState<VariantKey>(
    restoredPvpSession?.snapshot.variantId ?? DEFAULT_VARIANT_KEY,
  )
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>(DEFAULT_CPU_LEVEL)
  const [pvpSession, setPvpSession] = useState<PvpMatchSession | null>(restoredPvpSession)

  useEffect(() => {
    const initEngine = async () => {
      try {
        await nshogiEngineService.waitForReady()
        setIsEngineReady(true)
        console.log('[App] Engine ready')
      } catch (err) {
        console.error('[App] Engine initialization failed:', err)
      }
    }
    initEngine()
  }, [])

  const handleStartQuick = () => {
    console.log('[App] Quick Start initiated (PvC -> Matchmaking)');
    setGameMode('quick');
    setCurrentScreen('mode-select');
  }
  
  const handleStartPvp = () => {
    setGameMode('pvp');
    setCurrentScreen('mode-select');
  }
  
  const handleStartPvc = () => {
    setGameMode('pvc');
    setCurrentScreen('mode-select');
  }
  
  const handleStartTutorial = () => {
    setCurrentScreen('tutorial');
  }

  const handleBackToHome = () => {
    setGameMode('pvc');
    setVariantKey(DEFAULT_VARIANT_KEY);
    setCpuLevel(DEFAULT_CPU_LEVEL);
    setPvpSession(null);
    clearPvpSession();
    setCurrentScreen('home');
  }

  const handleExitPlay = () => {
    if (gameMode === 'pvp') {
      setPvpSession(null);
      clearPvpSession();
      setCurrentScreen('pvp-lobby');
      return;
    }

    handleBackToHome();
  }

  const handleSelectVariant = (nextVariantKey: VariantKey, nextCpuLevel: CpuLevel) => {
    setVariantKey(nextVariantKey);
    setCpuLevel(nextCpuLevel);
    setCurrentScreen(gameMode === 'pvp' ? 'pvp-lobby' : 'play');
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="logo-text" onClick={handleBackToHome} style={{ cursor: 'pointer' }}>
          <span>EX SHOGI</span>
        </h1>
        <div className="engine-status">
          {isEngineReady ? '● ENGINE ONLINE' : '○ ENGINE INITIALIZING...'}
        </div>
      </header>
      
      <main>
        {currentScreen === 'home' && (
          <HomeScreen 
            onStartQuick={handleStartQuick}
            onStartPvp={handleStartPvp}
            onStartPvc={handleStartPvc}
            onStartTutorial={handleStartTutorial}
          />
        )}
        {currentScreen === 'mode-select' && (
          <ModeSelectScreen
            gameMode={gameMode}
            onSelect={handleSelectVariant}
            onBack={handleBackToHome}
          />
        )}
        {currentScreen === 'play' && (
          <PlayScreen
            gameMode={gameMode}
            variantKey={variantKey}
            cpuLevel={cpuLevel}
            pvpSession={pvpSession}
            onExit={handleExitPlay}
          />
        )}
        {currentScreen === 'pvp-lobby' && (
          <PvpLobbyScreen
            variantKey={variantKey}
            initialSession={pvpSession}
            onBack={() => setCurrentScreen('mode-select')}
            onStartMatch={(session) => {
              setPvpSession(session);
              setCurrentScreen('play');
            }}
          />
        )}
        {currentScreen === 'tutorial' && (
          <TutorialScreen onBack={handleBackToHome} />
        )}
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 EX SHOGI. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  )
}

export default App
