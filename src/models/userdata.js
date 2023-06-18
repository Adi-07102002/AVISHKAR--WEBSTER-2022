require("../db/connection");
const mongoose = require("mongoose");

const userDataSchema={
    personalInfo:{
        name:String,
        age:Number,
        phone:String,
        city:String,
        email:String,
        country:String,
    },
    messages:{
        message:String,
        user:String,
        isViewed:Boolean
    },
    keywords:[],
    pastScore:Number,
    minutesMeditated:Number,
    subscribed:Boolean,
    email:String,
}

const UserData = new mongoose.model("UserData", userDataSchema);
module.exports = UserData;