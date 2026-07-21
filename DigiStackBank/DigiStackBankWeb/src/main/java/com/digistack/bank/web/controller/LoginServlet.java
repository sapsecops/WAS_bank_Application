package com.digistack.bank.web.controller;
import java.io.IOException;
import javax.ejb.EJB;import javax.servlet.*;import javax.servlet.annotation.WebServlet;import javax.servlet.http.*;
import com.digistack.bank.ejb.service.CustomerService;
@WebServlet("/login")
public class LoginServlet extends HttpServlet{
 @EJB private CustomerService customerService;
 protected void doPost(HttpServletRequest req,HttpServletResponse resp)throws ServletException,IOException{
  String id=req.getParameter("customerId"); String pw=req.getParameter("password");
  if(customerService.login(id,pw)){ req.getSession().setAttribute("customerId",id); resp.sendRedirect("dashboard.jsp");}
  else{ req.setAttribute("error","Invalid Customer ID or Password"); req.getRequestDispatcher("login.jsp").forward(req,resp);}
 }
}
