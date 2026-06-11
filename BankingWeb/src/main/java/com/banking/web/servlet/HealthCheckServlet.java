package com.banking.web.servlet;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import javax.annotation.Resource;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

@WebServlet("/health")
public class HealthCheckServlet extends HttpServlet {

    private static final Logger LOG = LogManager.getLogger(HealthCheckServlet.class);

    @Resource(name = "jdbc/BankingDS")
    private DataSource dataSource;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse res)
            throws ServletException, IOException {

        res.setContentType("application/json");
        PrintWriter out = res.getWriter();

        boolean dbOk = false;
        String dbVersion = "unknown";
        String dbSchema  = "unknown";
        long responseMs  = 0;

        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection();
             Statement  stmt = conn.createStatement()) {

            ResultSet rs = stmt.executeQuery(
                "SELECT version(), current_schema()");
            if (rs.next()) {
                dbVersion = rs.getString(1);
                dbSchema  = rs.getString(2);
            }
            dbOk = true;
            responseMs = System.currentTimeMillis() - start;

        } catch (Exception e) {
            LOG.error("Health check DB failure", e);
            res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }

        String status = dbOk ? "UP" : "DOWN";
        out.println("{");
        out.println("  \"status\": \"" + status + "\",");
        out.println("  \"application\": \"BankingApp\",");
        out.println("  \"datasource\": \"jdbc/BankingDS\",");
        out.println("  \"db_status\": \"" + (dbOk ? "CONNECTED" : "FAILED") + "\",");
        out.println("  \"db_version\": \"" + dbVersion + "\",");
        out.println("  \"db_schema\": \"" + dbSchema + "\",");
        out.println("  \"db_response_ms\": " + responseMs + ",");
        out.println("  \"server\": \"" + req.getServerName() + ":" + req.getServerPort() + "\"");
        out.println("}");
    }
}
