const express = require('express');
const morgan = require('morgan');
const { SecurityDomain, User, Role } = require('../src/model');
const authenticationFilter = require('../src/filter');

const credentials = { };

const app = express();
app.use(morgan('combined'));

app.use((req,res,next) => {
    req.user = credentials.user;
    req.securityDomain = credentials.domain;
    next();
});

app.use(authenticationFilter);

app.get(   '/dev/blog/:id',  (req,res) => { res.json({ok: true}); });
app.put(   '/dev/blog/:id',  (req,res) => { res.sendStatus(204); });
app.get(   'dev/wiki/:id',  (req,res) => { res.json({ok: true}); });
app.put(   'dev/wiki/:id',  (req,res) => { res.sendStatus(204); });
app.get(   'prod/wiki/:id',  (req,res) => { res.json({ok: true}); });
app.put(   'prod/wiki/:id',  (req,res) => { res.sendStatus(204); });
app.get(   'dev/blog/:id/comment/:comment_id',  (req,res) => { res.json({ok: true}); });
app.put(   'dev/blog/:id/comment/:comment_id',  (req,res) => { res.sendStatus(204); });

let server;

function start() {
    const port = process.env.PORT || 8666;
    return new Promise((resolve, reject) => {
        server = app.listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
        }).on('error', err => {
                reject(err);
        });
    });
}


function stop() {
    return new Promise((resolve, reject) => {
        console.log('Closing server');
        server.close(err => {
            if (err) {
                reject(err);
                // so we don't also call `resolve()`
                return;
            }
            resolve();
        });
    });
}

function setUser(user) {
    credentials.user = user;
}

function setDomain(domain) {
    credentials.domain = domain;
}

module.exports = { app, start, stop, setUser, setDomain };