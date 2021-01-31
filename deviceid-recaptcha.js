const express = require('express');
const util = require('util')
const request = require('request-promise');
const fs = require('fs');
const app = express();
const fraud_file = fs.createWriteStream(__dirname + '/logs/login_' + Date.now() + '.log', {flags : 'w'});

const settings = {port:process.env.PORT,html_code:process.env.HTML_CODE}
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'pug')

//temporary in memory object for Risk Profile example
let allRiskProfiles = {};
let riskProfile = {}

app.listen(settings.port, () => {
  console.log('Http listening on ', settings.port);
});

app.get('/v3', (req, res) => {
    //res.send('Hello World!')
    res.render('v3', {page: 'foo'});
})

app.post('/deviceid-recaptcha_v3', (req,res) => {
  console.log('/recaptcha-verify request >>> Body:');
  console.log(req.body);

  const userToken = req.body['g-recaptcha-response'];
  if (!userToken) {
    const errMsg = 'Error: user token is empty.';
    console.error(errMsg);
    res.status(400); // bad request
    res.send(errMsg);
    return;
  }

  let opts = {
   method: 'POST',
   uri: process.env.CAPTCHA_SITEVERIFY_URI,
   form: {
    secret: process.env.SECRET_KEYV3,
    response: userToken
   },
   json: true
  };

  const username = req.body.username;

  //Device ID+ includes two identifiers – a residue-based identifier and an attribute-based identifier.
  let decodedDeviceID = decodeURI(getAppCookies(req, res)['_imp_apg_r_']);
  //console.log(getAppCookies(req, res)['_imp_apg_r_']);
  decodedDeviceID = JSON.parse(decodeURIComponent(decodedDeviceID));

  console.log(util.inspect(decodedDeviceID, {showHidden: false, depth: null}))

    request(opts)
      .then((response) => {
        console.log('Verification response v3:');
        console.log(response);
        const verifResult = {
          success: response['success'],
          score: response['score'] ? response['score'] : -1,
          errors: response['error-codes'] ? response['error-codes'] : []
        };

        let did_res = decodedDeviceID.diA,
        did_attr = decodedDeviceID.diB;

        riskProfile = [{score: verifResult.score, reason: verifResult.errors, timestamp: Date.now(), did_attr: did_attr}];

        //Risk Profile object storage
        //if username exists
        if(allRiskProfiles[username]){
          //if DeviceID residue value exists under username
          if(allRiskProfiles[username][did_res]){
            //push riskprofile object into existing collection
            allRiskProfiles[username][did_res].push(riskProfile)
          }else{
            //create new risk profile based on residue value as existing DiD does not exist
            allRiskProfiles[username][did_res] = riskProfile
          }
        }else{
          //add entirely new username and risk object
          let residueObj = {};
          residueObj[did_res] = [riskProfile]
          allRiskProfiles[username] = residueObj;
        }

        //format object for logging - example purposes
        let riskProfileSession = {};
        riskProfileSession[username] = {};
        riskProfileSession[username][did_res] = riskProfile;
        fraudLogger(JSON.stringify(riskProfileSession));

        console.log(util.inspect(allRiskProfiles, {showHidden: false, depth: null}))


        //format object for UI
        let riskProfileUI = {};
        riskProfileUI[username] = allRiskProfiles[username];
        res.render('json', {riskProfile: riskProfileUI});

       })
      .catch((err) => {
       console.error(err);
       const verifResult = {success: false, errors: ['Error from ' + process.env.CAPTCHA_SITEVERIFY_URI]};
       res.status(404); // server error
       res.render('json', {page: allRiskProfiles});
      })
});

// Utility function - returns an object with the cookies' name as keys
const getAppCookies = (req) => {
    // We extract the raw cookies from the request headers
    const rawCookies = req.headers.cookie.split('; ');
    // rawCookies = ['myapp=secretcookie, 'analytics_cookie=beacon;']

    const parsedCookies = {};
    rawCookies.forEach(rawCookie=>{
        const parsedCookie = rawCookie.split('=');
        // parsedCookie = ['myapp', 'secretcookie'], ['analytics_cookie', 'beacon']
        parsedCookies[parsedCookie[0]] = parsedCookie[1];
    });
    return parsedCookies;
};

const fraudLogger = (line) => {
  fraud_file.write(util.format(line) + ',\n');
}