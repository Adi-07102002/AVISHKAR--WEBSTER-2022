require("../db/connection");
const mongoose = require("mongoose");
console.log("rooms      ");
const RoomDataSchema={
    code:Number,
    players:Number
}

const RoomData = new mongoose.model("RoomData", RoomDataSchema);
module.exports = RoomData;
