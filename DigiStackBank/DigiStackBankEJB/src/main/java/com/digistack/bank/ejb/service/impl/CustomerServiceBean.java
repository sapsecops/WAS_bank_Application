package com.digistack.bank.ejb.service.impl;
import javax.ejb.Stateless;
import com.digistack.bank.ejb.service.CustomerService;
import com.digistack.bank.persistence.dao.CustomerDAO;
import com.digistack.bank.persistence.dao.impl.CustomerDAOImpl;
@Stateless
public class CustomerServiceBean implements CustomerService{
 private final CustomerDAO customerDAO=new CustomerDAOImpl();
 public boolean login(String customerId,String password){ return customerDAO.validateCustomer(customerId,password); }
}
