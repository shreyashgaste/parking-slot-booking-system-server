const Customer = require("../models/Customer");
const Authority = require("../models/Authority");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Parkingslot = require("../models/Parkingslot");

// handle errors
const handleErrors = (err) => {
  let errors = { email: "", password: "" };

  // incorrect email
  if (err.message === "incorrect email") {
    errors.email = "Email is not registered";
  }

  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "Password is incorrect";
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = "Email is already registered";
    return errors;
  }

  // validation errors
  if (err.message.includes("User validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.SECRET_KEY, {
    expiresIn: maxAge,
  });
};

// controller actions

module.exports.customersignup_post = async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password)
    return res.json({ error: "Please provide all the details." });
  try {
    const isexist = await Customer.findOne({ email });
    if (isexist) {
      if (isexist.verified) {
        return res.json({
          message: "Customer already registered, please login!",
        });
      } else {
        const deleteCustomer = await Customer.findOneAndDelete({ email });
      }
    }
    const customer = new Customer({
      name,
      email,
      phone,
      password,
    });

    await customer.save();
    res
      .status(201)
      .json({ message: "Customer registered succesfully", customer });
  } catch (err) {
    // const errors = handleErrors(err);
    // res.status(400).json({ errors });
  }
};

module.exports.customersignin_post = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ error: "Must provide email and password" });
  try {
    const isexist = await Customer.findOne({ email });
    if (isexist) {
      if (!isexist.verified) {
        const deleteUser = await Customer.findOneAndDelete({ email });
        if (deleteUser)
          return res.json({
            error: "Customer is not registered, please sign-up!",
          });
      }
    }

    const customer = await Customer.login(email, password);
    const token = createToken(customer._id);

    let oldTokens = customer.tokens || [];
    if (oldTokens.length) {
      oldTokens = oldTokens.filter((t) => {
        const timeDiff = (Date.now() - parseInt(t.signedAt)) / 1000;
        if (timeDiff < 259200) {
          return t;
        }
      });
    }
    await Customer.findByIdAndUpdate(customer._id, {
      tokens: [...oldTokens, { token, signedAt: Date.now().toString() }],
    });
    // res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ customer });
  } catch (err) {
    // const errors = handleErrors(err);
    // res.status(400).json({ errors });
  }
};

module.exports.authoritysignup_post = async (req, res) => {
  const { name, email, phone, password, address } = req.body;
  if (!name || !email || !phone || !password || !address)
    return res.json({ error: "Please provide all the details." });
  try {
    const isexist = await Authority.findOne({ email });
    if (isexist) {
      if (isexist.verified) {
        return res.json({
          message: "Authority already registered, please login!",
        });
      } else {
        const deleteAuthority = await Authority.findOneAndDelete({ email });
      }
    }
    const authority = new Authority({
      name,
      email,
      phone,
      address: address.toLowerCase(),
      password,
    });

    await authority.save();
    res
      .status(201)
      .json({ message: "Authority registered succesfully", authority });
  } catch (err) {
    // const errors = handleErrors(err);
    // res.status(400).json({ errors });
  }
};

module.exports.authoritysignin_post = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ error: "Must provide email and password" });
  try {
    const isexist = await Authority.findOne({ email });
    if (isexist) {
      if (!isexist.verified) {
        const deleteAuthority = await Authority.findOneAndDelete({ email });
        if (deleteAuthority)
          return res.json({
            error: "Authority is not registered, please sign-up!",
          });
      }
    }

    const authority = await Authority.login(email, password);
    const token = createToken(authority._id);

    let oldTokens = authority.tokens || [];
    if (oldTokens.length) {
      oldTokens = oldTokens.filter((t) => {
        const timeDiff = (Date.now() - parseInt(t.signedAt)) / 1000;
        if (timeDiff < 259200) {
          return t;
        }
      });
    }
    await Authority.findByIdAndUpdate(authority._id, {
      tokens: [...oldTokens, { token, signedAt: Date.now().toString() }],
    });
    // res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ token, authority });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};
module.exports.adminsignup_post = async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !phone || !password)
    return res.json({ error: "Please provide all the details." });
  try {
    const isexist = await Admin.findOne({ email });
    if (isexist) {
      if (isexist.verified) {
        return res.json({ message: "Admin already registered, please login!" });
      } else {
        const deleteAdmin = await Admin.findOneAndDelete({ email });
      }
    }
    const admin = new Admin({
      name,
      email,
      phone,
      password,
    });

    await admin.save();
    res.status(201).json({ message: "Admin registered succesfully", admin });
  } catch (err) {
    // const errors = handleErrors(err);
    // res.status(400).json({ errors });
  }
};

module.exports.adminsignin_post = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.json({ error: "Must provide email and password" });
  try {
    const isexist = await Admin.findOne({ email });
    if (isexist) {
      if (!isexist.verified) {
        const deleteAdmin = await Admin.findOneAndDelete({ email });
        if (deleteAdmin)
          return res.json({
            error: "Admin is not registered, please sign-up!",
          });
      }
    }

    const admin = await Admin.login(email, password);
    const token = createToken(admin._id);

    let oldTokens = admin.tokens || [];
    if (oldTokens.length) {
      oldTokens = oldTokens.filter((t) => {
        const timeDiff = (Date.now() - parseInt(t.signedAt)) / 1000;
        if (timeDiff < 259200) {
          return t;
        }
      });
    }
    await Admin.findByIdAndUpdate(admin._id, {
      tokens: [...oldTokens, { token, signedAt: Date.now().toString() }],
    });
    // res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ token, admin });
  } catch (err) {
    // const errors = handleErrors(err);
    // res.status(400).json({ errors });
  }
};

module.exports.findparkingslots_post = async (req, res) => {
  const { address } = req.body;
  if (!address) return res.json({ error: "Please provide address." });
  try {
    const searchAddress = address.toLowerCase();
    const data = await Authority.find({
      address: { $regex: searchAddress },
    });
    console.log(data.length);
    if (data.length == 0) return res.json({ error: "No Address Found" });
    let result = [];
    for (let i = 0; i < data.length; i++) {
      console.log(data[i]._id, "hi");
      const tmp = await Parkingslot.findOne({
        owner: data[i]._id,
      });
      console.log(tmp);
      result.push(tmp);
    }
    console.log(result);
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
};

module.exports.registerparkinglocation_post = async (req, res) => {
  const {
    owner,
    availableTwoWheelerSlots,
    availableFourWheelerSlots,
    totalTwoWheelerSlots,
    totalFourWheelerSlots,
    fareForTwoWheelerSlots,
    fareForFourWheelerSlots,
  } = req.body;
  if (
    !owner ||
    !availableTwoWheelerSlots ||
    !availableFourWheelerSlots ||
    !fareForTwoWheelerSlots ||
    !fareForFourWheelerSlots
  )
    return res.json({ error: "Please provide all details." });
  try {
    const data = new Parkingslot({
      owner,
      availableTwoWheelerSlots,
      availableFourWheelerSlots,
      totalTwoWheelerSlots,
      totalFourWheelerSlots,
      fareForTwoWheelerSlots,
      fareForFourWheelerSlots,
    });

    await data.save();
    res
      .status(201)
      .json({ message: "Parking location saved succesfully", data });
  } catch (err) {
    console.log(err);
  }
};

//   module.exports.bookslot_post = async (req, res) => {
//     const { owner, vehicleNo, entryTime, exitTime } = req.body;
//     if (!owner || !vehicleNo || !entryTime || !exitTime)
//       return res.json({ error: "Please provide all the details." });
//     try {
//       const isexist = await Customer.findOne({ email });
//       if (isexist) {
//         if (isexist.verified) {
//           return res.json({ message: "Customer already registered, please login!" });
//         } else {
//           const deleteCustomer = await Customer.findOneAndDelete({ email });
//         }
//       }
//       const customer = new Customer({
//         name,
//         email,
//         phone,
//         password,
//       });

//       await customer.save();
//       res.status(201).json({ message: "Customer registered succesfully", customer });
//     } catch (err) {
//         console.log(err);
//     }
//   };
