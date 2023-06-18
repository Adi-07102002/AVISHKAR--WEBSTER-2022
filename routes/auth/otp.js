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
const createToken=require("./createtoken");
const OtpData = require("../../src/models/otpData");
const User = require("../../src/models/userauth");
router.post("/enteremail", async function (req, res) {
  let data = await User.findOne({ email: req.body.email });
  let otpalr = await OtpData.findOneAndDelete({ email: req.body.email });
  if (data) {
    let otpCode = Math.floor(Math.random() * 1000000 + 1).toString();
    let otpData = new OtpData({
      email: req.body.email,
      code: otpCode,
      expireIn: new Date().getTime() + 300 * 1000,
    });
    await otpData.save();
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "glee.official36@gmail.com",
        pass: "uhpvjuhdajuqlviy",
      },
    });

    var mailOptions = {
      from: "glee.official36@gmail.com",
      to: req.body.email,
      subject: "Otp for changing password",
      text: otpCode,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    res.redirect("/enterotp");
  } else {
    res.redirect("/enteremail");
  }
});
router.get("/enteremail", async function (req, res) {
  res.render("enteremail");
});

router.get("/enterotp", async function (req, res) {
  res.render("enterotp");
});
router.post("/enterotp", async function (req, res) {
  let data = await OtpData.findOne({ email: req.body.email });
  let user = await User.findOne({ email: req.body.email });
  let curr_time = new Date().getTime();
  if (data) {
    console.log(data.code + "   " + data.expireIn + "  " + curr_time);
    if (data.code === req.body.otp && data.expireIn > curr_time) {
      const token = await createToken(user._id);
      res.cookie("jwt", token.toString(), {
        expires: new Date(Date.now() + 6000000),
        httpOnly: true,
      });
      res.redirect("/changepassword");
    }
  } else {
    res.redirect("/enteremail");
  }
});
router.get("/changepassword", async function (req, res) {
  res.render("changepassword");
});
router.post("/changepassword", async function (req, res) {
  let user=await isAuth(req);
  let password = req.body.password;
  let confirmpassword = req.body.confirmpassword;
  if (password === confirmpassword) {
    const newpassword = async function (password) {
      password = await bcrypt.hash(password, 10);
      console.log(password);
      return password;
    };
    password = await newpassword(password);
    const hey=await User.findOneAndUpdate({email:user.email},{password:password},{new:true});
    console.log(hey);
    await OtpData.findOneAndDelete({ email: user.email });
    res.redirect("/secrets")
  }else{
    console.log("password and confirm password do not match");
  }
});
module.exports = router;
