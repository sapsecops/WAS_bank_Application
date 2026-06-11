package com.banking.model;

import javax.persistence.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "txn_log", schema = "banking",
       indexes = {
           @Index(name = "idx_txn_from",      columnList = "from_account"),
           @Index(name = "idx_txn_to",        columnList = "to_account"),
           @Index(name = "idx_txn_timestamp", columnList = "txn_timestamp")
       })
@NamedQueries({
    @NamedQuery(name = "TransactionLog.findByFromAccount",
                query = "SELECT t FROM TransactionLog t WHERE t.fromAccount.accountId = :accountId ORDER BY t.txnTimestamp DESC"),
    @NamedQuery(name = "TransactionLog.findByToAccount",
                query = "SELECT t FROM TransactionLog t WHERE t.toAccount.accountId = :accountId ORDER BY t.txnTimestamp DESC"),
    @NamedQuery(name = "TransactionLog.findByStatus",
                query = "SELECT t FROM TransactionLog t WHERE t.status = :status"),
    @NamedQuery(name = "TransactionLog.findByDateRange",
                query = "SELECT t FROM TransactionLog t WHERE t.txnTimestamp BETWEEN :startDate AND :endDate ORDER BY t.txnTimestamp DESC")
})
public class TransactionLog implements Serializable {

    private static final long serialVersionUID = 1L;

    public enum TxnType { DEBIT, CREDIT, TRANSFER, REVERSAL, FEE, INTEREST }
    public enum TxnStatus { PENDING, SUCCESS, FAILED, REVERSED }

    @Id
    @Column(name = "txn_id", length = 36)
    private String txnId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_account")
    private Account fromAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_account")
    private Account toAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "txn_type", nullable = false, length = 30)
    private TxnType txnType;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private TxnStatus status = TxnStatus.PENDING;

    @Column(name = "reference_no", length = 50)
    private String referenceNo;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "txn_timestamp", updatable = false)
    private Date txnTimestamp;

    @PrePersist
    protected void onCreate() {
        txnTimestamp = new Date();
        if (txnId == null || txnId.isEmpty()) {
            txnId = UUID.randomUUID().toString();
        }
    }

    // Getters and Setters
    public String getTxnId() { return txnId; }
    public void setTxnId(String txnId) { this.txnId = txnId; }

    public Account getFromAccount() { return fromAccount; }
    public void setFromAccount(Account fromAccount) { this.fromAccount = fromAccount; }

    public Account getToAccount() { return toAccount; }
    public void setToAccount(Account toAccount) { this.toAccount = toAccount; }

    public TxnType getTxnType() { return txnType; }
    public void setTxnType(TxnType txnType) { this.txnType = txnType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public TxnStatus getStatus() { return status; }
    public void setStatus(TxnStatus status) { this.status = status; }

    public String getReferenceNo() { return referenceNo; }
    public void setReferenceNo(String referenceNo) { this.referenceNo = referenceNo; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public Date getTxnTimestamp() { return txnTimestamp; }

    @Override
    public String toString() {
        return "TransactionLog{id=" + txnId + ", type=" + txnType
                + ", amount=" + amount + ", status=" + status + "}";
    }
}
