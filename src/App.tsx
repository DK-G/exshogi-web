import { useEffect, useState } from 'react'
import './App.css'
import { PlayScreen } from './screens/Play/PlayScreen'
import { HomeScreen } from './screens/Home/HomeScreen'
import { TutorialScreen } from './screens/Tutorial/TutorialScreen'
import { nshogiEngineService } from './engine/NshogiEngineService'

type Screen = 'home' | 'play' | 'tutorial'
type GameMode = 'quick' | 'pvp' | 'pvc' | null

function App() {
  const [isEngineReady, setIsEngineReady] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<Screen>('home')
  const [gameMode, setGameMode] = useState<GameMode>(null)

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
    setCurrentScreen('play');
  }
  
  const handleStartPvp = () => {
    setGameMode('pvp');
    setCurrentScreen('play');
  }
  
  const handleStartPvc = () => {
    setGameMode('pvc');
    setCurrentScreen('play');
  }
  
  const handleStartTutorial = () => {
    setCurrentScreen('tutorial');
  }

  const handleBackToHome = () => {
    setGameMode(null);
    setCurrentScreen('home');
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
        {currentScreen === 'play' && (
          <PlayScreen gameMode={gameMode} />
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
