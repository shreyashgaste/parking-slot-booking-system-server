const jwt = require('jsonwebtoken');
const Customer = require("../models/Customer");
const Admin = require("../models/Admin")

const checkAdmin = (req, res, next) => {
  const token = req.cookies.jwt;
  console.log(token);
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        // res.redirect('/ adminlogin');
        res.status(400).send({ error: "Please Login Again" })
      } else {
        const { userId } = decodedToken;
        let user = await Admin.findById(userId);
        res.user = user;
        next();
      }
    });
  } else {
    req.user = null;
    // res.redirect('/adminlogin');
    return res.status(400).send({error : "You must be logged in"});
  }
};
const checkCustomer = (req, res, next) => {
    const token = req.cookies.jwt;
    console.log(token);
    if (token) {
      jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
        if (err) {
          console.log(err.message);
          res.status(400).json({ error: "Please Login Again" })
        } else {
          const { userId } = decodedToken;
          let user = await Customer.findById(userId);
          res.user = user;
          next();
        }
      });
    } else {
      req.user = null;
      return res.status(400).send({error : "You must be logged in"});
    }
  };
  

module.exports = { checkCustomer, checkAdmin };