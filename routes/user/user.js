const express = require("express");

const router = express.Router();

const userdetails = require("./userdetails");



router.use("/userdetails",userdetails);



module.exports = router;
