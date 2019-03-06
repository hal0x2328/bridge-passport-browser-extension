var _settings = {
  lockPassport: false,
  apiBaseUrl: "https://api.bridgeprotocol.io/",
  explorerBaseUrl: "https://explorer.bridgeprotocol.io/",
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

function openPopup(url, windowSize) {
  if (popupWindowId === false) {
    popupWindowId = true; //Prevent user pressing pressing the button multiple times.

    _browser.browserAction.setTitle({ title: windowIsOpenTitle });
    _browser.windows.create({
      url,
      type: 'popup',
      width: windowSize.width,
      height: windowSize.height,
      left: windowSize.left,
      top: windowSize.top
    },
      function (win) {
        popupWindowId = win.id;
      });
  }
  else if (typeof popupWindowId === 'number') {
    //hack to force a redraw so we don't lose the background image
    _browser.windows.update(popupWindowId, { focused: true });
    _browser.windows.update(popupWindowId, { width: windowSize.width, height: windowSize.height, left: windowSize.left, top: windowSize.top });
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

  if (request.action == "openPopup") {
    openPopup(request.url, request.windowSize);
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
    sendResponse(_passport);
  }

  if (request.action == "createPassport") {
    createPassport(request.passphrase).then(sendResponse);
    return true;
  }

  if (request.action == "getPassportDetails") {
    getPassportDetails().then(sendResponse);
    return true;
  }

  if(request.action == "getPassportIdForPublicKey"){
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

  if(request.action == "getBridgePassportId"){
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

  if(request.action == "resendApplication"){
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

  if(request.action == "getNetworkFee"){
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
    sendBlockchainPayment(request.network, request.amount).then(sendResponse);
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