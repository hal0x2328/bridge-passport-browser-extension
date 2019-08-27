var _passport;
var _passphrase;
var _settings;
var _params;

//Templates
var _claimTemplate;
var _blockchainTemplate;
var _applicationTemplate;
var _transactionTemplate;

_browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.target != "popup")
        return;

    if (request.action === "focus") {
        window.focus();
        if (window.location.href)
            window.location.href = request.url;
    }

    if (request.action === "login") {
        window.focus();
        initLogin(request.sender, request.loginRequest);
    }

    if (request.action === "payment") {
        window.focus();
        initPayment(request.sender, request.address, request.amount, request.identifier);
    }

    sendResponse();
});


$(function () {
    Init();
});

async function Init() {
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
    hideWait();

    //If we were launched from a request, now that we're loaded, do the action
    if (_params) {
        let action = getParamAction(_params);
        if (action.action === "login") {
            await initLogin(action.sender, action.loginRequest);
        }
        else if (action.action === "payment") {
            await initPayment(action.sender, action.address, action.amount, action.identifier);
        }
    }
}

async function initPayment(sender, address, amount, identifier) {
    alert("payment of + " + amount + " to " + address);
    showWait("Sending Payment Transaction Information...");
    setTimeout(async function () {
        try {
            let message = {
                action: "sendBridgePaymentResponse",
                transactionId: "123354235234534534"
            };
            alert("send message to " + sender);
            await sendMessageToTab(sender, message);
            hideWait();
        }
        catch (err) {
            alert("Error sending login response: " + err);
            hideWait();
        }
    }, 50);

}

async function initLogin(sender, loginRequest) {
    $("#login_modal").modal({
        closable: false,
        onApprove: async function () {
            showWait("Sending Login Response...");
            setTimeout(async function () {
                try {
                    let requestValue = await getPassportLoginRequest(loginRequest);
                    let responseValue = await getPassportLoginResponse(requestValue, [3]);
                    let message = {
                        action: 'sendBridgeLoginResponse',
                        responseValue: responseValue.payload
                    };
                    await sendMessageToTab(sender, message);
                    hideWait();
                }
                catch (err) {
                    alert("Error sending login response: " + err);
                    hideWait();
                }
            }, 50);
        },
        onDeny: async function () {

        }
    }).modal("show");
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
                $("#claims_list").append(getClaimItem(claims[i]));
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
                var item = getApplicationItem(res.applications[i]);
                $("#verification_request_list").append(item);
            }
        }
        else if (res.error) {
            $("#verification_request_list").empty();
            $("#verification_request_list").text("Error connecting to Bridge public api. Verification requests are unavailable.");
        }

        hideRefreshSectionProgress($("#refresh_verifications_button"));
        resolve();
    });
}

function getApplicationItem(application) {
    var applicationItem = $(_applicationTemplate).clone();
    var link = $(applicationItem).find(".application-link");
    link.click(function () {
        alert("Show application details");
    })
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

function getClaimItem(claim) {
    var claimItem = $(_claimTemplate).clone();
    $(claimItem).find(".claim-name").html(claim.claimTypeName + ": " + claim.claimValue);
    $(claimItem).find(".claim-expires").text("Verified On: " + new Date(claim.createdOn * 1000).toLocaleDateString());
    $(claimItem).find(".claim-signature-link").text(claim.signedByName);
    $(claimItem).find(".partner-details-link").attr("data-passportid", claim.signedById);
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