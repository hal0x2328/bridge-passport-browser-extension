var _settings = {
  lockPassport: false,
  apiBaseUrl: BridgeProtocol.Constants.bridgeApiUrl,
  explorerBaseUrl: BridgeProtocol.Constants.bridgeExplorerUrl,
}

//Cached passport
var _passport;
var _passphrase;

//Cache stuff for now
var _verificationPartners;
var _claimTypes;
var _profileTypes;
var _scriptHash;

//Window tracking
var popupWindowId = false;
var windowNotOpenTitle = 'Open Bridge Passport';
var windowIsOpenTitle = 'Bridge Passport is already open. Click to focus popup.';

function openPopup(pageName, params) {
  //Default to main
  if (!pageName)
    pageName = "main";

  //Set the window size
  let height = screen.height * .80;
  let width = screen.width * .50;

  if (height < 1024)
    height = screen.height;
  else if (height > 1024)
    height = 1024;

  if (width < 1280)
    width = screen.width;
  else if (width > 1280)
    width = 1280;

  //Center the window
  hcenter = screen.width * .50;
  vcenter = screen.height * .50;
  hoffset = width * .50;
  voffset = height * .50;

  let left = hcenter - hoffset;
  let top = vcenter - voffset;

  let windowSize = {
    height,
    width,
    left,
    top
  };
  
  let url = _browser.extension.getURL("/pages/" + pageName + ".html");
  if (params)
    url = url + "?" + params;

  console.log("Opening Passport window: " + JSON.stringify({ url, windowSize }));

  if (typeof popupWindowId === 'number') {
    console.log("Passport window already open, focusing");
    _browser.runtime.sendMessage({ target: "popup", action: "focus", url });
  }
  
  if (popupWindowId === false) {
    popupWindowId = true; //Prevent user pressing pressing the button multiple times.
    _browser.browserAction.setTitle({ title: windowIsOpenTitle });
    _browser.windows.create(
      {
        url,
        type: 'popup',
        width: windowSize.width,
        height: windowSize.height,
        left: windowSize.left,
        top: windowSize.top
      },
      function (win) {
        popupWindowId = win.id;
      }
    );
  }

  return;
}

//Look for closing popups
_browser.windows.onRemoved.addListener(function (winId) {
  if (popupWindowId === winId) {
    //_browser.browserAction.enable();
    _browser.browserAction.setTitle({ title: windowNotOpenTitle });
    popupWindowId = false;
  }
});

_browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.target != 'background')
    return;

  if (request.action == "login") {
    if(popupWindowId === false){
      openPopup("main", "sender=" + sender.tab.id + "&login_request=" + request.detail.loginRequest);
    }
    else{
      _browser.runtime.sendMessage({ target: "popup", action: "focus" });
      _browser.runtime.sendMessage({ target: "popup", action: "login", sender: sender.tab.id, loginRequest: request.detail.loginRequest });
    }
    
    return;
  }

  if (request.action == "payment") {
    if(popupWindowId === false){
      openPopup("main", "sender=" + sender.tab.id + "&payment_request=" + request.detail.paymentRequest);
    }
    else{
      _browser.runtime.sendMessage({ target: "popup", action: "focus" });
      _browser.runtime.sendMessage({ target: "popup", action: "payment", sender: sender.tab.id, paymentRequest: request.detail.paymentRequest });
    }

    return;
  }

  if(request.action == "claimsImport"){
    _browser.runtime.sendMessage({target:"popup", action:"claimsImport", sender: sender.tab.id, claimsImportRequest: request.detail.claimsImportRequest});
  }

  if (request.action == "openPopup") {
    openPopup(request.pageName, request.params);
    return;
  }

  if (request.action == "clearCache") {
    _claimTypes = null;
    _verificationPartners = null;
    _profileTypes = null;
    _scriptHash = null;
    sendResponse();
  }

  if (request.action == "getSettings") {
    loadSettingsFromBrowserStorage().then(sendResponse);
    return true;
  }

  if (request.action == "saveSettings") {
    _settings = request.settings;
    saveSettingsToBrowserStorage(request.settings).then(sendResponse);
    return true;
  }

  if (request.action == "getPassphrase") {
    sendResponse(_passphrase);
  }

  if (request.action == "getPassport") {
    getPassport().then(sendResponse);
    return true;
  }

  if (request.action == "createPassport") {
    createPassport(request.passphrase, request.neoWif, request.autoCreate).then(sendResponse);
    return true;
  }

  if (request.action == "getPassportDetails") {
    getPassportDetails().then(sendResponse);
    return true;
  }

  if (request.action == "getPassportIdForPublicKey") {
    getPassportIdForPublicKey(request.publicKey).then(sendResponse);
    return true;
  }

  if (request.action == "importPassport") {
    importPassport(request.content, request.passphrase).then(sendResponse);
    return true;
  }

  if (request.action == "unlockPassport") {
    unlockPassport(request.passphrase).then(sendResponse);
    return true;
  }

  if (request.action == "getPassportFromStorage") {
    loadPassportFromBrowserStorage().then(sendResponse);
    return true;
  }

  if (request.action == "closePassport") {
    closePassport().then(sendResponse);
    return true;
  }

  if (request.action == "removePassport") {
    removePassport().then(sendResponse);
    return true;
  }

  if (request.action == "getBridgePassportId") {
    getBridgePassportId().then(sendResponse);
    return true;
  }

  if (request.action == "getClaims") {
    getDecryptedClaims().then(sendResponse);
    return true;
  }

  if (request.action == "getApplications") {
    getApplications().then(sendResponse);
    return true;
  }

  if (request.action == "getApplication") {
    getApplication(request.applicationId).then(sendResponse);
    return true;
  }

  if (request.action == "createApplication") {
    createApplication(request.partner, request.serviceTypes, request.paymentNetwork, request.paymentTransactionId).then(sendResponse);
    return true;
  }

  if (request.action == "updateApplicationTransaction") {
    updateApplicationTransaction(request.applicationId, request.network, request.transactionId).then(sendResponse);
    return true;
  }

  if (request.action == "resendApplication") {
    resendApplication(request.applicationId).then(sendResponse);
    return true;
  }

  if (request.action == "getVerificationPartners") {
    getVerificationPartners().then(sendResponse);
    return true;
  }

  if (request.action == "getVerificationPartner") {
    getVerificationPartner(request.partnerId).then(sendResponse);
    return true;
  }

  if (request.action == "getPassportLoginRequest") {
    getPassportLoginRequest(request.payload).then(sendResponse);
    return true;
  }

  if (request.action == "getPassportLoginResponse") {
    getPassportLoginResponse(request.request, request.claimTypeIds).then(sendResponse);
    return true;
  }

  if (request.action == "removeAllApplicationClaims") {
    removeAllApplicationClaims(request.applicationId).then(sendResponse);
    return true;
  }

  if (request.action == "updateClaimPackages") {
    updateClaimPackages(request.claimPackages).then(sendResponse);
    return true;
  }

  if (request.action == "getNetworkFee") {
    getNetworkFee().then(sendResponse);
    return true;
  }

  if (request.action == "getBlockchainAddresses") {
    sendResponse(_passport.wallets);
  }

  if (request.action == "getBlockchainPrivateKey") {
    getBlockchainPrivateKey(request.network, request.key).then(sendResponse);
    return true;
  }

  if (request.action == "registerBlockchainAddress") {
    registerBlockchainAddress(request.network, request.address).then(sendResponse);
    return true;
  }

  if (request.action == "sendBlockchainPayment") {
    sendBlockchainPayment(request.network, request.amount, request.paymentIdentifier, request.recipientAddress).then(sendResponse);
    return true;
  }

  if (request.action == "getBlockchainPassportInfo") {
    getBlockchainPassportInfo(request.network, request.passportId).then(sendResponse);
    return true;
  }

  if (request.action == "getBlockchainAddressInfo") {
    getBlockchainAddressInfo(request.network, request.address).then(sendResponse);
    return true;
  }

  if (request.action == "getBlockchainTransactionInfo") {
    getBlockchainTransactionInfo(request.network, request.transactionId).then(sendResponse);
    return true;
  }

  if (request.action == "checkBlockchainTransactionComplete") {
    checkBlockchainTransactionComplete(request.network, request.transactionId).then(sendResponse);
    return true;
  }
});