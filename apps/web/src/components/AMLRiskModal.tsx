import React from 'react';
import { type AMLRiskResult } from '../utils/amlRiskScanner';

interface AMLRiskModalProps {
  isOpen: boolean;
  isScanning: boolean;
  result: AMLRiskResult | null;
  onClose: () => void;
}

export default function AMLRiskModal({ isOpen, isScanning, result, onClose }: AMLRiskModalProps) {
  if (!isOpen) return null;

  const riskColors = {
    LOW: { bg: '#dbeafe', border: '#0284c7', text: '#0c4a6e' },
    MEDIUM: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    HIGH: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
    CRITICAL: { bg: '#7f1d1d', border: '#dc2626', text: '#ffffff' },
  };

  const riskLevel = result?.riskLevel || 'LOW';
  const colors = riskColors[riskLevel];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1a202c' }}>
            🔍 AML Risk Assessment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>
              ⏳
            </div>
            <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>
              Scanning your wallet for compliance risks...
            </p>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Risk Result */}
        {!isScanning && result && (
          <>
            {/* Risk Score Badge */}
            <div
              style={{
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '12px',
                }}
              >
                {riskLevel === 'LOW'
                  ? '✅'
                  : riskLevel === 'MEDIUM'
                    ? '🟡'
                    : riskLevel === 'HIGH'
                      ? '🔴'
                      : '⛔'}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: colors.text }}>
                {riskLevel} RISK
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: colors.text, opacity: 0.9 }}>
                Risk Score: {result.score}/100
              </p>
            </div>

            {/* Message */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                {result.message}
              </p>
            </div>

            {/* Flags */}
            {result.flags.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
                  Detected Risk Factors:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.flags.map((flag, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#f1f5f9',
                        borderLeft: `4px solid ${flag.severity === 'CRITICAL' ? '#dc2626' : flag.severity === 'WARNING' ? '#f59e0b' : '#3b82f6'}`,
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                        {flag.type} ({flag.severity})
                      </div>
                      <div style={{ color: '#64748b' }}>{flag.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            <div
              style={{
                background: result.passed ? '#dbeafe' : '#fee2e2',
                border: `1px solid ${result.passed ? '#0284c7' : '#fecaca'}`,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '24px',
                fontSize: '13px',
                color: result.passed ? '#0c4a6e' : '#7f1d1d',
              }}
            >
              {result.passed
                ? '✅ Your wallet passed the AML screening. You may proceed with your transaction.'
                : '⚠️ Your wallet shows elevated risk factors. Transactions may be restricted or require additional review.'}
            </div>
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
        >
          {isScanning ? 'Scanning...' : 'Close'}
        </button>
      </div>
    </div>
  );
}
