package com.banking.model;

import javax.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "account", schema = "banking")
@NamedQueries({
    @NamedQuery(name = "Account.findByCustomer",
                query = "SELECT a FROM Account a WHERE a.customer.customerId = :customerId"),
    @NamedQuery(name = "Account.findByStatus",
                query = "SELECT a FROM Account a WHERE a.status = :status"),
    @NamedQuery(name = "Account.findByType",
                query = "SELECT a FROM Account a WHERE a.accountType = :accountType")
})
public class Account implements Serializable {

    private static final long serialVersionUID = 1L;

    public enum AccountType { SAVINGS, CURRENT, LOAN, FIXED_DEPOSIT }
    public enum AccountStatus { ACTIVE, INACTIVE, FROZEN, CLOSED }

    @Id
    @Column(name = "account_id", length = 20)
    private String accountId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 20)
    private AccountType accountType;

    @Column(name = "balance", nullable = false,
            precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "currency", length = 3)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Column(name = "branch_code", length = 10)
    private String branchCode;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_date", updatable = false)
    private Date createdDate;

    @OneToMany(mappedBy = "fromAccount", fetch = FetchType.LAZY)
    private List<TransactionLog> debitTransactions;

    @OneToMany(mappedBy = "toAccount", fetch = FetchType.LAZY)
    private List<TransactionLog> creditTransactions;

    @PrePersist
    protected void onCreate() {
        createdDate = new Date();
        if (accountId == null || accountId.isEmpty()) {
            accountId = "ACC" + System.currentTimeMillis();
        }
    }

    // Getters and Setters
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }

    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public AccountStatus getStatus() { return status; }
    public void setStatus(AccountStatus status) { this.status = status; }

    public String getBranchCode() { return branchCode; }
    public void setBranchCode(String branchCode) { this.branchCode = branchCode; }

    public Date getCreatedDate() { return createdDate; }

    public List<TransactionLog> getDebitTransactions() { return debitTransactions; }
    public List<TransactionLog> getCreditTransactions() { return creditTransactions; }

    @Override
    public String toString() {
        return "Account{id=" + accountId + ", type=" + accountType
                + ", balance=" + balance + ", status=" + status + "}";
    }
}
