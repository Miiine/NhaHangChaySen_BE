import bcrypt from "bcryptjs";

const password = "121212";
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log("Hash:", hash);
