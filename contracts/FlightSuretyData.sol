pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;

    struct Airline {
        address airline;
        string name;
        bool hasFunded;
        //uint256 nrApprovers;
        //mapping(address => uint256) approvers;
    }

    mapping(address => mapping(address => uint256)) airlineQueue;
    mapping(address => address[]) airlinesQueued;
    mapping(address => uint256) registeredAirlines;
    uint256 private nrAirlines;
    uint constant MAX_AIRLINES_WITHOUT_VOTING = 5;
    mapping(address => uint256) airlineFunds;
    mapping(address => uint256) authorizedAirlines;

    event AirlineRegistered(address airline);
    event AirlineAuthorized(address airline); // funded
    event AirlineVotes(uint256 votes);

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor (address firstAirline) public
    {
        contractOwner = msg.sender;
        authorizedAirlines[firstAirline] = 1;
        nrAirlines = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the airline to be authorized
    */
    modifier requireAirlineAuthorized()
    {
        // cannot use msg.sender here as the call may pass through other
        // contracts along the way, and msg.sender gets overwritten at each subsequent call
        require(authorizedAirlines[tx.origin] == 1, "Airline is NOT authorized to register another airline!!");
        _;
    }

    /**
    * @dev Modifier that requires the new airline to NOT be already authorized
    */
    modifier requireAirlineUnique(address newAirline)
    {
        require(authorizedAirlines[newAirline] != 1, "New airline must not already be authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get number of registered airlines
    *
    * @return The number of registered airlines
    */  
    function getNrAirlines() public view returns(uint256) 
    {
        return nrAirlines;
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Check if address is airline
    *
    * @return A bool that indicates if the address is an airline
    */      
    function isAirline(address airline) public view requireIsOperational returns(bool)
    {
        return authorizedAirlines[airline] == 1;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *      Note that this operation can only be done by funded airlines!!
    *
    */
    function registerAirline
                            (address newAirline) requireAirlineAuthorized() requireAirlineUnique(newAirline)
                            external returns(bool success, uint256 votes) 
    {
       if (nrAirlines < MAX_AIRLINES_WITHOUT_VOTING)
       {
           registeredAirlines[newAirline] = 1;
           emit AirlineRegistered(newAirline);
           nrAirlines += 1;
           return (true, 0);
       }

       // vote here M of N
       require(airlineQueue[newAirline][tx.origin] != 1, "Airline already voted for new airline authorization. Cannot double vote!!");
       airlineQueue[newAirline][tx.origin] = 1;
       airlinesQueued[newAirline].push(tx.origin); 
       //Airline({airline: msg.sender, name: "", hasFunded: false});

       // votes not sufficient
       if (airlinesQueued[newAirline].length < nrAirlines.div(2))
       {
            emit AirlineVotes(airlinesQueued[newAirline].length);
            return (false, airlinesQueued[newAirline].length);
       }

       nrAirlines = nrAirlines + 1;
       registeredAirlines[newAirline] = 1;
       emit AirlineRegistered(newAirline);

       // cleanup
       address[] memory tmp = airlinesQueued[newAirline];
       for (uint256 i = 0; i < tmp.length; ++i)
       {
           delete airlineQueue[newAirline][tmp[i]];
       }
       delete airlinesQueued[newAirline];
       return (true, 0);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(/*address airline*/) public payable requireIsOperational
    {
        // ensures this is not callable by a contract, only an externally owned account
        uint256 amount = 10 ether;
        require(msg.value >= amount, "Insufficient funds");
        require(authorizedAirlines[msg.sender] != 1, "Airline already authorized.");

        uint256 change = msg.value.sub(amount);
        airlineFunds[msg.sender].add(amount);// = airlineFunds[msg.sender].sub(amount);
        authorizedAirlines[msg.sender] = 1;
        msg.sender.transfer(change); // transfer change back to the caller

        emit AirlineAuthorized(msg.sender);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }

    function authorizeCaller(address callerAddress) external requireContractOwner
    {
        authorizedContracts[callerAddress] = 1;
    }

    function deauthorizeCaller(address callerAddress) external requireContractOwner
    {
        delete authorizedContracts[callerAddress];
    }


}

