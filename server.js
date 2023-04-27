require("dotenv").config() ;
const express = require("express") ;
const cors = require("cors") ;
const port = 5000 || process.env.PORT ;
const {connection} = require("./db") ;
const authRoute = require("./routes/authRoutes") ;
const callbackRoute = require("./routes/googleCallbackRoute") ;
const app = express() ;

app.use(cors({
    origin : ["http://localhost:3000",process.env.CLIENT_URL],
    methods: ["GET","POST","PUT","DELETE"],
    credentials : true
}));

app.use(express.json()) ;

app.use("/api",authRoute) ;

app.use("/",callbackRoute) ;

app.listen(port,()=>{
    console.log(`Server is running on port : ${port}`) ;
    connection() ;
})