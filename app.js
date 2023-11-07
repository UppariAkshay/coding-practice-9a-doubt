const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let database = null;
const databasePath = path.join(__dirname, "userData.db");

const bcrypt = require("bcrypt");

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/register/", async (request, response) => {
  let registerUser = ``;

  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);

  const checkUserNameInDatabase = `
    SELECT *
    FROM user
    WHERE username = '${username}'`;

  const isUsernameThereInDatabase = await database.get(checkUserNameInDatabase);

  if (isUsernameThereInDatabase === undefined) {
    if (password.length >= 5) {
      registerUser = `
            INSERT INTO user(username,name,password,gender,location)
            VALUES('${username}','${name}','${hashPassword}','${gender}','${location}')`;
      await database.run(registerUser);
      response.send("User created successfully");
    } else {
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  let loginUser = ``;

  const { username, password } = request.body;

  const checkUsernameInDatabase = `
    SELECT *
    FROM user
    WHERE username = '${username}'`;
  const isUsernameThereInDatabase = await database.get(checkUsernameInDatabase);

  if (isUsernameThereInDatabase !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      password,
      isUsernameThereInDatabase.password
    );

    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  let changePassword = ``;

  const getUser = `
    SELECT *
    FROM user
    WHERE username = '${username}'`;

  const user = await database.get(getUser);

  if (user === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
    console.log(isPasswordMatched);
    if (isPasswordMatched === true) {
      const newPasswordLength = newPassword.length;
      if (newPasswordLength >= 5) {
        const newHashPassword = await bcrypt.hash(newPassword, 10);
        changePassword = `
            UPDATE user
            SET password = '${newHashPassword}'
            WHERE username = '${username}'`;

        await database.run(changePassword);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password too short");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
