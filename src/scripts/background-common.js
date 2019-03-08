async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function createPassport(passphrase) {
  let passportHelper = new BridgeProtocol.Passport();
  let passport = await passportHelper.createPassport(passphrase);
  if (passport) {
    _passphrase = passphrase;
    _passport = passport;
    await savePassportToBrowserStorage(_passport);
  }
  return passport;
}

async function getPassportDetails() {
  let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
  return await passportHelper.getDetails(_passport.id);
}

async function getPassportIdForPublicKey(publicKey){
  let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
  return await passportHelper.getPassportIdForPublicKey(publicKey);
}

async function importPassport(content, passphrase) {
  let passportHelper = new BridgeProtocol.Passport();
  let passport = await passportHelper.loadPassportFromContent(content, passphrase);

  if (passport) {
    passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, passport, passphrase);
    await savePassportToBrowserStorage(passport);

    _passphrase = passphrase;
    _passport = passport;
  }

  return passport;
}

async function unlockPassport(passphrase) {
  var content = await loadPassportFromBrowserStorage();
  let passportHelper = new BridgeProtocol.Passport();
  let passport = await passportHelper.loadPassportFromContent(JSON.stringify(content), passphrase);

  if (passport) {
    passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, passport, passphrase);
    await savePassportToBrowserStorage(passport);

    _passphrase = passphrase;
    _passport = passport;
  }

  return passport;
}

async function saveSettingsToBrowserStorage(settings) {
  return await _browser.storage.local.set({ 'settings': JSON.stringify(settings) });
}

async function loadSettingsFromBrowserStorage() {
  var res = await _browser.storage.local.get('settings');
  if (res && res.settings) {
    _settings = JSON.parse(res.settings);
  }

  return _settings;
}

async function savePassportToBrowserStorage(passport) {
  return await _browser.storage.local.set({ 'passport': JSON.stringify(passport) });
}

async function loadPassportFromBrowserStorage() {
  var res = await _browser.storage.local.get('passport');
  if (res && res.passport)
    return JSON.parse(res.passport);

  return null;
}

async function removePassportFromBrowserStorage() {
  return await _browser.storage.local.remove('passport');
}

async function removePassport() {
  _passport = null;
  _passphrase = null;

  await removePassportFromBrowserStorage();
}

async function closePassport() {
  _passport = null;
  _passphrase = null;
}

async function getClaimsObjects(claims) {
  if(!claims)
    claims = new Array();
    
  for (let i = 0; i < claims.length; i++) {
    claims[i].claimTypeName = claims[i].claimTypeId;

    var type = await getClaimTypeById(claims[i].claimTypeId);
    if (type)
      claims[i].claimTypeName = type.name;
  }

  return claims;
}

async function getClaimTypeById(claimTypeId) {

  if (!_claimTypes) {
    let claimHelper = new BridgeProtocol.Claim(_settings.apiBaseUrl, _passport, _passphrase);
    _claimTypes = await claimHelper.getAllClaimTypes();
  }

  if(!_claimTypes){
    return null;
  }

  for (let i = 0; i < _claimTypes.length; i++) {
    if (_claimTypes[i].id == claimTypeId)
      return _claimTypes[i];
  }
}

async function getDecryptedClaims() {
  let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
  let claims = await passportHelper.getDecryptedClaims();
  return await getClaimsObjects(claims);
}

async function getBridgePassportId() {
  let bridgeHelper = new BridgeProtocol.Bridge(_settings.apiBaseUrl, _passport, _passphrase);
  return await bridgeHelper.getBridgePassportId();
}

async function createApplication(partner) {
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  return await applicationHelper.createApplication(partner); 
}

async function updateApplicationTransaction(applicationId, network, transactionId){
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  return await applicationHelper.updatePaymentTransaction(applicationId, network, transactionId);
}

async function resendApplication(applicationId) {
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  return await applicationHelper.retrySend(applicationId);
}

async function getApplications() {
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  var applications = await applicationHelper.getAllApplications();

  //Get the name if we can
  for (let i = 0; i < applications.length; i++) {
    var partner = await getVerificationPartner(applications[i].verificationPartner);
    if (partner)
      applications[i].verificationPartnerName = partner.name;
  }

  return applications;
}

async function getApplication(applicationId) {
  let claimHelper = new BridgeProtocol.Claim(_settings.apiBaseUrl, _passport, _passphrase);
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  var application = await applicationHelper.getApplication(applicationId);
  var partner = await getVerificationPartner(application.verificationPartner);

  if (partner)
    application.verificationPartnerName = partner.name;

  //Decrypt the encrypted claims packages to display via the UI
  var decryptedClaims = new Array();
  for (let i = 0; i < application.claims.length; i++) {
    var claim = await claimHelper.decryptClaimPackage(application.claims[i]);

    //If we couldn't decrypt, it may be the old incompatible format
    if (claim) {
      var partner = await getVerificationPartner(claim.signedById);
      if (partner)
        claim.verificationPartnerName = partner.name;
      var claimType = await getClaimTypeById(claim.claimTypeId);
      if (claimType)
        claim.claimTypeName = claimType.name;
      decryptedClaims.push(claim);
    }
  }
  application.decryptedClaims = decryptedClaims;

  return application;
}

async function getVerificationPartners() {
  if (!_verificationPartners) {
    var verificationPartnerHelper = new BridgeProtocol.VerificationPartner(_settings.apiBaseUrl, _passport, _passphrase)
    _verificationPartners = await verificationPartnerHelper.getAllPartners();
  }

  var partners = new Array();
  for (let i = 0; i < _verificationPartners.length; i++) {
     partners.push(_verificationPartners[i]);
  }
  return partners;
}

async function getVerificationPartner(partnerId) {
  if (!_verificationPartners) {
    var verificationPartnerHelper = new BridgeProtocol.VerificationPartner(_settings.apiBaseUrl, _passport, _passphrase)
    _verificationPartners = await verificationPartnerHelper.getAllPartners();
  }

  for (let i = 0; i < _verificationPartners.length; i++) {
    if (_verificationPartners[i].id == partnerId) {
      return _verificationPartners[i];
    }
  }

  return null;
}

async function getPassportLoginRequest(payload) {
  let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
  let authHelper = new BridgeProtocol.Auth(_settings.apiBaseUrl, _passport, _passphrase);
  var request = await authHelper.verifyPassportLoginChallengeRequest(payload);

  let claimTypes = new Array();
  if (request.payload.claimTypes) {
    for (let i = 0; i < request.payload.claimTypes.length; i++) {
      let claimType = await getClaimTypeById(request.payload.claimTypes[i]);
      if (claimType) {
        claimTypes.push(claimType);
      }
    }
  }

  request.claimTypes = claimTypes; //The claim types being requested
  request.missingClaimTypes = getMissingPassportClaimTypes(claimTypes);
  request.passportDetails = await passportHelper.getDetails(request.passportId);

  return request;
}

async function getPassportLoginResponse(request, claimTypeIds) {
  let claims = new Array();
  let passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase);
  let authHelper = new BridgeProtocol.Auth(_settings.apiBaseUrl, _passport, _passphrase);
  claims = await passportHelper.getDecryptedClaims(claimTypeIds);

  return {
    payload: await authHelper.createPassportLoginChallengeResponse(request.payload.token, claims, request.publicKey),
    passportId: _passport.id
  };
}

async function getProfileType(profileTypeId) {
  if (!_profileTypes) {
    let profileHelper = new BridgeProtocol.Profile(_settings.apiBaseUrl, _passport, _passphrase);
    _profileTypes = await profileHelper.getAllProfileTypes();
  }

  for (let i = 0; i < _profileTypes.length; i++) {
    if (_profileTypes[i].id == profileTypeId) {
      return _profileTypes[i];
    }
  }
}

async function removeAllApplicationClaims(applicationId) {
  let applicationHelper = new BridgeProtocol.Application(_settings.apiBaseUrl, _passport, _passphrase);
  await applicationHelper.removeClaims(applicationId);
}

async function updateClaimPackages(claimPackages) {
  for (let i = 0; i < claimPackages.length; i++) {
    updatePassportClaim(claimPackages[i]);
  }
}

function updatePassportClaim(claimPackage) {
  _passport.claims = replaceClaimPackage(claimPackage, _passport.claims);
}

function replaceClaimPackage(newClaimPackage, claimPackages) {
  //We may want to check expiration and some stuff here as well...
  let claimPackage = null;
  if (newClaimPackage)
    claimPackage = getClaimPackageByTypeId(newClaimPackage.typeId, claimPackages);

  if (!claimPackage)
    claimPackages.push(newClaimPackage);
  else {
    for (let i = 0; i < claimPackages.length; i++) {
      let claimPackage = claimPackages[i];
      if (claimPackage && claimPackage.typeId == newClaimPackage.typeId) {
        claimPackages[i] = newClaimPackage;
      }
    }
  }
  return claimPackages;
}

function getClaimPackageByTypeId(claimTypeId, claimPackages) {
  for (let i = 0; i < claimPackages.length; i++) {
    if (claimPackages[i].typeId == claimTypeId) {
      return claimPackages[i];
    }
  }
}

function getMissingPassportClaimTypes(claimTypes) {
  var missingClaimTypes = new Array();
  for (let i = 0; i < claimTypes.length; i++) {
    if (!checkPassportContainsClaimType(claimTypes[i].id)) {
      missingClaimTypes.push(claimTypes[i]);
    }
  }
  return missingClaimTypes;
}

function checkPassportContainsClaimType(claimTypeId) {
  if (_passport.getClaimPackageByType(claimTypeId)) {
    return true;
  }

  return false;
}

async function getNetworkFee() {
  var bridgeHelper = new BridgeProtocol.Bridge(_settings.apiBaseUrl, _passport, _passphrase);
  return await bridgeHelper.getBridgeNetworkFee();
}

async function getBridgeScriptHash(network) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return await blockchainHelper.getBridgeScriptHash(network);
}

async function getBlockchainPrivateKey(network, key) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return blockchainHelper.getPrivateKey(network, key);
}

async function registerBlockchainAddress(network, address) {
  if (!_scriptHash) {
    var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
    _scriptHash = await blockchainHelper.getBridgeScriptHash(network);
  }

  var passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase, _scriptHash);
  return await passportHelper.addBlockchainAddress(network, address);
}

async function sendBlockchainPayment(network, amount, paymentIdentifier) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  if (!_scriptHash) {
    _scriptHash = await blockchainHelper.getBridgeScriptHash(network);
  }

  let bridgeWallet = await blockchainHelper.getBridgeWallet(network);
  var passportHelper = new BridgeProtocol.Passport(_settings.apiBaseUrl, _passport, _passphrase, _scriptHash);
  return await passportHelper.sendPayment(network, amount, bridgeWallet, paymentIdentifier);
}

async function getBlockchainPassportInfo(network, passportId) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return await blockchainHelper.getPassportStatus(network, passportId);
}

async function getBlockchainAddressInfo(network, address) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return await blockchainHelper.getAddressStatus(network, address);
}

async function getBlockchainTransactionInfo(network, transactionId) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return await blockchainHelper.getTransactionStatus(network, transactionId);
}

async function checkBlockchainTransactionComplete(network, transactionId) {
  var blockchainHelper = new BridgeProtocol.Blockchain(_settings.apiBaseUrl, _passport, _passphrase);
  return await blockchainHelper.checkTransactionComplete(network, transactionId);
}