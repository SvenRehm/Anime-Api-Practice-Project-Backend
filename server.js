const express = require("express")
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt-nodejs")
const cors = require("cors")
const jwt = require("jsonwebtoken")

const knex = require("knex")
const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "test",
    database: "anime"
  }
})

db.select("*").from("users")

const app = express()

app.use(bodyParser.json())

app.use(cors())

app.get("/", (req, res) => {
  res.send(database.users)
})

app.post("/signin", (req, res) => {
  const { password, email } = req.body
  db.select("email", "hash")
    .from("login")
    .where("email", "=", email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash)
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json("unable to get user"))
      } else {
        res.status(400).json("wrong credentials")
      }
    })
    .catch(err => res.status(400).json("wrong credentials"))
})

app.post("/register", (req, res) => {
  const { email, name, password } = req.body
  const hash = bcrypt.hashSync(password)

  db.transaction(trx => {
    trx
      .insert({
        hash: hash,
        email: email
      })
      .into("login")
      .returning("email")
      .then(loginEmail => {
        var token = generateToken({
          email: loginEmail[0],
          name: name
        })
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
            name: name,
            joined: new Date()
          })
          .then(user => {
            res.json({ user: user[0] })
          })
      })
      .then(trx.commit)
      .catch(trx.rollback)
  }).catch(err => res.status(400).json("unable to register"))
})

app.get("/:id", (req, res) => {
  const { id } = req.params
  db("users")
    .select("*")

    .where({ id: id })
    .then(user => {
      if (user.length) {
        res.json(user[0])
      } else {
        res.status(400).json("Not found")
      }
    })
    .catch(err => res.status(400).json("error getting user"))
})

app.put("/addplaylist", (req, res) => {
  const { id, animeid } = req.body
  db("users")
    .where("id", "=", id)
    .update({
      animelist: knex.raw("array_append(animelist, ?)", [animeid])
    })

    .returning("animelist")
    .then(animelist => {
      res.json(animelist[0])
    })
    .catch(err => res.status(400).json("unable to get entries"))
})

app.listen(3002, () => {
  console.log("app is running 3002")
})
