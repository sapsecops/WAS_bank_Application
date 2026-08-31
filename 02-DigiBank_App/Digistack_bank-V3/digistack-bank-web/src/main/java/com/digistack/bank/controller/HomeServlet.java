package com.digistack.bank.controller;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.logging.Logger;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/home")
public class HomeServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final Logger logger = Logger.getLogger(HomeServlet.class.getName());

    // Direct JDBC connection details — temporary, for v1 only.
    // Replaced by a JNDI-managed DataSource in Version 7.
    private static final String DB_URL = "jdbc:postgresql://192.168.10.30:5432/digistack_bank";
    private static final String DB_USER = "digistack_app";
    private static final String DB_PASSWORD = "Wasadmin@951951"; 

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String welcomeMessage = "Unable to reach database.";

        try {
            Class.forName("org.postgresql.Driver");

            try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
                 Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(
                         "SELECT config_value FROM app_config WHERE config_key = 'welcome_message'")) {

                if (rs.next()) {
                    welcomeMessage = rs.getString("config_value");
                    logger.info("HomeServlet: successfully read app_config value: " + welcomeMessage);
                } else {
                    logger.warning("HomeServlet: app_config row not found.");
                }
            }

        } catch (ClassNotFoundException e) {
            logger.severe("HomeServlet: PostgreSQL JDBC driver not found on classpath: " + e.getMessage());
        } catch (SQLException e) {
            logger.severe("HomeServlet: Database connection/query failed: " + e.getMessage());
        }

        request.setAttribute("welcomeMessage", welcomeMessage);
        request.getRequestDispatcher("/Home.jsp").forward(request, response);
    }
}