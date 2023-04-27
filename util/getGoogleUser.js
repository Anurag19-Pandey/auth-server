const axios = require("axios") ;
const OAuthClient = require("./OAuthClient") ;


const getAccessAndBearerTokenUrl = ({accessToken}) =>
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${accessToken}`

const getGoogleUser = async({code})=>{
    const {tokens} = await OAuthClient.getToken(code) ;
    const response = await axios.get(getAccessAndBearerTokenUrl({
        accessToken : tokens.access_token
    }),{
        headers : {Authorization : `Bearer ${tokens.id_token}`}
    }
    );

    return response.data ;
}

module.exports = getGoogleUser ;