<!DOCTYPE html>
<html>
<head lang="pt-br">
    <meta charset="UTF-8">

    <!--Page Title-->
    <title>Portifólio - Gustavo Henrique</title>

    <!--Meta Keywords and Description-->
    <meta name="keywords" content="">
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>

    <!--Favicon-->
    <link rel="shortcut icon" href="images/icon.ico" title="icon"/>

    <!-- Main CSS Files -->
    <link rel="stylesheet" href="css/style.css">

    *<!-- Namari Color CSS -->
    <link rel="stylesheet" href="css/namari-color-login.css">

    <!--Icon Fonts - Font Awesome Icons-->
    <link rel="stylesheet" href="css/font-awesome.min.css">

    <!-- Animate CSS-->
    <link href="css/animate.css" rel="stylesheet" type="text/css">

    <!--Google Webfonts-->
    <link href='https://fonts.googleapis.com/css?family=Open+Sans:400,300,600,700,800' rel='stylesheet' type='text/css'>
</head>
<body>
<!-- Preloader -->
<div id="preloader">
    <div id="status" class="la-ball-triangle-path">
        <div></div>
        <div></div>
        <div></div>
    </div>
</div>
<!--End of Preloader-->

<div class="page-border" data-wow-duration="0.7s" data-wow-delay="0.2s">
    <div class="top-border wow fadeInDown animated" style="visibility: visible; animation-name: fadeInDown;"></div>
    <div class="right-border wow fadeInRight animated" style="visibility: visible; animation-name: fadeInRight;"></div>
    <div class="bottom-border wow fadeInUp animated" style="visibility: visible; animation-name: fadeInUp;"></div>
    <div class="left-border wow fadeInLeft animated" style="visibility: visible; animation-name: fadeInLeft;"></div>
</div>

<div id="wrapper">

    <header id="banner" class="scrollto clearfix" data-enllax-ratio=".5">
        <div id="header" class="nav-collapse">
            <div class="row clearfix">
                <div class="col-1">

                    <!--Logo-->
                    <div id="logo">

                        <!--Logo that is shown on the banner-->
                        <a href="index.php"> <img src="images/logo1.png" id="banner-logo" alt="Landing Page"/> </a>
                        <!--End of Banner Logo-->

                        <!--The Logo that is shown on the sticky Navigation Bar-->
                        <img src="images/logo2.png" id="navigation-logo" alt="Landing Page"/>
                        <!--End of Navigation Logo-->

                    </div>
                    <!--End of Logo-->

                    <aside>

                        <!--Social Icons in Header-->
                        <ul class="social-icons">
                            <li>
                                <a target="_blank" title="Instagram" href="http://www.instagram.com/gustavoxuxus">
                                    <i class="fa fa-instagram fa-1x"></i><span>Instagram</span>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" title="linkedin" href="https://www.linkedin.com/in/gustavo-henrique-santos-machado-22379440/">
                                    <i class="fa fa-linkedin fa-1x"></i><span>Linkedin</span>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" title="github" href="https://github.com/gustavohsmachado">
                                    <i class="fa fa-github fa-1x"></i><span>GitHub</span>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" title="spotify" href="https://open.spotify.com/user/gustavoxuxu">
                                    <i class="fa fa-spotify fa-1x"></i><span>Spotify</span>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" title="whatsapp" href="https://wa.me/5531986585208">
                                    <i class="fa fa-whatsapp fa-1x"></i><span>Whatsapp</span>
                                </a>
                            </li>
                        </ul>
                        <!--End of Social Icons in Header-->

                    </aside>

                    <!--Main Navigation-->
                    <nav id="nav-main">
                        <ul>
                            <li>
                                <a href="#" onclick="redirecionarIndex();">Home</a>
                                    <script>
                                        function redirecionarIndex() {
                                            window.location.href = 'index.php';
                                        }
                                    </script>
                            </li>
                    </nav>
                    <!--End of Main Navigation-->

                    <div id="nav-trigger"><span></span></div>
                    <nav id="nav-mobile"></nav>

                </div>
            </div>
        </div><!--End of Header-->

        <!--Banner Content-->
        <div id="banner-content" class="row clearfix">

            <h2> Ocorreu um error durante o Login </h2>
                <?php

                    if (isset($_SESSION["error_message"])) {

                        echo "<p>{$_SESSION["error_message"]}</p>";

                        unset($_SESSION["error_message"]);

                    } else {

                        echo "<p>Usuário ou Senha Incorretos</p>";

                    }

                ?>

                <p><a href="login.php">Voltar para a página de Login</a></p>

        </div><!--End of Row-->
    </header>   

    <!--Footer-->
    <footer id="landing-footer" class="clearfix">
        <div class="row clearfix">

            <p id="copyright" class="col-2">Made with love by <a href="https://www.shapingrain.com">ShapingRain</a></p>

            <!--Social Icons in Footer-->
            <ul class="col-2 social-icons">
                <li>
                    <a target="_blank" title="Instagram" href="http://www.instagram.com/gustavoxuxus">
                        <i class="fa fa-instagram fa-1x"></i><span>Instagram</span>
                    </a>
                </li>
                <li>
                    <a target="_blank" title="linkedin" href="https://www.linkedin.com/in/gustavo-henrique-santos-machado-22379440/">
                        <i class="fa fa-linkedin fa-1x"></i><span>Linkedin</span>
                    </a>
                </li>
                <li>
                    <a target="_blank" title="github" href="https://github.com/gustavohsmachado">
                        <i class="fa fa-github fa-1x"></i><span>GitHub</span>
                    </a>
                </li>
                <li>
                    <a target="_blank" title="spotify" href="https://open.spotify.com/user/gustavoxuxu">
                        <i class="fa fa-spotify fa-1x"></i><span>Spotify</span>
                    </a>
                </li>
                <li>
                    <a target="_blank" title="whatsapp" href="https://wa.me/5531986585208">
                        <i class="fa fa-whatsapp fa-1x"></i><span>Whatsapp</span>
                    </a>
                </li>
            </ul>
            <!--End of Social Icons in Footer-->
        </div>
    </footer>
    <!--End of Footer-->

</div>

<!-- Include JavaScript resources -->
<script src="js/jquery.1.8.3.min.js"></script>
<script src="js/wow.min.js"></script>
<script src="js/featherlight.min.js"></script>
<script src="js/featherlight.gallery.min.js"></script>
<script src="js/jquery.enllax.min.js"></script>
<script src="js/jquery.scrollUp.min.js"></script>
<script src="js/jquery.easing.min.js"></script>
<script src="js/jquery.stickyNavbar.min.js"></script>
<script src="js/jquery.waypoints.min.js"></script>
<script src="js/images-loaded.min.js"></script>
<script src="js/lightbox.min.js"></script>
<script src="js/site.js"></script>


</body>
</html>