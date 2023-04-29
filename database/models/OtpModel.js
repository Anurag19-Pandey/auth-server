const mongoose = require("mongoose") ;

const otpSchema = mongoose.Schema({
    id :{
        type:String,
    },
    otp :{
        type:String,
    },
    expiresIn:{
        type:Date ,
        default:Date.getTime() + 10*60000
    }
});

const otp = mongoose.model(userSchema,'Otp') ;

module.exports = otp;