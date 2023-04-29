const express = require("express") ;

const { GoogleCallBack} = require("../controllers/authControllers");

const router = express.Router() ;

router.route("/auth/google/callback").get(GoogleCallBack) ;

router.route("/verify-email/:verificationString").get(VerificationRedirect) ;

module.exports = router ;