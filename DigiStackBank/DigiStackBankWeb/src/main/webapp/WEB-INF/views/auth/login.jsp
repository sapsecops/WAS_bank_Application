<%@ page contentType="text/html;charset=UTF-8" language="java"%>

<!DOCTYPE html>

<html>

<head>

<title>DigiStack Bank</title>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1">

<link rel="stylesheet"
href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">

<link rel="stylesheet"
href="css/style.css">

</head>

<body>

<div class="container">

    <div class="row justify-content-center">

        <div class="col-md-5">

            <div class="card shadow mt-5">

                <div class="card-header bg-primary text-white text-center">

                    <h3>DigiStack Bank</h3>

                    <small>Secure Internet Banking</small>

                </div>

                <div class="card-body">

                    <form action="login" method="post">

                        <div class="form-group">

                            <label>Customer ID</label>

                            <input type="text"
                                   name="customerId"
                                   class="form-control">

                        </div>

                        <div class="form-group">

                            <label>Password</label>

                            <input type="password"
                                   name="password"
                                   class="form-control">

                        </div>

                        <div class="form-check">

                            <input type="checkbox"
                                   class="form-check-input">

                            <label class="form-check-label">

                                Remember Me

                            </label>

                        </div>

                        <br>

                        <button
                            class="btn btn-primary btn-block">

                            Login Securely

                        </button>

                    </form>

                </div>

            </div>

        </div>

    </div>

</div>

</body>

</html>