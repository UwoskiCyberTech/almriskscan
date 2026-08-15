/**
 * AML Risk Scanner Utility
 * Scans wallets for AML/compliance risks after 15% fee is charged
 */

export interface AMLRiskResult {
  score: number; // 0-100, higher = more risk
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: AMLRiskFlag[];
  message: string;
  passed: boolean; // true if LOW or MEDIUM risk, false if HIGH or CRITICAL
}

export interface AMLRiskFlag {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
}

// Known sanctioned addresses (simplified list - in production, use professional AML services)
const SANCTIONED_ADDRESSES = new Set([
  '0x7f367cc41522ce07e53ef14eb0a814f7d4d8b4d5', // OFAC Tornado Cash
  '0x72a5843cc08275c8171e582972aa4fda8c397b2a',
  '0xd7d6997947bfcba6ba029b626c33fa3b9a3c3cc2',
  '0x94a1b5cdb002eaf7c4a23d6f4fc802923e7d7d2d',
]);

// High-risk countries (simplified - in production, use proper compliance data)
const HIGH_RISK_COUNTRIES = new Set([
  'KP', // North Korea
  'IR', // Iran
  'SY', // Syria
  'CU', // Cuba
]);

// Common mixer/privacy pool addresses
const MIXER_ADDRESSES = new Set([
  '0x1111111254fb6c44bac0bed2854e76f90643097d', // 1inch
  '0x68b3465833fb72B5A828cCEFc994A864daL1D19',
]);

/**
 * Scan wallet for AML risks
 */
export async function scanWalletForAMLRisk(
  address: string,
  country?: string,
  previousBalance?: string,
  transactionHistory?: any[]
): Promise<AMLRiskResult> {
  const flags: AMLRiskFlag[] = [];
  let riskScore = 0;

  // Check if address is sanctioned
  const normalizedAddress = address.toLowerCase();
  if (SANCTIONED_ADDRESSES.has(normalizedAddress)) {
    flags.push({
      type: 'SANCTIONED_ADDRESS',
      severity: 'CRITICAL',
      description: 'Wallet address is on OFAC sanctions list',
    });
    riskScore += 50;
  }

  // Check if address is a known mixer
  if (MIXER_ADDRESSES.has(normalizedAddress)) {
    flags.push({
      type: 'MIXER_ADDRESS',
      severity: 'WARNING',
      description: 'Wallet appears to be associated with a mixing service',
    });
    riskScore += 20;
  }

  // Check country risk
  if (country && HIGH_RISK_COUNTRIES.has(country.toUpperCase())) {
    flags.push({
      type: 'HIGH_RISK_COUNTRY',
      severity: 'WARNING',
      description: `Wallet connected from high-risk country: ${country}`,
    });
    riskScore += 15;
  }

  // Check for suspicious transaction patterns (if history provided)
  if (transactionHistory && transactionHistory.length > 0) {
    const riskyPatterns = analyzeTransactionPatterns(transactionHistory);
    flags.push(...riskyPatterns);
    riskScore += riskyPatterns.reduce((sum, f) => sum + (f.severity === 'CRITICAL' ? 20 : f.severity === 'WARNING' ? 10 : 2), 0);
  }

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (riskScore >= 70) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 50) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 25) {
    riskLevel = 'MEDIUM';
  }

  const passed = riskLevel === 'LOW' || riskLevel === 'MEDIUM';

  return {
    score: Math.min(riskScore, 100),
    riskLevel,
    flags,
    message: generateRiskMessage(riskLevel, flags),
    passed,
  };
}

/**
 * Analyze transaction patterns for suspicious activity
 */
function analyzeTransactionPatterns(transactions: any[]): AMLRiskFlag[] {
  const flags: AMLRiskFlag[] = [];

  // Check for rapid transactions
  if (transactions.length > 5) {
    const recentTxs = transactions.slice(0, 5);
    const timestamps = recentTxs.map(t => t.timestamp || 0);
    const timeDiffs = [];
    for (let i = 1; i < timestamps.length; i++) {
      timeDiffs.push(timestamps[i - 1] - timestamps[i]);
    }

    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    if (avgTimeDiff < 60) { // Less than 60 seconds between transactions
      flags.push({
        type: 'RAPID_TRANSACTIONS',
        severity: 'WARNING',
        description: 'Unusual rapid transaction pattern detected',
      });
    }
  }

  return flags;
}

/**
 * Generate human-readable risk message
 */
function generateRiskMessage(level: string, flags: AMLRiskFlag[]): string {
  const flagCount = flags.length;

  switch (level) {
    case 'CRITICAL':
      return `⛔ CRITICAL RISK: ${flagCount} risk factor(s) detected. This wallet may be restricted.`;
    case 'HIGH':
      return `🔴 HIGH RISK: ${flagCount} risk factor(s) detected. Additional review may be needed.`;
    case 'MEDIUM':
      return `🟡 MEDIUM RISK: ${flagCount} risk factor(s) detected. Proceed with caution.`;
    case 'LOW':
      return `✅ LOW RISK: Wallet appears to be legitimate.`;
    default:
      return 'Risk assessment status unknown';
  }
}

/**
 * Format risk result for display
 */
export function formatAMLRiskResult(result: AMLRiskResult): {
  title: string;
  summary: string;
  details: string;
  riskColor: string;
} {
  const flagDetails = result.flags
    .map(f => `• ${f.type}: ${f.description} (${f.severity})`)
    .join('\n');

  return {
    title: `Wallet AML Risk Assessment - ${result.riskLevel}`,
    summary: result.message,
    details: flagDetails || 'No risk factors detected',
    riskColor: {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#7f1d1d',
    }[result.riskLevel] || '#6b7280',
  };
}
