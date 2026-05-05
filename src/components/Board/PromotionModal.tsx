import React from 'react';
import './PromotionModal.css';

interface PromotionModalProps {
  onConfirm: (promote: boolean) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="promotion-overlay">
      <div className="promotion-modal panel">
        <h3 className="promotion-title">成りますか？</h3>
        <p className="promotion-sub">PROMOTE PIECE?</p>
        
        <div className="promotion-options">
          <button className="promo-btn yes" onClick={() => onConfirm(true)}>
            <span className="btn-label">成る</span>
            <span className="btn-sub">PROMOTE</span>
          </button>
          
          <button className="promo-btn no" onClick={() => onConfirm(false)}>
            <span className="btn-label">成らず</span>
            <span className="btn-sub">DON'T PROMOTE</span>
          </button>
        </div>

        <button className="promo-cancel" onClick={onCancel}>
          キャンセル (CANCEL)
        </button>
      </div>
    </div>
  );
};
