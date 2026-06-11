package com.banking.ejb;

import com.banking.exception.BankingException;
import com.banking.exception.BankingException.ErrorCode;
import com.banking.model.Account;
import com.banking.model.Account.AccountStatus;
import com.banking.model.TransactionLog;
import com.banking.model.TransactionLog.TxnStatus;
import com.banking.model.TransactionLog.TxnType;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.math.BigDecimal;

/**
 * Handles all fund movement between accounts.
 * All methods run in a REQUIRED CMT transaction — either
 * the whole transfer commits or everything rolls back atomically.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.REQUIRED)
public class FundTransferBean {

    private static final Logger LOG = LogManager.getLogger(FundTransferBean.class);

    private static final BigDecimal MIN_BALANCE = new BigDecimal("0.00");

    @PersistenceContext(unitName = "BankingPU")
    private EntityManager em;

    /**
     * Transfer funds between two accounts (atomic debit + credit).
     *
     * @param fromAccountId source account
     * @param toAccountId   destination account
     * @param amount        positive transfer amount
     * @param remarks       optional narration
     * @return completed TransactionLog record
     * @throws BankingException on validation or business rule failure
     */
    public TransactionLog transfer(String fromAccountId, String toAccountId,
                                   BigDecimal amount, String remarks)
            throws BankingException {

        LOG.info("Transfer initiated: {} -> {} amount={}", fromAccountId, toAccountId, amount);

        // --- Validation ---
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException(ErrorCode.INVALID_AMOUNT,
                    "Transfer amount must be positive");
        }
        if (fromAccountId.equals(toAccountId)) {
            throw new BankingException(ErrorCode.INVALID_AMOUNT,
                    "Source and destination accounts cannot be the same");
        }

        // --- Load accounts (pessimistic lock to prevent concurrent overdraft) ---
        Account from = em.find(Account.class, fromAccountId,
                javax.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (from == null) {
            throw new BankingException(ErrorCode.ACCOUNT_NOT_FOUND,
                    "Source account not found: " + fromAccountId);
        }

        Account to = em.find(Account.class, toAccountId,
                javax.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (to == null) {
            throw new BankingException(ErrorCode.ACCOUNT_NOT_FOUND,
                    "Destination account not found: " + toAccountId);
        }

        // --- Business rules ---
        if (from.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(ErrorCode.ACCOUNT_INACTIVE,
                    "Source account is not active: " + fromAccountId);
        }
        if (to.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(ErrorCode.ACCOUNT_INACTIVE,
                    "Destination account is not active: " + toAccountId);
        }
        if (from.getBalance().subtract(amount).compareTo(MIN_BALANCE) < 0) {
            throw new BankingException(ErrorCode.INSUFFICIENT_FUNDS,
                    "Insufficient funds in account: " + fromAccountId
                    + " (balance=" + from.getBalance() + ", requested=" + amount + ")");
        }

        // --- Execute transfer ---
        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));
        em.merge(from);
        em.merge(to);

        // --- Log the transaction ---
        TransactionLog txn = new TransactionLog();
        txn.setFromAccount(from);
        txn.setToAccount(to);
        txn.setTxnType(TxnType.TRANSFER);
        txn.setAmount(amount);
        txn.setStatus(TxnStatus.SUCCESS);
        txn.setRemarks(remarks);
        em.persist(txn);
        em.flush();

        LOG.info("Transfer complete: txnId={} from={} to={} amount={}",
                txn.getTxnId(), fromAccountId, toAccountId, amount);

        return txn;
    }

    /**
     * Credit (deposit) funds into an account.
     */
    public TransactionLog credit(String toAccountId, BigDecimal amount,
                                 String remarks) throws BankingException {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException(ErrorCode.INVALID_AMOUNT,
                    "Credit amount must be positive");
        }

        Account to = em.find(Account.class, toAccountId,
                javax.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (to == null) {
            throw new BankingException(ErrorCode.ACCOUNT_NOT_FOUND,
                    "Account not found: " + toAccountId);
        }
        if (to.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(ErrorCode.ACCOUNT_INACTIVE,
                    "Account is not active: " + toAccountId);
        }

        to.setBalance(to.getBalance().add(amount));
        em.merge(to);

        TransactionLog txn = new TransactionLog();
        txn.setToAccount(to);
        txn.setTxnType(TxnType.CREDIT);
        txn.setAmount(amount);
        txn.setStatus(TxnStatus.SUCCESS);
        txn.setRemarks(remarks);
        em.persist(txn);
        em.flush();

        LOG.info("Credit applied: txnId={} account={} amount={}",
                txn.getTxnId(), toAccountId, amount);
        return txn;
    }

    /**
     * Debit (withdrawal) funds from an account.
     */
    public TransactionLog debit(String fromAccountId, BigDecimal amount,
                                String remarks) throws BankingException {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BankingException(ErrorCode.INVALID_AMOUNT,
                    "Debit amount must be positive");
        }

        Account from = em.find(Account.class, fromAccountId,
                javax.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (from == null) {
            throw new BankingException(ErrorCode.ACCOUNT_NOT_FOUND,
                    "Account not found: " + fromAccountId);
        }
        if (from.getStatus() != AccountStatus.ACTIVE) {
            throw new BankingException(ErrorCode.ACCOUNT_INACTIVE,
                    "Account is not active: " + fromAccountId);
        }
        if (from.getBalance().subtract(amount).compareTo(MIN_BALANCE) < 0) {
            throw new BankingException(ErrorCode.INSUFFICIENT_FUNDS,
                    "Insufficient funds: balance=" + from.getBalance());
        }

        from.setBalance(from.getBalance().subtract(amount));
        em.merge(from);

        TransactionLog txn = new TransactionLog();
        txn.setFromAccount(from);
        txn.setTxnType(TxnType.DEBIT);
        txn.setAmount(amount);
        txn.setStatus(TxnStatus.SUCCESS);
        txn.setRemarks(remarks);
        em.persist(txn);
        em.flush();

        LOG.info("Debit applied: txnId={} account={} amount={}",
                txn.getTxnId(), fromAccountId, amount);
        return txn;
    }
}
