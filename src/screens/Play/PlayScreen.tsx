import React, { useEffect, useMemo, useState } from 'react';
import { Board } from '../../components/Board/Board';
import { PromotionModal } from '../../components/Board/PromotionModal';
import { GameInfoSidebar } from '../../components/GameInfo/GameInfoSidebar';
import { useGame } from '../../hooks/useGame';
import { nshogiEngineService, type EngineStatus } from '../../engine/NshogiEngineService';
import { gameStateToSfen, type DisappearanceForecast, type GameState, type Side, type VariantEffect } from '@exshogi/engine-core';
import { VARIANT_PRESENTATION, type VariantKey } from '../../domain/variants';
import { CPU_LEVELS, type CpuLevel } from '../../domain/cpuLevels';
import { buildWebKifuPreview } from '../../domain/kifu';
import { pickFallbackCpuMove } from '../../domain/cpuFallback';
import { pvpClient, type PvpRoomConnection } from '../../services/pvp/client';
import type { PvpMatchSession } from '../../services/pvp/session';
import { clearPvpSession, savePvpSession } from '../../services/pvp/storage';
import type { RoomSnapshot } from '../../services/pvp/types';
import './PlayScreen.css';
import { MOBILE_DEFAULT_TRAP_COUNT } from '../../domain/mobileParity';

interface PlayScreenProps {
  gameMode: 'quick' | 'pvp' | 'pvc';
  variantKey: VariantKey;
  cpuLevel: CpuLevel;
  pvpSession?: PvpMatchSession | null;
  onExit: () => void;
}

type PvpConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export const PlayScreen: React.FC<PlayScreenProps> = ({
  gameMode,
  variantKey,
  cpuLevel,
  pvpSession,
  onExit,
}) => {
  const pvpConnectionRef = React.useRef<PvpRoomConnection | null>(null);
  const isSpectator = gameMode === 'pvp' && pvpSession?.mode === 'spectator';
  const [remoteSnapshot, setRemoteSnapshot] = useState<RoomSnapshot | null>(() =>
    gameMode === 'pvp' ? pvpSession?.snapshot ?? null : null,
  );
  const [pvpUsiMoves, setPvpUsiMoves] = useState<string[]>(() =>
    gameMode === 'pvp' ? pvpSession?.snapshot.moves ?? [] : [],
  );
  const { 
    board, 
    capturedPieces, 
    captureTargets,
    trapMarkers,
    phaseMovedCells,
    disappearanceMarkers,
    turn, 
    selectedCell, 
    validMoves, 
    selectCell,
    gameState,
    executeMove,
    executeUsiMove,
    pendingPromotion,
    confirmPromotion,
    cancelPromotion,
    moveHistory,
    moveEffects,
    startedAt,
    result,
    finishRemoteGame,
    resign,
    timeout,
    abort,
    syncFromUsiHistory,
    setTrapCharges,
    endInvaderPhase,
  } = useGame(variantKey, {
    onLocalMove: (_move, usi) => {
      if (gameMode === 'pvp' && !isSpectator) {
        pvpConnectionRef.current?.sendMove(usi);
        setPvpUsiMoves((prev) => appendUsiMove(prev, usi));
      }
    },
  });
  const variantMeta = VARIANT_PRESENTATION[variantKey];
  const cpuConfig = CPU_LEVELS[cpuLevel];
  const [cpuFallbackReasons, setCpuFallbackReasons] = useState<string[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>(() => nshogiEngineService.getStatus());
  const [isCpuThinking, setIsCpuThinking] = useState(false);
  const [isMatchmakingActive, setIsMatchmakingActive] = useState(gameMode === 'quick');
  const [matchmakingElapsed, setMatchmakingElapsed] = useState(0);
  const [spectatorConnectionNotice, setSpectatorConnectionNotice] = useState<string | null>(null);
  const [pvpConnectionStatus, setPvpConnectionStatus] = useState<PvpConnectionStatus>(
    gameMode === 'pvp' ? 'connecting' : 'idle',
  );
  const [pvpConnectionError, setPvpConnectionError] = useState<string | null>(null);
  const [pvpReconnectAttempt, setPvpReconnectAttempt] = useState(0);
  const [invaderPhaseClock, setInvaderPhaseClock] = useState<{ turn: Side; ms: number }>({
    turn: 'sente',
    ms: INVADER_PHASE_MS,
  });
  const [trapSetupActive, setTrapSetupActive] = useState(
    () => variantKey === 'trap' && (gameMode !== 'pvp' || pvpSession?.snapshot.status === 'setup'),
  );
  const [trapSetupSubmitted, setTrapSetupSubmitted] = useState(false);
  const [trapSetupSelections, setTrapSetupSelections] = useState<TrapSetupSelections>({
    sente: {},
    gote: {},
  });
  const [clocks, setClocks] = useState(() => ({
    sente: INITIAL_PVC_CLOCK_MS,
    gote: INITIAL_PVC_CLOCK_MS,
  }));
  const gameId = useMemo(
    () => `web-${variantKey}-${startedAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    [startedAt, variantKey],
  );
  const pvpRoomId = pvpSession?.snapshot.roomId ?? pvpSession?.binding?.roomId;
  const pvpRoomStatus = gameMode === 'pvp'
    ? remoteSnapshot?.status ?? pvpSession?.snapshot.status
    : 'playing';
  const pvpIsConnected = gameMode !== 'pvp' || pvpConnectionStatus === 'connected';
  const pvpCanMove = gameMode !== 'pvp' || (pvpRoomStatus === 'playing' && pvpIsConnected);
  const activeClocks = gameMode === 'pvp' && remoteSnapshot?.clocks ? remoteSnapshot.clocks : clocks;
  const timeControlLabel = gameMode === 'pvp' && remoteSnapshot
    ? formatTimePreset(remoteSnapshot.timeLimitMs, remoteSnapshot.byoYomiMs)
    : '10分切れ負け';
  const latestEffects = moveEffects.at(-1) ?? [];
  const trapKingHits = gameState.variantState?.trap?.kingHits;
  const disappearance = gameState.variantState?.disappearance;
  const disappearanceForecast = disappearance?.forecast;
  const disappearanceTurnCount = disappearance?.turnCount ?? 0;
  const disappearanceTurnsLeft = disappearanceForecast
    ? Math.max(0, disappearanceForecast.nextTriggerTurn - disappearanceTurnCount)
    : null;
  const movedInPhase = gameState.variantState?.multiMove?.movedPieceUids.length ?? 0;
  const invaderPhaseRemainingMs =
    invaderPhaseClock.turn === turn ? invaderPhaseClock.ms : INVADER_PHASE_MS;
  const cpuFallbackLatestReason = cpuFallbackReasons.at(-1);
  const showCpuEngineStatus = gameMode === 'pvc' || gameMode === 'quick';
  const trapSetupSide: Side = gameMode === 'pvp'
    ? pvpSession?.binding?.seat ?? 'sente'
    : 'sente';
  const trapSetupLimit = pvpSession?.trapCount ?? MOBILE_DEFAULT_TRAP_COUNT;
  const trapSetupSelectedCount = countTrapSelections(trapSetupSelections[trapSetupSide]);
  const trapSetupPanelActive =
    variantKey === 'trap' &&
    (gameMode === 'pvp' ? pvpRoomStatus === 'setup' && !trapSetupSubmitted : trapSetupActive);
  const displayedTrapMarkers = trapSetupPanelActive
    ? mergeTrapMarkers(trapMarkers, trapSetupSelections)
    : trapMarkers;
  const trapSetupWaiting = variantKey === 'trap' && gameMode === 'pvp' && pvpRoomStatus === 'setup' && trapSetupSubmitted;

  useEffect(() => {
    if (gameMode !== 'pvp') return;
    if (!pvpSession?.snapshot.moves.length) return;
    syncFromUsiHistory(pvpSession.snapshot.moves);
  }, [gameMode, pvpSession?.snapshot.moves, syncFromUsiHistory]);

  useEffect(() => {
    if (variantKey !== 'invader' || result) return;
    if (isSpectator) return;

    const timer = window.setInterval(() => {
      setInvaderPhaseClock((prev) => {
        const current = prev.turn === turn ? prev.ms : INVADER_PHASE_MS;
        const next = Math.max(0, current - 1000);
        if (next <= 0) {
          window.clearInterval(timer);
          endInvaderPhase('timeout');
        }
        return { turn, ms: next };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endInvaderPhase, isSpectator, result, variantKey, turn]);

  // CPU Move logic (Always active for PvC, active as placeholder for Quick)
  useEffect(() => {
    if (result) return;
    if (trapSetupPanelActive) return;
    if (turn === 'gote' && (gameMode === 'pvc' || gameMode === 'quick')) {
      const thinkAndMove = async () => {
        const sfen = gameStateToSfen(gameState, gameState.sideToMove);
        setIsCpuThinking(true);
        setEngineStatus(nshogiEngineService.getStatus());
        try {
          const bestMoveUsi = await withTimeout(
            nshogiEngineService.pickBestMove(
              sfen,
              cpuConfig.search.movetimeMs,
              cpuConfig.search.depth,
              undefined,
              cpuConfig.search.topK,
              cpuConfig.search.temperature,
            ),
            Math.max(1200, cpuConfig.search.movetimeMs + 800),
          );
          setEngineStatus(nshogiEngineService.getStatus());
          executeUsiMove(bestMoveUsi);
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'unknown';
          console.warn('[PlayScreen] CPU WASM failed, using JS fallback:', reason);
          setEngineStatus(nshogiEngineService.getStatus());
          const fallback = pickFallbackCpuMove(
            gameState,
            variantKey,
            cpuConfig,
            reason,
          );
          if (fallback.move) {
            setCpuFallbackReasons((prev) => [...prev, fallback.reason].slice(-5));
            executeMove(fallback.move);
          } else {
            console.error('[PlayScreen] CPU fallback found no legal move.');
          }
        } finally {
          setIsCpuThinking(false);
        }
      };
      const timer = setTimeout(thinkAndMove, 800);
      return () => {
        clearTimeout(timer);
        setIsCpuThinking(false);
      };
    }
  }, [turn, gameState, executeMove, executeUsiMove, gameMode, cpuConfig, result, variantKey, trapSetupPanelActive]);

  useEffect(() => {
    if (gameMode !== 'pvp' || !pvpSession) return;
    let closedByCleanup = false;

    const connection = pvpClient.connectRoom({
      roomId: pvpSession.binding?.roomId ?? pvpSession.snapshot.roomId,
      authToken: pvpSession.auth.token,
      seatToken: pvpSession.binding?.seatToken,
      mode: pvpSession.mode ?? 'player',
      lastSeq: pvpSession.lastSeq,
      onOpen: () => {
        setPvpConnectionStatus('connecting');
        setPvpConnectionError(null);
      },
      onAuthenticated: () => {
        setPvpConnectionStatus('connected');
        setPvpConnectionError(null);
      },
      onState: (snapshot) => {
        setPvpConnectionStatus('connected');
        setPvpConnectionError(null);
        setRemoteSnapshot(snapshot);
        setPvpUsiMoves(snapshot.moves);
        setClocks(snapshot.clocks);
        savePvpSession({
          ...pvpSession,
          snapshot,
          lastSeq: connection.getLastSeq(),
        });
        if (isSpectator && snapshot.status === 'finished') {
          setSpectatorConnectionNotice('この対局は終了しました。');
        }
      },
      onMessage: (message) => {
        if (
          message.type === 'move' &&
          (isSpectator || message.payload.seat !== pvpSession.binding?.seat)
        ) {
          executeUsiMove(message.payload.move);
        }
        if (message.type === 'move') {
          setClocks(message.payload.clocks);
          setRemoteSnapshot((prev) => prev
            ? {
                ...prev,
                clocks: message.payload.clocks,
                moves: appendUsiMove(prev.moves, message.payload.move, message.payload.moveNumber),
                turnSeat: message.payload.seat === 'sente' ? 'gote' : 'sente',
              }
            : prev,
          );
          setPvpUsiMoves((prev) =>
            appendUsiMove(prev, message.payload.move, message.payload.moveNumber),
          );
        }
        if (message.type === 'game_end') {
          clearPvpSession();
          setRemoteSnapshot((prev) => prev
            ? { ...prev, status: 'finished', result: message.payload, closedAt: message.payload.timestamp }
            : prev,
          );
          if (message.payload.reason === 'checkmate') {
            finishRemoteGame(message.payload.winner, 'mate', new Date(message.payload.timestamp).toISOString());
          } else if (message.payload.reason === 'disconnect') {
            finishRemoteGame(message.payload.winner, 'disconnect', new Date(message.payload.timestamp).toISOString());
          } else if (message.payload.reason === 'resignation') {
            resign(message.payload.winner === 'sente' ? 'gote' : 'sente');
          } else if (message.payload.reason === 'timeout') {
            timeout(message.payload.winner === 'sente' ? 'gote' : 'sente');
          } else if (message.payload.reason === 'abort') {
            abort();
          }
        }
      },
      onError: (err) => {
        console.error('[PlayScreen] PvP connection error:', err);
        setPvpConnectionStatus('error');
        setPvpConnectionError(err.message);
        if (isSpectator) {
          setSpectatorConnectionNotice(`観戦接続に問題があります: ${err.message}`);
        }
      },
      onClose: () => {
        if (!closedByCleanup) {
          setPvpConnectionStatus('disconnected');
        }
        if (isSpectator) {
          setSpectatorConnectionNotice('観戦接続が終了しました。');
        }
      },
    });
    pvpConnectionRef.current = connection;

    return () => {
      closedByCleanup = true;
      connection.close();
      if (pvpConnectionRef.current === connection) {
        pvpConnectionRef.current = null;
      }
    };
  }, [abort, executeUsiMove, finishRemoteGame, gameMode, isSpectator, pvpReconnectAttempt, pvpSession, resign, timeout]);

  useEffect(() => {
    if (result) return;
    if (trapSetupPanelActive) return;
    if (gameMode !== 'pvc' && gameMode !== 'quick') return;

    const timer = window.setInterval(() => {
      setClocks((prev) => {
        const next = {
          ...prev,
          [turn]: Math.max(0, prev[turn] - 1000),
        };
        if (next[turn] <= 0) {
          window.clearInterval(timer);
          timeout(turn);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameMode, result, timeout, turn, trapSetupPanelActive]);

  useEffect(() => {
    if (!isMatchmakingActive || result) return;

    const timer = window.setInterval(() => {
      setMatchmakingElapsed((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isMatchmakingActive, result]);

  const winnerLabel =
    result?.winner === 'sente' ? '先手' : result?.winner === 'gote' ? '後手' : '引き分け';
  const resultTitle = result?.winner === 'draw'
    ? '対局中断'
    : `${winnerLabel} 勝利`;
  const reasonLabel = result?.reason === 'resignation'
    ? '投了'
    : result?.reason === 'mate'
      ? '詰み'
      : result?.reason === 'stalemate'
        ? 'ステイルメイト'
        : result?.reason === 'timeout'
          ? '時間切れ'
          : result?.reason === 'abort'
            ? '中断'
            : result?.reason === 'disconnect'
              ? '切断'
              : result?.reason ?? '';
  const resultActionLabel = gameMode === 'pvp' ? isSpectator ? '観戦ロビーへ戻る' : 'ロビーへ戻る' : 'トップへ';
  const spectatorNotice = isSpectator
    ? spectatorConnectionNotice ??
      (pvpSession?.snapshot.status === 'finished' ? 'この対局は終了しています。' : null)
    : null;
  const pvpConnectionNotice = gameMode === 'pvp'
    ? formatPvpConnectionNotice(pvpConnectionStatus, pvpConnectionError, pvpRoomStatus)
    : null;
  const kifuPreview = useMemo(() => {
    if (!result) return null;
    return buildWebKifuPreview({
      gameId,
      mode: gameMode === 'pvc' || gameMode === 'quick' ? 'pvc' : 'pvp',
      variantKey,
      cpuLevel: gameMode === 'pvc' || gameMode === 'quick' ? cpuConfig : undefined,
      winner: result.winner,
      reason: result.reason,
      startedAt,
      endedAt: result.endedAt,
      moveCount: gameMode === 'pvp' ? Math.max(moveHistory.length, pvpUsiMoves.length) : moveHistory.length,
      engineMode: gameMode === 'pvp'
        ? isSpectator ? 'remote-spectator' : 'remote'
        : cpuFallbackReasons.length > 0 ? 'wasm+js-fallback' : 'wasm',
      fallbackCount: gameMode === 'pvp' ? 0 : cpuFallbackReasons.length,
      timeControl: timeControlLabel,
      clocks: activeClocks,
      roomId: pvpRoomId,
      recordSource: gameMode === 'pvp' ? isSpectator ? 'spectator' : 'pvp' : 'local',
      seat: isSpectator ? 'spectator' : pvpSession?.binding?.seat,
      usiMoves: gameMode === 'pvp' ? pvpUsiMoves : undefined,
      moveEffects,
      ...collectTrueKingMetadata(gameState),
      phaseLogCount: variantKey === 'invader' ? 0 : undefined,
    }, moveHistory);
  }, [
    activeClocks,
    cpuConfig,
    cpuFallbackReasons.length,
    gameId,
    gameMode,
    isSpectator,
    gameState,
    moveHistory,
    moveEffects,
    pvpRoomId,
    pvpSession?.binding?.seat,
    pvpUsiMoves,
    result,
    startedAt,
    timeControlLabel,
    variantKey,
  ]);

  const handleTrapSetupCell = (row: number, col: number) => {
    const coordKey = `${9 - col},${row + 1}`;
    setTrapSetupSelections((prev) => {
      const sideSelections = { ...prev[trapSetupSide] };
      const currentTotal = countTrapSelections(sideSelections);
      if (currentTotal >= trapSetupLimit) return prev;
      sideSelections[coordKey] = (sideSelections[coordKey] ?? 0) + 1;
      return {
        ...prev,
        [trapSetupSide]: sideSelections,
      };
    });
  };

  const clearTrapSetupSide = (side: Side) => {
    setTrapSetupSelections((prev) => ({
      ...prev,
      [side]: {},
    }));
  };

  const confirmTrapSetup = () => {
    const ownSelections = trapSetupSelections[trapSetupSide];
    if (countTrapSelections(ownSelections) !== trapSetupLimit) return;

    const nextSelections: TrapSetupSelections = {
      ...trapSetupSelections,
      [trapSetupSide]: ownSelections,
    };

    if (gameMode === 'pvp') {
      pvpConnectionRef.current?.sendTrapSetup(toServerTrapSelections(ownSelections));
      setTrapCharges(nextSelections);
      setTrapSetupSubmitted(true);
      setTrapSetupActive(false);
      return;
    }

    const cpuSide: Side = trapSetupSide === 'sente' ? 'gote' : 'sente';
    if (countTrapSelections(nextSelections[cpuSide]) === 0) {
      nextSelections[cpuSide] = generateRandomTrapSelections(trapSetupLimit);
    }
    setTrapSetupSelections(nextSelections);
    setTrapCharges(nextSelections);
    setTrapSetupActive(false);
  };

  const reconnectPvp = () => {
    pvpConnectionRef.current?.close();
    pvpConnectionRef.current = null;
    setPvpConnectionStatus('connecting');
    setPvpConnectionError(null);
    setPvpReconnectAttempt((prev) => prev + 1);
  };

  return (
    <div className="play-arena">
      {gameMode === 'quick' && (
        <div className={`matchmaking-overlay ${isMatchmakingActive ? '' : 'compact'}`}>
          {isMatchmakingActive ? (
            <div className="matchmaking-content">
              <div className="matchmaking-status">
                <span className="pulse-dot"></span>
                <div>
                  <b>対戦相手を探しています</b>
                  <small>{formatElapsed(matchmakingElapsed)} / CPU練習中</small>
                </div>
              </div>
              <div className="matchmaking-actions">
                <button onClick={() => setIsMatchmakingActive(false)}>
                  練習を続ける
                </button>
                <button onClick={onExit}>
                  検索終了
                </button>
              </div>
            </div>
          ) : (
            <button
              className="matchmaking-restore"
              onClick={() => setIsMatchmakingActive(true)}
            >
              対戦検索を再開
            </button>
          )}
        </div>
      )}

      <div className="play-context-bar">
        <span>{variantMeta.label}</span>
        <span>{isSpectator ? '観戦' : gameMode === 'pvc' || gameMode === 'quick' ? 'PvC' : 'PvP'}</span>
        {(gameMode === 'pvc' || gameMode === 'quick') && (
          <span>{cpuConfig.label}</span>
        )}
      </div>

      {isSpectator && spectatorNotice && (
        <div className="spectator-notice">
          <span>{spectatorNotice}</span>
          <button onClick={onExit}>ロビーへ戻る</button>
        </div>
      )}

      {pvpConnectionNotice && (
        <div className={`pvp-connection-notice ${pvpConnectionStatus}`}>
          <span>{pvpConnectionNotice}</span>
          {(pvpConnectionStatus === 'disconnected' || pvpConnectionStatus === 'error') && (
            <button onClick={reconnectPvp}>再接続</button>
          )}
          <button onClick={onExit}>ロビーへ戻る</button>
        </div>
      )}

      <div className="arena-main-content">
        <div className="board-stack">
            <div className="variant-state-strip">
            {gameMode === 'pvp' && (
              <span className={pvpIsConnected ? 'effect' : 'danger'}>
                PvP: {formatPvpConnectionLabel(pvpConnectionStatus)}
              </span>
            )}
            {trapSetupPanelActive && (
              <span className="danger">
                罠配置: {trapSetupSide === 'sente' ? '先手' : '後手'} {trapSetupSelectedCount}/{trapSetupLimit}
              </span>
            )}
            {captureTargets.length > 0 && (
              <span className="danger">捕獲必須: {captureTargets.length} マス</span>
            )}
            {variantKey === 'invader' && (
              <span>フェーズ: {turn === 'sente' ? '先手' : '後手'} 残り {formatClock(invaderPhaseRemainingMs)} / 移動済み {movedInPhase} 駒</span>
            )}
            {variantKey === 'trap' && trapKingHits && (
              <span>王罠: 先手 {trapKingHits.sente}/2・後手 {trapKingHits.gote}/2</span>
            )}
            {variantKey === 'disappearance' && disappearance && (
              <span>神隠し: 履歴 {disappearance.history.length} 件・王免疫 先手{disappearance.kingGuard.sente}/後手{disappearance.kingGuard.gote}</span>
            )}
            {variantKey === 'disappearance' && disappearanceForecast && (
              <span className={disappearanceForecast.type === 'D' && disappearanceForecast.revealed ? 'danger' : 'effect'}>
                予告{disappearanceForecast.type}: {disappearanceTurnsLeft}手後 / {formatForecastSquares(disappearanceForecast)}
              </span>
            )}
            {latestEffects.map((effect, index) => (
              <span className="effect" key={`${effect.type}-${index}`}>
                {formatVariantEffect(effect)}
              </span>
            ))}
          </div>
          {showCpuEngineStatus && (
            <div className={`cpu-engine-strip ${cpuFallbackLatestReason ? 'fallback-active' : ''}`}>
              <span className={`engine-dot ${engineStatus}`}></span>
              <span>
                CPU {isCpuThinking ? '思考中' : '待機'} / {formatEngineStatus(engineStatus)}
              </span>
              <span>{cpuConfig.label} depth {cpuConfig.search.depth}</span>
              {cpuFallbackLatestReason && (
                <span>JS fallback {cpuFallbackReasons.length}回: {cpuFallbackLatestReason}</span>
              )}
            </div>
          )}
          {variantKey === 'invader' && !isSpectator && (
            <div className="invader-phase-panel">
              <div>
                <b>{turn === 'sente' ? '先手' : '後手'}フェーズ</b>
                <span>各駒はこのフェーズ中に一度だけ動けます。</span>
              </div>
              <button
                onClick={() => endInvaderPhase('manual')}
                disabled={Boolean(result)}
              >
                フェーズ終了
              </button>
            </div>
          )}
          {trapSetupPanelActive && (
            <div className="trap-setup-panel">
              <div>
                <b>罠セットアップ</b>
                <span>盤上をクリックして罠を{trapSetupLimit}個配置します。同じマスに複数配置できます。</span>
              </div>
              <div className="trap-setup-actions">
                <button onClick={() => clearTrapSetupSide(trapSetupSide)}>
                  リセット
                </button>
                <button
                  onClick={confirmTrapSetup}
                  disabled={trapSetupSelectedCount !== trapSetupLimit}
                >
                  確定
                </button>
              </div>
            </div>
          )}
          {trapSetupWaiting && (
            <div className="trap-setup-panel waiting">
              <div>
                <b>罠配置を送信しました</b>
                <span>相手の配置完了を待っています。</span>
              </div>
              <strong>WAIT</strong>
            </div>
          )}
          {variantKey === 'disappearance' && disappearanceForecast && (
            <div className={`disappearance-forecast-panel type-${disappearanceForecast.type.toLowerCase()} ${disappearanceForecast.revealed ? 'revealed' : ''}`}>
              <div>
                <b>神隠し予告 {disappearanceForecast.type}</b>
                <span>{formatForecastTiming(disappearanceForecast, disappearanceTurnCount)}</span>
              </div>
              <strong>{formatForecastSquares(disappearanceForecast)}</strong>
            </div>
          )}
          <Board 
            board={board}
            onCellClick={isSpectator || (!pvpCanMove && !trapSetupPanelActive) ? () => {} : trapSetupPanelActive ? handleTrapSetupCell : selectCell}
            selectedCell={selectedCell}
            validMoves={validMoves}
            captureTargets={captureTargets}
            trapMarkers={displayedTrapMarkers}
            phaseMovedCells={phaseMovedCells}
            disappearanceMarkers={disappearanceMarkers}
            capturedPieces={capturedPieces}
          />
        </div>
      </div>

      <div className="arena-sidebar">
        <div className="play-actions">
          <button
            className="resign-button secondary"
            onClick={abort}
            disabled={Boolean(result)}
          >
            中断
          </button>
          <button
            className="resign-button"
            onClick={() => {
              if (gameMode === 'pvp' && !isSpectator) {
                pvpConnectionRef.current?.sendResign();
                clearPvpSession();
              }
              resign(gameMode === 'pvp' ? pvpSession?.binding?.seat ?? 'sente' : 'sente');
            }}
            disabled={Boolean(result) || isSpectator}
          >
            投了
          </button>
        </div>
        <GameInfoSidebar 
          sente={{ name: isSpectator ? 'SENTE' : 'Player', rank: '10K', time: formatClock(activeClocks.sente) }}
          gote={{ name: gameMode === 'pvc' || gameMode === 'quick' ? 'NSHOGI (CPU)' : 'GOTE', rank: cpuConfig.label, time: formatClock(activeClocks.gote) }}
          turn={turn}
          moveHistory={moveHistory}
        />
      </div>

      {pendingPromotion && (
        <PromotionModal 
          onConfirm={confirmPromotion} 
          onCancel={cancelPromotion} 
        />
      )}

      {result && (
        <div className="result-overlay">
          <div className="result-modal">
            <p className="mode-kicker">RESULT</p>
            <h2>{resultTitle}</h2>
            <p className="result-reason">{reasonLabel}</p>
            <div className="result-summary">
              <span>{variantMeta.label}</span>
              <span>{gameMode === 'pvc' || gameMode === 'quick' ? `PvC ${cpuConfig.label}` : 'PvP'}</span>
              <span>{moveHistory.length} 手</span>
            </div>
            {showCpuEngineStatus && cpuFallbackReasons.length > 0 && (
              <div className="cpu-fallback-summary">
                <b>CPU fallback</b>
                <span>{cpuFallbackReasons.length}回 / 直近: {cpuFallbackLatestReason}</span>
              </div>
            )}
            {kifuPreview && (
              <div className="kifu-preview">
                <div className="kifu-header">
                  <h3>棋譜プレビュー</h3>
                  <span>{kifuPreview.jkf.version}</span>
                </div>
                <dl className="kifu-meta">
                  {kifuPreview.headerRows.map((row) => (
                    <React.Fragment key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                <div className="kifu-moves">
                  {kifuPreview.moveRows.length === 0 ? (
                    <p>着手なし</p>
                  ) : (
                    kifuPreview.moveRows.slice(-5).map((row) => (
                      <div className="kifu-move-row" key={row.index}>
                        <span>{row.index}</span>
                        <b>{row.sente}</b>
                        <b>{row.gote}</b>
                        {row.effects.length > 0 && (
                          <em>{row.effects.join(' / ')}</em>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <details className="jkf-details">
                  <summary>JKF JSON</summary>
                  <pre>{kifuPreview.serialized}</pre>
                </details>
              </div>
            )}
            {variantKey === 'kagemusha' && (
              <div className="true-king-reveal">
                <h3>真王情報</h3>
                {formatTrueKingReveal(gameState)}
              </div>
            )}
            <button className="result-primary" onClick={onExit}>
              {resultActionLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`wasm-timeout:${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });

const INITIAL_PVC_CLOCK_MS = 10 * 60 * 1000;
const INVADER_PHASE_MS = 15 * 1000;
type TrapSetupSelections = Record<Side, Record<string, number>>;

const countTrapSelections = (selections: Record<string, number>) =>
  Object.values(selections).reduce((sum, count) => sum + count, 0);

const mergeTrapMarkers = (
  baseMarkers: Array<{ row: number; col: number; side: Side; count: number }>,
  selections: TrapSetupSelections,
) => {
  const markerMap = new Map<string, { row: number; col: number; side: Side; count: number }>();
  baseMarkers.forEach((marker) => {
    markerMap.set(`${marker.side}:${marker.row}:${marker.col}`, marker);
  });
  (['sente', 'gote'] as const).forEach((side) => {
    Object.entries(selections[side]).forEach(([coordKey, count]) => {
      if (count <= 0) return;
      const [file, rank] = coordKey.split(',').map(Number);
      const marker = {
        row: rank - 1,
        col: 9 - file,
        side,
        count,
      };
      markerMap.set(`${side}:${marker.row}:${marker.col}`, marker);
    });
  });
  return Array.from(markerMap.values());
};

const toServerTrapSelections = (selections: Record<string, number>) =>
  Object.entries(selections).flatMap(([coordKey, count]) => {
    const [file, rank] = coordKey.split(',').map(Number);
    return Array.from({ length: count }, () => ({
      row: rank - 1,
      col: 9 - file,
    }));
  });

const generateRandomTrapSelections = (count: number) => {
  const selections: Record<string, number> = {};
  for (let index = 0; index < count; index += 1) {
    const file = Math.floor(Math.random() * 9) + 1;
    const rank = Math.floor(Math.random() * 9) + 1;
    const key = `${file},${rank}`;
    selections[key] = (selections[key] ?? 0) + 1;
  }
  return selections;
};

const appendUsiMove = (moves: string[], usi: string, moveNumber?: number) => {
  if (moveNumber && moves[moveNumber - 1] === usi) return moves;
  if (moveNumber && moves.length >= moveNumber) return moves;
  if (moves[moves.length - 1] === usi) return moves;
  return [...moves, usi];
};

const formatTimePreset = (timeLimitMs: number, byoYomiMs: number) => {
  const baseMinutes = Math.max(0, Math.round(timeLimitMs / 60_000));
  if (byoYomiMs > 0) {
    return `${baseMinutes}分 + 秒読み${Math.round(byoYomiMs / 1000)}秒`;
  }
  return `${baseMinutes}分切れ負け`;
};

const formatPvpConnectionLabel = (status: PvpConnectionStatus) => {
  if (status === 'connected') return '接続中';
  if (status === 'connecting') return '接続中...';
  if (status === 'disconnected') return '切断';
  if (status === 'error') return 'エラー';
  return '待機';
};

const formatPvpConnectionNotice = (
  status: PvpConnectionStatus,
  error: string | null,
  roomStatus?: string,
) => {
  if (status === 'connected' || status === 'idle') return null;
  if (status === 'connecting') return 'PvP サーバへ接続しています。';
  if (status === 'disconnected') return 'PvP 接続が切断されました。再接続できます。';
  const detail = error ? `: ${error}` : '';
  return `PvP 接続に問題があります${detail}${roomStatus === 'playing' ? '。復帰するまで着手は停止します。' : '。'}`;
};

const formatForecastTiming = (forecast: DisappearanceForecast, currentTurn: number) => {
  if (forecast.type === 'C') {
    return '発生手数は非公開';
  }
  if (forecast.type === 'B' && forecast.announcedTurns.length > 0) {
    const elapsed = currentTurn - forecast.generatedAtTurn;
    const candidates = forecast.announcedTurns
      .map((turn) => Math.max(0, turn - elapsed))
      .filter((turn) => turn > 0);
    return `候補: ${(candidates.length > 0 ? candidates : [Math.max(0, forecast.nextTriggerTurn - currentTurn)]).join(' / ')}手後`;
  }
  return `${Math.max(0, forecast.nextTriggerTurn - currentTurn)}手後`;
};

const formatForecastSquares = (forecast: DisappearanceForecast) => {
  if (forecast.type === 'C') return '対象マス非公開';
  const shown = forecast.announcedSquares.map(formatCoordLabel);
  if (forecast.type === 'D' && !forecast.revealed) {
    const hiddenCount = Math.max(0, forecast.targetSquares.length - forecast.announcedSquares.length);
    return [...shown, ...Array.from({ length: hiddenCount }, () => '??')].join(' / ');
  }
  if (shown.length === 0) return '対象マス非公開';
  return shown.join(' / ');
};

const formatCoordLabel = (coord: { file: number; rank: number }) => {
  const ranks = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return `${coord.file}${ranks[coord.rank - 1] ?? coord.rank}`;
};

const collectTrueKingMetadata = (state: GameState) => {
  const trueKings: {
    trueKingSente?: { file: number; rank: number; id: string; type: string };
    trueKingGote?: { file: number; rank: number; id: string; type: string };
  } = {};

  state.board.cells.forEach((cell, index) => {
    const piece = cell.piece;
    if (!piece?.roleTrueKing) return;
    const width = state.board.width;
    const info = {
      file: (index % width) + 1,
      rank: Math.floor(index / width) + 1,
      id: piece.id,
      type: piece.type,
    };
    if (piece.side === 'sente') {
      trueKings.trueKingSente = info;
    } else {
      trueKings.trueKingGote = info;
    }
  });

  return trueKings;
};

const formatVariantEffect = (effect: VariantEffect) => {
  if (effect.type === 'trap_trigger') {
    const captured = effect.captured ? `${effect.captured.type}${effect.captured.wasKing ? '(王)' : ''}` : '空罠';
    return `罠発動 ${effect.coord.file}${effect.coord.rank}: ${captured}`;
  }
  if (effect.type === 'disappearance') {
    const removed = effect.removed ? `${effect.removed.type}${effect.removed.wasKing ? '(王)' : ''}` : '空マス';
    return `神隠し ${effect.coord.file}${effect.coord.rank}: ${removed}`;
  }
  if (effect.type === 'false_victory') {
    return '影武者: 偽王捕獲';
  }
  return `王免疫 ${effect.coord.file}${effect.coord.rank}`;
};

const formatEngineStatus = (status: EngineStatus) => {
  if (status === 'ready') return 'WASM ready';
  if (status === 'loading') return 'WASM loading';
  if (status === 'error') return 'WASM error';
  return 'WASM未初期化';
};

const formatTrueKingReveal = (state: GameState) => {
  const rows: string[] = [];
  state.board.cells.forEach((cell, index) => {
    const piece = cell.piece;
    if (!piece?.roleTrueKing) return;
    const file = (index % state.board.width) + 1;
    const rank = Math.floor(index / state.board.width) + 1;
    rows.push(`${piece.side === 'sente' ? '先手' : '後手'}: ${file}${rank} ${piece.type}`);
  });
  if (rows.length === 0) return <p>盤上に真王は残っていません。</p>;
  return (
    <ul>
      {rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  );
};

const formatClock = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};
