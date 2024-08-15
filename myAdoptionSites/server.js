const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const ejs = require('ejs');
const app = express();
const PORT = process.env.PORT || 3005;
const usersFile = path.join(__dirname, 'data', 'login.txt');
const petsFile = path.join(__dirname, 'data', 'pets.txt');

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
// Session middleware setup
app.use(session({
  secret: 'secret', resave: false, saveUninitialized: false, cookie: {secure: false}
}));
// Middleware to inject header and footer
app.use((req, res, next) => {
  const user = req.session.user || null;
  ejs.renderFile(path.join(__dirname, 'views', 'partials', 'header.ejs'), {user: req.session.user}, (err, header) => {
    if (err) return res.status(500).send('Error loading header');
    ejs.renderFile(path.join(__dirname, 'views', 'partials', 'footer.ejs'), {}, (err, footer) => {
      if (err) return res.status(500).send('Error loading footer');
      res.locals.header = header;
      res.locals.footer = footer;
      next();
    });
  });
});
// Route for the home page
app.get('/Q8HomePage', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'Q8HomePage.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading home page');
    const fullContent = res.locals.header + content + res.locals.footer;
    res.send(fullContent);
  });
});
app.get('/', (req, res) => {
  res.redirect('/Q8HomePage');
});

// Helper Functions
const readData = (file, callback) => {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) return callback(err);
    const lines = data.trim().split('\n');
    const result = lines.map(line => line.split(':'));
    callback(null, result);
  });
};

const writeData = (file, data, callback) => {
  const formattedData = data.map(entry => entry.join(':')).join('\n');
  fs.writeFile(file, formattedData, 'utf8', callback);
};


// 1. Create an account
app.get('/register', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'register.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading registration page');
    const fullContent = res.locals.header + content + res.locals.footer;
    res.send(fullContent);
  });
});
app.post('/register', (req, res) => {
  const {username, password} = req.body;

  const userRegex = /^[A-Za-z0-9]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,}$/;

  if (!userRegex.test(username) || !passwordRegex.test(password)) {
    return res.status(400).send('Invalid username or password format.');
  }

  fs.readFile(usersFile, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Server error.');

    const users = data.trim().split('\n').filter(Boolean);
    const usernameExists = users.some(line => line.split(':')[1] === username);

    if (usernameExists) {
      return res.status(409).send('Username already exists. Please choose another one.');
    }

    const nextID = users.length + 1;

    const newUserEntry = `${nextID}:${username}:${password}`;
    fs.appendFile(usersFile, `${newUserEntry}\n`, (err) => {
      if (err) return res.status(500).send('Failed to create account.');

      res.send(`Account successfully created with ID ${nextID}. You can now log in.`);
    });
  });
});


// 2. Login
app.get('/login', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'login.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading login page');
    res.send(res.locals.header + content + res.locals.footer);
  });
});

app.post('/login', (req, res) => {
  const { username, password, redirect } = req.body;

  // 逻辑验证用户名和密码
  readData(usersFile, (err, users) => {
    if (err) return res.status(500).send('Server error.');
    const user = users.find(u => u[0] === username && u[1] === password);
    if (user) {
      req.session.user = username;  // 登录成功，设置session
      res.redirect(redirect || '/'); // 登录后重定向至原始页面或首页
    } else {
      res.status(401).send('Invalid username or password.'); // 登录失败
    }
  });
});



app.get('/addPet', (req, res) => {
  if (!req.session || !req.session.user) {
    // 未登录，重定向至登录页面，并附带原始想访问的URL，以便登录后可以跳转回来
    res.redirect(`/login?redirect=/addPet`);
  } else {
    // 已登录，正常显示添加宠物页面
    fs.readFile(path.join(__dirname, 'public', 'addPet.html'), 'utf8', (err, content) => {
      if (err) return res.status(500).send('Error loading page');
      res.send(res.locals.header + content + res.locals.footer);
    });
  }
});



// 3. Add Pet (Protected Route)
app.post('/addPet', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { animal, breed, age, gender } = req.body;
  const username = req.session.user;

  // 读取现有宠物数据以确定新宠物的ID
  fs.readFile(petsFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading pet data:', err);
      return res.status(500).send('Error reading pet information.');
    }

    const pets = data.trim().split('\n').filter(Boolean);
    const nextID = pets.length + 1; // 计算下一个宠物的ID

    // 构建新宠物信息条目，并在前面添加编号
    const newPetEntry = `${nextID}:${username}:${animal}:${breed}:${age}:${gender}`;

    // 将新宠物信息追加到文件
    fs.appendFile(petsFile, `${newPetEntry}\n`, (err) => {
      if (err) {
        console.error('Error writing pet data:', err);
        return res.status(500).send('Error saving pet information.');
      }
      res.redirect('/addPet'); // 重定向到添加宠物页面或其他确认页面
    });
  });
});



// 4. Find Pets
app.get('/Q8FindCatDogPage', (req, res) => {
  // Initially serve the form with an optional message if there are no query parameters
  let initialHTML = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Adopt A-Cat/Dog</title>
  <link rel="stylesheet" href="Q8FindCatDogPage.css">
  <script src="js/updateTime.js"></script>
  <script src="validateForm.js"></script>
</head>
<body>
<header>
  <div class="container header">
    <a href="Q8HomePage">
      <img
        src="https://www.catster.com/wp-content/uploads/2023/11/Dog-and-cat-with-together-in-bed-AJR_photo-Shutterstock-e1668494842955.jpg"
        alt="Adopt A-Cat/Dog Logo">
    </a>
    <h1>Adopt Cat/Dog</h1>
    <p>Website for adopting a cat or dog in your local area.</p>
    <p>Current Time: <span id="dateTimeDisplay"></span></p>
  </div>
</header>
<nav>
  <ul>
    <li><a href="Q8HomePage">Home</a></li>
    <li><a href="Q8BrowsePage">Browse Available Pets</a></li>
    <li><a href="Q8FindCatDogPage">Find a dog/cat</a></li>
    <li><a href="Q8DogCarePage">Dog Care</a></li>
    <li><a href="Q8CatCarePage">Cat Care</a></li>
    <li><a href="addpet">Have a pet to give away</a></li>
    <li><a href="Q8ContactPage">Contact Us</a></li>
  </ul>
</nav>
<main>
  <h2>Find a Dog/Cat</h2>
  <form id="findPetForm">
    <fieldset>
      <legend>Select Animal</legend>
      <label for="animal">Animal:</label>
      <select name="animal" id="animal" required>
        <option value="">Please select an animal</option>
        <option value="dog">Dog</option>
        <option value="cat">Cat</option>
        <option value="doesnt_matter">Doesn't Matter</option>
      </select>
    </fieldset>
    <fieldset>
      <legend>Details</legend>
      <label for="breed">Breed:</label>
      <select name="breed" id="breed" required>
        <option value="">Any breed</option>
        <option value="NatureSystem">Nature System (Dog)</option>
        <option value="DogShowSystem">Dog Show System (Dog)</option>
        <option value="DevonRex">Devon Rex (Cat)</option>
        <option value="CornishRex">Cornish Rex (Cat)</option>
      </select>
      <label for="age">Age:</label>
      <select name="age" id="age" required>
        <option value="">Any age</option>
        <option value="young">Young (0-2 years)</option>
        <option value="adult">Adult (2-7 years)</option>
        <option value="senior">Senior (7+ years)</option>
        <option value="doesnt_matter">Doesn't Matter</option>
      </select>
      <label for="gender">Gender:</label>
      <select name="gender" id="gender" required>
        <option value="">Any gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="doesnt_matter">Doesn't Matter</option>
      </select>
    </fieldset>
    <fieldset>
      <legend>Compatibility</legend>
      <input type="checkbox" id="compatibility_dogs" name="compatibility_dogs">
      <label for="compatibility_dogs">Gets along with other dogs</label>
      <input type="checkbox" id="compatibility_cats" name="compatibility_cats">
      <label for="compatibility_cats">Gets along with other cats</label>
      <input type="checkbox" id="compatibility_children" name="compatibility_children">
      <label for="compatibility_children">Suitable for a family with small children</label>
    </fieldset>
    <button type="submit" class="btn btn-primary">Search</button>
    <button type="reset" class="btn btn-secondary">Clear</button>
  </form>
</main>
<footer>
  <a href="Q8PrivacyPage">Privacy/Disclaimer Statement</a>
</footer>
</body>
</html>
    `;
  // Check if there are any query parameters
  if (Object.keys(req.query).length > 0) {
    readData(petsFile, (err, pets) => {
      if (err) {
        console.error('Error reading pet data:', err);
        return res.status(500).send('Error reading pet information.');
      }

      const {animal, breed, age, gender} = req.query;
      const filteredPets = pets.filter(pet => (!animal || pet[1] === animal || animal === 'doesnt_matter') && (!breed || pet[2] === breed || breed === 'doesnt_matter') && (!age || pet[3] === age || age === 'doesnt_matter') && (!gender || pet[4] === gender || gender === 'doesnt_matter'));

      let resultsHTML = '<h1>Available Pets</h1>';
      if (filteredPets.length > 0) {
        filteredPets.forEach(pet => {
          resultsHTML += `
                        <div>
                            <h2>${pet[1]}</h2>
                            <p>Breed: ${pet[2]}</p>
                            <p>Age: ${pet[3]}</p>
                            <p>Gender: ${pet[4]}</p>
                        </div>
                        <hr>
                    `;
        });
      } else {
        resultsHTML += '<p>No pets found matching your criteria.</p>';
      }
      res.send(initialHTML + resultsHTML + res.locals.footer);
    });
  } else {
    res.send( initialHTML + res.locals.footer);
  }
});
// Route for Dog Care page
app.get('/Q8DogCarePage', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'Q8DogCarePage.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading Dog Care page');
    res.send( content + res.locals.footer);
  });
});

// Route for Cat Care page
app.get('/Q8CatCarePage', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'Q8CatCarePage.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading Cat Care page');
    res.send(content + res.locals.footer);
  });
});
//contact page
app.get('/Q8ContactPage', (req, res) => {
  fs.readFile(path.join(__dirname, 'public', 'Q8ContactPage.html'), 'utf8', (err, content) => {
    if (err) return res.status(500).send('Error loading contact page');
    res.setHeader('Content-Type', 'text/html');
    res.send(res.locals.header + content + res.locals.footer);
  });
});


app.post('/process-contact-form', (req, res) => {
  const {name, email, message} = req.body;
  console.log(name, email, message); // Log the form data to the console
  res.send('Thank you for your message!'); // Send a response back to the client
});


app.post('/process-contact-form', (req, res) => {
  const {name, email, message} = req.body;
  console.log(name, email, message); // Log the form data to the console
  res.send('Thank you for your message!'); // Send a response back to the client
});


// Route for Logout page
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Failed to logout');
    }
    res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Logged Out</title>
                <link rel="stylesheet" href="/css/style.css">
            </head>
            <body>
                <h1>You have been logged out successfully.</h1>
                <p><a href="/login">Click here to log in again</a></p>
            </body>
            </html>
        `);
  });
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
