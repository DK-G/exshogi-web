import React from 'react';
import './TutorialScreen.css';

interface TutorialScreenProps {
  onBack: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onBack }) => {
  return (
    <div className="tutorial-screen">
      <div className="tutorial-content">
        <h2 className="section-title">HOW TO PLAY</h2>
        <div className="coming-soon-card">
          <div className="icon">🏮</div>
          <h3>準備中</h3>
          <p>基本的な指し方から、特殊ルールの解説まで順次公開予定です。</p>
          <button className="back-btn" onClick={onBack}>戻る</button>
        </div>
      </div>
    </div>
  );
};
