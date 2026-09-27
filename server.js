const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;

const PASSWORD =
  process.env.ADMIN_PASSWORD || 'blackwolf123';

const DATA =
  process.env.DATA_DIR ||
  path.join(process.cwd(), 'data');

const SITES =
  path.join(DATA, 'sites');

const PROJECTS_FILE =
  path.join(DATA, 'projects.json');


// ==========================================
// CREATE REQUIRED FOLDERS
// ==========================================

fs.mkdirSync(SITES, {
  recursive: true
});


// ==========================================
// PROJECT DATABASE
// ==========================================

function loadProjects() {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) {
      return [];
    }

    const data =
      fs.readFileSync(
        PROJECTS_FILE,
        'utf8'
      );

    return JSON.parse(data);

  } catch (error) {

    console.error(
      'Could not load projects:',
      error.message
    );

    return [];
  }
}


function saveProjects(projects) {
  fs.writeFileSync(
    PROJECTS_FILE,
    JSON.stringify(
      projects,
      null,
      2
    ),
    'utf8'
  );
}


// ==========================================
// UPLOAD SETTINGS
// ==========================================

const upload = multer({

  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      25 * 1024 * 1024
  }

});


// ==========================================
// EXPRESS SETTINGS
// ==========================================

app.use(
  express.json()
);


// ==========================================
// ADMIN TOKEN
// ==========================================

let adminToken = '';


// ==========================================
// HTML PANEL
// ==========================================

const html = `<!doctype html>

<html>

<head>

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
BLACK WOLF HOSTING
</title>

<style>

*{
  box-sizing:border-box;
}

body{

  margin:0;

  background:#070a0f;

  color:#f3f4f6;

  font-family:
    Arial,
    sans-serif;

}

.wrap{

  max-width:760px;

  margin:auto;

  padding:
    28px 18px 50px;

}

.logo{

  text-align:center;

  font-size:64px;

}

h1{

  text-align:center;

  font-size:40px;

  margin:
    8px 0;

}

.sub{

  text-align:center;

  color:#9ca3af;

  font-size:18px;

}

.card{

  background:#11161d;

  border:
    1px solid #27313d;

  border-radius:22px;

  padding:22px;

  margin-top:28px;

}

input,
button{

  width:100%;

  box-sizing:border-box;

  padding:15px;

  border-radius:12px;

  font-size:16px;

}

input{

  background:#080b10;

  color:white;

  border:
    1px solid #334155;

  margin:
    8px 0 14px;

}

button{

  background:#eaf6ff;

  color:#111827;

  border:0;

  font-weight:bold;

  cursor:pointer;

}

button:active{

  transform:scale(.99);

}

.project{

  border:
    1px solid #2b3440;

  border-radius:14px;

  padding:15px;

  margin-top:12px;

}

.projectName{

  font-size:18px;

  font-weight:bold;

  margin-bottom:8px;

}

a{

  color:#9bdcff;

  word-break:break-all;

}

.danger{

  background:#30151a;

  color:#fff;

  margin-top:12px;

}

.hidden{

  display:none;

}

.msg{

  margin-top:12px;

  color:#9ca3af;

  word-break:break-word;

}

.success{

  color:#86efac;

}

.error{

  color:#fca5a5;

}

.small{

  color:#9ca3af;

  font-size:14px;

  margin-top:8px;

}

</style>

</head>


<body>


<div class="wrap">


<div class="logo">
🐺
</div>


<h1>
BLACK WOLF HOSTING
</h1>


<div class="sub">
Personal website hosting panel
</div>


<!-- ================= LOGIN ================= -->

<div
  id="loginBox"
  class="card"
>

<h2>
Admin Login
</h2>


<input
  id="passwordInput"
  type="password"
  placeholder="Admin password"
  autocomplete="current-password"
>


<button
  type="button"
  onclick="doLogin()"
>
ENTER PANEL
</button>


<div
  id="loginMessage"
  class="msg"
></div>


</div>


<!-- ================= PANEL ================= -->

<div
  id="panelBox"
  class="hidden"
>


<!-- UPLOAD -->

<div class="card">

<h2>
Upload Website
</h2>


<div>
ZIP must contain
<b>index.html</b>
at the ZIP root.
</div>


<div class="small">
Maximum ZIP size: 25 MB
</div>


<input
  id="zipInput"
  type="file"
  accept=".zip"
>


<button
  type="button"
  onclick="uploadWebsite()"
>
🚀 Upload & Host
</button>


<div
  id="uploadMessage"
  class="msg"
></div>


</div>


<!-- PROJECTS -->

<div class="card">

<h2>
Your Projects
</h2>


<div id="projectsBox">
Loading...
</div>


</div>


</div>


</div>


<script>


// ==========================================
// CLIENT TOKEN
// ==========================================

let token =
  localStorage.getItem(
    'blackwolf_token'
  ) || '';


// ==========================================
// LOGIN
// ==========================================

async function doLogin(){

  const passwordInput =
    document.getElementById(
      'passwordInput'
    );

  const loginMessage =
    document.getElementById(
      'loginMessage'
    );

  loginMessage.textContent =
    'Logging in...';

  loginMessage.className =
    'msg';


  try{

    const response =
      await fetch(
        '/api/login',
        {
          method:'POST',

          headers:{
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              password:
                passwordInput.value
            })
        }
      );


    const data =
      await response.json();


    if(data.ok){

      token =
        data.token;


      localStorage.setItem(
        'blackwolf_token',
        token
      );


      document
        .getElementById('loginBox')
        .classList
        .add('hidden');


      document
        .getElementById('panelBox')
        .classList
        .remove('hidden');


      loginMessage.textContent =
        '';


      passwordInput.value =
        '';


      loadProjects();


    }else{

      loginMessage.textContent =
        data.error ||
        'Wrong password';

      loginMessage.className =
        'msg error';

    }


  }catch(error){

    loginMessage.textContent =
      'Connection error. Please try again.';

    loginMessage.className =
      'msg error';

  }

}


// ==========================================
// LOAD PROJECTS
// ==========================================

async function loadProjects(){

  const projectsBox =
    document.getElementById(
      'projectsBox'
    );


  projectsBox.textContent =
    'Loading...';


  try{

    const response =
      await fetch(
        '/api/projects',
        {
          headers:{
            Authorization:
              'Bearer ' + token
          }
        }
      );


    if(response.status === 401){

      localStorage.removeItem(
        'blackwolf_token'
      );

      token = '';

      location.reload();

      return;
    }


    const data =
      await response.json();


    if(
      !data.projects ||
      !data.projects.length
    ){

      projectsBox.innerHTML =
        'No websites hosted yet.';

      return;
    }


    projectsBox.innerHTML =
      data.projects
        .map(
          project => `

<div class="project">

<div class="projectName">

${escapeHtml(
  project.name
)}

</div>


<a
  target="_blank"
  rel="noopener noreferrer"
  href="${escapeHtml(
    project.url
  )}"
>

${escapeHtml(
  project.url
)}

</a>


<br>


<button
  type="button"
  class="danger"
  onclick="deleteProject('${escapeHtml(
    project.id
  )}')"
>

Delete

</button>


</div>

`
        )
        .join('');


  }catch(error){

    projectsBox.textContent =
      'Could not load projects.';

  }

}


// ==========================================
// UPLOAD WEBSITE
// ==========================================

async function uploadWebsite(){

  const zipInput =
    document.getElementById(
      'zipInput'
    );

  const uploadMessage =
    document.getElementById(
      'uploadMessage'
    );


  const file =
    zipInput.files[0];


  if(!file){

    uploadMessage.textContent =
      'Select a ZIP file first.';

    uploadMessage.className =
      'msg error';

    return;
  }


  if(
    !file.name
      .toLowerCase()
      .endsWith('.zip')
  ){

    uploadMessage.textContent =
      'Please select a ZIP file.';

    uploadMessage.className =
      'msg error';

    return;
  }


  const formData =
    new FormData();


  formData.append(
    'site',
    file
  );


  uploadMessage.textContent =
    'Uploading website...';

  uploadMessage.className =
    'msg';


  try{

    const response =
      await fetch(
        '/api/upload',
        {
          method:'POST',

          headers:{
            Authorization:
              'Bearer ' + token
          },

          body:
            formData
        }
      );


    const data =
      await response.json();


    if(!response.ok){

      uploadMessage.textContent =
        data.error ||
        'Upload failed.';

      uploadMessage.className =
        'msg error';

      return;
    }


    uploadMessage.textContent =
      'Hosted successfully! ' +
      data.url;

    uploadMessage.className =
      'msg success';


    zipInput.value =
      '';


    loadProjects();


  }catch(error){

    uploadMessage.textContent =
      'Upload error. Please try again.';

    uploadMessage.className =
      'msg error';

  }

}


// ==========================================
// DELETE PROJECT
// ==========================================

async function deleteProject(id){

  if(
    !confirm(
      'Delete this project?'
    )
  ){

    return;
  }


  try{

    const response =
      await fetch(
        '/api/projects/' +
          encodeURIComponent(id),
        {
          method:'DELETE',

          headers:{
            Authorization:
              'Bearer ' + token
          }
        }
      );


    if(response.status === 401){

      localStorage.removeItem(
        'blackwolf_token'
      );

      location.reload();

      return;
    }


    if(!response.ok){

      alert(
        'Could not delete project.'
      );

      return;
    }


    loadProjects();


  }catch(error){

    alert(
      'Could not delete project.'
    );

  }

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(text){

  return String(text)
    .replace(
      /[&<>"']/g,
      function(character){

        return {
          '&':'&amp;',
          '<':'&lt;',
          '>':'&gt;',
          '"':'&quot;',
          "'":'&#039;'
        }[character];

      }
    );

}


// ==========================================
// CHECK SAVED LOGIN
// ==========================================

function showPanelIfLoggedIn(){

  if(!token){

    return;
  }


  document
    .getElementById('loginBox')
    .classList
    .add('hidden');


  document
    .getElementById('panelBox')
    .classList
    .remove('hidden');


  loadProjects();

}


// ==========================================
// START
// ==========================================

showPanelIfLoggedIn();


</script>


</body>

</html>`;


// ==========================================
// AUTH MIDDLEWARE
// ==========================================

function auth(req, res, next){

  const authorization =
    req.headers.authorization || '';


  if(
    authorization ===
    'Bearer ' + adminToken
  ){

    return next();

  }


  return res
    .status(401)
    .json({
      error:'Unauthorized'
    });

}


// ==========================================
// HOME PAGE
// ==========================================

app.get(
  '/',
  (req, res) => {

    res
      .type('html')
      .send(html);

  }
);


// ==========================================
// LOGIN API
// ==========================================

app.post(
  '/api/login',
  (req, res) => {

    const password =
      req.body?.password;


    if(
      password !== PASSWORD
    ){

      return res
        .status(401)
        .json({
          error:
            'Wrong password'
        });

    }


    adminToken =
      crypto
        .randomBytes(32)
        .toString('hex');


    return res.json({

      ok:true,

      token:
        adminToken

    });

  }
);


// ==========================================
// GET PROJECTS
// ==========================================

app.get(
  '/api/projects',
  auth,
  (req, res) => {

    return res.json({

      projects:
        loadProjects()

    });

  }
);


// ==========================================
// UPLOAD WEBSITE
// ==========================================

app.post(
  '/api/upload',

  auth,

  upload.single('site'),

  (req, res) => {

    try{

      if(!req.file){

        return res
          .status(400)
          .json({
            error:
              'No ZIP uploaded.'
          });

      }


      // ======================================
      // READ ZIP
      // ======================================

      const zip =
        new AdmZip(
          req.file.buffer
        );


      const entries =
        zip.getEntries();


      // ======================================
      // CHECK INDEX.HTML AT ROOT
      // ======================================

      const hasRootIndex =
        entries.some(
          entry => {

            if(entry.isDirectory){

              return false;
            }


            const cleanName =
              entry.entryName
                .replace(/\\/g, '/')
                .replace(/^\/+/, '');


            return (
              cleanName ===
              'index.html'
            );

          }
        );


      if(!hasRootIndex){

        return res
          .status(400)
          .json({

            error:
              'ZIP must contain index.html at the ZIP root.'

          });

      }


      // ======================================
      // CREATE SLUG
      // ======================================

      const originalName =
        path.basename(
          req.file.originalname,
          '.zip'
        );


      const base =
        originalName
          .toLowerCase()
          .replace(
            /[^a-z0-9-]+/g,
            '-'
          )
          .replace(
            /^-+|-+$/g,
            ''
          )
          .slice(
            0,
            40
          ) || 'site';


      let slug =
        base;


      let counter =
        2;


      while(
        fs.existsSync(
          path.join(
            SITES,
            slug
          )
        )
      ){

        slug =
          base +
          '-' +
          counter++;

      }


      // ======================================
      // CREATE WEBSITE DIRECTORY
      // ======================================

      const destination =
        path.join(
          SITES,
          slug
        );


      fs.mkdirSync(
        destination,
        {
          recursive:true
        }
      );


      // ======================================
      // EXTRACT ZIP SAFELY
      // ======================================

      for(
        const entry of entries
      ){

        let entryName =
          entry.entryName
            .replace(
              /\\/g,
              '/'
            )
            .replace(
              /^\/+/,
              ''
            );


        // Ignore empty names

        if(!entryName){

          continue;

        }


        // Prevent path traversal

        const parts =
          entryName.split('/');


        if(
          parts.some(
            part =>
              part === '..' ||
              part === '.'
          )
        ){

          continue;

        }


        const outputPath =
          path.resolve(
            destination,
            entryName
          );


        const destinationRoot =
          path.resolve(
            destination
          ) + path.sep;


        if(
          !outputPath.startsWith(
            destinationRoot
          )
        ){

          continue;

        }


        if(entry.isDirectory){

          fs.mkdirSync(
            outputPath,
            {
              recursive:true
            }
          );

        }else{

          fs.mkdirSync(
            path.dirname(
              outputPath
            ),
            {
              recursive:true
            }
          );


          fs.writeFileSync(
            outputPath,
            entry.getData()
          );

        }

      }


      // ======================================
      // FINAL INDEX CHECK
      // ======================================

      const indexPath =
        path.join(
          destination,
          'index.html'
        );


      if(
        !fs.existsSync(
          indexPath
        )
      ){

        fs.rmSync(
          destination,
          {
            recursive:true,
            force:true
          }
        );


        return res
          .status(400)
          .json({

            error:
              'index.html must be at the ZIP root.'

          });

      }


      // ======================================
      // CREATE PROJECT
      // ======================================

      const project = {

        id:
          crypto.randomUUID(),

        name:
          originalName,

        slug:
          slug,

        url:
          `${req.protocol}://${req.get('host')}/site/${slug}`,

        createdAt:
          new Date().toISOString()

      };


      const projects =
        loadProjects();


      projects.push(
        project
      );


      saveProjects(
        projects
      );


      return res.json(
        project
      );


    }catch(error){

      console.error(
        'Upload error:',
        error
      );


      return res
        .status(400)
        .json({

          error:
            'Could not read ZIP: ' +
            error.message

        });

    }

  }
);


// ==========================================
// DELETE PROJECT
// ==========================================

app.delete(
  '/api/projects/:id',
  auth,
  (req, res) => {

    const projects =
      loadProjects();


    const project =
      projects.find(
        item =>
          item.id ===
          req.params.id
      );


    if(!project){

      return res
        .sendStatus(404);

    }


    const siteDirectory =
      path.join(
        SITES,
        project.slug
      );


    // Safety check

    const safeRoot =
      path.resolve(
        SITES
      ) + path.sep;


    const safePath =
      path.resolve(
        siteDirectory
      );


    if(
      !safePath.startsWith(
        safeRoot
      )
    ){

      return res
        .status(400)
        .json({
          error:
            'Invalid project path.'
        });

    }


    fs.rmSync(
      siteDirectory,
      {
        recursive:true,
        force:true
      }
    );


    const remaining =
      projects.filter(
        item =>
          item.id !==
          project.id
      );


    saveProjects(
      remaining
    );


    return res.json({
      ok:true
    });

  }
);


// ==========================================
// SERVE HOSTED WEBSITE
// ==========================================

app.get(
  '/site/:slug',
  (req, res) => {

    const slug =
      req.params.slug;


    // Only allow safe slug characters

    if(
      !/^[a-z0-9-]+$/i.test(
        slug
      )
    ){

      return res
        .sendStatus(404);

    }


    const siteDirectory =
      path.join(
        SITES,
        slug
      );


    const indexFile =
      path.join(
        siteDirectory,
        'index.html'
      );


    if(
      !fs.existsSync(
        indexFile
      )
    ){

      return res
        .sendStatus(404);

    }


    return res.sendFile(
      indexFile
    );

  }
);


// ==========================================
// STATIC FILES
// ==========================================

app.use(
  '/site/:slug',
  (req, res, next) => {

    const slug =
      req.params.slug;


    if(
      !/^[a-z0-9-]+$/i.test(
        slug
      )
    ){

      return res
        .sendStatus(404);

    }


    next();

  },
  express.static(
    SITES
  )
);


// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (error, req, res, next) => {

    console.error(
      'Server error:',
      error
    );


    if(
      error instanceof
      multer.MulterError
    ){

      if(
        error.code ===
        'LIMIT_FILE_SIZE'
      ){

        return res
          .status(400)
          .json({

            error:
              'ZIP file is too large. Maximum size is 25 MB.'

          });

      }

    }


    return res
      .status(500)
      .json({

        error:
          'Internal server error.'

      });

  }
);


// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,
  () => {

    console.log(
      'BLACK WOLF HOSTING running on port ' +
      PORT
    );

  }
);
