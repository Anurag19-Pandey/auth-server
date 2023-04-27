const express = require("express") ;
const { SignUp , Login , updateUser , verifyEmail , forgotPassword , resetPassword , googleAuth , GoogleCallBack} = require("../controllers/authControllers");

const router = express.Router() ;

router.route("/signup").post(SignUp) ;
 
router.route("/login").post(Login) ;

router.route("/users/:userId").put(updateUser) ;

router.route("/verify-email").put(verifyEmail) ;

router.route("/forgot-password/:email").put(forgotPassword) ;

router.route("/users/:passwordResetCode/reset-password").put(resetPassword) ;

router.route("/auth/google/url").get(googleAuth) ;

module.exports = router ;