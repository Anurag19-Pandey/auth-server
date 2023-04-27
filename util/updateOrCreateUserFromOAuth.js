const {getDbConnection} = require("../db") ;

const updateOrCreateUserFromOAuth = async({oauthUserInfo})=>{
    const {
        id : googleId ,
        verified_email : isVerified,
        email 
    } = oauthUserInfo ;

    const db = getDbConnection('auth-database') ;

    const existing = await db.collection('users').findOne({email}) ;

    if(existing){
        const result = await db.collection('users').findOneAndUpdate({email},{
            $set:{ googleId , isVerified }},
          { returnOriginal : false },);

        return result.value ;
    }else{
        const result = await db.collection('users').insertOne({
            email ,
            googleId ,
            isVerified ,
            info : {}
        });
        
        return result;
    }
}
module.exports = updateOrCreateUserFromOAuth ;