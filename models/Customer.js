const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const customerSchema = new mongoose.Schema({
  name:{
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "Customer",
    required: true
},
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [7, "Minimum password length is 7 characters"],
  },
  verified: {
    type: Boolean,
    default: false,
    required: true,
  },
  tokens: [
    {
      type: Object
    }
  ]
});

// fire a function before doc saved to db
customerSchema.pre("save", async function (next) {
  if(this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);  
  }
  next();
});

// static method to login user
customerSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw Error("incorrect password");
  }
  throw Error("incorrect email");
};

customerSchema.methods.comparePassword = async function (password) {
  const result = await bcrypt.compareSync(password, this.password);
  return result;
}

const Customer = mongoose.model("customer", customerSchema);

module.exports = Customer;
