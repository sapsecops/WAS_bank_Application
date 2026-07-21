package com.digistack.bank.web.filter;

import java.io.IOException;
import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.*;

@WebFilter("/*")
public class AuthenticationFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request,
                         ServletResponse response,
                         FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req =
                (HttpServletRequest) request;

        HttpServletResponse res =
                (HttpServletResponse) response;

        String uri = req.getRequestURI();

        if (uri.endsWith("login")
                || uri.endsWith("login.jsp")
                || uri.contains("/css/")
                || uri.contains("/js/")
                || uri.contains("/images/")) {

            chain.doFilter(request, response);
            return;
        }

        HttpSession session = req.getSession(false);

        if (session == null
                || session.getAttribute("customer") == null) {

            res.sendRedirect(req.getContextPath() + "/login");

            return;
        }

        chain.doFilter(request, response);
    }
}