<!DOCTYPE html>
<html>

<?php
    include 'conexao.php';
    session_start();

    if (!isset($_SESSION["username"])) {

        header("Location: login.html");
        exit();

    }

    $username = $_SESSION["username"];

    $stmt = $conn -> prepare("SELECT nome FROM CADASTRO WHERE login =?");
    $stmt -> bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt -> num_rows > 0) {

        $stmt -> bind_result($name);
        $stmt -> fetch();

    }
    
?>

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

    <!-- Namari Color CSS -->
    <link rel="stylesheet" href="css/namari-color.css">

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
                        <a href="pageUser.php"> <img src="images/logo1.png" id="banner-logo" alt="Landing Page"/> </a>
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
                                <a href="pageUser.php">Home</a>
                            </li>
                        </ul>
                    </nav>
                    <!--End of Main Navigation-->

                    <div id="nav-trigger"><span></span></div>
                    <nav id="nav-mobile"></nav>

                </div>
            </div>
        </div><!--End of Header-->

        <!--Banner Content-->
        <div id="banner-content" class="row clearfix">

            <div class="col-38">

                <div class="section-heading">
                    <h3><?php echo "$name" ?></h3>
                    <h1>SEJA BEM VINDO AO MEU PORTIFÓLIO</h1>
                    <h2> Olá, sou Gustavo, um profissional de T.I apaixonado por Tecnologia desafios e inovações. 
                        Este espaço digital que representa minha paixão pela TI e o desejo de enfrentar novos horizontes tecnológicos. Obrigado por visitar!</h2>
                </div>

                <!--Call to Action-->
                <a href="logout.php" class="button">Sair</a> <a href="alterData.php" class="button">Alterar Dados</a>
                <!--End Call to Action-->
                <?php
                   if (session_status() == PHP_SESSION_NONE) {
                    session_start();
                }
                   include 'conexao.php'; // Inclua o arquivo de conexão com o banco de dados
               
                   // Verificar conexão
                   if ($conn->connect_error) {
                       die("Conexão falhou: " . $conn->connect_error);
                   }
               
                   // Capturar o IP do visitante
                   $ip_address = $_SERVER['REMOTE_ADDR'];
               
                   // Capturar a página que está sendo visitada
                   $pagina_visitada = $_SERVER['REQUEST_URI'];
               
                   // Preparar a instrução SQL para inserir os dados na tabela
                   $stmt = $conn->prepare("INSERT INTO registros_acesso (ip_address, pagina_visitada) VALUES (?, ?)");
                   $stmt->bind_param("ss", $ip_address, $pagina_visitada);
               
                   // Executar a instrução SQL
                   $stmt->execute();
               
                   // Fechar a instrução e a conexão
                   $stmt->close();
                   $conn->close();
                ?>

            </div>

        </div><!--End of Row-->
    </header>

    <!--Main Content Area-->
    <main id="content">

    <?php
        function calcularIdade($dataNascimento) {
            // Obtém a data atual
            $dataAtual = new DateTime();
            // Converte a data de nascimento para um objeto DateTime
            $dataNascimento = new DateTime($dataNascimento);
            // Calcula a diferença entre as datas
            $diferenca = $dataAtual->diff($dataNascimento);
            // Retorna a idade
            return $diferenca->y;
        }

        $dataNascimento = '1994-07-17';
        $idade = calcularIdade($dataNascimento);
    ?>   

    </main>
    <!--End Main Content Area-->


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