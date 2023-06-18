const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_CONN,{
    useNewUrlParser:true,
    useUnifiedTopology:true
}).then(()=>{
    console.log("database connected succesfully");
}).catch((err)=>{
    console.log(err);
});