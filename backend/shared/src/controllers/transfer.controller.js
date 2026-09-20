const transferService = require('../services/transfer.service');
const transactionRepository = require('../repositories/transaction.repository');

const createTransfer = async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  const { sourceAccountId, destinationAccountId, amount, currency } = req.body;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Missing Idempotency-Key header' }
    });
  }

  if (!sourceAccountId || !destinationAccountId || !amount || !currency) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Missing required fields' }
    });
  }

  try {
    const result = await transferService.performLocalTransfer(idempotencyKey, {
      sourceAccountId,
      destinationAccountId,
      amount: parseInt(amount),
      currency
    });

    res.json(result);
  } catch (error) {
    console.error('Transfer controller error:', error.message);
    let statusCode = 400;
    if (error.message.includes('NOT_FOUND')) statusCode = 404;

    res.status(statusCode).json({
      success: false,
      error: {
        code: error.message,
        message: getFriendlyMessage(error.message)
      }
    });
  }
};

const getTransferById = (req, res) => {
  const { id } = req.params;
  const transaction = transactionRepository.findById(id);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: { code: 'TRANSACTION_NOT_FOUND', message: `Transaction ${id} not found` }
    });
  }
  res.json({ success: true, data: transaction });
};

const getTransfers = (req, res) => {
  try {
    const transactions = transactionRepository.findAll();
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

function getFriendlyMessage(code) {
  const messages = {
    'SOURCE_ACCOUNT_NOT_FOUND': 'Tài khoản nguồn không tồn tại',
    'DESTINATION_ACCOUNT_NOT_FOUND': 'Tài khoản nhận không tồn tại',
    'INSUFFICIENT_BALANCE': 'Số dư không đủ',
    'SAME_ACCOUNT_TRANSFER': 'Không thể chuyển tiền cho chính mình',
    'INVALID_AMOUNT': 'Số tiền không hợp lệ',
    'SOURCE_ACCOUNT_INACTIVE': 'Tài khoản nguồn đang bị khóa',
    'DESTINATION_ACCOUNT_INACTIVE': 'Tài khoản nhận đang bị khóa'
  };
  return messages[code] || 'Giao dịch thất bại: ' + code;
}

module.exports = {
  createTransfer,
  getTransferById,
  getTransfers
};
