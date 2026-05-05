import React, { useState } from 'react';
import './HomeScreen.css';

interface HomeScreenProps {
  onStartQuick: () => void;
  onStartPvp: () => void;
  onStartPvc: () => void;
  onStartTutorial: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartQuick,
  onStartPvp,
  onStartPvc,
  onStartTutorial,
}) => {

  return (
    <div className="home-screen">
      <div className="home-content">
        <div className="title-section">
          <div className="kanji-logo">
            <div className="logo-ex-row">
              <span className="char-ex">EX</span>
            </div>
            <div className="logo-kanji-row">
              <span className="char">将</span>
              <span className="char">棋</span>
            </div>
          </div>
          <h2 className="subtitle">EX SHOGI</h2>
          <p className="tagline">ZEN ARCHIVE EDITION</p>
        </div>

        <nav className="home-nav-grid">
          <button className="nav-item-large quick-start" onClick={onStartQuick}>
            <div className="nav-text-group">
              <span className="nav-label">今すぐ遊ぶ</span>
              <span className="nav-sub">QUICK START</span>
            </div>
          </button>
          
          <div className="secondary-actions">
            <button className="nav-item-compact pvp" onClick={onStartPvp}>
              <span className="nav-label">対人戦開始</span>
              <span className="nav-sub">PvP MATCH</span>
            </button>
            
            <button className="nav-item-compact pvc" onClick={onStartPvc}>
              <span className="nav-label">CPU戦開始</span>
              <span className="nav-sub">PvC PRACTICE</span>
            </button>
            
            <button className="nav-item-compact tutorial" onClick={onStartTutorial}>
              <span className="nav-label">チュートリアル</span>
              <span className="nav-sub">TUTORIAL</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="decorations">
        <div className="gold-leaf-top"></div>
        <div className="gold-leaf-bottom"></div>
      </div>
    </div>
  );
};
