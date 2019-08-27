//Message handling
_browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.target != "popup")
        return;

    if (request.action === "focus") {
        window.focus();
        if (request.url)
            window.location.href = request.url;
    }

    sendResponse();
});

//UI
document.title = 'Bridge Passport';

function showWait(message, twoLine) {
	if (twoLine) {
		$("#loading_spinner").find("img").css("margin-top", "-82px");
		$("#loading_spinner_message").css("padding-top", "0px");
	}
	else {
		$("#loading_spinner").find("img").css("margin-top", "-80px");
		$("#loading_spinner_message").css("padding-top", "0px");
	}

	$("#loading_spinner_message").html(message);
	$("#loading_spinner").show();
}

function showRefreshSectionProgress(icon){
	$(icon).addClass("refresh");
	$(icon).addClass("refresh-animation");
}

function hideRefreshSectionProgress(icon){
	$(icon).removeClass("refresh");
	$(icon).removeClass("refresh-animation");
}

function hideWait() {
	window.setTimeout(hideSpinner, 200);
}

function hideSpinner() {
	$("#loading_spinner_message").text("");
	$("#loading_spinner").hide();
}

function makeStringReadable(str) {
	let camelMatch = /([A-Z])/g;
	str = str.replace(camelMatch, " $1");

	//Make sure we're upper case
	str = str.charAt(0).toUpperCase() + str.slice(1);

	return str;
}

//Utility
async function sendMessageToTab(tabId, message){
	_browser.tabs.update(parseInt(tabId), { 'active': true }, async function(tab) { 
		await _browser.tabs.sendMessage(tab.id, message);
	});
}

async function loadPage(pageName, params, popup) {
	if(popup){
		await _browser.runtime.sendMessage({ target: 'background', action: 'openPopup', params, pageName });
	}
	else{
		let url = "./" + pageName + ".html";
		if(params)
			url = url + "?" + params;

		location.href = url;
	}
}

function getParamAction(queryString){
	let action = {
		action: "none",
		loginRequest: null,
		paymentRequest: {
			amount: 0,
			account: null,
			identifier: null
		},
		sender: null
	};

	let params = getParamsFromQueryString(queryString);
	if(!params || !Array.isArray(params) || params.length == 0)
		return { action };

	for(let i=0; i<params.length; i++){
		if (params[i].key == "sender") {
			action.sender = params[i].val;
		}
		else if (params[i].key == "login_request") {
			action.action = "login";
			action.loginRequest = params[i].val;
		}
		else if (params[i].key == "payment_amount") {
			action.action = "payment";
			action.paymentRequest.amount = params[i].val;
		}
		else if(params[i].key == "payment_address"){
			action.action = "payment";
			action.paymentRequest.address = params[i].val;
		}
		else if(params[i].key == "payment_identifier"){
			action.action = "payment";
			action.paymentRequest.identifier = params[i].val;
		}
	}

	return action;
}

function getQueryStringFromLocation() {
	var target = String(window.location);
	var idx = target.lastIndexOf("?");
	if (idx == -1)
		return null;

	let params = target.substring(idx + 1, target.length);
	console.log("param: " + params);
	return params;
}

function getParamsFromQueryString(qs){
	let params = [];
	let pairs = qs.split('&');
	for(let i=0; i<pairs.length; i++){
		let pair = pairs[i].split('=');
		params.push({
			key: pair[0],
			val: pair[1]
		});
	}
	return params;
}

function exportPassport(passport) {
	var iframe = Object.assign(document.createElement('iframe'), {
		onload() {
			var doc = this.contentDocument;
			var a = Object.assign(doc.createElement('a'), {
				href: 'data:text/plain;base64,' + btoa(JSON.stringify(passport)),
				download: 'passport.json',
			});
			doc.body.appendChild(a);
			a.dispatchEvent(new MouseEvent('click'));
			setTimeout(() => this.remove());
		},
		style: 'display: none',
	});
	document.body.appendChild(iframe);
}

async function checkBridgeOnline(){
	var bridgePassportId = await getBridgePassportId();
	
	if(bridgePassportId){
		return true;
	}

	return false;
}

async function checkApplicationPaymentStatus(applicationId, callback){
	setTimeout(async function () {
		let application = await getApplication(applicationId);
		if(application.status == "waitingForPayment"){
			checkApplicationPaymentStatus(applicationId, callback);
		}
		else{
			callback(application);
		}
	}, 15000);
}


function checkMissingLoginClaimType(missingClaimTypes, claimTypeId) {
    for (let i = 0; i < missingClaimTypes.length; i++) {
        if (missingClaimTypes[i].id == claimTypeId) {
            return true;
        }
    }
    return false;
}

//Background script messaging helpers
async function getBridgePassportId(){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBridgePassportId' });
}

async function getPassphrase() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassphrase' });
}

async function getPassportFromStorage() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportFromStorage' });
}

async function createPassport(passphrase, neoWif, autoCreate) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'createPassport', passphrase, neoWif, autoCreate });
}

async function getPassportDetails() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportDetails' });
}

async function getPassportIdForPublicKey(publicKey) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportIdForPublicKey', publicKey });
}

async function importPassport(content, passphrase) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'importPassport', content, passphrase });
}

async function unlockPassport(passphrase) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'unlockPassport', passphrase });
}

async function getPassport() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassport' });
}

async function closePassport() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'closePassport' });
}

async function removePassport() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'removePassport' });
}

async function getPassportClaims() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getClaims' });
}

async function getApplications() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getApplications' });
}

async function getApplication(applicationId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getApplication', applicationId });
}

async function createApplication(partner) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'createApplication', partner });
}

async function updateApplicationTransaction(applicationId, network, transactionId){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'updateApplicationTransaction', applicationId, network, transactionId });
}

async function resendApplication(applicationId){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'resendApplication', applicationId });
}

async function clearCache() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'clearCache' });
}

async function getSettings() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getSettings' });
}

async function saveSettings(settings) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'saveSettings', settings });
}

async function getVerificationPartners() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getVerificationPartners' });
}

async function getVerificationPartner(partnerId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getVerificationPartne', partnerId });
}

async function getPassportLoginRequest(payload) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportLoginRequest', payload });
}

async function getPassportLoginResponse(request, claimTypeIds) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getPassportLoginResponse', request, claimTypeIds });
}

async function removeAllApplicationClaims(applicationId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'removeAllApplicationClaims', applicationId });
}

async function updateClaimPackages(claimPackages) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'updateClaimPackages', claimPackages });
}

async function getNetworkFee(){
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getNetworkFee' });
}

async function getBlockchainAddresses() {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainAddresses' });
}

async function getBlockchainPrivateKey(network, key) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainPrivateKey', network, key });
}

async function registerBlockchainAddress(network, address) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'registerBlockchainAddress', network, address });
}

async function sendBlockchainPayment(network, amount, paymentIdentifier, recipientAddress) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'sendBlockchainPayment', network, amount, paymentIdentifier, recipientAddress});
}

async function getBlockchainPassportInfo(network, passportId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainPassportInfo', network, passportId });
}

async function getBlockchainAddressInfo(network, address) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainAddressInfo', network, address });
}

async function getBlockchainTransactionInfo(network, transactionId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'getBlockchainTransactionInfo', network, transactionId });
}

async function checkBlockchainTransactionComplete(network, transactionId) {
	return await _browser.runtime.sendMessage({ target: 'background', action: 'checkBlockchainTransactionComplete', network, transactionId });
}