package com.banking.ejb;

import com.banking.exception.BankingException;
import com.banking.exception.BankingException.ErrorCode;
import com.banking.model.Customer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import java.util.List;

@Stateless
public class CustomerServiceBean {

    private static final Logger LOG = LogManager.getLogger(CustomerServiceBean.class);

    @PersistenceContext(unitName = "BankingPU")
    private EntityManager em;

    /**
     * Register a new customer.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public Customer createCustomer(String firstName, String lastName,
                                   String email, String phone, String address)
            throws BankingException {

        // Check duplicate email
        try {
            TypedQuery<Customer> q = em.createNamedQuery(
                    "Customer.findByEmail", Customer.class);
            q.setParameter("email", email);
            q.getSingleResult();
            throw new BankingException(ErrorCode.DUPLICATE_CUSTOMER,
                    "Customer already exists with email: " + email);
        } catch (NoResultException e) {
            // Expected — no duplicate
        }

        Customer customer = new Customer();
        customer.setFirstName(firstName);
        customer.setLastName(lastName);
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setAddress(address);
        customer.setKycStatus("PENDING");

        em.persist(customer);
        em.flush();

        LOG.info("Customer created: {}", customer.getCustomerId());
        return customer;
    }

    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public Customer findById(String customerId) throws BankingException {
        Customer c = em.find(Customer.class, customerId);
        if (c == null) {
            throw new BankingException(ErrorCode.CUSTOMER_NOT_FOUND,
                    "Customer not found: " + customerId);
        }
        return c;
    }

    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    public List<Customer> findAll() {
        return em.createNamedQuery("Customer.findAll", Customer.class)
                 .getResultList();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public Customer updateKycStatus(String customerId, String status)
            throws BankingException {
        Customer customer = findById(customerId);
        customer.setKycStatus(status);
        em.merge(customer);
        LOG.info("KYC updated for {}: {}", customerId, status);
        return customer;
    }
}
