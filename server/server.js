import express from 'express';
import {createServer} from 'node:http';
import { Socket } from 'socket.io-client';
import 'dotenv/config';
import mongoose from 'mongoose';
import {Server} from 'socket.io';
import {v2 as cloudinary} from 'cloudinary';
import cors from 'cors';
import path from 'node:path';
import { messages, users } from './usersData.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ dest:"./" })
const PORT = 3000;

const server = createServer(app);

const io = new Server(server , {
    cors: {
        origin: '*'
    }, 
    // connectionStateRecovery: {}
})

cloudinary.config({
    cloud_name: "dwa2csohq",
    api_key: "665725662135347" ,
   api_secret:"Y2Dk2D6ExFwjQjLNlo9i6DLbq_0"
});

io.on('connection', (socket) =>{
    console.log('user connected', 'hmm');
    socket.on('message', (msg) => {
        io.emit('chat', msg)
    })
 
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
} )
mongoose.connect(process.env.DB_URL)
.then(() => console.log('database connected'))
.catch(err => console.log('failed to connect', err));

app.use(cors())
app.use(express.json());

app.post('/api/storemessage', async (req, res) => {
    try {

        const user = new messages(
             {
                 name: req.body.name,
                 message: req.body.message,
                 url: req.body.url,
                 date: req.body.date
             }
         )
         await user.save();
         res.send(user);
    }catch(err) {
        console.log('oops');
        console.log(err)
    }
})

app.post('/api/storeuser', upload.single('file'), async (req, res, next) => {
   
        try{
            const {name,password} = JSON.parse(req.body.user);
            const result = await cloudinary.uploader.upload(req.file.path);
            const image = result.secure_url || result.url;
            // console.log(image)
            const user = new users({
                name: name,
                password: password,
                url: image
            })
            await user.save();
            res.send(user);
            // console.log(user)
      }catch (err) {
        console.log(err);
      }

})

app.get('/api/getdata', async (req, res) => {
    try{
        const data = await messages.find({}).exec();
        res.send(data)
    }
    catch(err) {
        console.log('hmmm something went wrong with sending the data', err);
    }
})


app.use(express.static(path.join(__dirname, '..', 'src')));
app.use('/images', express.static('images'));
app.use(express.static(path.join(__dirname, '..', 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist/index.html'))
})



server.listen(3000, () => {
    console.log('app running on ' + PORT)
})
// import cors from 'cors';
// import session from 'express-session';
// import cookieParser from 'cookie-parser';
// import MongoStore from 'connect-mongo';
//  const app = express()

//  app.use(session({
//     secret: "your-secret-key",
//     resave:false,
//     saveUninitialized: false,
//     cookie: {
//         HttpOnly: true,
//         sameSite: 'strict',
//     },
//     store: MongoStore.create({
//         mongoUrl: 'mongodb://localhost:27017/session-store',
//     })
//  }))

 

//  app.get('/login', (req, res) => {
//     req.session.user = {id: 1, username: 'rajel'};
//     res.send('you logged in ');
//  });

//  app.get('/', (req, res) => {
//      if(!req?.session?.user) {
//          res.redirect('/pls');
//         }
//         const sessionId = req.sessionID;
//         console.log(req.sessionStore.get(sessionId))
//         console.log(req.session)
//         res.send('welcome' + " " + req.session.user.username);
    
//  });

//  app.get('/displaydata', (req, res) => {
//     // console.log(req.session);
//     console.log(req.sessionStore.get(req.sessionID, (err) => {
//         console.log
//     }));
//     // console.log(req.session.user);
//     // console.log(req.store);
//  })

//  app.get('/pls', (req, res) => {
//     res.send('please log in first mate');
//  });

//  app.get('/logout' , (req ,res) => {
//     req.session.destroy();
//     res.send('logout');
//  });

//  app.listen(3000, () => {
//     console.log('app running in 3000');
// });
