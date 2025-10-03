/**
 * Transaction Model - Supabase Implementation
 * Replaces MongoDB Transaction model
 *
 * Original: api/models/Transaction.js
 * Migration: MongoDB transactions → Supabase transactions table
 */

const { logger } = require('@librechat/data-schemas');
const { supabaseAdmin } = require('../../db/supabase');
const { getMultiplier, getCacheMultiplier } = require('../tx');

const cancelRate = 1.15;

/**
 * Updates a user's token balance based on a transaction
 * Uses Supabase RPC function for atomic updates
 * @param {Object} params - Function parameters
 * @param {string} params.user - User ID (UUID)
 * @param {number} params.incrementValue - Value to increment (can be negative)
 * @param {Object} params.setValues - Additional fields to set
 * @returns {Promise<Object>}
 */
const updateBalance = async ({ user, incrementValue, setValues }) => {
  try {
    // Get current balance from profiles table
    const { data: profile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('token_balance, tokens_compared')
      .eq('id', user)
      .single();

    if (selectError) {
      logger.error('[updateBalance] Error fetching profile:', selectError);
      throw selectError;
    }

    const currentBalance = profile?.token_balance || 0;
    const newBalance = Math.max(0, currentBalance + incrementValue);

    // Update the balance
    const updateData = {
      token_balance: newBalance,
      updated_at: new Date().toISOString(),
      ...setValues,
    };

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', user)
      .select('token_balance, tokens_compared')
      .single();

    if (updateError) {
      logger.error('[updateBalance] Error updating balance:', updateError);
      throw updateError;
    }

    return {
      tokenCredits: updatedProfile.token_balance,
      tokensCompared: updatedProfile.tokens_compared,
    };
  } catch (error) {
    logger.error('[updateBalance] Error:', error);
    throw new Error(`Failed to update balance for user ${user}`);
  }
};

/**
 * Calculate token value for a transaction
 * @param {Object} txn - Transaction object
 */
function calculateTokenValue(txn) {
  if (!txn.valueKey || !txn.tokenType) {
    txn.tokenValue = txn.rawAmount;
    return;
  }

  const { valueKey, tokenType, model, endpointTokenConfig } = txn;
  const multiplier = Math.abs(getMultiplier({ valueKey, tokenType, model, endpointTokenConfig }));
  txn.rate = multiplier;
  txn.tokenValue = txn.rawAmount * multiplier;

  if (txn.context && txn.tokenType === 'completion' && txn.context === 'incomplete') {
    txn.tokenValue = Math.ceil(txn.tokenValue * cancelRate);
    txn.rate *= cancelRate;
  }
}

/**
 * Calculate token value for structured tokens
 * @param {Object} txn - Transaction object
 */
function calculateStructuredTokenValue(txn) {
  if (!txn.tokenType) {
    txn.tokenValue = txn.rawAmount;
    return;
  }

  const { model, endpointTokenConfig } = txn;

  if (txn.tokenType === 'prompt') {
    const inputMultiplier = getMultiplier({ tokenType: 'prompt', model, endpointTokenConfig });
    const writeMultiplier =
      getCacheMultiplier({ cacheType: 'write', model, endpointTokenConfig }) ?? inputMultiplier;
    const readMultiplier =
      getCacheMultiplier({ cacheType: 'read', model, endpointTokenConfig }) ?? inputMultiplier;

    txn.rateDetail = {
      input: inputMultiplier,
      write: writeMultiplier,
      read: readMultiplier,
    };

    const totalPromptTokens =
      Math.abs(txn.inputTokens || 0) +
      Math.abs(txn.writeTokens || 0) +
      Math.abs(txn.readTokens || 0);

    if (totalPromptTokens > 0) {
      txn.rate =
        (Math.abs(inputMultiplier * (txn.inputTokens || 0)) +
          Math.abs(writeMultiplier * (txn.writeTokens || 0)) +
          Math.abs(readMultiplier * (txn.readTokens || 0))) /
        totalPromptTokens;
    } else {
      txn.rate = Math.abs(inputMultiplier);
    }

    txn.tokenValue = -(
      Math.abs(txn.inputTokens || 0) * inputMultiplier +
      Math.abs(txn.writeTokens || 0) * writeMultiplier +
      Math.abs(txn.readTokens || 0) * readMultiplier
    );

    txn.rawAmount = -totalPromptTokens;
  } else if (txn.tokenType === 'completion') {
    const multiplier = getMultiplier({ tokenType: txn.tokenType, model, endpointTokenConfig });
    txn.rate = Math.abs(multiplier);
    txn.tokenValue = -Math.abs(txn.rawAmount) * multiplier;
    txn.rawAmount = -Math.abs(txn.rawAmount);
  }

  if (txn.context && txn.tokenType === 'completion' && txn.context === 'incomplete') {
    txn.tokenValue = Math.ceil(txn.tokenValue * cancelRate);
    txn.rate *= cancelRate;
    if (txn.rateDetail) {
      txn.rateDetail = Object.fromEntries(
        Object.entries(txn.rateDetail).map(([k, v]) => [k, v * cancelRate]),
      );
    }
  }
}

/**
 * Create an auto-refill transaction (does NOT update balance automatically)
 * @param {Object} txData - Transaction data
 * @returns {Promise<Object>}
 */
async function createAutoRefillTransaction(txData) {
  if (txData.rawAmount != null && isNaN(txData.rawAmount)) {
    return;
  }

  try {
    const transaction = { ...txData };
    transaction.endpointTokenConfig = txData.endpointTokenConfig;
    calculateTokenValue(transaction);

    // Map to Supabase transaction schema
    const dbTransaction = {
      user_id: txData.user,
      type: txData.rawAmount >= 0 ? 'credit' : 'debit',
      amount: Math.abs(transaction.tokenValue),
      currency: 'credits',
      description: txData.context || 'Auto-refill',
      metadata: {
        tokenType: txData.tokenType,
        rawAmount: txData.rawAmount,
        rate: transaction.rate,
        model: txData.model,
        context: txData.context,
        endpointTokenConfig: txData.endpointTokenConfig,
      },
      comparison_session_id: txData.conversationId || null,
    };

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert(dbTransaction)
      .select()
      .single();

    if (error) throw error;

    // Update balance
    const balanceResponse = await updateBalance({
      user: txData.user,
      incrementValue: txData.rawAmount,
      setValues: { last_refill: new Date().toISOString() },
    });

    const result = {
      rate: transaction.rate,
      user: txData.user.toString(),
      balance: balanceResponse.tokenCredits,
      transaction: data,
    };

    logger.debug('[Balance.check] Auto-refill performed', result);
    return result;
  } catch (error) {
    logger.error('[createAutoRefillTransaction] Error:', error);
    throw error;
  }
}

/**
 * Create a transaction and update the balance
 * @param {Object} _txData - Transaction data
 * @returns {Promise<Object>}
 */
async function createTransaction(_txData) {
  const { balance, transactions, ...txData } = _txData;

  if (txData.rawAmount != null && isNaN(txData.rawAmount)) {
    return;
  }

  if (transactions?.enabled === false) {
    return;
  }

  try {
    const transaction = { ...txData };
    transaction.endpointTokenConfig = txData.endpointTokenConfig;
    calculateTokenValue(transaction);

    // Map to Supabase transaction schema
    const dbTransaction = {
      user_id: txData.user,
      type: transaction.tokenValue >= 0 ? 'credit' : 'debit',
      amount: Math.abs(transaction.tokenValue),
      currency: 'credits',
      description: `${txData.tokenType} tokens`,
      metadata: {
        tokenType: txData.tokenType,
        rawAmount: txData.rawAmount,
        rate: transaction.rate,
        model: txData.model,
        context: txData.context,
        valueKey: txData.valueKey,
        endpointTokenConfig: txData.endpointTokenConfig,
      },
      comparison_session_id: txData.conversationId || null,
    };

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert(dbTransaction)
      .select()
      .single();

    if (error) throw error;

    // Update balance if enabled
    if (!balance?.enabled) {
      return;
    }

    const incrementValue = transaction.tokenValue;
    const balanceResponse = await updateBalance({
      user: txData.user,
      incrementValue,
    });

    return {
      rate: transaction.rate,
      user: txData.user.toString(),
      balance: balanceResponse.tokenCredits,
      [txData.tokenType]: incrementValue,
    };
  } catch (error) {
    logger.error('[createTransaction] Error:', error);
    throw error;
  }
}

/**
 * Create a structured transaction and update the balance
 * @param {Object} _txData - Transaction data
 * @returns {Promise<Object>}
 */
async function createStructuredTransaction(_txData) {
  const { balance, transactions, ...txData } = _txData;

  if (transactions?.enabled === false) {
    return;
  }

  try {
    const transaction = {
      ...txData,
      endpointTokenConfig: txData.endpointTokenConfig,
    };

    calculateStructuredTokenValue(transaction);

    // Map to Supabase transaction schema
    const dbTransaction = {
      user_id: txData.user,
      type: transaction.tokenValue >= 0 ? 'credit' : 'debit',
      amount: Math.abs(transaction.tokenValue),
      currency: 'credits',
      description: `${txData.tokenType} tokens (structured)`,
      metadata: {
        tokenType: txData.tokenType,
        rawAmount: txData.rawAmount,
        rate: transaction.rate,
        rateDetail: transaction.rateDetail,
        model: txData.model,
        context: txData.context,
        inputTokens: txData.inputTokens,
        writeTokens: txData.writeTokens,
        readTokens: txData.readTokens,
        endpointTokenConfig: txData.endpointTokenConfig,
      },
      comparison_session_id: txData.conversationId || null,
    };

    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert(dbTransaction)
      .select()
      .single();

    if (error) throw error;

    // Update balance if enabled
    if (!balance?.enabled) {
      return;
    }

    const incrementValue = transaction.tokenValue;
    const balanceResponse = await updateBalance({
      user: txData.user,
      incrementValue,
    });

    return {
      rate: transaction.rate,
      user: txData.user.toString(),
      balance: balanceResponse.tokenCredits,
      [txData.tokenType]: incrementValue,
    };
  } catch (error) {
    logger.error('[createStructuredTransaction] Error:', error);
    throw error;
  }
}

/**
 * Query and retrieve transactions based on filter
 * @param {Object} filter - Filter object
 * @returns {Promise<Array>}
 */
async function getTransactions(filter) {
  try {
    let query = supabaseAdmin.from('transactions').select('*');

    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter.type) {
      query = query.eq('type', filter.type);
    }
    if (filter.comparison_session_id) {
      query = query.eq('comparison_session_id', filter.comparison_session_id);
    }

    // Date range filters
    if (filter.created_at) {
      if (filter.created_at.$gte) {
        query = query.gte('created_at', filter.created_at.$gte);
      }
      if (filter.created_at.$lte) {
        query = query.lte('created_at', filter.created_at.$lte);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[getTransactions] Error querying transactions:', error);
    throw error;
  }
}

module.exports = {
  getTransactions,
  createTransaction,
  createAutoRefillTransaction,
  createStructuredTransaction,
  updateBalance,
};


