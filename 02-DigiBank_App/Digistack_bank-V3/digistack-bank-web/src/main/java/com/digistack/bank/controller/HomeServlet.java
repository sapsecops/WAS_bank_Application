package com.digistack.bank.controller;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.PreparedStatement;
import java.util.logging.Logger;

import javax.naming.InitialContext;
import javax.naming.NamingException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

@WebServlet("/home")
public class HomeServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    private static final Logger logger =
            Logger.getLogger(HomeServlet.class.getName());

    // This is the WebSphere JNDI name.
    // WebSphere will map this name to the PostgreSQL DataSource.
    private static final String DATASOURCE_JNDI =
            "jdbc/DigiStackBankDS";

    @Override
    protected void doGet(HttpServletRequest request,
                         HttpServletResponse response)
            throws ServletException, IOException {

        String welcomeMessage = "Unable to reach database.";

        try {
            // Ask WebSphere for the DataSource
            InitialContext context = new InitialContext();

            DataSource dataSource =
                    (DataSource) context.lookup(DATASOURCE_JNDI);

            // Ask the DataSource for a database connection
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(
                     "SELECT config_value " +
                     "FROM app_config " +
                     "WHERE config_key = ?")) {

                stmt.setString(1, "welcome_message");

                try (ResultSet rs = stmt.executeQuery()) {

                    if (rs.next()) {

                        welcomeMessage =
                                rs.getString("config_value");

                        logger.info(
                            "HomeServlet: successfully read app_config value: "
                            + welcomeMessage
                        );

                    } else {

                        logger.warning(
                            "HomeServlet: app_config row not found."
                        );
                    }
                }
            }

        } catch (NamingException e) {

            logger.severe(
                "HomeServlet: WebSphere DataSource lookup failed: "
                + e.getMessage()
            );

        } catch (SQLException e) {

            logger.severe(
                "HomeServlet: Database connection/query failed: "
                + e.getMessage()
            );
        }

        request.setAttribute("welcomeMessage", welcomeMessage);

        request.getRequestDispatcher("/Home.jsp")
               .forward(request, response);
    }
}
