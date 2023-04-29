const {getDbConnection} = require("../db") ;
const bcrypt = require("bcrypt") ;
const jwt = require("jsonwebtoken") ;
const {ObjectId} = require("mongodb") ;
const sendGrid = require("@sendgrid/mail") ;
const {v4 :uuidv4} = require("uuid") ;
const getGoogleOAuthUrl = require("../util/getGoogleOAuthUrl");
const getGoogleUser = require("../util/getGoogleUser") ;
const updateOrCreateUserFromOAuth = require("../util/updateOrCreateUserFromOAuth") ;

sendGrid.setApiKey(process.env.SEND_GRID_API_KEY);

const sendEmail = ({to , from, subject , text , html})=>{
    const msg = {to , from , subject , text , html} ;

    return sendGrid.send(msg) ;
}

const otpGeneration = async(id) =>{

        const otp1 = Math.random()*10 ;
        const otp2 = Math.random()*10 ;
        const otp3 = Math.random()*10 ;
        const otp4 = Math.random()*10 ;

        const otp = `${otp1} + ${otp2} + ${otp3} + ${otp4}` ;

        const db = getDbConnection('auth-database') ;

        const otpAvail = await db.collection('otp').insertOne({
            id,
            otp,
            expiresIn:Date.getTime() + 10*60000,
        }) ;

        return otp ;
}

module.exports.SignUp = async(req,res)=>{
    try{

        const {email , password } = req.body ;

        const db = getDbConnection('auth-database') ;

        const user = await db.collection('users').findOne({email}) ;

        if(user){
           return res.sendStatus(409) ;  // 409 - conflict error code 
        }

        const salt  = uuidv4() ;

        const pepper = process.env.PEPPER_STRING;

        const passwordHash = await bcrypt.hash(salt + password + pepper , 10) ;

        const verificationString = uuidv4() ;

        const startingInfo = {
             name : '' ,
             favouriteFood : '',
             bio : ''
        }

        const result = await db.collection('users').insertOne({
            email,
            passwordHash,
            salt ,
            info : startingInfo,
            isVerified : false ,
            verificationString ,
            otp : `${otp1}+${otp2}+${otp3}+${otp4}`
        }) ;
        
        const {insertedId} = result ;

        const otp = otpGeneration(insertedId) ;
        
       try{
        await sendEmail({
            to : email ,
            from : process.env.EMAIL_ID,
            subject : 'Please verify your Email',
            text :`Your Verification OTP is : ${otp}` 
        });
        console.log("Mail sent !") ;
       }catch(err){
        console.log(err);
       }
    
        jwt.sign({
            id : insertedId ,
            email ,
            info : startingInfo ,
            isVerified : false
        },
        process.env.JWT_SECRET,
        {
                expiresIn:'2d'
        },
        (err , token) => {
            if(err){
               return res.status(500).send(err) ;
            }
            return res.status(200).json({token}) ;
        }
        );

    }catch(err){
        console.log(err) ;
    }
}

module.exports.Login = async(req,res)=>{
    try{

        const {email , password} = req.body ;

        const db = getDbConnection('auth-database') ;

        const user = await db.collection('users').findOne({email}) ;

        if(!user){
            return res.sendStatus(401) ;
        }

        const {_id : id , isVerified , passwordHash , salt , info} = user ;
       
        const pepper = process.env.PEPPER_STRING ;
       
        const isCorrect = await bcrypt.compare(salt + password + pepper , passwordHash) ;

        if(isCorrect) {
            jwt.sign({
                id ,
                isVerified ,
                email ,
                info
            },
            process.env.JWT_SECRET,
            {
                expiresIn:'2d'

            },(err,token)=>{
                if(err){
                    return res.sendStatus(500); 
                }
                return res.status(200).json({token}) ;
            })
        }
        else{
            return res.sendStatus(401) ;
        }

    }catch(err){
        console.log(err=> console.log(err)) ;
    }
}

module.exports.updateUser = async(req,res)=>{
    try{
        
        const {authorization} = req.headers ;

        const { userId } = req.params ;

        const updates = (({
            favouriteFood ,
            name ,
            bio
        }) => ({
            favouriteFood ,
            name ,
            bio
        }))(req.body) ;

        if(!authorization){
            return res.status(401).json({message : "No authorization header sent"}) ;
        }

        const token = authorization.split(' ')[1] ;

        jwt.verify(token , process.env.JWT_SECRET , async(err , decoded)=>{
            if(err)
            return res.status(401).json({message : "Unable to verify token"}) ;
            
            const {id, isVerified } = decoded ;

            if(id !== userId)
                return res.status(403).json({message : "Not allowed to update user data."})
            if(!isVerified)
                return res.status(403).json({message : "You need to verify your email before you can update your data."}) ;
                
                const db = getDbConnection('auth-database') ;

                const result = await db.collection('users').findOneAndUpdate(
                    { _id : new ObjectId(id) },
                    { $set:{  info : updates }},
                    {returnOriginal : false}
                ) ;

                const {email  , info } = result.value ;

                jwt.sign({id , email , isVerified , info} ,process.env.JWT_SECRET , (err, token)=>{
                    if(err){
                        return res.status(200).json(err) ;
                    }

                    return res.status(200).json({token}) ;
                })
        })
    }catch(err){
        console.log(err) ;
    }
}

module.exports.verifyEmail = async(req,res)=>{
    try{
        const {verificationString} = req.body ;

        const db = getDbConnection('auth-database') ;

        const result = await db.collection('users').findOne({
            verificationString
        });

        if(!result){
            return res.status(401).json({message : 'The email verification code is incorrect'}) ;
        }

        const {_id : id , email , info} = result ;

        await db.collection('users').updateOne(
            { _id : new ObjectId(id)},{
                $set : {
                    isVerified : true
                }
            }) ;

            jwt.sign({id , email , isVerified : true , info} , process.env.JWT_SECRET , { expiresIn :'2d'},(err , token)=>{
                if(err)
                    return res.sendStatus(500) ;
                return res.status(200).json({token}) ;
            })
    }catch(err){
        console.log(err) ;
    }
}

module.exports.forgotPassword = async(req,res)=>{
    try{
        const {email} = req.params ;
       
        const db = getDbConnection('auth-database') ;

        const passwordResetCode = uuidv4() ;

        const result = await db.collection('users').updateOne({email},{
            $set : {
                passwordResetCode
            }
        }) ;

        if(result.modifiedCount > 0) {
            try{
                await sendEmail({
                    to : email , 
                    from : 'anuragpandey192000@gmail.com',
                    subject : 'Password Reset',
                    text : `
                        To reset your password , click the link : ${process.env.CLIENT_URL}/${passwordResetCode} 
                    `
                }); 
            }catch(err){
                console.log(err) ;
            }  
        }

        res.sendStatus(200) ;
    }catch(err){
        console.log(err) ;
        res.sendStatus(500) ;
    }
}

module.exports.resetPassword= async(req,res)=>{
    try{
        const {passwordResetCode} = req.params ;

        const newPassword = req.body.passwordValue ;

        const db = getDbConnection('auth-database') ;

        const salt  = uuidv4() ;

        const pepper = process.env.PEPPER_STRING;

        const newPasswordHash = await bcrypt.hash(salt + newPassword + pepper , 10) ;

        const result = await db.collection('users').findOneAndUpdate({passwordResetCode},{
            $set : {
                passwordHash : newPasswordHash ,
                salt
            },
            $unset :{
                passwordResetCode : ''
            }
        }) ;
            // didn't reset password 
        if(result.lastErrorObject.n == 0){
            return res.sendStatus(404) ;
        }

        res.sendStatus(200) ;
    }catch(err){
        console.log(err) ;
    }
}

module.exports.googleAuth = (req,res)=>{

    const url = getGoogleOAuthUrl() ;
    res.status(200).json({url}) ;

}

module.exports.GoogleCallBack = async(req,res)=>{
    try{

        const {code} = req.query ;

        const oauthUserInfo = await getGoogleUser({code}) ;

        const updatedUser = await updateOrCreateUserFromOAuth({oauthUserInfo}) ;

        const {_id : id , isVerified , email , info } = updatedUser ;

        jwt.sign({
            id ,
            isVerified ,
            email , 
            info
        },process.env.JWT_SECRET,(err , token)=>{
            if(err) return res.sendStatus(500) ;
            res.redirect(`${process.env.CLIENT_URL}/login?token=${token}`)
        })

    }catch(err){
        console.log(err) ;
    }
}

module.exports.otpVerification = async(req,res)=>{
    try{
        const {authorization} = req.headers ;
        const {otpparams} = req.params ;
        
        if(!authorization){
            return res.status(401).json({message : "No authorization header sent"}) ;
        }

        const token = authorization.split(' ')[1] ;

        jwt.verify(token , process.env.JWT_SECRET , async(err , decoded)=>{
            if(err)
            return res.status(401).json({message : "Unable to verify token"}) ;
            
            const {id} = decoded ;

            const otpAvail = await db.collection('otp').findOne({id}) ;

            if(otpAvail){
                const expiresIn = Date.getTime() + 10*60000 ;

                if(otpAvail.expiresIn <= expiresIn){
                    if(otpAvail.otp == otpparams){
                        const deleteOtp = await db.collection('otp').deleteOne({id});
                        const result = await db.collection('users').findOneAndUpdate(
                            { _id : new ObjectId(id) },
                            { $set:{  isVerified : true }},
                            {returnOriginal : false}
                        ) ;

                        const {email  , info , isVerified} = result.value ;
                        jwt.sign({id , email , isVerified , info} ,process.env.JWT_SECRET , (err, token)=>{
                            if(err){
                                return res.status(200).json(err) ;
                            }
                            return res.send({token : token ,status : true , message :"Email is Verified" }) ;
                        })
                       
                    }else{
                        return res.send({status : false , message :"Invalid Otp" }) ;
                    }
                }else{
                    return res.send({status : false , message :"Invalid Otp" }) ;
                }
            }else{
                return res.send({status : false , message :"Invalid Otp" }) ;
            }

        })
    }catch(err){
        console.log(err) ;
    }
}