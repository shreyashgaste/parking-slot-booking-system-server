const Customer = require("../models/Customer");
const Authority = require("../models/Authority");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Parkingslot = require("../models/Parkingslot");
const CustomerVerificationToken = require("../models/CustomerVerificationToken");
const AuthorityVerificationToken = require("../models/AuthorityVerificationToken");
const {
  generateOTP,
  mailTransport,
  generateEmailTemplate,
  plainEmailTemplate,
  generatePasswordResetTemplate,
  awsConfiguration,
} = require("../utils/mail");
const { isValidObjectId } = require("mongoose");
const { createRandomBytes } = require("../utils/commonHelper");

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
    const OTP = generateOTP();
    const customerVerificationToken = new CustomerVerificationToken({
      owner: customer._id,
      token: OTP,
    });
    await customerVerificationToken.save();
    await customer.save();
    mailTransport().sendMail({
      from: process.env.USER,
      to: customer.email,
      subject: "Verify your email account",
      html: generateEmailTemplate(OTP, `${customer.name}`),
    });
    res
      .status(201)
      .json({
        message: "Check your email and verify your account to continue...",
        customer,
      });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.verifyEmail_post = async (req, res) => {
  const { userId, otp, role } = req.body;
  if (!userId || !otp.trim() || !role.trim())
    return res.json({ error: "Invalid request, missing parameters!" });

  if (!isValidObjectId(userId)) return res.json({ error: "Invalid user id!" });
  try {
    let user;
    if (role === "Authority") {
      user = await Authority.findById(userId);
    } else if (role === "Customer") {
      user = await Customer.findById(userId);
    }

    if (!user) return res.json({ error: "Sorry, user not found!" });

    if (user.verified)
      return res.json({ error: "This account is already verified!" });
    let token;
    if (role === "Authority") {
      token = await AuthorityVerificationToken.findOne({ owner: user._id });
    } else if (role === "Customer") {
      token = await CustomerVerificationToken.findOne({ owner: user._id });
    }

    if (!token) {
      let deleteUser;
      if (role === "Authority") {
        deleteUser = await Authority.findByIdAndDelete(userId);
      } else if (role === "Customer") {
        deleteUser = await Customer.findByIdAndDelete(userId);
      }
      return res.json({ error: "Sorry, user not found!" });
    }

    const isMatched = await token.compareToken(otp.trim());
    if (!isMatched) return res.json({ error: "Please provide a valid token!" });

    user.verified = true;
    if (role === "Authority") {
        await AuthorityVerificationToken.findByIdAndDelete(token._id);
      } else if (role === "Customer") {
        await CustomerVerificationToken.findByIdAndDelete(token._id);
      }

    await user.save();

    mailTransport().sendMail({
      from: process.env.USER,
      to: user.email,
      subject: "Welcome Email",
      html: plainEmailTemplate(
        `${user.name}`,
        "Email Verified Successfully. Thanks for connecting with us!"
      ),
    });
    //   awsConfiguration();
    //   const ses = new AWS.SES({ region: "ap-south-1" });
    //   const params = {
    //     Destination: { ToAddresses: [user.email] },
    //     Message: {
    //       Body: {
    //         Html: {
    //           Charset: "UTF-8",
    //           Data: plainEmailTemplate(
    //             `${user.name}`,
    //             "Email Verified Successfully. Thanks for connecting with us!"
    //           ),
    //         },
    //       },
    //       Subject: { Charset: "UTF-8", Data: "Welcome Email" },
    //     },
    //     Source: process.env.USER,
    //   };
    //   ses
    //     .sendEmail(params)
    //     .promise()
    //     .then((val) => {
    //       console.log(val);
    //     })
    //     .catch((err) => {
    //       console.log(err);
    //     });
    res.json({ success: true, message: "Your email is verified.", user });
  } catch (error) {
      console.log(error);
    res.json({ error: "Server traffic error!" });
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
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ customer });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
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
    const OTP = generateOTP();
    const authorityVerificationToken = new AuthorityVerificationToken({
      owner: authority._id,
      token: OTP,
    });
    await authorityVerificationToken.save();

    await authority.save();
    mailTransport().sendMail({
      from: process.env.USER,
      to: authority.email,
      subject: "Verify your email account",
      html: generateEmailTemplate(OTP, `${authority.name}`),
    });
    res
      .status(201)
      .json({ message: "Check your email and verify your account to continue...", authority });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
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
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
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
    const errors = handleErrors(err);
    res.status(400).json({ errors });
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
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ token, admin });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
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

module.exports.bookslot_post = async (req, res) => {
  const {
    authorityOwner,
    customerOwner,
    locationId,
    vehicleType,
    vehicleNo,
    entryTime,
    exitTime,
    duration,
  } = req.body;
  if (
    !authorityOwner ||
    !locationId ||
    !vehicleType ||
    !vehicleNo ||
    !entryTime ||
    !exitTime ||
    !duration
  )
    return res.json({ error: "Please provide all the details." });
  try {
    const availability = await Parkingslot.findById(locationId);
    let data;
    if (vehicleType === "Two-Wheeler") {
      if (availability.availableTwoWheelerSlots > 0) {
        data = await Parkingslot.findByIdAndUpdate(locationId, {
          availableTwoWheelerSlots: availability.availableTwoWheelerSlots - 1,
        });
      }
    } else if (vehicleType === "Four-Wheeler") {
      if (availability.availableFourWheelerSlots > 0) {
        data = await Parkingslot.findByIdAndUpdate(locationId, {
          availableFourWheelerSlots: availability.availableFourWheelerSlots - 1,
        });
      }
    }
    if (data) {
      const bookingslot = new Parkingslot({
        owner: customerOwner,
        locationId,
        vehicleType,
        vehicleNo,
        entryTime,
        exitTime,
        duration,
      });
      if (bookingslot) res.status(201).json({ message: "Booking done!" });
    }
    res
      .status(201)
      .json({ message: "Customer registered succesfully", customer });
  } catch (err) {
    console.log(err);
  }
};
