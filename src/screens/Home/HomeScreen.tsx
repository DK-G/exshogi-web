import React from 'react';
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
          <p className="tagline">また、誘える将棋</p>
          <p className="home-lead">盤上は本格、盤外は誘いやすい。友だちと同じ部屋に集まって、変則将棋をもう一局。</p>
        </div>

        <nav className="home-nav-grid">
          <button className="nav-item-large quick-start" onClick={onStartQuick}>
            <div className="nav-text-group">
              <span className="nav-label">今すぐ遊ぶ</span>
              <span className="nav-sub">まずは一局</span>
            </div>
          </button>
          
          <div className="secondary-actions">
            <button className="nav-item-compact pvp" onClick={onStartPvp}>
              <span className="nav-label">友だちと遊ぶ</span>
              <span className="nav-sub">部屋をつくる</span>
            </button>
            
            <button className="nav-item-compact pvc" onClick={onStartPvc}>
              <span className="nav-label">CPUと練習</span>
              <span className="nav-sub">ひとりで試す</span>
            </button>
            
            <button className="nav-item-compact tutorial" onClick={onStartTutorial}>
              <span className="nav-label">チュートリアル</span>
              <span className="nav-sub">遊び方を見る</span>
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
