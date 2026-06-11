package com.banking.model;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "customer", schema = "banking",
       uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@NamedQueries({
    @NamedQuery(name = "Customer.findAll",
                query = "SELECT c FROM Customer c ORDER BY c.lastName"),
    @NamedQuery(name = "Customer.findByEmail",
                query = "SELECT c FROM Customer c WHERE c.email = :email"),
    @NamedQuery(name = "Customer.findByKycStatus",
                query = "SELECT c FROM Customer c WHERE c.kycStatus = :kycStatus")
})
public class Customer implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "customer_id", length = 20)
    private String customerId;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "kyc_status", length = 20)
    private String kycStatus = "PENDING";  // PENDING, VERIFIED, REJECTED

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_date", updatable = false)
    private Date createdDate;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "updated_date")
    private Date updatedDate;

    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL)
    private List<Account> accounts;

    @PrePersist
    protected void onCreate() {
        createdDate = new Date();
        updatedDate = new Date();
        if (customerId == null || customerId.isEmpty()) {
            customerId = "CUST" + System.currentTimeMillis();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = new Date();
    }

    // Getters and Setters
    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return firstName + " " + lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getKycStatus() { return kycStatus; }
    public void setKycStatus(String kycStatus) { this.kycStatus = kycStatus; }

    public Date getCreatedDate() { return createdDate; }
    public Date getUpdatedDate() { return updatedDate; }

    public List<Account> getAccounts() { return accounts; }
    public void setAccounts(List<Account> accounts) { this.accounts = accounts; }

    @Override
    public String toString() {
        return "Customer{id=" + customerId + ", name=" + getFullName()
                + ", kyc=" + kycStatus + "}";
    }
}
