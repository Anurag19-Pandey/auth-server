const {MongoClient} = require("mongodb") ;

const MONGO_URI = process.env.MONGO_URI;
let client ;

const connection = async()=>{
   client =  await MongoClient.connect(MONGO_URI,{
        useNewUrlParser : true ,
        useUnifiedTopology : true
    });
}


module.exports = {
    connection
}