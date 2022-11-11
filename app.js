require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;
const { move_piece, decision } = require("./game");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "Ourvvtybtguybyggygg.",
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  game_choice: Number,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
  done(null, user.id);
  // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

var user_id = 0;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/monopoly",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      user_id = profile.id;
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/monopoly",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/monopoly");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/monopoly", function (req, res) {
  console.log(user_id);
  if (req.isAuthenticated()) {
    res.render("monopoly");
  } else {
    res.render("login");
  }
});

app.get("/logout", function (req, res) {
  req.logout(function () {});
  res.redirect("/");
});

app.get("/monopoly_board", function (req, res) {
  res.render("monopoly_board");
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("register");
      } else {
        user_id = req.body.username;
        passport.authenticate("local")(req, res, function () {
          res.redirect("monopoly");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      user_id = req.body.username;
      passport.authenticate("local")(req, res, function () {
        res.redirect("monopoly");
      });
    }
  });
});
//uptil this point is the website functioning and user authentication
//below is the game logic
app.get("/monopoly_board", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("monopoly_board");
  } else {
    res.render("login");
  }
});
let game_type = 100;

app.post("/online_multiplayer", function (req, res) {
  game_type = 0;
  User.findOneAndUpdate(
    { username: user_id },
    { game_choice: 0 },
    { new: true },
    function (err, doc) {
      if (err) {
        console.log(err);
      } else {
        console.log(doc);
      }
    }
  );
  res.redirect("/monopoly_board");
});
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
  if (game_type == 0) {
    console.log("VALUE OF J IS: " + j);
    if (rooms[j].clients < 4) {
      rooms[j].game_type = 0;
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
              rooms3[p].places[a].ownership,
              rooms3[p].players[q].money,
              rooms3[p].places[a].price,
              rooms3[p].places[a].name
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
              if (count < 1 && rooms3[p].players[q].turn==1) {
                rooms3[p].players[gamma].money =
                  rooms3[p].players[gamma].money - rooms3[p].places[a].price;
                rooms3[p].places[a].ownership = player_name;
                io.sockets
                  .in("room-" + socket.id)
                  .emit("update_stats", {
                    player_name: rooms3[p].players[gamma].name,
                    place_name: rooms3[p].places[a].cell_name,
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
            });
            rooms3[p].players[q].turn = 0;
            rooms3[p].players[(q + 1) % 4].turn = 1;
            q=(q+1)%4;
          }
        });
}});
http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
