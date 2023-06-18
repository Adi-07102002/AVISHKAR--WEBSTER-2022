require("../db/connection");
const mongoose = require("mongoose");

const OtpDataSchema={
    email:String,
    code:String,
    expireIn:Date
}

const OtpData = new mongoose.model("OtpData", OtpDataSchema);
module.exports = OtpData;
