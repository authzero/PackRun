const express = require("express");
const fetch = require('node-fetch');
const crypto = require('crypto');
const tls = require('tls');
const app = express();
const basicAuth = require('express-basic-auth')
var bodyParser = require('body-parser');
const ChartHelper = require("./ChartHelper");
const HMACUtils = require("./HMACUtils");
app.use(bodyParser.json());
app.use(express.static('static'));
const port = process.env.PORT || 8081
var PWBuildVersion = "90.0.16";
var PWServer = "lb-aws-or-prod-iss02-mobile.animaljam.com";
app.listen(port, async () => {
  //await updateFlashvarsPW();
  var p = await ChartHelper.downloadDatabase("Prod_v" + PWBuildVersion.replace(/\./g, '_'))
  HMACUtils.CipherKey = await ChartHelper.GetHMACSecretKey(p);
  console.log("server is running on port", port);
});
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
})
function updateFlashvarsPW() {
  return new Promise(resolve => {
    let getHeader = {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    };
    fetch("https://animal-jam-api-secret.onrender.com/flashvars-mobile", getHeader).then(res => res.json()).then(info => {
      PWServer = "lb-" + info["game_server"]["smartfoxServer"];
      PWBuildVersion = info["build_Version"];
      return resolve();
    }).catch(err => {
      console.log("Error when retrieving play wild  flashvars: " + err);
      return resolve();
    });
  })
}
app.post("/Raid", async function (request, response) {
  const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
  var reqbody = request.body;
  try {
    //await updateFlashvarsPW();
    var accountsarray = reqbody.accounts;
    var functionarray = [];
    var game = reqbody.game;
    if (game.trim().length <= 0) {
      game = "53145";
    }
    if (accountsarray === undefined) {
      response.send({ result: "failue" });
      return;
    }
    else if (accountsarray.length > 90) {
      response.send({ result: "failure" });
      return;
    }
    else if (reqbody.target !== undefined && !(accountsarray.length < 0)) {
      response.json({ result: "success" });
      for (let i = 0; i < accountsarray.length; i++) {
        var username = accountsarray[i].username;
        var password = accountsarray[i].password;
        if ((username || password) === undefined) {
          continue;
        }
        await snooze(800);
        var token = await loginMobile(username, password);
        if (token == null) {
          console.log(`Error logging in to Play Wild ${username}`);
          continue;
        }
        else {
          console.log("Logged in " + username + " to Play Wild,  Token : " + token);
          raidPlayWild(PWServer, PWBuildVersion, token, username, reqbody.target, game);
        }
      }
    }
  }
  catch (error) {
    console.log("Error : " + error)
    response.send({ result: "failure" });
  }

})
function loginMobile(user, pass) {
  return new Promise(resolve => {
    let login = {
      screen_name: user,
      password: pass,
      domain: "mobile"
    };
    let postHeader = {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(login)
    };
    fetch("https://animal-jam-api-secret.onrender.com/login", postHeader).then(res => res.json()).then(info => {
      return resolve(info["auth_token"]);
    }).catch(err => {
      console.log("Error when logging in " + user + " into Play Wild");
      return resolve(null);
    });
  })
}
function raidPlayWild(ip, deployv, t, u, packId, gameId) {
  return new Promise(async resolve => {
    var hasStarted = false;
    var noerror = false;
    var hasCompleted = false;
    var currentMinigameRoomId = -1;
    var socket = tls.connect({ host: ip, port: 443, rejectUnauthorized: false });
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
      socket.on('secureConnect', async function () {
        socket.write(`<msg t='sys'><body action='rndK' r='-1'></body></msg>\x00`);
        await snooze(500);
      });
      socket.on('data', async function (data) {
        var rdata = data.toString();
       // console.log(rdata)
        if (rdata.includes(`<msg t='sys'><body action='rndK' r='-1'><k>`)) {
          var loginTag = `<login z='sbiLogin'><nick><![CDATA[${u}%0%${deployv}%9%0%PC2%0%-1%0]]></nick><pword><![CDATA[${t}]]></pword></login>`;
          socket.write(`<msg t='sys'><body action='login' r='0'>${loginTag}</body></msg>\x00`);
          await snooze(2000);
        }
        if (rdata.includes(`%xt%zl%-1%0%`)) {
          socket.write(`%xt%o%afp%-1%2034%2344%2364%35754%\x00`);
          await snooze(1000);
        }
        if (rdata.includes("%xt%ms%")) {
          hasCompleted = false;
          var arr1 = rdata.split("%");
          var idx = arr1.indexOf("ms");
          currentMinigameRoomId = arr1[idx + 1];
          socket.write(`%xt%o%mm%${currentMinigameRoomId}%${gameId}%ready%${HMACUtils.GetHMACWithParams([gameId,"ready"],"mm")}%\x00`);
          await snooze(400);
        }
        if (rdata.includes(`%xt%mm%${currentMinigameRoomId}%begin%`)) {
          console.log("Started run!");
          var itemNum = 5;
          while (hasCompleted == false) {
            for (let index = 0; index < 10; index++) {
              socket.write(`%xt%o%mm%${currentMinigameRoomId}%${gameId}%collect%${itemNum}%${HMACUtils.GetHMACWithParams([gameId,"collect",itemNum],"mm")}%\x00`);
              await snooze(300);
              itemNum++;
            }
            socket.write(`%xt%o%mm%${currentMinigameRoomId}%${gameId}%deposit%4%${HMACUtils.GetHMACWithParams([gameId,"deposit","4"],"mm")}%\x00`);
            await snooze(300);
          }
        }
        if (rdata.includes(`%xt%mm%${currentMinigameRoomId}%end%`)) {
          console.log("Completed run, Restarting!")
          hasCompleted = true;
          socket.write(`%xt%o%hj%-1%\x00`);
          await snooze(2000);
          socket.write(`%xt%o%ljr%-1%${gameId}%\x00`);
          await snooze(600);
          socket.write(`%xt%o%ls%-1%\x00`);
          await snooze(600);
          socket.write(`%xt%o%lir%-1%\x00`)
          await snooze(600);
        }
        if (rdata.includes(`{"b":{"r":-1,"o":{"statusId":1`)) {
          rdata = rdata.substr(0, rdata.lastIndexOf('xt"}')) + "xt\"}"
          HMACUtils.uuid = JSON.parse(rdata).b.o.params.uuid;
          HMACUtils.session = JSON.parse(rdata).b.o.params.sessionId
          //socket.write(`%xt%o%az%0%1%0%1%1%0%0%2965%2965%2992%2982%1990%2955%0%0%\x00`);
          //await snooze(1000);
          socket.write(`%xt%o%#pj%-1%${packId}%\x00`);
          await snooze(2000);
          //socket.write(`%xt%o%#rj%-1%${packId}%\x00`);
          //socket.write(500);
          //socket.write(`%xt%o%#ia%-1%${packId}%\x00`);
          //socket.write(500);
          console.log("Entering loop! Prepare to jump into hyperspace (Play Wild)!");
          if (noerror == false) {
            socket.write(`%xt%o%hj%-1%\x00`);
            await snooze(2000);
            socket.write(`%xt%o%ljr%-1%${gameId}%\x00`);
            await snooze(600);
            socket.write(`%xt%o%ls%-1%\x00`);
            await snooze(600);
            socket.write(`%xt%o%lir%-1%\x00`)
            await snooze(700);
          }
        }
      })
      socket.on('close', function () { console.log("Socket closed!"); });
      socket.on('error', function (e) { console.log(`Error! ${e}`); socket.end(); noerror = true; });
    }
    catch (error) {
      console.log(`Error : ${error}`);
      resolve();
    }
  })
}
