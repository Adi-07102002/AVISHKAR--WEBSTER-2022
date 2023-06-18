const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/userauth");

const app = express();
app.use(cookieParser());

const isAuth = async (req) => {
  try {
    const token = await req.cookies.jwt;
    // console.log("helllllo " + token);
    const verifyUser = await jwt.verify(token, process.env.SECRET);
    let user = await User.findOne({ _id: verifyUser._id }).select({
      username: 1,
      email: 1,
    });
    return user;
  } catch (error) {
    console.log(error);
  }
};

module.exports = isAuth;
