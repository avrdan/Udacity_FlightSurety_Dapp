// assume accounts 1-10 airlines
// assume accounts 11-20 passengers
// assume accounts 30-50 oracles
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
        //event = await config.flightSuretyData.fund({from: newAirline, value: web3.utils.toWei(amount.toString(), "ether")});
        event = await config.flightSuretyApp.fundAirlineInsurance({from: newAirline, value: web3.utils.toWei(amount.toString(), "ether")});
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
            //event = await config.flightSuretyData.fund({from: accounts[i], value: web3.utils.toWei(amount.toString(), "ether")});
            event = await config.flightSuretyApp.fundAirlineInsurance({from: accounts[i], value: web3.utils.toWei(amount.toString(), "ether")});
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
        //event = await config.flightSuretyData.fund({from: accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], value: web3.utils.toWei(amount.toString(), "ether")});
        event = await config.flightSuretyApp.fundAirlineInsurance({from: accounts[MAX_AIRLINES_WITHOUT_VOTING + 1], value: web3.utils.toWei(amount.toString(), "ether")});
        assert.equal(event.logs != undefined && event.logs[0] == "AirlineAuthorized", false, "Airline authorized event not received.");
    } catch(e) {
        console.log(e);
        assert(true, false, "Airline should have been voted in by all of the other airlines");
    }

    // ASSERT
    let result = await config.flightSuretyData.isAirline.call(accounts[MAX_AIRLINES_WITHOUT_VOTING + 1]);
    assert.equal(result, true, "Airline multi-sig authorization error.");
  });

  it(`(buy insurance) Passengers can buy insurance for a specific flight if amount is valid.`, async function () {
    let airline = accounts[1];
    let isRegistered = true; // normally, needs to be done by oracles
    let updatedTimestamp = 1609069459467;
    let statusCode = 10; // STATUS_CODE_ON_TIME
    let FIRST_PASSENGER_ACCOUNT = 11;
    var i = 1;
    try
    {
        let key = await config.flightSuretyApp.getFlightKey.call(airline, "TEST_FLIGHT_01", updatedTimestamp);
        console.log("key: ", key);
        var event = await config.flightSuretyApp.registerFlight(key, isRegistered, statusCode, updatedTimestamp, airline);
        assert.equal(event.logs != undefined && event.logs[0] == "RegisterFlight", false, "Faiure, registering flight.");
        var amount = 0.5;
        for (i = 1; i <= 3; ++i)
        {
            console.log("Passenger: " + i);
            await config.flightSuretyApp.buyInsurance(key, {from: accounts[FIRST_PASSENGER_ACCOUNT + (i - 1)], value: web3.utils.toWei(amount.toString(), "ether")});
            amount += 0.5;
        }
    } catch(e) {
        if (String(e).includes("Insurance can be bought for a price of maximum 1 ETH") && i == 3)
        {
            console.log ("Ok, third passenger cannot buy the insurance (amount too large) - expected.");
        } else
        {
            assert.equal(true, false, "Flight cannot be registered!! " + e);
        }
    }
  });

  it(`(buy insurance) Credit all passengers who bought insurance.`, async function () {
    let airline = accounts[1];
    let updatedTimestamp = 1609069459467;    
    let key = await config.flightSuretyApp.getFlightKey.call(airline, "TEST_FLIGHT_01", updatedTimestamp);
    console.log("key: ", key);

    let FIRST_PASSENGER_ACCOUNT = 11;
    let initialBalance1 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT]);
    console.log("Init. Balance1: " + initialBalance1);
    let initialBalance2 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT + 1]);
    console.log("Init. Balance2: " + initialBalance2);
    let initialBalance3 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT + 2]);
    console.log("Init. Balance3: " + initialBalance3);

    try
    {
        var event = await config.flightSuretyApp.creditInsurees(key);
        let finalBalance1 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT]);
        console.log("Final. Balance1: " + finalBalance1);
        let finalBalance2 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT + 1]);
        console.log("Final. Balance2: " + finalBalance2);
        let finalBalance3 = await web3.eth.getBalance(accounts[FIRST_PASSENGER_ACCOUNT + 2]);
        console.log("Final. Balance3: " + finalBalance3);

        let diff1 = finalBalance1 - initialBalance1;
        let diff2 = finalBalance2 - initialBalance2;
        let diff3 = finalBalance3 - initialBalance3;

        console.log("Diff1:", diff1);
        console.log("Diff2:", diff2);
        console.log("Diff3:", diff3);

        assert.equal(diff1 > 0 && diff2 > 0 && diff3 == 0, "First two passangers didn't get the expected payouts!!");

        //console.log(event);
        /*if (event.logs != undefined)
        {
            for (i = 0; i < event.logs.length; ++i)
            {
                if (event.logs[i] == "InsurancePayout")
                {
                    console.log("--- Insurance payout detected ---");
                }
            }
        }*/
    } catch(e) {
        assert.equal(true, false, "Error! Could not credit passengers!! " + e);
    }
  });

});
