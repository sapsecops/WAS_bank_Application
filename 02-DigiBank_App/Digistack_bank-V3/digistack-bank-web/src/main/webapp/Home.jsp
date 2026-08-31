<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DigiStack Bank</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --db-navy: #0b2545;
            --db-blue: #13315c;
            --db-gold: #c9a227;
            --db-bg: #f4f6f9;
        }
        body {
            background-color: var(--db-bg);
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        .db-navbar {
            background: linear-gradient(90deg, var(--db-navy), var(--db-blue));
        }
        .db-navbar .navbar-brand {
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #fff !important;
        }
        .db-navbar .navbar-brand span {
            color: var(--db-gold);
        }
        .db-hero {
            background: linear-gradient(135deg, var(--db-navy) 0%, var(--db-blue) 100%);
            color: #fff;
            padding: 4rem 0;
            border-radius: 0 0 24px 24px;
            opacity: 0;
            animation: fadeInUp 0.8s ease-out forwards;
        }
        .db-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            opacity: 0;
            animation: fadeInUp 0.8s ease-out 0.2s forwards;
        }
        .db-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 28px rgba(0,0,0,0.12);
        }
        .db-accent {
            color: var(--db-gold);
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>

    <nav class="navbar navbar-expand-lg db-navbar shadow-sm">
        <div class="container">
            <a class="navbar-brand" href="#">DigiStack <span>Bank</span></a>
        </div>
    </nav>

    <header class="db-hero text-center">
        <div class="container">
            <h1 class="display-5 fw-bold">Welcome to DigiStack Bank</h1>
            <p class="lead mb-0">Secure. Reliable. Built on enterprise-grade infrastructure.</p>
        </div>
    </header>

    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card db-card p-4">
                    <div class="card-body text-center">
                        <h5 class="card-title text-muted mb-3">System Status</h5>
                        <p class="fs-5">
                            <span class="db-accent">&#9679;</span>
                            ${welcomeMessage}
                        </p>
                        <p class="text-muted small mb-0">Live read from PostgreSQL via WebSphere-managed JDBC.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="text-center text-muted py-4 small">
        &copy; DigiStack Bank &mdash; Training Environment
    </footer>

</body>
</html>