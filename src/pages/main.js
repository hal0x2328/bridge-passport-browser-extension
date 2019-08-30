var _passport;
var _passphrase;
var _settings;
var _params;

//Templates
var _claimTemplate;
var _blockchainTemplate;
var _applicationTemplate;
var _transactionTemplate;
var _loginClaimTypeTemplate;

//Look for login or payment requests
_browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.target != "popup")
        return;

    if (request.action === "login") {
        window.focus();
        initLogin(request.sender, request.loginRequest);
    }

    if (request.action === "payment") {
        window.focus();
        initPayment(request.sender, request.paymentRequest);
    }

    if (request.action === "claimsImport") {
        window.focus();
        initClaimsImport(request.sender, request.claimsImportRequest);
    }

    sendResponse();
});


$(function () {
    Init();
});

async function Init() {
    window.focus();

    _settings = await getSettings();
    _passport = await getPassport();
    _passphrase = await getPassphrase();
    _params = getQueryStringFromLocation();

    if (!_passphrase && _passport) {
        await initUnlock();
        $("#unlock_passport_modal").modal({ closable: false }).modal("show");
        return;
    }

    if (!_passport) { //If we can't, it means we don't have one loaded
        loadPage("createpassport", _params);
        return;
    }

    initSidebar();
    await initPassportDetails();
    await initVerifications();
    await initClaims();
    await initBlockchainAddresses();
    initSettings();
    initUI();

    //If we were launched from a request, now that we're loaded, do the action
    if (_params) {
        let action = getParamAction(_params);
        if (action.action === "login") {
            await initLogin(action.sender, action.loginRequest);
        }
        else if (action.action === "payment") {
            await initPayment(action.sender, action.paymentRequest);
        }
    }

    hideWait();
}

async function initClaimsImport(sender, claimsImportRequest) {
    showWait("Evaluating claims for import, please wait");
    setTimeout(async function () {
        try {
            let claimHelper = new BridgeProtocol.Claim(_settings.apiBaseUrl, _passport, _passphrase);
            let res = await claimHelper.verifyClaimsImportRequest(claimsImportRequest);
            let claims = res.payload.claimsImportRequest.claims;
            let decryptedClaims = [];

            //Decrypt the packages for use
            for (let i = 0; i < claims.length; i++) {
                let decryptedClaim = await claimHelper.decryptClaimPackage(claims[i]);
                decryptedClaims.push(decryptedClaim);
            }

            //Populate the objects
            decryptedClaims = await getClaimsObjects(decryptedClaims);

            if (decryptedClaims && decryptedClaims.length > 0) {
                $("#claims_import_list").empty();
                for (let i = 0; i < decryptedClaims.length; i++) {
                    $("#claims_import_list").append(await getClaimItem(decryptedClaims[i], true, i));
                }
            }
            else {
                $("#claims_import_list").empty();
                $("#claims_import_list").text("No verified information found");
            }

            $("#claims_import_modal").modal({
                closable: false,
                onApprove: async function () {
                    let claimPackages = new Array();
                    $("#claims_import_list").find("input[type=checkbox]").each(function () {
                        if ($(this).prop("checked")) {
                            let idx = $(this).attr("id").replace("claim_", "");
                            claimPackages.push(claims[idx]);
                        }
                    });

                    //Nothing to import
                    if (claimPackages.length == 0) {
                        hideWait();
                        return;
                    }


                    showWait("Updating passport claim packages...");
                    setTimeout(async function () {
                        try {
                            await updateClaimPackages(claimPackages);
                            initClaims();
                        }
                        catch (err) {
                            alert("Could not update passport claim packages: " + err);
                            hideWait();
                        }
                    }, 50);

                    hideWait();
                },
                onDeny: async function () {
                    hideWait();
                }
            }).modal("show");
        }
        catch (err) {
            alert("Error processing payment request: " + err);
        }
    }, 50);
}

async function initPayment(sender, paymentRequest) {
    showWait("Payment request received, please wait");
    setTimeout(async function () {
        try {
            let paymentHelper = new BridgeProtocol.Payment(_settings.apiBaseUrl, _passport, _passphrase);
            let request = await paymentHelper.verifyPaymentRequest(paymentRequest);
            let amount = request.payload.paymentRequest.amount;
            let address = request.payload.paymentRequest.address;
            let identifier = request.payload.paymentRequest.identifier;
            let passportId = request.passportId;

            $("#payment_address").val(address);
            let x = new BigNumber(amount * .00000001);
            $("#payment_amount").val(x.toFixed());
            $("#payment_identifier").val(identifier);

            //TODO: Check the balance requested against the BRDG balance in the wallet
            //And don't let them send if they don't have sufficient funds
            $("#payment_modal").modal({
                closable: false,
                onApprove: async function () {
                    showWait("Sending Payment to Blockchain...");
                    setTimeout(async function () {
                        let txid;
                        try {
                            let blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
                            txid = await blockchainHelper.sendPayment("NEO", parseInt(amount), address, identifier, false);
                            if (!txid) {
                                alert("Error sending payment.");
                                hideWait();
                                return;
                            }
                        }
                        catch (err) {
                            alert("Error sending payment: " + err);
                            hideWait();
                        }

                        showWait("Sending Payment Transaction Information", false);
                        try {
                            let responseValue = await paymentHelper.createPaymentResponse("NEO", amount, address, identifier, txid, request.publicKey);
                            let message = {
                                action: "sendBridgePaymentResponse",
                                paymentResponse: responseValue
                            };
                            await sendMessageToTab(sender, message);
                            hideWait();
                            if (_params) {
                                loadPage("main");
                            }
                        }
                        catch (err) {
                            alert("Error sending login response: " + err);
                            hideWait();
                            if (_params) {
                                loadPage("main");
                            }
                        }
                    }, 50);
                },
                onDeny: async function () {
                    hideWait();
                    if (_params) {
                        loadPage("main");
                    }
                }
            }).modal("show");
        }
        catch (err) {
            alert("Error processing payment request: " + err);
        }
    }, 50);
}

async function initLogin(sender, loginRequest) {
    showWait("Login request received, please wait");
    setTimeout(async function () {
        try {
            //Unpack the request
            let requestValue = await getPassportLoginRequest(loginRequest);
            _loginClaimTypeTemplate = $(".login-claim-type-template").first();

            $("#login_claim_types").empty();
            for (let i = 0; i < requestValue.claimTypes.length; i++) {
                let item = getLoginClaimItem(requestValue.missingClaimTypes, requestValue.claimTypes[i]);
                $("#login_claim_types").append(item);
            }

            $("#loginrequest_passport_id").text(requestValue.passportDetails.id);
            $("#loginrequest_partner_name").text(requestValue.passportDetails.partnerName);
            if (!requestValue.payload.token) {
                $("token_invalid").text("Token signature was invalid.  Proceed with caution.");
            }

            $("#login_modal").modal({
                closable: false,
                onApprove: async function () {
                    let claimTypeIds = new Array();
                    $("#login_claim_types").find("input[type=checkbox]").each(function () {
                        if ($(this).prop("checked")) {
                            let id = $(this).attr("id").replace("loginclaim_", "");
                            claimTypeIds.push(parseInt(id));
                        }
                    });

                    showWait("Sending Login Response...");
                    setTimeout(async function () {
                        try {
                            let responseValue = await getPassportLoginResponse(requestValue, claimTypeIds);
                            let message = {
                                action: 'sendBridgeLoginResponse',
                                loginResponse: responseValue.payload
                            };
                            await sendMessageToTab(sender, message);
                            hideWait();
                            if (_params) {
                                loadPage("main");
                            }
                        }
                        catch (err) {
                            alert("Error sending login response: " + err);
                            hideWait();
                            if (_params) {
                                loadPage("main");
                            }
                        }
                    }, 50);
                },
                onDeny: async function () {
                    hideWait();
                    if (_params) {
                        loadPage("main");
                    }
                }
            }).modal("show");
        }
        catch (err) {
            alert("Error processing login request: " + err);
        }
    }, 50);
}

function getLoginClaimItem(missingClaimTypes, claimType) {
    var item = $(_loginClaimTypeTemplate).clone();
    let name = claimType.name;

    if (checkMissingLoginClaimType(missingClaimTypes, claimType.id)) {
        name += " (Missinng)";
        $(item).find("input").attr("disabled", true);
    }
    $(item).find(".login-claim-type-name").html(name);
    $(item).find(".login-claim-type-id").html(claimType.id).attr("id", "loginclaim_" + claimType.id);
    return item;
}

async function initUI() {
    $(".ui.accordion").accordion();

    $("#bridge_button").click(function () {
        window.open(_settings.explorerBaseUrl);
    });

    $("#refresh_passport_button").click(async function () {
        initPassportDetails();
        await initClaims();
    });

    $("#refresh_blockchain_button").click(async function () {
        await initBlockchainAddresses();
    });

    $("#refresh_verifications_button").click(async function () {
        await initVerifications();
    });

    //show the buttons
    $("#unload_button").show();
    $("#create_verification_request_button").show();

    //Set content heights
    $(".main-section").each(function () {
        let containerHeight = $(this).outerHeight();
        let headerHeight = $(this).find(".main-section-header").outerHeight();
        let footerHeight = $(this).find(".main-section-footer").outerHeight();
        let contentHeight = containerHeight - headerHeight - footerHeight - 1;
        $(this).find(".main-section-content").outerHeight(contentHeight);
    });

    $(".refresh-section-icon").click(function () {
        showRefreshSectionProgress(this);
    });
}

async function initPassportDetails() {
    if (!_passport)
        return;

    //We don't have a valid passport object that's unlocked
    if (!_passport.publicKey) {
        let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
        _passport = await passportHelper.loadPassportFromContent(JSON.stringify(_passport), _passphrase);
    }

    $("#passport_id").val(_passport.id);
    $("#passport_publickey").val(_passport.key.public);

    $("#unload_button").click(async function () {
        await removePassport();
        loadPage("createpassport");
    });

    $("#copy_passport_id").popup({ on: 'click' });
    $("#copy_passport_id").click(function () {
        try {
            $("#passport_id").select();
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
        }
        catch (err) {

        }
    });
    $("#copy_public_key").popup({ on: 'click' });
    $("#copy_public_key").click(function () {
        try {
            $("#public_key").select();
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
        }
        catch (err) {

        }
    });
}

async function initClaims() {
    return new Promise(async (resolve, reject) => {
        _claimTemplate = $(".claim-template").first();
        var claims = await getPassportClaims();
        if (claims && claims.length > 0) {
            $("#claims_list").empty();
            for (let i = 0; i < claims.length; i++) {
                $("#claims_list").append(await getClaimItem(claims[i]));
            }
        }
        else {
            $("#claims_list").empty();
            $("#claims_list").text("No verified information found");
        }
        hideRefreshSectionProgress($("#refresh_passport_button"));
        resolve();
    });
}

async function getBalancesForAddress(address) {
    let gas = 0;
    let brdg = 0;

    var info = await BridgeProtocol.NEOUtility.getAddressBalances(address);

    for (let i = 0; i < info.length; i++) {
        let asset = info[i];
        if (asset.asset == "GAS") {
            gas = asset.balance;
        }
        else if (asset.asset == "BRDG") {
            brdg = asset.balance;
        }
    }

    return {
        gas,
        brdg
    }
}

async function initBlockchainAddresses() {
    return new Promise(async (resolve, reject) => {
        _blockchainTemplate = $(".blockchain-template").first();
        var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
        var addresses = _passport.wallets;
        var info = await blockchainHelper.getPassportStatus("NEO", _passport.id);
        if (addresses) {
            if (addresses && addresses.length > 0) {
                $("#blockchain_list").empty();
            }

            for (let i = 0; i < addresses.length; i++) {
                let balances = await getBalancesForAddress(addresses[i].address);
                addresses[i].registered = false;
                addresses[i].brdgbalance = balances.brdg;
                addresses[i].gasbalance = balances.gas;
                if (info) {
                    addresses[i].registered = true;
                }
                var item = getBlockchainItem(addresses[i]);
                $("#blockchain_list").append(item);
            }
        }
        else {
            $("#blockchain_list").empty();
            $("#blockchain_list").text("No blockchain addresses found");
        }

        $("#copy_wif").popup({ on: 'click' });
        $("#copy_wif").click(function () {
            try {
                $("#wif_value").select();
                document.execCommand('copy');
                window.getSelection().removeAllRanges();
                alert('Private Key Copied to Clipboard');
            }
            catch (err) {

            }
        });
        hideRefreshSectionProgress($("#refresh_blockchain_button"));
        resolve();
    });
}

function initUnlock() {
    $("#unlock_passport_button").click(async function () {
        var passphrase = $("#unlock_passphrase").val();
        if (!passphrase) {
            alert("Passphrase is required.");
            return;
        }

        showWait("Unlocking Bridge Passport...");
        setTimeout(async function () {
            try {
                var passport = await unlockPassport(passphrase);
                if (passport) {
                    loadPage("main", _params);
                }
                else {
                    $("#error").text("Invalid passphrase.");
                    hideWait();
                }
            }
            catch (err) {
                alert("Could not unlock passport: " + err);
                hideWait();
            }
        }, 50);
    });
}

async function initVerifications() {
    return new Promise(async (resolve, reject) => {
        _applicationTemplate = $(".application-template").first();
        let res = await getApplications();
        if (res.error) {
            $("#create_verification_request_button").prop('disabled', true);
        }
        console.log(JSON.stringify(res));

        if (res.applications) {
            if (res.applications && res.applications.length > 0) {
                $("#verification_request_list").empty();
            }
            else {
                $("#verification_request_list").empty();
                $("#verification_request_list").text("No active verifications found");
            }

            for (let i = 0; i < res.applications.length; i++) {
                var item = await getApplicationItem(res.applications[i]);
                $("#verification_request_list").append(item);
            }
        }
        else if (res.error) {
            $("#verification_request_list").empty();
            $("#verification_request_list").text("Error connecting to Bridge public api. Verification requests are unavailable.");
        }

        //TODO: This will all need to be dynamic information on the selection once more verification partners
        //are added to the network
        $("#create_verification_request_button").click(async function () {
            let fee = await getNetworkFee();
            fee = parseInt(fee);
            //TODO: Check balance

            $("#partner_select_partner_id").val("");
            $("#partner_select_dropdown").dropdown();
            $("#verification_create_button").focus();
            $("#partner_select_modal").modal({
                closable: false,
                onApprove: async function () {
                    showWait("Creating Verification Request...");
                    setTimeout(async function () {
                        try {
                            let partnerId = $("#partner_select_partner_id").val();
                            let application = await createApplication(partnerId);
                            if (!application) {
                                alert("Could not create verification request.");
                                hideWait();
                                return;
                            }

                            //Send the payment and wait
                            showWait("Sending Network Fee Payment Transaction...");
                            setTimeout(async function () {
                                let txid;
                                let blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
                                try {          
                                    txid = await blockchainHelper.sendPayment("NEO", fee, BridgeProtocol.Constants.bridgeContractAddress, application.id, false);
                                    if (!txid) {
                                        alert("Error sending payment transaction.");
                                        hideWait();
                                        return;
                                    }
                                }
                                catch (err) {
                                    alert("Error sending payment transaction: " + err);
                                    hideWait();
                                }

                                //Update the network transaction Id
                                application = await updateApplicationTransaction(application.id, "NEO", txid);
                                if (!application) {
                                    alert("Error updating application transaction");
                                    hideWait();
                                    return;
                                }

                                let status = await blockchainHelper.waitTransactionStatus("NEO", txid, fee,  BridgeProtocol.Constants.bridgeContractAddress, application.id);
                                if(!status){
                                    alert("Payment failed.");
                                    hideWait();
                                    return;
                                }

                                alert("Payment success.");
                            }, 50);
                        }
                        catch (err) {
                            alert("Could not create verification request: " + err);
                            hideWait();
                        }
                    }, 50);
                },
                onDeny: async function () {

                }
            }).modal("show");
        });

        $("#partner_select_site_link").click(function () {
            window.open("https://www.goaver.com");
        });

        $("#partner_select_info_link").click(function () {
            window.open("https://app.goaver.com/bridgeprotocol/info");
        });
        $("#partner_select_partner_id").change(function () {
            $("#partner_select_info").show();
        });

        hideRefreshSectionProgress($("#refresh_verifications_button"));
        resolve();
    });
}

async function getApplicationItem(application) {
    var partner = await getPartnerInfo(application.verificationPartner);
    var applicationItem = $(_applicationTemplate).clone();
    var link = $(applicationItem).find(".application-link");
    link.click(function () {
        alert("Show application details");
    })
    $(applicationItem).find(".bridge-application-icon-container").css("background-color", partner.color);
    $(applicationItem).find(".bridge-application-icon-container").find("img").attr("src", partner.icon);
    $(applicationItem).find(".application-status").text("Status: " + makeStringReadable(application.status));
    $(applicationItem).find(".application-partner").text("Partner: " + application.verificationPartnerName);
    var createdDate = new Date(application.createdOn * 1000);
    var created = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString();
    $(applicationItem).find(".application-created").text("Created: " + created);
    return applicationItem;
}

function initSidebar() {
    $("#export_button").click(function () {
        exportPassport(_passport);
    });

    $("#logout_button").click(async function () {
        await closePassport();
        window.close();
    });
}

function initSettings() {
    $("#settings_button").click(async function () {
        $("#lock_passport").prop('checked', _settings.lockPassport);
        $("#api_url").val(_settings.apiBaseUrl);
        $("#explorer_url").val(_settings.explorerBaseUrl);
        $('#settings_modal').modal('show');
    });

    $("#save_settings_button").click(async function () {
        _settings.lockPassport = $("#lock_passport").is(':checked');
        _settings.apiBaseUrl = $("#api_url").val();
        _settings.explorerBaseUrl = $("#explorer_url").val();
        await saveSettings(_settings);
    });
}

async function getClaimItem(claim, showCheckbox, idx) {
    var partner = await getPartnerInfo(claim.signedById);
    var claimItem = $(_claimTemplate).clone();
    if (showCheckbox) {
        $(claimItem).find(".claim-checkbox-container").show();
    }
    $(claimItem).find(".claim-type-id").text(claim.claimTypeId);
    $(claimItem).find(".claim-type-id").attr("id", "claim_" + idx);
    $(claimItem).find(".claim-type-name").text(claim.claimTypeName);
    $(claimItem).find(".claim-value").text(claim.claimValue);
    $(claimItem).find(".claim-verified-on").text(new Date(claim.createdOn * 1000).toLocaleDateString());
    $(claimItem).find(".claim-verified-by").text(claim.signedByName);
    return claimItem;
}

function getTransactionItem(tx) {
    var transactionItem = $(_transactionTemplate).clone();
    $(transactionItem).find(".transaction-id").text("Id: " + tx.txid);
    $(transactionItem).find(".transaction-amount").text("Amount: " + tx.amount);
    $(transactionItem).find(".transaction-from").text("From: " + tx.address_from);
    $(transactionItem).find(".transaction-to").text("To: " + tx.address_to);
    $(transactionItem).find(".transaction-details-link").click(function () {
        window.open("https://neoscan.io/transaction/" + tx.txid);
    });
    return transactionItem;
}

function getBlockchainItem(address) {
    var item = $(_blockchainTemplate).clone();
    $(item).find(".blockchain-network").html(address.network);
    $(item).find(".blockchain-address").html(address.address);
    $(item).find(".neo-brdg-balance").html(address.brdgbalance);
    $(item).find(".neo-gas-balance").html(address.gasbalance);
    $(item).find(".view-key").click(async function () {
        var key = await getBlockchainPrivateKey(address.network, address.key);
        if (address.network == "NEO") {
            $("#key_modal_text").text("Private Key (WIF)");
            $("#wif_value").val(key);
            window.getSelection().removeAllRanges();
        }
        $('#key_modal').modal("show");
    });

    $(item).find(".view-transactions").click(async function () {
        let blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
        let res = await blockchainHelper.getRecentTransactions("NEO", address.address);

        $("#transaction_list").empty();
        if (!res || res.length == 0) {
            $("#transaction_list").text("No transactions found");
        }

        _transactionTemplate = $(".transaction-template").first();
        for (let i = 0; i < res.length; i++) {
            $("#transaction_list").append(getTransactionItem(res[i]));
        }
        $("#transactions_modal").modal("show");
    });

    if (address.registered) {
        $(item).find(".blockchain-registered").html("Yes");
    }
    else {
        $(item).find(".register-address").click(function () {
            registerAddress(address.address);
        });
    }

    return item;
}

function registerAddress(address) {
    showWait("Registering passport and address on blockchain...<br>(This may take a few minutes depending on the network)", true);
    setTimeout(async function () {
        let blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
        let res = await blockchainHelper.addBlockchainAddress("NEO", address, true);
        hideWait();
        if (!res) {
            alert("Error registering passport on NEO network.");
            return;
        }
        initBlockchainAddresses();
    }, 50);
}