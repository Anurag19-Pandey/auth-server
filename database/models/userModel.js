const mongoose = require("mongoose") ;

const userSchema = mongoose.Schema({
    email :{
        type:String,
    },
    password :{
        type:String,
    },
    info:{
        type:Object ,
        default:{}
    }
});

const user = mongoose.model(userSchema,'User') ;

module.exports = user;