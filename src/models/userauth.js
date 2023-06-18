require("../db/connection");
const mongoose=require("mongoose");
// const passportLocalMongoose = require("passport-local-mongoose");
// const findOrCreate = require("mongoose-findorcreate");
const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true
    },
    email :{
        type : String,
        required : true,
        unique : true
    },
    password:{
        type : String,
        required : true
    },
    googleid :{
        type : String
    },
    isverified:{
        type:Boolean
    },
    tokens : [{
        token : {
            type : String
        }
    }]
});

//model
const User = new mongoose.model("User",userSchema);
// userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);
module.exports = User;