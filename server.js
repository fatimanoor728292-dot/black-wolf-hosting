const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.ADMIN_PASSWORD || 'blackwolf123';
const DATA = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const SITES = path.join(DATA, 'sites');
const PF = path.join(DATA, 'projects.json');

fs.mkdirSync(SITES, { recursive: true });

const load = () => {
  try {
    return JSON.parse(fs.readFileSync(PF, 'utf8'));
  } catch {
    return [];
  }
};

const save = (x) => {
  fs.writeFileSync(PF, JSON.stringify(x, null, 2));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.use(express.json());

const html = `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BLACK WOLF HOSTING</title>

<style>
body{
  margin:0;
  background:#070a0f;
  color:#f3f4f6;
  font-family:Arial,sans-serif;
}

.wrap{
  max-width:760px;
  margin:auto;
  padding:28px 18px;
}

.logo{
  text-align:center;
  font-size:64px;
}

h1{
  text-align:center;
  font-size:40px;
  margin:8px 0;
}

.sub{
  text-align:center;
  color:#9ca3af;
  font-size:18px;
}

.card{
  background:#11161d;
  border:1px solid #27313d;
  border-radius:22px;
  padding:22px;
  margin-top:28px;
}

input,button{
  width:100%;
  box-sizing:border-box;
  padding:15px;
  border-radius:12px;
  font-size:16px;
}

input{
  background:#080b10;
  color:white;
  border:1px solid #334155;
  margin:8px 0 14px;
}

button{
  background:#eaf6ff;
  border:0;
  font-weight:bold;
}

.project{
  border:1px solid #2b3440;
  border-radius:14px;
  padding:15px;
  margin-top:12px;
}

a{
  color:#9bdcff;
  word-break:break-all;
}

.danger{
  background:#30151a;
  color:#fff;
  margin-top:10px;
}

.hidden{
  display:none;
}

.msg{
  margin-top:12px;
  color:#9ca3af;
}
</style>
</head>

<body>

<div class="wrap">

<div class="logo">🐺</div>

<h1>BLACK WOLF HOSTING</h1>

<div class="sub">
Personal website hosting panel
</div>

<div id="loginBox" class="card">

<h2>Admin Login</h2>

<input
  id="passwordInput"
  type="password"
  placeholder="Admin password"
>

<button type="button" onclick="doLogin()">
ENTER PANEL
</button>

<div id="loginMessage" class="msg"></div>

</div>

<div id="panelBox" class="hidden">

<div class="card">

<h2>Upload Website</h2>

<div>
ZIP must contain <b>index.html</b>.
</div>

<input
  id="zipInput"
  type="file"
  accept=".zip"
>

<button type="button" onclick="uploadWebsite()">
🚀 Upload & Host
</button>

<div id="uploadMessage" class="msg"></div>

</div>

<div class="card">

<h2>Your Projects</h2>

<div id="projectsBox">
Loading...
</div>

</div>

</div>

</div>

<script>

let token = localStorage.getItem('blackwolf_token') || '';

async function doLogin(){

  const passwordInput =
    document.getElementById('passwordInput');

  const loginMessage =
    document.getElementById('loginMessage');

  const loginBox =
    document.getElementById('loginBox');

  const panelBox =
    document.getElementById('panelBox');

  loginMessage.textContent = 'Logging in...';

  try{

    const response = await fetch('/api/login', {
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        password:passwordInput.value
      })
    });

    const data = await response.json();

    if(data.ok){

      token = data.token;

      localStorage.setItem(
        'blackwolf_token',
        token
      );

      loginBox.classList.add('hidden');
      panelBox.classList.remove('hidden');

      loginMessage.textContent = '';

      loadProjects();

    }else{

      loginMessage.textContent =
        data.error || 'Wrong password';

    }

  }catch(error){

    loginMessage.textContent =
      'Connection error. Please try again.';

  }
}


async function loadProjects(){

  const projectsBox =
    document.getElementById('projectsBox');

  try{

    const response = await fetch(
      '/api/projects',
      {
        headers:{
          Authorization:'Bearer ' + token
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

    const data = await response.json();

    if(!data.projects.length){

      projectsBox.innerHTML =
        'No websites hosted yet.';

      return;
    }

    projectsBox.innerHTML =
      data.projects.map(project => `

        <div class="project">

          <b>${escapeHtml(project.name)}</b>

          <br>

          <a
            target="_blank"
            href="${project.url}"
          >
            ${project.url}
          </a>

          <br>

          <button
            type="button"
            class="danger"
            onclick="deleteProject('${project.id}')"
          >
            Delete
          </button>

        </div>

      `).join('');

  }catch(error){

    projectsBox.textContent =
      'Could not load projects.';

  }
}


async function uploadWebsite(){

  const zipInput =
    document.getElementById('zipInput');

  const uploadMessage =
    document.getElementById('uploadMessage');

  const file = zipInput.files[0];

  if(!file){

    uploadMessage.textContent =
      'Select a ZIP first.';

    return;
  }

  const formData = new FormData();

  formData.append('site', file);

  uploadMessage.textContent =
    'Uploading...';

  try{

    const response = await fetch(
      '/api/upload',
      {
        method:'POST',
        headers:{
          Authorization:'Bearer ' + token
        },
        body:formData
      }
    );

    const data = await response.json();

    if(!response.ok){

      uploadMessage.textContent =
        data.error || 'Upload failed.';

      return;
    }

    uploadMessage.textContent =
      'Hosted successfully: ' + data.url;

    zipInput.value = '';

    loadProjects();

  }catch(error){

    uploadMessage.textContent =
      'Upload error. Please try again.';

  }
}


async function deleteProject(id){

  if(!confirm('Delete this project?')){

    return;
  }

  try{

    await fetch(
      '/api/projects/' + id,
      {
        method:'DELETE',
        headers:{
          Authorization:'Bearer ' + token
        }
      }
    );

    loadProjects();

  }catch(error){

    alert('Could not delete project.');

  }
}


function escapeHtml(text){

  return String(text).replace(
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


function showPanelIfLoggedIn(){

  if(!token){

    return;
  }

  document
    .getElementById('loginBox')
    .classList.add('hidden');

  document
    .getElementById('panelBox')
    .classList.remove('hidden');

  loadProjects();

}

showPanelIfLoggedIn();

</script>

</body>
</html>`;

let token = '';

function auth(req, res, next){

  if(
    (req.headers.authorization || '') ===
    'Bearer ' + token
  ){

    return next();

  }

  res.status(401).json({
    error:'Unauthorized'
  });

}


app.get('/', (req, res) => {

  res.type('html').send(html);

});


app.post('/api/login', (req, res) => {

  if(req.body?.password !== PASSWORD){

    return res.status(401).json({
      error:'Wrong password'
    });

  }

  token =
    crypto.randomBytes(24).toString('hex');

  res.json({
    ok:true,
    token
  });

});


app.get('/api/projects', auth, (req, res) => {

  res.json({
    projects:load()
  });

});


app.post(
  '/api/upload',
  auth,
  upload.single('site'),
  (req, res) => {

    try{

      if(!req.file){

        return res.status(400).json({
          error:'No ZIP uploaded.'
        });

      }

      const zip =
        new AdmZip(req.file.buffer);

      const entries =
        zip.getEntries();

      const hasIndex =
        entries.some(
          entry =>
            !entry.isDirectory &&
            path.basename(entry.entryName)
              .toLowerCase() === 'index.html'
        );

      if(!hasIndex){

        return res.status(400).json({
          error:'ZIP must contain index.html.'
        });

      }

      const base =
        path
          .basename(
            req.file.originalname,
            '.zip'
          )
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0,40) || 'site';

      let slug = base;
      let i = 2;

      while(
        fs.existsSync(
          path.join(SITES, slug)
        )
      ){

        slug = base + '-' + i++;

      }

      const dest =
        path.join(SITES, slug);

      fs.mkdirSync(dest, {
        recursive:true
      });

      for(const entry of entries){

        let name =
          entry.entryName
            .replace(/\\/g,'/');

        if(
          name.split('/').some(
            part =>
              part === '..' ||
              part === '.'
          )
        ){

          continue;

        }

        const output =
          path.resolve(dest, name);

        if(
          !output.startsWith(
            path.resolve(dest) + path.sep
          )
        ){

          continue;

        }

        if(entry.isDirectory){

          fs.mkdirSync(output, {
            recursive:true
          });

        }else{

          fs.mkdirSync(
            path.dirname(output),
            {
              recursive:true
            }
          );

          fs.writeFileSync(
            output,
            entry.getData()
          );

        }

      }

      const indexPath =
        path.join(dest, 'index.html');

      if(!fs.existsSync(indexPath)){

        fs.rmSync(dest, {
          recursive:true,
          force:true
        });

        return res.status(400).json({
          error:'index.html must be at the ZIP root.'
        });

      }

      const project = {

        id:crypto.randomUUID(),

        name:req.file.originalname
          .replace(/\.zip$/i,''),

        slug,

        url:
          `${req.protocol}://${req.get('host')}/site/${slug}`,

        createdAt:
          new Date().toISOString()

      };

      const projects = load();

      projects.push(project);

      save(projects);

      res.json(project);

    }catch(error){

      res.status(400).json({
        error:
          'Could not read ZIP: ' +
          error.message
      });

    }

  }
);


app.delete(
  '/api/projects/:id',
  auth,
  (req, res) => {

    const projects = load();

    const project =
      projects.find(
        x => x.id === req.params.id
      );

    if(!project){

      return res.sendStatus(404);

    }

    fs.rmSync(
      path.join(
        SITES,
        project.slug
      ),
      {
        recursive:true,
        force:true
      }
    );

    save(
      projects.filter(
        x => x.id !== project.id
      )
    );

    res.json({
      ok:true
    });

  }
);


app.get(
  '/site/:slug',
  (req, res) => {

    const index =
      path.join(
        SITES,
        req.params.slug,
        'index.html'
      );

    if(!fs.existsSync(index)){

      return res.sendStatus(404);

    }

    res.sendFile(index);

  }
);


app.use(
  '/site/:slug',
  express.static(SITES)
);


app.listen(
  PORT,
  () => console.log(
    'BLACK WOLF HOSTING running on ' +
    PORT
  )
);
