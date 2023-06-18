const express = require("express");
const bodyparser = require("body-parser");
var nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const router = new express.Router();
router.use(express.static("public"));
router.use(
  bodyparser.urlencoded({
    extended: true,
  })
);
const isAuth = require("./isauth");
const createToken = require("./createtoken");
const OtpData = require("../../src/models/otpData");
const User = require("../../src/models/userauth");

router.get("/verifyemail", async function (req, res) {
  res.render("verifyemail");
});
router.post("/verifyemail", async function (req, res) {
  let data = await OtpData.findOne({ email: req.body.email });
  let curr_time = new Date().getTime();
  if (data) {
    console.log(data.code + "   " + data.expireIn + "  " + curr_time);
    if (data.code === req.body.otp && data.expireIn > curr_time) {
      let user = await User.findOneAndUpdate({ email: req.body.email },{isverified:true});
      const token = await createToken(user._id);
      res.cookie("jwt", token.toString(), {
        expires: new Date(Date.now() + 6000000),
        httpOnly: true,
      });
      await OtpData.findOneAndDelete({ email: req.body.email });
      res.redirect("/monopoly");
    }
  } else {
    res.redirect("/verifyemail");
  }
});

module.exports = router;
