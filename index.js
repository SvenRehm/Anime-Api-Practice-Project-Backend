const dotenv = require("dotenv")
dotenv.config()
const express = require("express")
const app = new express()
const cors = require("cors")
const passport = require("passport")
const passportJWT = require("passport-jwt")
const JwtStrategy = passportJWT.Strategy
const ExtractJwt = passportJWT.ExtractJwt
const parser = require("body-parser")
const knex = require("knex")
const knexDb = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "test",
    database: "animebrain"
  }
})
const bookshelf = require("bookshelf")
const securePassword = require("bookshelf-secure-password")

const db = bookshelf(knexDb)
db.plugin(securePassword)
const jwt = require("jsonwebtoken")
const User = db.Model.extend({
  tableName: "login_user",
  hasSecurePassword: true
})

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET_OR_KEY
}

const strategy = new JwtStrategy(opts, (payload, next) => {
  User.forge({ id: payload.id })
    .fetch()
    .then(res => {
      next(null, res)
    })
})
app.use(cors())
passport.use(strategy)
app.use(passport.initialize())
app.use(
  parser.urlencoded({
    extended: false
  })
)
app.use(parser.json())

app.get("/", (req, res) => {
  // res.send(knexDb.database)
  knexDb
    .select("id", "username", "animelist", "email", "joined")
    .from("login_user")
    .then(user => {
      res.json(user)
    })
})

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password || !req.body.username) {
    return res.status(401).send({ message: "Some Fields are empty" })
  }

  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    joined: new Date()
  })

  user
    .save()
    .then(() => {
      res.send({ message: "Successfully Registered" })
    })
    .catch(err => {
      return res
        .status(401)
        .send({ message: "Username or Email exists already" })
    })
})
app.post("/getToken", (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(401).send({ message: "Some Fields are empty" })
  }
  User.forge({ email: req.body.email })
    .fetch()
    .then(result => {
      if (!result) {
        return res.status(400).send("user not found")
      }
      result
        .authenticate(req.body.password)
        .then(user => {
          const payload = { id: user.id }
          const token = jwt.sign(payload, process.env.SECRET_OR_KEY)
          res.send(token)
        })
        .catch(err => {
          return res
            .status(401)
            .send({ message: "Username or Password Incorrect" })
        })
    })
})

app.get(
  "/protected",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.send("i'm protected")
  }
)
app.get(
  "/getUser",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.send(req.user)
  }
)

app.put("/addplaylist", (req, res) => {
  const { id, animeid } = req.body
  knexDb("login_user")
    .where("id", "=", id)
    .update({
      animelist: knexDb.raw("array_append(animelist, ?)", [animeid])
    })

    .returning("animelist")
    .then(animelist => {
      res.json(animelist[0])
    })
    .catch(err => res.status(400).json("unable to get animelist"))
})

app.delete("/removefromplaylist", (req, res) => {
  const { id, animeid } = req.body

  knexDb("login_user")
    .where("id", "=", id)
    .update({
      animelist: knexDb.raw(`array_remove(animelist, ${animeid})`)
    })

    .returning("animelist")
    .then(animelist => {
      res.json(animelist[0])
    })
    .catch(err => res.status(400).json("unable to get animelist"))
})

const PORT = process.env.PORT || 5000
app.listen(PORT)