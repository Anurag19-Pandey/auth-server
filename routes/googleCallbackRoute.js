const express = require("express") ;

const { GoogleCallBack} = require("../controllers/authControllers");

const router = express.Router() ;

router.route("/auth/google/callback").get(GoogleCallBack) ;

module.exports = router ;