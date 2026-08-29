/**
 * =====================================================
 * CRYPTO PAYMENT SERVICE - LITECOIN (LTC) VERIFICATION
 * =====================================================
 * Handles real-time LTC conversion and blockchain verification
 * for address: ltc1qdtj865lld8dnl90u3gvf0sat8gmdchrz7tzms2
 */

const { getLogger } = require('../utils/logger');
const logger = getLogger();

const LTC_ADDRESS = 'ltc1qdtj865lld8dnl90u3gvf0sat8gmdchrz7tzms2';

let cachedLtcPrice = 85.0; // Fallback LTC/EUR price
let lastPriceFetch = 0;

/**
 * Get current LTC price in EUR
 */
async function getLtcPriceEur() {
  const now = Date.now();
  if (now - lastPriceFetch < 60000 && cachedLtcPrice > 0) {
    return cachedLtcPrice;
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.litecoin?.eur) {
        cachedLtcPrice = data.litecoin.eur;
        lastPriceFetch = now;
        return cachedLtcPrice;
      }
    }
  } catch (error) {
    logger.debug('CryptoService', `CoinGecko price fetch failed: ${error.message}, using cached: ${cachedLtcPrice}`);
  }

  // Backup fetch via Binance
  try {
    const bRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=LTCEUR', {
      signal: AbortSignal.timeout(5000)
    });
    if (bRes.ok) {
      const bData = await bRes.json();
      if (bData?.price) {
        cachedLtcPrice = parseFloat(bData.price);
        lastPriceFetch = now;
        return cachedLtcPrice;
      }
    }
  } catch (e) {
    // Ignore backup failure
  }

  return cachedLtcPrice;
}

/**
 * Convert EUR amount to LTC
 */
async function eurToLtc(amountEur) {
  const price = await getLtcPriceEur();
  const ltc = amountEur / price;
  return parseFloat(ltc.toFixed(6));
}

/**
 * Verify incoming LTC transactions on blockchain
 * @param {number} expectedLtc - Expected amount in LTC
 * @param {number} minTimestampMs - Minimum timestamp of the transaction (Order creation time)
 * @returns {Promise<{ found: boolean, txid?: string, amountLtc?: number, confirmed?: boolean, explorerUrl?: string, message?: string }>}
 */
async function checkLtcPayment(expectedLtc, minTimestampMs = 0) {
  try {
    // 1. Fetch from LitecoinSpace (Mempool)
    const res = await fetch(`https://litecoinspace.org/api/address/${LTC_ADDRESS}/txs`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`LitecoinSpace HTTP error: ${res.status}`);
    }

    const txs = await res.json();
    if (!Array.isArray(txs) || txs.length === 0) {
      return { found: false, message: 'Aucune transaction détectée sur cette adresse.' };
    }

    const minTimeSec = minTimestampMs ? Math.floor((minTimestampMs - 60000) / 1000) : 0;

    for (const tx of txs) {
      const txTimeSec = tx.status?.block_time || Math.floor(Date.now() / 1000);
      
      // If transaction is older than the order, skip
      if (minTimeSec && txTimeSec < minTimeSec) {
        continue;
      }

      // Check outputs for LTC_ADDRESS
      for (const output of tx.vout || []) {
        if (output.scriptpubkey_address === LTC_ADDRESS) {
          const receivedLtc = output.value / 100000000;
          
          // Check if amount is within 5% tolerance or greater
          const tolerance = expectedLtc * 0.05;
          if (receivedLtc >= (expectedLtc - tolerance)) {
            return {
              found: true,
              txid: tx.txid,
              amountLtc: receivedLtc,
              confirmed: Boolean(tx.status?.confirmed),
              blockHeight: tx.status?.block_height || null,
              explorerUrl: `https://litecoinspace.org/tx/${tx.txid}`
            };
          }
        }
      }
    }

    return { 
      found: false, 
      message: 'Aucune transaction correspondante au montant exact trouvée dans les dernières transactions.' 
    };

  } catch (error) {
    logger.error('CryptoService', 'LTC check failed', { error: error.message });
    return { found: false, error: error.message };
  }
}

module.exports = {
  LTC_ADDRESS,
  getLtcPriceEur,
  eurToLtc,
  checkLtcPayment
};
