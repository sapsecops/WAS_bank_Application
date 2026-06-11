package com.banking.ejb;

import com.banking.exception.BankingException;
import com.banking.exception.BankingException.ErrorCode;
import com.banking.model.Account;
import com.banking.model.Account.AccountStatus;
import com.banking.model.Account.AccountType;
import com.banking.model.Customer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import java.math.BigDecimal;
import java.util.List;

@Stateless
@TransactionAttribute(TransactionAttributeType.REQUIRED)
public class AccountServiceBean {

    private static final Logger LOG = LogManager.getLogger(AccountServiceBean.class);

    @PersistenceContext(unitName = "BankingPU")
    private EntityManager em;

    /**
     * Create a new bank account for an existing customer.
     */
    public Account createAccount(String customerId, AccountType type,
                                 String branchCode, String currency)
            throws BankingException {

        LOG.info("Creating {} account for customer {}", type, customerId);

        Customer customer = em.find(Customer.class, customerId);
        if (customer == null) {
            throw new BankingException(ErrorCode.CUSTOMER_NOT_FOUND,
                    "Customer not found: " + customerId);
        }

        Account account = new Account();
        account.setCustomer(customer);
        account.setAccountType(type);
        account.setBranchCode(branchCode);
        account.setCurrency(currency != null ? currency : "INR");
        account.setBalance(BigDecimal.ZERO);
        account.setStatus(AccountStatus.ACTIVE);

        em.persist(account);
        em.flush();

        LOG.info("Account created: {}", account.getAccountId());
        return account;
    }

    /**
     * Find account by ID.
     */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public Account findById(String accountId) throws BankingException {
        Account account = em.find(Account.class, accountId);
        if (account == null) {
            throw new BankingException(ErrorCode.ACCOUNT_NOT_FOUND,
                    "Account not found: " + accountId);
        }
        return account;
    }

    /**
     * Get all accounts for a customer.
     */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public List<Account> findByCustomer(String customerId) {
        TypedQuery<Account> q = em.createNamedQuery(
                "Account.findByCustomer", Account.class);
        q.setParameter("customerId", customerId);
        return q.getResultList();
    }

    /**
     * Get current balance.
     */
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public BigDecimal getBalance(String accountId) throws BankingException {
        return findById(accountId).getBalance();
    }

    /**
     * Freeze an account (TELLER / ADMIN only).
     */
    public void freezeAccount(String accountId) throws BankingException {
        Account account = findById(accountId);
        account.setStatus(AccountStatus.FROZEN);
        em.merge(account);
        LOG.warn("Account frozen: {}", accountId);
    }

    /**
     * Close an account.
     */
    public void closeAccount(String accountId) throws BankingException {
        Account account = findById(accountId);
        if (account.getBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new BankingException(ErrorCode.INVALID_AMOUNT,
                    "Cannot close account with non-zero balance: " + accountId);
        }
        account.setStatus(AccountStatus.CLOSED);
        em.merge(account);
        LOG.info("Account closed: {}", accountId);
    }
}
