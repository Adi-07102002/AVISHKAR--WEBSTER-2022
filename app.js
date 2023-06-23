require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
var nodemailer = require("nodemailer");
const cookieSession = require("cookie-session");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const http = require("http").Server(app);
const io = require("socket.io")(http);
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const { move_piece, decision } = require("./game");
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());
app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: ["codeforces_grandmasters_team"],
  })
);
console.log("hey");

const User = require("./src/models/userauth");
const isAuth = require("./routes/auth/isauth");
const createToken = require("./routes/auth/createtoken");
const OtpData = require("./src/models/otpData");
const RoomData = require("./src/models/rooms");
const verify=require("./routes/auth/verify");
const otp = require("./routes/auth/otp");
app.use(otp);
app.use(verify);

app.get("/", async (req, res) => {
  console.log("get");
  try {
    const user=await isAuth(req);
    if(user){
      res.redirect("/monopoly");
    }
    res.status(200).render("home");
  } catch (err) {
    res.status(401).send(err);
  }
});
app.get("/login", async function (req, res) {
  try {
    res.status(200).render("login");
  } catch (error) {
    res.status(401).send(error);
  }
});
app.get("/register", async function (req, res) {
  try {
    res.status(200).render("register");
  } catch (error) {
    res.status(401).send(error);
  }
});
app.get("/monopoly", async function (req, res) {
  const user = await isAuth(req);
  let verified=await User.findOne({email:user.email});
  console.log(verified);
  if (user && verified.isverified) {
    res.render("monopoly");
  } else {
    res.render("login");
  }
});
app.get("/contact",function(req,res){
  res.render("contact");
})

app.post("/register", async function (req, res) {
  let password = req.body.password;
  let cpassword = req.body.confirmpassword;
  const name = req.body.name;
  const email = req.body.email;
  if (password === cpassword) {
    // let hashpassword;
    const newpassword = async function (password) {
      password = await bcrypt.hash(password, 10);
      console.log(password);
      return password;
    };
    password = await newpassword(password);
    console.log(password);
    let user = new User({
      username: name,
      email: email,
      password: password,
      isverified: false,
    });
    //user=isAuth(req);
    await user.save();
    let data = await User.findOne({ email: req.body.email });
    await OtpData.findOneAndDelete({ email: req.body.email });
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
      res.redirect("/verifyemail");
    } else {
      res.redirect("/register");
    }
  } else {
    console.log("error in register");
    res.redirect("/register");
  }
});

app.post("/login", async function (req, res) {
  const email = req.body.email;
  let password = req.body.password;

  let user = await User.findOne({ email: email });
  let flag=false;
  if(user){    
    flag = await bcrypt.compare(password, user.password);
  }
  //console.log("flag "+flag);
  if(user&&user.isverified==false){
    console.log(user.isverified);
    res.redirect("/verifyemail");
  }
  if (user && flag) {
    const token = await createToken(user._id);
    res.cookie("jwt", token.toString(), {
      expires: new Date(Date.now() + 6000000),
      httpOnly: true,
    });
    const a = await req.cookies.jwt;
    console.log(a);
    res.redirect("/monopoly");
  } else {
    res.redirect("/login");
    console.log("error");
  }
});

//uptil this point is the website functioning and user authentication
//below is the game logic
let code=0;
app.get("/monopoly_board", async function (req, res) {
  const user = await isAuth(req);
  let verified=await User.findOne({email:user.email});
  if (user&&verified.isverified) {
    res.render("monopoly_board");
  } else {
    res.render("login");
  }
});
let game_type = 100;

app.post("/online_multiplayer", function (req, res) {
  game_type = 0;
  res.redirect("/monopoly_board");
});
app.post("/with_friends", function (req, res) {
  game_type = 2;
  code=3333;
  res.redirect("/create_room");
});
app.get("/create_room",async function(req,res){
  res.render("create_room");
})
app.get("/room_code",async function(req,res){
   code=Math.floor(Math.random() * 1000000 + 1);
   let roomData = new RoomData({
    code: code,
    players:1,
  });
  await roomData.save();
   res.render("room_code",{code:code});
})
app.post("/room_code",async function(req,res){
  res.redirect("/monopoly_board");
})
app.get("/enter_code",async function(req,res){
  res.render("enter_code");
})
app.post("/enter_code",async function(req,res){
  let a=req.body.code_entered;
  let b=await RoomData.findOne({code:a});
  try{
  if(b){
    code=a;
  }
  else{
    res.redirect("/enter_code");
  }
  }
  catch(error){
    console.log(error);
  }
  res.redirect("/monopoly_board");
})
app.post("/offline_mode", function (req, res) {
  game_type = 3;
  res.redirect("/monopoly_board");
});

const go = "go",
  city = "city",
  company = "company",
  chest = "chest",
  chance = "chance",
  jail = "jail",
  go_jail = "go_jail",
  park = "park";
let places = [
  {
    cell: 0,
    name: go,
    price: 0,
    ownership: 0,
    cell_name: "Start",
  },
  {
    cell: 1,
    name: city,
    price: 60,
    ownership: 0,
    cell_name: "MEDITERRANIAN AVE",
  },
  {
    cell: 2,
    name: chest,
    price: 0,
    ownership: 0,
    cell_name: "COMMUNITY CHEST",
  },
  {
    cell: 3,
    name: city,
    price: 100,
    ownership: 0,
    cell_name: "ORIENTAL AVE",
  },
  {
    cell: 4,
    name: chance,
    price: 0,
    ownership: 0,
    cell_name: "CHANCE",
  },
  {
    cell: 5,
    name: city,
    price: 120,
    ownership: 0,
    cell_name: "CONNECTICUT AVE",
  },
  {
    cell: 6,
    name: jail,
    price: 0,
    ownership: 0,
    cell_name: "JAIL",
  },
  {
    cell: 7,
    name: city,
    price: 140,
    ownership: 0,
    cell_name: "ST.CHARLES PLACE",
  },
  {
    cell: 8,
    name: company,
    price: 150,
    ownership: 0,
    cell_name: "ELEC.COMP",
  },
  {
    cell: 9,
    name: city,
    price: 160,
    ownership: 0,
    cell_name: "VIRGINIA AVE",
  },
  {
    cell: 10,
    name: chest,
    price: 0,
    ownership: 0,
    cell_name: "COMMUNITY CHEST",
  },
  {
    cell: 11,
    name: city,
    price: 200,
    ownership: 0,
    cell_name: "NY AVE",
  },
  {
    cell: 12,
    name: park,
    price: 0,
    ownership: 0,
    cell_name: "FREE PARKING",
  },
  {
    cell: 13,
    name: city,
    price: 220,
    ownership: 0,
    cell_name: "KENTUCY AVE",
  },
  {
    cell: 14,
    name: chance,
    price: 0,
    ownership: 0,
    cell_name: "CHANCE",
  },
  {
    cell: 15,
    name: city,
    price: 240,
    ownership: 0,
    cell_name: "ILLINOIS AVE",
  },
  {
    cell: 16,
    name: company,
    price: 150,
    ownership: 0,
    cell_name: "WATER WORKS",
  },
  {
    cell: 17,
    name: city,
    price: 280,
    ownership: 0,
    cell_name: "MARVIN GARDENS",
  },
  {
    cell: 18,
    name: go_jail,
    price: 0,
    ownership: 0,
    cell_name: "GO TO JAIL",
  },
  {
    cell: 19,
    name: city,
    price: 300,
    ownership: 0,
    cell_name: "PACIFIC AVE",
  },
  {
    cell: 20,
    name: chest,
    price: 0,
    ownership: 0,
    cell_name: "COMMUNITY CHEST",
  },
  {
    cell: 21,
    name: city,
    price: 320,
    ownership: 0,
    cell_name: "PENNSYLVANIA AVE",
  },
  {
    cell: 22,
    name: chance,
    price: 0,
    ownership: 0,
    cell_name: "CHANCE",
  },
  {
    cell: 23,
    name: city,
    price: 400,
    ownership: 0,
    cell_name: "BOARDWALK",
  },
];

let players = [
  {
    socket_id: 0,
    name: 1,
    curr_pos: 0,
    money: 1000,
    turn: 1,
    in_game: 1,
    room: -1,
  },
  {
    socket_id: 0,
    name: 2,
    curr_pos: 0,
    money: 1000,
    turn: 0,
    in_game: 1,
    room: -1,
  },
  {
    socket_id: 0,
    name: 3,
    curr_pos: 0,
    money: 1000,
    turn: 0,
    in_game: 1,
    room: -1,
  },
  {
    socket_id: 0,
    name: 4,
    curr_pos: 0,
    money: 1000,
    turn: 0,
    in_game: 1,
    room: -1,
  },
];
let roomno = 100;
let clients = 0;
let rooms = [
  {
    roomno: roomno,
    clients: clients,
    game_type: -1,
    players: [
      {
        socket_id: 0,
        name: 1,
        curr_pos: 0,
        money: 1000,
        turn: 1,
        in_game: 1,
        room: -1,
      },
      {
        socket_id: 0,
        name: 2,
        curr_pos: 0,
        money: 1000,
        turn: 0,
        in_game: 1,
        room: -1,
      },
      {
        socket_id: 0,
        name: 3,
        curr_pos: 0,
        money: 1000,
        turn: 0,
        in_game: 1,
        room: -1,
      },
      {
        socket_id: 0,
        name: 4,
        curr_pos: 0,
        money: 1000,
        turn: 0,
        in_game: 1,
        room: -1,
      },
    ],
    places: [
      {
        cell: 0,
        name: go,
        price: 0,
        ownership: 0,
        cell_name: "Start",
      },
      {
        cell: 1,
        name: city,
        price: 60,
        ownership: 0,
        cell_name: "MEDITERRANIAN AVE",
      },
      {
        cell: 2,
        name: chest,
        price: 0,
        ownership: 0,
        cell_name: "COMMUNITY CHEST",
      },
      {
        cell: 3,
        name: city,
        price: 100,
        ownership: 0,
        cell_name: "ORIENTAL AVE",
      },
      {
        cell: 4,
        name: chance,
        price: 0,
        ownership: 0,
        cell_name: "CHANCE",
      },
      {
        cell: 5,
        name: city,
        price: 120,
        ownership: 0,
        cell_name: "CONNECTICUT AVE",
      },
      {
        cell: 6,
        name: jail,
        price: 0,
        ownership: 0,
        cell_name: "JAIL",
      },
      {
        cell: 7,
        name: city,
        price: 140,
        ownership: 0,
        cell_name: "ST.CHARLES PLACE",
      },
      {
        cell: 8,
        name: company,
        price: 150,
        ownership: 0,
        cell_name: "ELEC.COMP",
      },
      {
        cell: 9,
        name: city,
        price: 160,
        ownership: 0,
        cell_name: "VIRGINIA AVE",
      },
      {
        cell: 10,
        name: chest,
        price: 0,
        ownership: 0,
        cell_name: "COMMUNITY CHEST",
      },
      {
        cell: 11,
        name: city,
        price: 200,
        ownership: 0,
        cell_name: "NY AVE",
      },
      {
        cell: 12,
        name: park,
        price: 0,
        ownership: 0,
        cell_name: "FREE PARKING",
      },
      {
        cell: 13,
        name: city,
        price: 220,
        ownership: 0,
        cell_name: "KENTUCY AVE",
      },
      {
        cell: 14,
        name: chance,
        price: 0,
        ownership: 0,
        cell_name: "CHANCE",
      },
      {
        cell: 15,
        name: city,
        price: 240,
        ownership: 0,
        cell_name: "ILLINOIS AVE",
      },
      {
        cell: 16,
        name: company,
        price: 150,
        ownership: 0,
        cell_name: "WATER WORKS",
      },
      {
        cell: 17,
        name: city,
        price: 280,
        ownership: 0,
        cell_name: "MARVIN GARDENS",
      },
      {
        cell: 18,
        name: go_jail,
        price: 0,
        ownership: 0,
        cell_name: "GO TO JAIL",
      },
      {
        cell: 19,
        name: city,
        price: 300,
        ownership: 0,
        cell_name: "PACIFIC AVE",
      },
      {
        cell: 20,
        name: chest,
        price: 0,
        ownership: 0,
        cell_name: "COMMUNITY CHEST",
      },
      {
        cell: 21,
        name: city,
        price: 320,
        ownership: 0,
        cell_name: "PENNSYLVANIA AVE",
      },
      {
        cell: 22,
        name: chance,
        price: 0,
        ownership: 0,
        cell_name: "CHANCE",
      },
      {
        cell: 23,
        name: city,
        price: 400,
        ownership: 0,
        cell_name: "BOARDWALK",
      },
    ],
  },
];
let j = 0;
io.on("connection", function (socket) {
  if (game_type == 0||game_type==2) {
    console.log("VALUE OF J IS: " + j);
    if (rooms[j].clients < 4) {
      rooms[j].game_type = 0;
      if(game_type==2){rooms[j].game_type=2;rooms[j].roomno=code;}
      socket.join("room-" + rooms[j].roomno + "" + rooms[j].game_type);
      rooms[j].players[rooms[j].clients].socket_id = socket.id;
      rooms[j].players[rooms[j].clients].room =
        rooms[j].roomno + "" + rooms[j].game_type;
      console.log(
        rooms[j].players[rooms[j].clients].name +
          " just connected in " +
          rooms[j].players[rooms[j].clients].room
      );
      rooms[j].clients++;
      console.log(rooms[j].players);
      socket.emit("begin_game");
      socket.on("cell_clicked", function (k) {
        console.log("got clicked");
        let p1 = 0;
        let q1 = 0;
        let pq1 = 0;
        while (p1 < rooms.length && pq1 != 1) {
          while (q1 < rooms[p1].clients) {
            if (rooms[p1].players[q1].socket_id == socket.id) {
              console.log("bye bye" + rooms[p1].clients + " " + p1 + " " + q1);
              pq1 = 1;
              break;
            }
            q1++;
          }
          p1++;
        }
        p1 = p1 - 1;
        q1 = q1 % 4;
        if (p1 >= 1) {
          q1 = q1 + p1;
        }
        socket.emit("cell_clicked", {
          Name: rooms[p1].places[k].cell_name,
          price: rooms[p1].places[k].price,
          ownership: rooms[p1].places[k].ownership,
        });
      });
      socket.on('chat message', msg => {
        console.log("listened the msg")
      let p2 = 0;
      let q2 = 0;
      let pq2 = 0;
      while (p2 < rooms.length && pq2 != 1) {
        while (q2 < rooms[p2].clients) {
          if (rooms[p2].players[q2].socket_id == socket.id) {
            console.log("message" + rooms[p2].clients + " " + p2 + " " + q2);
            pq2 = 1;
            break;
          }
          q2++;
        }
        p2++;
      }
      p2 = p2 - 1;
      q2 = q2 % 4;
      if (p2 >= 1) {
        q2 = q2 + p2;
      }
      console.log("room is "+rooms[p2].roomno + "" + rooms[p2].game_type)
        let m="PLAYER "+rooms[p2].players[q2].name+" :  "+msg;
        io.sockets
        .in("room-" + rooms[p2].roomno + "" + rooms[p2].game_type)
        .emit('chat message', m);
        // msg="You:  "+msg;
        // io.to(socket.id).emit('chat message', msg);
      });
      socket.on("move", function () {
        console.log("hi " + socket.id);
        let p = 0;
        let q = 0;
        let pqa = 0;
        while (p < rooms.length && pqa != 1) {
          while (q < rooms[p].clients) {
            if (rooms[p].players[q].socket_id == socket.id) {
              console.log("bye bye" + rooms[p].clients + " " + p + " " + q);
              pqa = 1;
              break;
            }
            q++;
          }
          p++;
        }
        p = p - 1;
        q = q % 4;
        if (p >= 1) {
          q = q + p;
        }
        console.log(p + " " + q + " move check " + socket.id);
        let a = 0;
        if (
          rooms[p].players[q].socket_id == socket.id &&
          rooms[p].players[q].turn == 1 &&
          rooms[p].players[q].in_game == 1
        ) {
          if (rooms[p].players[q].money < 0) {
            rooms[p].players[q].in_game = 0;
            rooms[p].players[q].turn = 0;
            rooms[p].players[(q + 1) % rooms[p].clients].turn = 1;
            io.to(socket.id).emit("end_game");
          }

          io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("display", rooms[p].players[q].name + " moved");
          let b = move_piece(rooms[p].players[q].curr_pos);
          if (b >= 23) {
            rooms[p].players[q].money += 100;
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name: rooms[p].players[q].name,
                player_money: rooms[p].players[q].money,
              });
          }
          a = b % 23;
          b = 0;
          io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: a,
            });
          rooms[p].players[q].curr_pos = a;

          let choice = decision(
            rooms[p].players[q].name,
            rooms[p].places[a].ownership,
            rooms[p].players[q].money,
            rooms[p].places[a].price,
            rooms[p].places[a].name
          );
          console.log("CHOICE: " + choice);

          let count = 0;

          if (choice == 1) {
            //rent case
            console.log(p + " " + q);
            rooms[p].players[q].money =
              rooms[p].players[q].money - rooms[p].places[a].price * 0.1;
            rooms[p].players[rooms[p].places[a].ownership - 1].money =
              rooms[p].players[rooms[p].places[a].ownership - 1].money +
              rooms[p].places[a].price * 0.1;
            console.log(rooms[p].players);
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name: rooms[p].players[q].name,
                player_money: rooms[p].players[q].money,
              });
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name:
                  rooms[p].players[rooms[p].places[a].ownership - 1].name,
                player_money:
                  rooms[p].players[rooms[p].places[a].ownership - 1].money,
              });
              let msg="PLAYER "+rooms[p].players[q].name+" paid $"+rooms[p].places[a].price * 0.1+" as rent to "+rooms[p].players[rooms[p].places[a].ownership - 1].name;
              io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("display", msg);
            if (rooms[p].players[q].money < 0) {
              rooms[p].players[q].in_game == 0;
              io.to(socket.id).emit("end_game");
              console.log(rooms[p].players[q].name + " is out");
            }
          }
          if (choice == 0) {
            //buy city case
            io.to(socket.id).emit("player_decision", rooms[p].players[q].name);
            console.log("player decision event fired " + socket.id);
          }
          if(choice == 5){
            rooms[p].players[q].money+=100;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU GET $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 6){
            rooms[p].players[q].money-=50;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU LOSE $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 7){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){

                rooms[p].players[alpha].money-=50;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[alpha].name,
                  player_money: rooms[p].players[alpha].money,
                });
            }
            let msg="EVERYONE LOSES $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }

          if(choice == 8){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){

                rooms[p].players[alpha].money+=100;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[alpha].name,
                  player_money: rooms[p].players[alpha].money,
                });
            }
            let msg="EVERYONE GETS $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 9){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){
                if(alpha!=q){

                    rooms[p].players[alpha].money+=150;
                    io.sockets
                    .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                    .emit("update_money", {
                      player_name: rooms[p].players[alpha].name,
                      player_money: rooms[p].players[alpha].money,
                    });
                }
            }
            let msg="EVERYONE EXCEPT YOU GETS $150"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }

          if(choice==10){
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: 0,
            });
            rooms[p].players[q].curr_pos = 0;
            rooms[p].players[q].money += 100;
            setTimeout(function(){
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });

            },2000)
            let msg="GO TO START AND COLLECT $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==11){
            rooms[p].players[q].money-=50;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU LOSE $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==12){
            rooms[p].players[q].money-=200;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOUR BAIL COST YOU $200"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==13){
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: 6,
            });
            rooms[p].players[q].curr_pos = 6;
            rooms[p].players[q].money -= 200;
            setTimeout(function(){
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });

            },4000)
            let msg="GO TO JAIL"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }


          socket.on("buy", function (player_name) {
            console.log(socket.id + " tried to buy");
            let p = 0;
            let q = 0;
            let pq = 0;
            while (p < rooms.length && pq != 1) {
              while (q < rooms[p].clients) {
                if (rooms[p].players[q].socket_id == socket.id) {
                  console.log("bye bye" + rooms[p].clients + " " + p + " " + q);
                  pq = 1;
                  break;
                }
                q++;
              }
              p++;
            }
            p = p - 1;
            q = q % 4;
            if (p >= 1) {
              q = q + p;
            }
            console.log(p + " " + q);
            if (count < 1 && choice == 0) {
              rooms[p].players[q].money =
                rooms[p].players[q].money - rooms[p].places[a].price;
              rooms[p].places[a].ownership = player_name;
              io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_stats", {
                  player_name: rooms[p].players[q].name,
                  place_name: rooms[p].places[a].cell_name,
                });
              io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });
                let msg="PLAYER "+rooms[p].players[q].name+" bought "+rooms[p].places[a].cell_name;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("display", msg);
              console.log(rooms[p].players);
              count++;
            }
          });
          rooms[p].players[q].turn = 0;
          rooms[p].players[(q + 1) % rooms[p].clients].turn = 1;
        }
      });
    } else {
      roomno++;
      j = rooms.length;
      rooms.push({
        roomno: roomno,
        clients: 0,
        game_type: 0,
        players: [
          {
            socket_id: 0,
            name: 1,
            curr_pos: 0,
            money: 1000,
            turn: 1,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 2,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 3,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 4,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
        ],
        places: [
          {
            cell: 0,
            name: go,
            price: 0,
            ownership: 0,
            cell_name: "Start",
          },
          {
            cell: 1,
            name: city,
            price: 60,
            ownership: 0,
            cell_name: "MEDITERRANIAN AVE",
          },
          {
            cell: 2,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 3,
            name: city,
            price: 100,
            ownership: 0,
            cell_name: "ORIENTAL AVE",
          },
          {
            cell: 4,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 5,
            name: city,
            price: 120,
            ownership: 0,
            cell_name: "CONNECTICUT AVE",
          },
          {
            cell: 6,
            name: jail,
            price: 0,
            ownership: 0,
            cell_name: "JAIL",
          },
          {
            cell: 7,
            name: city,
            price: 140,
            ownership: 0,
            cell_name: "ST.CHARLES PLACE",
          },
          {
            cell: 8,
            name: company,
            price: 150,
            ownership: 0,
            cell_name: "ELEC.COMP",
          },
          {
            cell: 9,
            name: city,
            price: 160,
            ownership: 0,
            cell_name: "VIRGINIA AVE",
          },
          {
            cell: 10,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 11,
            name: city,
            price: 200,
            ownership: 0,
            cell_name: "NY AVE",
          },
          {
            cell: 12,
            name: park,
            price: 0,
            ownership: 0,
            cell_name: "FREE PARKING",
          },
          {
            cell: 13,
            name: city,
            price: 220,
            ownership: 0,
            cell_name: "KENTUCY AVE",
          },
          {
            cell: 14,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 15,
            name: city,
            price: 240,
            ownership: 0,
            cell_name: "ILLINOIS AVE",
          },
          {
            cell: 16,
            name: company,
            price: 150,
            ownership: 0,
            cell_name: "WATER WORKS",
          },
          {
            cell: 17,
            name: city,
            price: 280,
            ownership: 0,
            cell_name: "MARVIN GARDENS",
          },
          {
            cell: 18,
            name: go_jail,
            price: 0,
            ownership: 0,
            cell_name: "GO TO JAIL",
          },
          {
            cell: 19,
            name: city,
            price: 300,
            ownership: 0,
            cell_name: "PACIFIC AVE",
          },
          {
            cell: 20,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 21,
            name: city,
            price: 320,
            ownership: 0,
            cell_name: "PENNSYLVANIA AVE",
          },
          {
            cell: 22,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 23,
            name: city,
            price: 400,
            ownership: 0,
            cell_name: "BOARDWALK",
          },
        ],
      });
      socket.join("room-" + rooms[j].roomno + "" + rooms[j].game_type);
      rooms[j].players[rooms[j].clients].socket_id = socket.id;
      rooms[j].players[rooms[j].clients].room =
        rooms[j].roomno + "" + rooms[j].game_type;
      console.log(
        rooms[j].players[rooms[j].clients].name +
          " just connected in " +
          rooms[j].players[rooms[j].clients].room
      );
      rooms[j].clients++;
      console.log(rooms[j].players);
      socket.emit("begin_game");
      socket.on("cell_clicked", function (k) {
        socket.emit("cell_clicked", {
          Name: rooms[j].places[k].cell_name,
          price: rooms[j].places[k].price,
          ownership: rooms[j].places[k].ownership,
        });
      });
      socket.on('chat message', msg => {
        console.log("listened the msg")
      let p2 = 0;
      let q2 = 0;
      let pq2 = 0;
      while (p2 < rooms.length && pq2 != 1) {
        while (q2 < rooms[p2].clients) {
          if (rooms[p2].players[q2].socket_id == socket.id) {
            console.log("message" + rooms[p2].clients + " " + p2 + " " + q2);
            pq2 = 1;
            break;
          }
          q2++;
        }
        p2++;
      }
      p2 = p2 - 1;
      q2 = q2 % 4;
      console.log("room is "+rooms[p2].roomno + "" + rooms[p2].game_type)
        let m="PLAYER "+rooms[p2].players[q2].name+" :  "+msg;
        io.sockets
        .in("room-" + rooms[p2].roomno + "" + rooms[p2].game_type)
        .emit('chat message', m);
        // msg="You:  "+msg;
        // io.to(socket.id).emit('chat message', msg);
      });
      socket.on("move", function () {
        console.log("hi " + socket.id);
        let p = 0;
        let q = 0;
        let pqa = 0;
        while (p < rooms.length && pqa != 1) {
          while (q < rooms[p].clients) {
            if (rooms[p].players[q].socket_id == socket.id) {
              console.log("bye bye" + rooms[p].clients + " " + p + " " + q);
              pqa = 1;
              break;
            }
            q++;
          }
          p++;
        }
        p = p - 1;
        q = q % 4;
        console.log(p + " " + q + " move check " + socket.id);
        let a = 0;
        if (
          rooms[p].players[q].socket_id == socket.id &&
          rooms[p].players[q].turn == 1 &&
          rooms[p].players[q].in_game == 1
        ) {
          if (rooms[p].players[q].money < 0) {
            rooms[p].players[q].in_game = 0;
            rooms[p].players[q].turn = 0;
            rooms[p].players[(q + 1) % rooms[p].clients].turn = 1;
            io.to(socket.id).emit("end_game");
          }
          io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("display", rooms[p].players[q].name + " moved");
          let b = move_piece(rooms[p].players[q].curr_pos);
          if (b >= 23) {
            rooms[p].players[q].money += 100;
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name: rooms[p].players[q].name,
                player_money: rooms[p].players[q].money,
              });
          }
          a = b % 23;
          b = 0;
          io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: a,
            });
          rooms[p].players[q].curr_pos = a;

          let choice = decision(
            rooms[p].players[q].name,
            rooms[p].places[a].ownership,
            rooms[p].players[q].money,
            rooms[p].places[a].price,
            rooms[p].places[a].name
          );
          console.log("hello " + choice);

          let count = 0;

          if (choice == 1) {
            //rent case
            console.log(p + " " + q);
            rooms[p].players[q].money =
              rooms[p].players[q].money - rooms[p].places[a].price * 0.1;
            rooms[p].players[rooms[p].places[a].ownership - 1].money =
              rooms[p].players[rooms[p].places[a].ownership - 1].money +
              rooms[p].places[a].price * 0.1;
            console.log(rooms[p].players);
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name: rooms[p].players[q].name,
                player_money: rooms[p].players[q].money,
              });
            io.sockets
              .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
              .emit("update_money", {
                player_name:
                  rooms[p].players[rooms[p].places[a].ownership - 1].name,
                player_money:
                  rooms[p].players[rooms[p].places[a].ownership - 1].money,
              });
              let msg="PLAYER "+rooms[p].players[q].name+" paid $"+rooms[p].places[a].price * 0.1+" as rent to "+rooms[p].players[rooms[p].places[a].ownership - 1].name;
              io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("display", msg);
            
            if (rooms[p].players[q].money < 0) {
              rooms[p].players[q].in_game == 0;
              io.to(socket.id).emit("end_game");
              console.log(rooms[p].players[q].name + " is out");
            }
          }
          if (choice == 0) {
            //buy city case
            io.to(socket.id).emit("player_decision", rooms[p].players[q].name);
            console.log("player decision event fired " + socket.id);
          }
          if(choice == 5){
            rooms[p].players[q].money+=100;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU GET $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 6){
            rooms[p].players[q].money-=50;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU LOSE $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 7){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){

                rooms[p].players[alpha].money-=50;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[alpha].name,
                  player_money: rooms[p].players[alpha].money,
                });
            }
            let msg="EVERYONE LOSES $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }

          if(choice == 8){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){

                rooms[p].players[alpha].money+=100;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[alpha].name,
                  player_money: rooms[p].players[alpha].money,
                });
            }
            let msg="EVERYONE GETS $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice == 9){
            for(let alpha=0;alpha<rooms[p].clients;alpha++){
                if(alpha!=q){

                    rooms[p].players[alpha].money+=150;
                    io.sockets
                    .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                    .emit("update_money", {
                      player_name: rooms[p].players[alpha].name,
                      player_money: rooms[p].players[alpha].money,
                    });
                }
            }
            let msg="EVERYONE EXCEPT YOU GETS $150"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==10){
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: 0,
            });
            rooms[p].players[q].curr_pos = 0;
            rooms[p].players[q].money += 100;
            setTimeout(function(){
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });

            },2000)
            let msg="GO TO START AND COLLECT $100"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==11){
            rooms[p].players[q].money-=50;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOU LOSE $50"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }
          if(choice==12){
            rooms[p].players[q].money-=200;
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update_money", {
              player_name: rooms[p].players[q].name,
              player_money: rooms[p].players[q].money,
            });
            let msg="YOUR BAIL COST YOU $200"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }

          if(choice==13){
            io.sockets
            .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
            .emit("update", {
              name: rooms[p].players[q].name,
              curr_pos: rooms[p].players[q].curr_pos,
              new_pos: 6,
            });
            rooms[p].players[q].curr_pos = 6;
            rooms[p].players[q].money -= 200;
            setTimeout(function(){
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });

            },4000)
            let msg="GO TO JAIL"
            io.sockets.in("room-"+rooms[p].roomno+""+rooms[p].game_type).emit("display",msg);
          }

          socket.on("buy", function (player_name) {
            console.log(socket.id + " tried to buy");
            let p = 0;
            let q = 0;
            let pq = 0;
            while (p < rooms.length && pq != 1) {
              while (q < rooms[p].clients) {
                if (rooms[p].players[q].socket_id == socket.id) {
                  console.log("bye bye" + rooms[p].clients + " " + p + " " + q);
                  pq = 1;
                  break;
                }
                q++;
              }
              p++;
            }
            p = p - 1;
            q = q % 4;
            // if (p >= 1) {
            //   q = q + p;
            // }
            console.log(p + " " + q);
            if (count < 1 && choice == 0) {
              rooms[p].players[q].money =
                rooms[p].players[q].money - rooms[p].places[a].price;
              rooms[p].places[a].ownership = player_name;
              io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_stats", {
                  player_name: rooms[p].players[q].name,
                  place_name: rooms[p].places[a].cell_name,
                });
              io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("update_money", {
                  player_name: rooms[p].players[q].name,
                  player_money: rooms[p].players[q].money,
                });
                let msg="PLAYER "+rooms[p].players[q].name+" bought "+rooms[p].places[a].cell_name;
                io.sockets
                .in("room-" + rooms[p].roomno + "" + rooms[p].game_type)
                .emit("display", msg);
              console.log(rooms[p].players);
              count++;
            }
          });
          rooms[p].players[q].turn = 0;
          rooms[p].players[(q + 1) % rooms[p].clients].turn = 1;
        }
      });
    }
  }






  if(game_type==3){
    socket.join("room-" + socket.id);
      let rooms3=[{
        roomno: socket.id,
        clients: 4,
        game_type: 3,
        players: [
          {
            socket_id: 0,
            name: 1,
            curr_pos: 0,
            money: 1000,
            turn: 1,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 2,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 3,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
          {
            socket_id: 0,
            name: 4,
            curr_pos: 0,
            money: 1000,
            turn: 0,
            in_game: 1,
            room: -1,
          },
        ],
        places: [
          {
            cell: 0,
            name: go,
            price: 0,
            ownership: 0,
            cell_name: "Start",
          },
          {
            cell: 1,
            name: city,
            price: 60,
            ownership: 0,
            cell_name: "MEDITERRANIAN AVE",
          },
          {
            cell: 2,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 3,
            name: city,
            price: 100,
            ownership: 0,
            cell_name: "ORIENTAL AVE",
          },
          {
            cell: 4,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 5,
            name: city,
            price: 120,
            ownership: 0,
            cell_name: "CONNECTICUT AVE",
          },
          {
            cell: 6,
            name: jail,
            price: 0,
            ownership: 0,
            cell_name: "JAIL",
          },
          {
            cell: 7,
            name: city,
            price: 140,
            ownership: 0,
            cell_name: "ST.CHARLES PLACE",
          },
          {
            cell: 8,
            name: company,
            price: 150,
            ownership: 0,
            cell_name: "ELEC.COMP",
          },
          {
            cell: 9,
            name: city,
            price: 160,
            ownership: 0,
            cell_name: "VIRGINIA AVE",
          },
          {
            cell: 10,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 11,
            name: city,
            price: 200,
            ownership: 0,
            cell_name: "NY AVE",
          },
          {
            cell: 12,
            name: park,
            price: 0,
            ownership: 0,
            cell_name: "FREE PARKING",
          },
          {
            cell: 13,
            name: city,
            price: 220,
            ownership: 0,
            cell_name: "KENTUCY AVE",
          },
          {
            cell: 14,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 15,
            name: city,
            price: 240,
            ownership: 0,
            cell_name: "ILLINOIS AVE",
          },
          {
            cell: 16,
            name: company,
            price: 150,
            ownership: 0,
            cell_name: "WATER WORKS",
          },
          {
            cell: 17,
            name: city,
            price: 280,
            ownership: 0,
            cell_name: "MARVIN GARDENS",
          },
          {
            cell: 18,
            name: go_jail,
            price: 0,
            ownership: 0,
            cell_name: "GO TO JAIL",
          },
          {
            cell: 19,
            name: city,
            price: 300,
            ownership: 0,
            cell_name: "PACIFIC AVE",
          },
          {
            cell: 20,
            name: chest,
            price: 0,
            ownership: 0,
            cell_name: "COMMUNITY CHEST",
          },
          {
            cell: 21,
            name: city,
            price: 320,
            ownership: 0,
            cell_name: "PENNSYLVANIA AVE",
          },
          {
            cell: 22,
            name: chance,
            price: 0,
            ownership: 0,
            cell_name: "CHANCE",
          },
          {
            cell: 23,
            name: city,
            price: 400,
            ownership: 0,
            cell_name: "BOARDWALK",
          },
        ],
      }];

        for(let co=0;co<4;co++){

            rooms3[0].players[co].socket_id = socket.id;
            rooms3[0].players[co].room =
              rooms3[0].roomno;
              console.log(
                "PLAYER "+rooms3[0].players[co].name +
                  " just connected in " +
                  rooms3[0].players[co].room
              );
        }
        console.log(rooms3[0].players);
        socket.emit("begin_game");
        socket.on("cell_clicked", function (k) {
          socket.emit("cell_clicked", {
            Name: rooms3[0].places[k].cell_name,
            price: rooms3[0].places[k].price,
            ownership: rooms3[0].places[k].ownership,
          });
        });

        let q=0;
        let gamma=0;
        let p=0;
        socket.on("move", function () {
          let a = 0;
          if (
            rooms3[p].players[q].turn == 1 &&
            rooms3[p].players[q].in_game == 1
          ) {
            if (rooms3[p].players[q].money < 0) {
              rooms3[p].players[q].in_game = 0;
              rooms3[p].players[q].turn = 0;
              rooms3[p].players[(q + 1) % rooms3[p].clients].turn = 1;
              io.to(socket.id).emit("end_game");
            }
  
            io.sockets
              .in("room-" + socket.id)
              .emit("display", rooms3[p].players[q].name + " moved");
            let b = move_piece(rooms3[p].players[q].curr_pos);
            if (b >= 23) {
              rooms3[p].players[q].money += 100;
              io.sockets
                .in("room-" + socket.id)
                .emit("update_money", {
                  player_name: rooms3[p].players[q].name,
                  player_money: rooms3[p].players[q].money,
                });
            }
            a = b % 23;
            b = 0;
            io.sockets
              .in("room-" + socket.id)
              .emit("update", {
                name: rooms3[p].players[q].name,
                curr_pos: rooms3[p].players[q].curr_pos,
                new_pos: a,
              });
            rooms3[p].players[q].curr_pos = a;
              gamma=q;
            let choice = decision(
              rooms3[p].players[q].name,
              rooms3[p].places[rooms3[p].players[gamma].curr_pos].ownership,
              rooms3[p].players[q].money,
              rooms3[p].places[rooms3[p].players[gamma].curr_pos].price,
              rooms3[p].places[rooms3[p].players[gamma].curr_pos].name
            );
            console.log("CHOICE: " + choice+" q is "+q);
  
            if (choice == 1) {
              //rent case
              console.log(p + " " + q);
              rooms3[p].players[q].money =
                rooms3[p].players[q].money - rooms3[p].places[a].price * 0.1;
              rooms3[p].players[rooms3[p].places[a].ownership - 1].money =
                rooms3[p].players[rooms3[p].places[a].ownership - 1].money +
                rooms3[p].places[a].price * 0.1;
              console.log(rooms3[p].players);
              io.sockets
                .in("room-" + socket.id)
                .emit("update_money", {
                  player_name: rooms3[p].players[q].name,
                  player_money: rooms3[p].players[q].money,
                });
              io.sockets
                .in("room-" + socket.id)
                .emit("update_money", {
                  player_name:
                    rooms3[p].players[rooms3[p].places[a].ownership - 1].name,
                  player_money:
                    rooms3[p].players[rooms3[p].places[a].ownership - 1].money,
                });
              if (rooms3[p].players[q].money < 0) {
                rooms3[p].players[q].in_game == 0;
                io.to(socket.id).emit("end_game");
                console.log(rooms3[p].players[q].name + " is out");
              }
            }
            if (choice == 0) {
              //buy city case
              io.sockets.in("room-"+socket.id).emit("player_decision", rooms3[p].players[q].name);
              console.log("player decision event fired " + rooms3[p].players[q].name);
            }
            if(choice == 5){
              rooms3[p].players[q].money+=100;
              io.sockets
              .in("room-" + socket.id)
              .emit("update_money", {
                player_name: rooms3[p].players[q].name,
                player_money: rooms3[p].players[q].money,
              });
              let msg="YOU GET $100"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice == 6){
              rooms3[p].players[q].money-=50;
              io.sockets
              .in("room-" + socket.id)
              .emit("update_money", {
                player_name: rooms3[p].players[q].name,
                player_money: rooms3[p].players[q].money,
              });
              let msg="YOU LOSE $50"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice == 7){
              for(let alpha=0;alpha<4;alpha++){
  
                  rooms3[p].players[alpha].money-=50;
                  io.sockets
                  .in("room-"+ socket.id)
                  .emit("update_money", {
                    player_name: rooms3[p].players[alpha].name,
                    player_money: rooms3[p].players[alpha].money,
                  });
              }
              let msg="EVERYONE LOSES $50"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
  
            if(choice == 8){
              for(let alpha=0;alpha<rooms3[p].clients;alpha++){
  
                  rooms3[p].players[alpha].money+=100;
                  io.sockets
                  .in("room-" + socket.id)
                  .emit("update_money", {
                    player_name: rooms3[p].players[alpha].name,
                    player_money: rooms3[p].players[alpha].money,
                  });
              }
              let msg="EVERYONE GETS $100"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice == 9){
              for(let alpha=0;alpha<rooms3[p].clients;alpha++){
                  if(alpha!=q){
  
                      rooms3[p].players[alpha].money+=150;
                      io.sockets
                      .in("room-" + socket.id)
                      .emit("update_money", {
                        player_name: rooms3[p].players[alpha].name,
                        player_money: rooms3[p].players[alpha].money,
                      });
                  }
              }
              let msg="EVERYONE EXCEPT YOU GETS $150"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
  
            if(choice==10){
              io.sockets
              .in("room-"+ socket.id)
              .emit("update", {
                name: rooms3[p].players[q].name,
                curr_pos: rooms3[p].players[q].curr_pos,
                new_pos: 0,
              });
              rooms3[p].players[q].curr_pos = 0;
              rooms3[p].players[q].money += 100;
              setTimeout(function(){
                  io.sockets
                  .in("room-" + socket.id)
                  .emit("update_money", {
                    player_name: rooms3[p].players[q].name,
                    player_money: rooms3[p].players[q].money,
                  });
  
              },2000)
              let msg="GO TO START AND COLLECT $100"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice==11){
              rooms3[p].players[q].money-=50;
              io.sockets
              .in("room-" + socket.id)
              .emit("update_money", {
                player_name: rooms3[p].players[q].name,
                player_money: rooms3[p].players[q].money,
              });
              let msg="YOU LOSE $50"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice==12){
              rooms3[p].players[q].money-=200;
              io.sockets
              .in("room-"+ socket.id)
              .emit("update_money", {
                player_name: rooms3[p].players[q].name,
                player_money: rooms3[p].players[q].money,
              });
              let msg="YOUR BAIL COST YOU $200"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
            if(choice==13){
              io.sockets
              .in("room-" + socket.id)
              .emit("update", {
                name: rooms3[p].players[q].name,
                curr_pos: rooms3[p].players[q].curr_pos,
                new_pos: 6,
              });
              rooms3[p].players[q].curr_pos = 6;
              rooms3[p].players[q].money -= 200;
              setTimeout(function(){
                  io.sockets
                  .in("room-" + socket.id)
                  .emit("update_money", {
                    player_name: rooms3[p].players[q].name,
                    player_money: rooms3[p].players[q].money,
                  });
  
              },4000)
              let msg="GO TO JAIL"
              io.sockets.in("room-"+ socket.id).emit("display",msg);
            }
  
  
            let count=0;
            socket.on("buy", function (player_name) {
               if(q==0){
                gamma=3;
               }
               else{
                gamma=q-1;
               }
                console.log("p is "+p+" and gamma is "+gamma +" count "+count+" a "+a);
              if (count < 1 && rooms3[p].players[q].turn==1 && rooms3[p].places[rooms3[p].players[gamma].curr_pos].ownership!=player_name ) {
                if(rooms3[p].places[rooms3[p].players[gamma].curr_pos].name=="city" || rooms3[p].places[rooms3[p].players[gamma].curr_pos].name=="company"  ){
                rooms3[p].players[gamma].money =
                  rooms3[p].players[gamma].money - rooms3[p].places[rooms3[p].players[gamma].curr_pos].price;
                rooms3[p].places[rooms3[p].players[gamma].curr_pos].ownership = player_name;
                io.sockets
                  .in("room-" + socket.id)
                  .emit("update_stats", {
                    player_name: rooms3[p].players[gamma].name,
                    place_name: rooms3[p].places[rooms3[p].players[gamma].curr_pos].cell_name,
                  });
                io.sockets
                  .in("room-" + socket.id)
                  .emit("update_money", {
                    player_name: rooms3[p].players[gamma].name,
                    player_money: rooms3[p].players[gamma].money,
                  });
                console.log(rooms3[p].players);
                count++;
              }
              }
            });
            rooms3[p].players[q].turn = 0;
            rooms3[p].players[(q + 1) % 4].turn = 1;
            q=(q+1)%4;
          }
        });
}});
http.listen(3000, () => {
  console.log(`Socket.IO server running at http://localhost:${3000}/`);
});
