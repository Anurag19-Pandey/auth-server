const OAuthClient = require("./OAuthClient") ;

const getGoogleOAuthUrl = () =>{
    const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return OAuthClient.generateAuthUrl({
        access_type : 'offline' ,
        prompt : 'consent' ,
        scope : scopes
    });
}

module.exports = getGoogleOAuthUrl ; 


