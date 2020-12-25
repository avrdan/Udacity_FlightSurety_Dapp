
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it(`(first airline) first airline has been correctly registered and authorized`, async function () {
    let nrAirlines = await config.flightSuretyData.getNrAirlines.call();
    let result = await config.flightSuretyData.isAirline.call(config.firstAirline);
    assert.equal(result, true, "First Airline registered and authorized.");
  });

  it('(airline) cannot authorize an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        let event = await config.flightSuretyData.registerAirline(newAirline, {from: config.firstAirline});
        assert.equal(event.logs != undefined && logs[0] == "AirlineRegistered", false, "Airline registered event not received.");
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('(airline) can register and authorize an Airline using registerAirline() and fund()', async () => {

    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        let event = await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
        assert.equal(event.logs != undefined && event.logs[0] == "AirlineRegistered", false, "Airline registered event not received.");
        // TODO: see if we need to expose fund to the app contract
        var amount = 10;
        event = await config.flightSuretyData.fund({from: newAirline, value: web3.utils.toWei(amount.toString(), "ether")});
        assert.equal(event.logs != undefined && event.logs[0] == "AirlineAuthorized", false, "Airline authorized event not received.");
    }
    catch(e) {
        assert.equal(true, false, "Exception: " + e);
    }
    let result = await config.flightSuretyData.isAirline.call(newAirline);
    console.log(result);

    // ASSERT
    assert.equal(result, true, "Airline has to be registerered and authorized after funding is completed.");

  });

  // add multi-sig test here
  it('(multisig airlines) can register and authorize airlines based on M of N votes', async () => {
    let MAX_AIRLINES_WITHOUT_VOTING = 5;
    var amount = 10;
    try {
        // start as 3 as 1 is the first airline which is already registered, while 2 was registered in the prev test
        for (i = 3; i <= MAX_AIRLINES_WITHOUT_VOTING; ++i)
        {
            console.log("Airline: " + i);
            let event = await config.flightSuretyApp.registerAirline(accounts[i], {from: accounts[1]});
            assert.equal(event.logs != undefined && event.logs[0] == "AirlineRegistered", false, "Airline registered event not received.");
            event = await config.flightSuretyData.fund({from: accounts[i], value: web3.utils.toWei(amount.toString(), "ether")});
            assert.equal(event.logs != undefined && event.logs[0] == "AirlineAuthorized", false, "Airline authorized event not received.");
        }
    }
    catch(e) {
        assert.equal(true, false, "Exception: " + e);
    }

    // try to register M by N using unauthorized airline
    try
    {
        let result = await config.flightSuretyApp.registerAirline(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], {from: accounts[10]});
    } catch(e) {
        if (String(e).includes("Airline is NOT authorized"))
        {
            console.log ("Ok, airline is not authorized to participate in signing - expected.");
        } else
        {
            console.log(e);
            assert(true, false, "Airline should not have been able to sign the registration of another..");
        }
    }

    // try to register M by N using authorized airline
    try
    {
        let nrAirlines = await config.flightSuretyData.getNrAirlines.call();
        console.log("Nr. airlines: " + nrAirlines);
        //let event = await config.flightSuretyApp.registerAirline(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], {from: accounts[1]});
        var event = await config.flightSuretyApp.registerAirline(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], {from: accounts[1]});
        event = await config.flightSuretyApp.registerAirline(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], {from: accounts[2]});
        event = await config.flightSuretyApp.registerAirline(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], {from: accounts[3]});
        assert.equal(event.logs != undefined && event.logs[0] == "AirlineRegistered", false, "Airline registered event not received.");
        // new airline 6 registered, authorize it by funding after 3/5 votes
        event = await config.flightSuretyData.fund({from: accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], value: web3.utils.toWei(amount.toString(), "ether")});
        assert.equal(event.logs != undefined && event.logs[0] == "AirlineAuthorized", false, "Airline authorized event not received.");
    } catch(e) {
        console.log(e);
        assert(true, false, "Airline should have been voted in by all of the other airlines");
    }

    // ASSERT
    let result = await config.flightSuretyData.isAirline.call(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1]);
    assert.equal(result, true, "Airline multi-sig authorization error.");
  });

});
